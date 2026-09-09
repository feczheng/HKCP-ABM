"use strict";

(function exposeCrossPackRouting(globalScope) {
  const MAINLAND_SCOPES = Object.freeze(["continuous-kowloon", "new-territories-east", "new-territories-west"]);

  class ComparisonGraph extends globalScope.HKIslandRouting.RegionalRoutingGraph {
    edgeCost(edgeId, options) {
      return options.dimension === "2d" ? this.planarEdgeCost(edgeId, options) : super.edgeCost(edgeId, options);
    }
    pathCacheKey(from, to, options) {
      return `${options.dimension || "3d"}:${super.pathCacheKey(from, to, options)}`;
    }
  }

  function contains(point, area, lookup) {
    const x = lookup.appOriginHk1980[0] + point.x * lookup.appUnitMeters;
    const y = lookup.appOriginHk1980[1] + point.y * lookup.appUnitMeters;
    const b = area.bounds;
    if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) return false;
    return area.polygons.some((polygon) => {
      let inside = false;
      for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
        const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
        if (Math.abs(cross) <= 1e-8 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj) && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) return true;
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    });
  }

  class Router {
    constructor({ manifest, boundaryLookup = globalScope.V12_13_BOUNDARY_LOOKUP, fetchImpl = globalScope.fetch?.bind(globalScope), chunkLoader = null, identityLoader = null } = {}) {
      this.manifest = manifest;
      this.boundaries = boundaryLookup;
      this.fetchImpl = fetchImpl;
      this.identityLoader = identityLoader;
      this.identities = new Map();
      this.ready = false;
      this.loading = null;
      this.graph = new ComparisonGraph(manifest, { fetchImpl, pathCacheMax: 64, chunkLoader: chunkLoader || ((entry) => this.readAsset(entry)) });
    }

    async readAsset(entry) {
      const url = `${this.manifest.runtime.basePath}${entry.file}?v=${encodeURIComponent(this.manifest.buildVersion)}`;
      const response = await this.fetchImpl(url);
      if (!response.ok) throw new Error(`Route asset unavailable (${response.status}): ${entry.file}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (entry.sha256) {
        const digest = new Uint8Array(await globalScope.crypto.subtle.digest("SHA-256", bytes));
        const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
        if (hash !== entry.sha256) throw new Error(`Route asset checksum mismatch: ${entry.file}`);
      }
      if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
        return JSON.parse(await new Response(stream).text());
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    }

    load(onProgress = null) {
      if (this.ready) return Promise.resolve(this);
      if (this.loading) return this.loading;
      this.loading = (async () => {
        if (this.boundaries?.crs !== "EPSG:2326" || this.boundaries.simplificationMeters !== 0 || this.boundaries.areas?.length !== 452) throw new Error("Exact DCCA boundaries unavailable");
        this.areaById = new Map(this.boundaries.areas.map((area) => [area.id, area]));
        await this.graph.load(onProgress);
        const maps = new Map();
        for (const entry of this.manifest.identityMaps || []) {
          const data = await (this.identityLoader ? this.identityLoader(entry) : this.readAsset(entry));
          if (!MAINLAND_SCOPES.includes(entry.scope) || maps.has(entry.scope) || data.scope !== entry.scope || data.packBuildVersion !== entry.packBuildVersion ||
              !Array.isArray(entry.dccaIds) || !entry.dccaIds.length ||
              data.localToMerged?.length !== entry.nodeCount || data.localToMerged.some((node) => !Number.isInteger(node) || node < 0 || node >= this.graph.nodeX.length)) throw new Error(`Invalid source identity map: ${entry.scope}`);
          maps.set(entry.scope, { ...entry, nodes: Uint32Array.from(data.localToMerged) });
        }
        if (maps.size !== 3) throw new Error("All three mainland identity maps are required");
        this.identities = maps;
        this.ready = true;
        return this;
      })().finally(() => { this.loading = null; });
      return this.loading;
    }

    resolve(endpoint) {
      if (!MAINLAND_SCOPES.includes(endpoint?.scope)) return { reason: "cross-water-or-unsupported-pack" };
      const identity = this.identities.get(endpoint.scope);
      if (!identity || endpoint.packBuildVersion !== identity.packBuildVersion) return { reason: "source-pack-version-mismatch" };
      if (!Number.isInteger(endpoint.nodeId) || endpoint.nodeId < 0 || endpoint.nodeId >= identity.nodes.length) return { reason: "invalid-pack-local-node" };
      if (![endpoint.x, endpoint.y, endpoint.z].every(Number.isFinite)) return { reason: "invalid-endpoint-coordinate" };
      const area = this.areaById.get(endpoint.dccaId);
      if (!area || !contains(endpoint, area, this.boundaries)) return { reason: "endpoint-outside-declared-dcca" };
      if (!identity.dccaIds.includes(endpoint.dccaId)) return { reason: "endpoint-dcca-pack-mismatch" };
      const nodeId = identity.nodes[endpoint.nodeId];
      const point = this.graph.nodePoint(nodeId);
      const horizontal = Math.hypot(endpoint.x - point.x, endpoint.y - point.y) * this.graph.appUnitMeters;
      const vertical = Math.abs(endpoint.z - point.z) * this.graph.verticalUnitMeters;
      const meters = Math.hypot(horizontal, vertical);
      if (meters > 500) return { reason: "endpoint-connector-over-500m" };
      return { nodeId, point, horizontal, vertical, meters };
    }

    route({ origin, destination, options = {}, walkingSpeedMpm = 70, mobility = 1 } = {}) {
      const blocked = (reason) => ({ status: "blocked", reason, origin, destination, threeD: null, twoD: null });
      if (!this.ready) return blocked("merged-graph-not-ready");
      if (!Number.isFinite(walkingSpeedMpm) || walkingSpeedMpm < 35 || walkingSpeedMpm > 120 || !Number.isFinite(mobility) || mobility <= 0 || mobility > 2) return blocked("invalid-walking-profile");
      const start = this.resolve(origin), end = this.resolve(destination);
      if (start.reason || end.reason) return blocked(start.reason || end.reason);
      if (this.graph.nodeComponent[start.nodeId] !== this.graph.nodeComponent[end.nodeId]) return blocked("disconnected-source-components");
      // Both conditions keep source topology and directions. Zero heuristic makes
      // the existing A* implementation a minimum-cost Dijkstra search.
      const scenarioKey = options.scenarioKey || "baseline";
      const scenarioHeat = options.scenarioHeat ?? 0.45;
      const heatAvoidance = options.heatAvoidance ?? 0.8;
      if (!["baseline", "walkable", "heat", "exam", "typhoon"].includes(scenarioKey) ||
          ![scenarioHeat, heatAvoidance].every((value) => Number.isFinite(value) && value >= 0 && value <= 2) || options.costProfile) return blocked("unsupported-cost-profile");
      const sharedOptions = { profile: "scenario", heuristicMode: "zero", scenarioKey, scenarioHeat, heatAvoidance };
      const path3 = this.graph.findPath(start.nodeId, end.nodeId, { ...sharedOptions, dimension: "3d" });
      const path2 = this.graph.findPath(start.nodeId, end.nodeId, { ...sharedOptions, dimension: "2d" });
      if (!path3 || !path2) return blocked("unreachable-directed-source-od");
      // Identical anchors require no out-and-back access trip. Distinct anchors
      // sharing a network node still retain their two unverified connectors.
      const noMovement = start.nodeId === end.nodeId && ["x", "y", "z"].every((axis) => origin[axis] === destination[axis]);
      const connector3 = noMovement ? 0 : start.meters + end.meters;
      const connector2 = noMovement ? 0 : start.horizontal + end.horizontal;
      const summarize = (path, dimension) => {
        const planar = dimension === "2d";
        const networkMeters = planar ? path.horizontalMeters : path.pathMeters;
        const connectorMeters = planar ? connector2 : connector3;
        const generalizedMeters = path.generalizedMeters + connectorMeters;
        const routeMeters = networkMeters + connectorMeters;
        const share = path.pathMeters / Math.max(1, path.pathMeters + connector3);
        return { ...path, dimension, networkMeters, connectorMeters, routeMeters, generalizedMeters,
          minutes: generalizedMeters / walkingSpeedMpm / mobility,
          activeTravelShare: planar ? 1 : 1 - path.mechanicalShare * share,
          verticalGainMeters: planar || noMovement ? 0 : path.verticalGainMeters + Math.max(0, (start.point.z - origin.z) * this.graph.verticalUnitMeters) + Math.max(0, (destination.z - end.point.z) * this.graph.verticalUnitMeters),
          points: noMovement ? [origin] : [origin, ...path.nodeIds.map((node) => this.graph.nodePoint(node)), destination],
        };
      };
      const threeD = summarize(path3, "3d"), twoD = summarize(path2, "2d");
      const edges2 = new Set(path2.edgeIds);
      const sharedEdges = path3.edgeIds.filter((edge) => edges2.has(edge)).length;
      return { status: "matched", reason: null, noMovement, origin, destination, threeD, twoD,
        globalStartNodeId: start.nodeId, globalDestinationNodeId: end.nodeId,
        crossPack: origin.scope !== destination.scope,
        connectors: { startMeters: noMovement ? 0 : start.meters, destinationMeters: noMovement ? 0 : end.meters, horizontalMeters: connector2, verticalMeters: noMovement ? 0 : start.vertical + end.vertical, review: !noMovement && (start.meters > 100 || end.meters > 100) },
        edgeOverlapShare: path3.edgeIds.length || path2.edgeIds.length ? sharedEdges / new Set([...path3.edgeIds, ...path2.edgeIds]).size : null,
        sameSourceTopology: true, accessHoursEnforced: false, empiricalValidation: false,
        source: this.manifest.source, buildVersion: this.manifest.buildVersion,
        options: sharedOptions, walkingSpeedMpm, mobility,
      };
    }
  }

  globalScope.CrossPackRouting = Object.freeze({ Router, MAINLAND_SCOPES });
})(typeof window !== "undefined" ? window : globalThis);
