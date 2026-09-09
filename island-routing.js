"use strict";

(function exposeHongKongIslandRouting(globalScope) {
  const STAIR_FEATURES = new Set([12, 20]);
  const RAMP_FEATURES = new Set([11, 19]);
  const MECHANICAL_FEATURES = new Set([8, 9, 10, 13, 16, 17, 18, 21]);
  const CROSSING_FEATURES = new Set([30, 31, 32, 33]);
  const BRIDGE_OR_SUBWAY_FEATURES = new Set([2, 4]);
  const DEFAULT_COST_PROFILE = Object.freeze({
    stairFactor: 1.34,
    rampFactor: 1.12,
    otherVerticalFactor: 1.08,
    mechanicalFixedMeters: 35,
    bridgeSubwayFactor: 1.04,
    crossingBaselineFactor: 1.12,
    crossingWalkableFactor: 1.03,
    heatExposureFactor: 0.18,
    gradientFactor: 1.8,
    gradientCap: 0.35,
    unclassifiedGradeMode: "source-3d",
    unclassifiedGradeThreshold: 1,
    unclassifiedShortEdgeMeters: 2,
    unclassifiedEquivalentGradeCap: 0.35,
  });
  const COST_PROFILE_CACHE = new WeakMap();

  function costProfile(options = {}) {
    if (!options.costProfile) return DEFAULT_COST_PROFILE;
    if (!COST_PROFILE_CACHE.has(options)) {
      COST_PROFILE_CACHE.set(options, Object.freeze({
        ...DEFAULT_COST_PROFILE,
        ...options.costProfile,
      }));
    }
    return COST_PROFILE_CACHE.get(options);
  }

  class MinPriorityQueue {
    constructor() {
      this.nodes = [];
      this.priorities = [];
    }

    get size() {
      return this.nodes.length;
    }

    push(node, priority) {
      let index = this.nodes.length;
      this.nodes.push(node);
      this.priorities.push(priority);
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (this.priorities[parent] <= priority) break;
        this.nodes[index] = this.nodes[parent];
        this.priorities[index] = this.priorities[parent];
        index = parent;
      }
      this.nodes[index] = node;
      this.priorities[index] = priority;
    }

    pop() {
      if (!this.nodes.length) return null;
      const firstNode = this.nodes[0];
      const firstPriority = this.priorities[0];
      const lastNode = this.nodes.pop();
      const lastPriority = this.priorities.pop();
      if (this.nodes.length) {
        let index = 0;
        while (true) {
          const left = index * 2 + 1;
          const right = left + 1;
          if (left >= this.nodes.length) break;
          const child = right < this.nodes.length && this.priorities[right] < this.priorities[left] ? right : left;
          if (this.priorities[child] >= lastPriority) break;
          this.nodes[index] = this.nodes[child];
          this.priorities[index] = this.priorities[child];
          index = child;
        }
        this.nodes[index] = lastNode;
        this.priorities[index] = lastPriority;
      }
      return { node: firstNode, priority: firstPriority };
    }
  }

  async function responseToJson(response) {
    if (!response.ok) throw new Error(`Graph chunk request failed (${response.status}): ${response.url}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (!isGzip) return JSON.parse(new TextDecoder().decode(bytes));
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser does not provide DecompressionStream for gzip graph chunks");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
  }

  async function loadWithConcurrency(items, limit, loader, onProgress) {
    const results = new Array(items.length);
    let cursor = 0;
    let completed = 0;
    async function worker() {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await loader(items[index], index);
        completed += 1;
        onProgress?.({ phase: "download", completed, total: items.length, item: items[index] });
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
  }

  class HongKongIslandRoutingGraph {
    constructor(manifest, options = {}) {
      if (!manifest?.graph || !manifest?.chunks) throw new Error("Invalid Hong Kong Island routing manifest");
      this.manifest = manifest;
      this.basePath = options.basePath || manifest.runtime?.basePath || "data/hk_island_routing/";
      this.fetchImpl = options.fetchImpl || globalScope.fetch?.bind(globalScope);
      this.chunkLoader = options.chunkLoader || null;
      this.fetchConcurrency = options.fetchConcurrency || 6;
      this.pathCacheMax = options.pathCacheMax || 1200;
      this.snapGridMeters = options.snapGridMeters || 150;
      this.ready = false;
      this.loading = false;
      this.loadError = null;
      this.pathCache = new Map();
      this.pathQueries = 0;
      this.cacheHits = 0;
      this.failedQueries = 0;
      this.totalExpandedNodes = 0;
      this.lastQuery = null;
      this.schoolAttachments = new Map(
        (manifest.attachments?.schools || []).map(([id, nodeId, snapMeters, nodeElevationHkpdM, componentId]) => [
          id,
          { nodeId, snapMeters, nodeElevationHkpdM, componentId: componentId ?? 0 },
        ]),
      );
      this.poiAttachments = new Map(
        (manifest.attachments?.childPois || []).map(([id, nodeId, snapMeters, nodeElevationHkpdM, componentId]) => [
          id,
          { nodeId, snapMeters, nodeElevationHkpdM, componentId: componentId ?? 0 },
        ]),
      );
    }

    async load(onProgress = null) {
      if (this.ready) return this;
      if (this.loading) throw new Error("Hong Kong Island routing graph is already loading");
      this.loading = true;
      try {
        const chunks = await loadWithConcurrency(
          this.manifest.chunks,
          this.fetchConcurrency,
          async (entry) => {
            if (this.chunkLoader) return this.chunkLoader(entry);
            if (!this.fetchImpl) throw new Error("No fetch implementation is available for graph chunks");
            const separator = entry.file.includes("?") ? "&" : "?";
            const url = `${this.basePath}${entry.file}${separator}v=${encodeURIComponent(this.manifest.buildVersion)}`;
            return responseToJson(await this.fetchImpl(url));
          },
          onProgress,
        );
        onProgress?.({ phase: "assemble", completed: 0, total: chunks.length });
        this.assemble(chunks, onProgress);
        this.ready = true;
        this.loadError = null;
        onProgress?.({ phase: "ready", completed: chunks.length, total: chunks.length });
        return this;
      } catch (error) {
        this.loadError = error;
        throw error;
      } finally {
        this.loading = false;
      }
    }

    assemble(chunks, onProgress = null) {
      const graph = this.manifest.graph;
      const coordinates = this.manifest.coordinates;
      const nodeCount = graph.nodeCount;
      const edgeCount = graph.edgeCount;
      const [appOriginE, appOriginN] = coordinates.appOriginHk1980;
      const appUnitMeters = coordinates.appUnitMeters;
      const verticalUnitMeters = coordinates.verticalUnitMeters;
      this.appUnitMeters = appUnitMeters;
      this.verticalUnitMeters = verticalUnitMeters;
      this.nodeX = new Float32Array(nodeCount);
      this.nodeY = new Float32Array(nodeCount);
      this.nodeZ = new Float32Array(nodeCount);
      this.nodeComponent = new Uint16Array(nodeCount);
      const nodeSeen = new Uint8Array(nodeCount);
      this.edgeFrom = new Uint32Array(edgeCount);
      this.edgeTo = new Uint32Array(edgeCount);
      this.edgeRouteId = new Uint32Array(edgeCount);
      this.edgeHorizontalMeters = new Float32Array(edgeCount);
      this.edgeLengthMeters = new Float32Array(edgeCount);
      this.edgeFeatureType = new Uint8Array(edgeCount);
      this.edgeLocation = new Uint8Array(edgeCount);
      this.edgeWeatherProof = new Uint8Array(edgeCount);
      this.edgeWheelchairBarrier = new Uint8Array(edgeCount);
      this.edgeWheelchairAccess = new Uint8Array(edgeCount);
      this.edgeDirection = new Int8Array(edgeCount);
      this.edgeEnabled = new Uint8Array(edgeCount);
      this.edgeGradient = new Float32Array(edgeCount);
      this.edgeAccessTimeId = new Int32Array(edgeCount);
      let edgeCursor = 0;

      chunks.forEach((chunk, chunkIndex) => {
        if (chunk.schemaVersion !== this.manifest.schemaVersion) {
          throw new Error(`Graph chunk schema mismatch: ${chunk.chunkId}`);
        }
        const [tileOriginE, tileOriginN] = chunk.originHk1980;
        for (let offset = 0; offset < chunk.nodes.length; offset += chunk.nodeStride) {
          const nodeId = chunk.nodes[offset];
          if (nodeId >= nodeCount || nodeSeen[nodeId]) throw new Error(`Invalid or duplicate node ${nodeId}`);
          nodeSeen[nodeId] = 1;
          this.nodeX[nodeId] = (tileOriginE + chunk.nodes[offset + 1] / 100 - appOriginE) / appUnitMeters;
          this.nodeY[nodeId] = (tileOriginN + chunk.nodes[offset + 2] / 100 - appOriginN) / appUnitMeters;
          this.nodeZ[nodeId] = chunk.nodes[offset + 3] / 100 / verticalUnitMeters;
          this.nodeComponent[nodeId] = chunk.nodes[offset + 4];
        }
        for (let offset = 0; offset < chunk.edges.length; offset += chunk.edgeStride) {
          if (edgeCursor >= edgeCount) throw new Error("Graph contains more edges than declared");
          this.edgeFrom[edgeCursor] = chunk.edges[offset];
          this.edgeTo[edgeCursor] = chunk.edges[offset + 1];
          this.edgeRouteId[edgeCursor] = chunk.edges[offset + 2];
          this.edgeHorizontalMeters[edgeCursor] = chunk.edges[offset + 3] / 1000;
          this.edgeLengthMeters[edgeCursor] = chunk.edges[offset + 4] / 1000;
          this.edgeFeatureType[edgeCursor] = chunk.edges[offset + 5];
          this.edgeLocation[edgeCursor] = chunk.edges[offset + 6];
          this.edgeWeatherProof[edgeCursor] = chunk.edges[offset + 7];
          this.edgeWheelchairBarrier[edgeCursor] = chunk.edges[offset + 8];
          this.edgeWheelchairAccess[edgeCursor] = chunk.edges[offset + 9];
          this.edgeDirection[edgeCursor] = chunk.edges[offset + 10];
          this.edgeEnabled[edgeCursor] = chunk.edges[offset + 11];
          this.edgeGradient[edgeCursor] = chunk.edges[offset + 12] / 1_000_000;
          this.edgeAccessTimeId[edgeCursor] = chunk.edges[offset + 15];
          edgeCursor += 1;
        }
        onProgress?.({ phase: "assemble", completed: chunkIndex + 1, total: chunks.length });
      });
      if (edgeCursor !== edgeCount) throw new Error(`Graph edge count mismatch: ${edgeCursor} != ${edgeCount}`);
      for (let nodeId = 0; nodeId < nodeCount; nodeId += 1) {
        if (!nodeSeen[nodeId]) throw new Error(`Graph is missing dense node ${nodeId}`);
      }
      this.buildAdjacency();
      this.buildSpatialIndex();
      this.searchScores = new Float64Array(nodeCount);
      this.previousNode = new Int32Array(nodeCount);
      this.previousEdge = new Int32Array(nodeCount);
      this.scoreStamp = new Uint32Array(nodeCount);
      this.closedStamp = new Uint32Array(nodeCount);
      this.queryStamp = 0;
    }

    buildAdjacency() {
      const nodeCount = this.nodeX.length;
      const degree = new Uint32Array(nodeCount + 1);
      let arcCount = 0;
      for (let edgeId = 0; edgeId < this.edgeFrom.length; edgeId += 1) {
        if (this.edgeEnabled[edgeId] !== 1) continue;
        const direction = this.edgeDirection[edgeId];
        if (direction >= 0) {
          degree[this.edgeFrom[edgeId] + 1] += 1;
          arcCount += 1;
        }
        if (direction <= 0) {
          degree[this.edgeTo[edgeId] + 1] += 1;
          arcCount += 1;
        }
      }
      if (arcCount !== this.manifest.graph.directedArcCount) {
        throw new Error(`Directed arc count mismatch: ${arcCount}`);
      }
      for (let nodeId = 1; nodeId <= nodeCount; nodeId += 1) degree[nodeId] += degree[nodeId - 1];
      const cursor = degree.slice(0, nodeCount);
      this.adjacencyOffset = degree;
      this.adjacencyNode = new Uint32Array(arcCount);
      this.adjacencyEdge = new Uint32Array(arcCount);
      for (let edgeId = 0; edgeId < this.edgeFrom.length; edgeId += 1) {
        if (this.edgeEnabled[edgeId] !== 1) continue;
        const from = this.edgeFrom[edgeId];
        const to = this.edgeTo[edgeId];
        const direction = this.edgeDirection[edgeId];
        if (direction >= 0) {
          const index = cursor[from]++;
          this.adjacencyNode[index] = to;
          this.adjacencyEdge[index] = edgeId;
        }
        if (direction <= 0) {
          const index = cursor[to]++;
          this.adjacencyNode[index] = from;
          this.adjacencyEdge[index] = edgeId;
        }
      }
    }

    buildDirectedCore(seedNodeId) {
      if (!Number.isInteger(seedNodeId) || seedNodeId < 0 || seedNodeId >= this.nodeX.length) {
        throw new Error("Directed-core seed node is outside the graph");
      }
      if (this.directedCoreMask && this.directedCoreSeedNodeId === seedNodeId) {
        return {
          seedNodeId,
          nodeCount: this.directedCoreNodeCount,
          share: this.directedCoreShare,
        };
      }
      const nodeCount = this.nodeX.length;
      const arcCount = this.adjacencyNode.length;
      const reverseOffset = new Uint32Array(nodeCount + 1);
      for (let arc = 0; arc < arcCount; arc += 1) reverseOffset[this.adjacencyNode[arc] + 1] += 1;
      for (let nodeId = 1; nodeId <= nodeCount; nodeId += 1) {
        reverseOffset[nodeId] += reverseOffset[nodeId - 1];
      }
      const reverseCursor = reverseOffset.slice(0, nodeCount);
      const reverseNode = new Uint32Array(arcCount);
      for (let fromNodeId = 0; fromNodeId < nodeCount; fromNodeId += 1) {
        for (let arc = this.adjacencyOffset[fromNodeId]; arc < this.adjacencyOffset[fromNodeId + 1]; arc += 1) {
          const toNodeId = this.adjacencyNode[arc];
          reverseNode[reverseCursor[toNodeId]++] = fromNodeId;
        }
      }
      const traverse = (offset, adjacent) => {
        const visited = new Uint8Array(nodeCount);
        const stack = new Uint32Array(nodeCount);
        let depth = 1;
        stack[0] = seedNodeId;
        visited[seedNodeId] = 1;
        while (depth) {
          const nodeId = stack[--depth];
          for (let arc = offset[nodeId]; arc < offset[nodeId + 1]; arc += 1) {
            const nextNodeId = adjacent[arc];
            if (visited[nextNodeId]) continue;
            visited[nextNodeId] = 1;
            stack[depth++] = nextNodeId;
          }
        }
        return visited;
      };
      const forward = traverse(this.adjacencyOffset, this.adjacencyNode);
      const backward = traverse(reverseOffset, reverseNode);
      const mask = new Uint8Array(nodeCount);
      let coreNodeCount = 0;
      for (let nodeId = 0; nodeId < nodeCount; nodeId += 1) {
        if (forward[nodeId] && backward[nodeId]) {
          mask[nodeId] = 1;
          coreNodeCount += 1;
        }
      }
      this.directedCoreMask = mask;
      this.directedCoreSeedNodeId = seedNodeId;
      this.directedCoreNodeCount = coreNodeCount;
      this.directedCoreShare = coreNodeCount / Math.max(1, this.manifest.graph.primaryComponentNodeCount || nodeCount);
      return { seedNodeId, nodeCount: coreNodeCount, share: this.directedCoreShare };
    }

    isDirectedCoreNode(nodeId) {
      return this.directedCoreMask ? this.directedCoreMask[nodeId] === 1 : true;
    }

    buildSpatialIndex() {
      this.spatialCells = new Map();
      const cellSize = this.snapGridMeters;
      const eligibleComponents = new Set(
        this.manifest.graph.eligibleEndpointComponentIds || [this.manifest.graph.primaryComponentId],
      );
      for (let nodeId = 0; nodeId < this.nodeX.length; nodeId += 1) {
        if (!eligibleComponents.has(this.nodeComponent[nodeId])) continue;
        const cellX = Math.floor((this.nodeX[nodeId] * this.appUnitMeters) / cellSize);
        const cellY = Math.floor((this.nodeY[nodeId] * this.appUnitMeters) / cellSize);
        const key = `${cellX}:${cellY}`;
        const bucket = this.spatialCells.get(key) || [];
        bucket.push(nodeId);
        this.spatialCells.set(key, bucket);
      }
    }

    nodePoint(nodeId) {
      if (!this.ready && !this.nodeX) return null;
      if (!Number.isInteger(nodeId) || nodeId < 0 || nodeId >= this.nodeX.length) return null;
      return { x: this.nodeX[nodeId], y: this.nodeY[nodeId], z: this.nodeZ[nodeId], nodeId };
    }

    attachment(type, placeId) {
      return type === "school" ? this.schoolAttachments.get(placeId) || null : this.poiAttachments.get(placeId) || null;
    }

    snapPoint(point) {
      if (!this.ready || !point) return null;
      const eastingM = point.x * this.appUnitMeters;
      const northingM = point.y * this.appUnitMeters;
      const centerX = Math.floor(eastingM / this.snapGridMeters);
      const centerY = Math.floor(northingM / this.snapGridMeters);
      let bestNode = -1;
      let bestSquared = Infinity;
      for (let radius = 0; radius < 80; radius += 1) {
        for (let cellX = centerX - radius; cellX <= centerX + radius; cellX += 1) {
          for (let cellY = centerY - radius; cellY <= centerY + radius; cellY += 1) {
            if (radius && Math.max(Math.abs(cellX - centerX), Math.abs(cellY - centerY)) !== radius) continue;
            const bucket = this.spatialCells.get(`${cellX}:${cellY}`) || [];
            for (const nodeId of bucket) {
              const dx = this.nodeX[nodeId] * this.appUnitMeters - eastingM;
              const dy = this.nodeY[nodeId] * this.appUnitMeters - northingM;
              const squared = dx * dx + dy * dy;
              if (squared < bestSquared) {
                bestSquared = squared;
                bestNode = nodeId;
              }
            }
          }
        }
        if (bestNode >= 0 && radius > 0 && (radius - 1) * this.snapGridMeters >= Math.sqrt(bestSquared)) break;
      }
      if (bestNode < 0) return null;
      return {
        nodeId: bestNode,
        componentId: this.nodeComponent[bestNode],
        snapMeters: Math.sqrt(bestSquared),
        point: this.nodePoint(bestNode),
      };
    }

    clearPathCache() {
      this.pathCache.clear();
    }

    cachePath(key, result) {
      if (!this.pathCache.has(key) && this.pathCache.size >= this.pathCacheMax) {
        this.pathCache.delete(this.pathCache.keys().next().value);
      }
      this.pathCache.set(key, result);
      return result;
    }

    pathCacheKey(startNodeId, destinationNodeId, options) {
      const costs = costProfile(options);
      return [
        options.profile || "scenario",
        options.scenarioKey || "baseline",
        Number(options.scenarioHeat || 0).toFixed(3),
        Number(options.heatAvoidance || 0).toFixed(3),
        Number(costs.stairFactor).toFixed(3),
        Number(costs.rampFactor).toFixed(3),
        Number(costs.otherVerticalFactor).toFixed(3),
        Number(costs.mechanicalFixedMeters).toFixed(2),
        Number(costs.bridgeSubwayFactor).toFixed(3),
        Number(costs.crossingBaselineFactor).toFixed(3),
        Number(costs.crossingWalkableFactor).toFixed(3),
        Number(costs.heatExposureFactor).toFixed(3),
        Number(costs.gradientFactor).toFixed(3),
        Number(costs.gradientCap).toFixed(3),
        costs.unclassifiedGradeMode,
        Number(costs.unclassifiedGradeThreshold).toFixed(3),
        Number(costs.unclassifiedShortEdgeMeters).toFixed(3),
        Number(costs.unclassifiedEquivalentGradeCap).toFixed(3),
        options.heuristicMode || "auto",
        startNodeId,
        destinationNodeId,
      ].join(":");
    }

    heuristic(fromNodeId, toNodeId, options = {}) {
      if (options.heuristicMode === "zero") return 0;
      const horizontal = Math.hypot(
        this.nodeX[toNodeId] - this.nodeX[fromNodeId],
        this.nodeY[toNodeId] - this.nodeY[fromNodeId],
      ) * this.appUnitMeters;
      if (costProfile(options).unclassifiedGradeMode === "bounded-sensitivity") {
        return horizontal;
      }
      const vertical = Math.abs(this.nodeZ[toNodeId] - this.nodeZ[fromNodeId]) * this.verticalUnitMeters;
      return Math.hypot(horizontal, vertical);
    }

    effectiveEdgeGeometry(edgeId, options = {}) {
      const costs = costProfile(options);
      const featureType = this.edgeFeatureType[edgeId];
      const horizontal = this.edgeHorizontalMeters[edgeId];
      const fromNodeId = this.edgeFrom[edgeId];
      const toNodeId = this.edgeTo[edgeId];
      const sourceVertical = Math.abs(this.nodeZ[toNodeId] - this.nodeZ[fromNodeId]) * this.verticalUnitMeters;
      const geometryGrade = sourceVertical / Math.max(0.001, horizontal);
      const classifiedVertical =
        STAIR_FEATURES.has(featureType) ||
        RAMP_FEATURES.has(featureType) ||
        MECHANICAL_FEATURES.has(featureType);
      const bounded =
        costs.unclassifiedGradeMode === "bounded-sensitivity" &&
        !classifiedVertical &&
        horizontal < costs.unclassifiedShortEdgeMeters &&
        geometryGrade > costs.unclassifiedGradeThreshold;
      const effectiveVertical = bounded
        ? Math.min(sourceVertical, horizontal * costs.unclassifiedEquivalentGradeCap)
        : sourceVertical;
      return {
        horizontal,
        sourceVertical,
        effectiveVertical,
        sourceLength: this.edgeLengthMeters[edgeId],
        effectiveLength: bounded
          ? Math.hypot(horizontal, effectiveVertical)
          : this.edgeLengthMeters[edgeId],
        geometryGrade,
        effectiveGrade: effectiveVertical / Math.max(0.001, horizontal),
        classifiedVertical,
        bounded,
      };
    }

    edgeCost(edgeId, options) {
      const featureType = this.edgeFeatureType[edgeId];
      const location = this.edgeLocation[edgeId];
      const weatherProof = this.edgeWeatherProof[edgeId];
      const gradient = Math.abs(this.edgeGradient[edgeId]);
      const scenarioKey = options.profile === "school-baseline" ? "baseline" : options.scenarioKey || "baseline";
      const heatAvoidance = options.profile === "school-baseline" ? 0.8 : Number(options.heatAvoidance || 0);
      const costs = costProfile(options);
      const geometry = this.effectiveEdgeGeometry(edgeId, options);
      let factor = 1;
      let fixedCost = 0;
      if (STAIR_FEATURES.has(featureType)) factor *= costs.stairFactor;
      else if (RAMP_FEATURES.has(featureType)) factor *= costs.rampFactor;
      else if ([8, 9, 16, 17].includes(featureType)) factor *= costs.otherVerticalFactor;
      else if ([10, 13, 18, 21].includes(featureType)) fixedCost += costs.mechanicalFixedMeters;
      else if (BRIDGE_OR_SUBWAY_FEATURES.has(featureType)) factor *= costs.bridgeSubwayFactor;
      if (CROSSING_FEATURES.has(featureType)) {
        factor *= scenarioKey === "walkable"
          ? costs.crossingWalkableFactor
          : costs.crossingBaselineFactor;
      }
      if (weatherProof !== 1 && location !== 2) {
        factor *= 1 + Number(options.scenarioHeat || 0) * heatAvoidance * costs.heatExposureFactor;
      }
      factor *= 1 + Math.min(costs.gradientCap, gradient * costs.gradientFactor);
      return geometry.effectiveLength * factor + fixedCost;
    }

    planarEdgeCost(edgeId, options) {
      const featureType = this.edgeFeatureType[edgeId];
      const location = this.edgeLocation[edgeId];
      const weatherProof = this.edgeWeatherProof[edgeId];
      const scenarioKey = options.profile === "school-baseline" ? "baseline" : options.scenarioKey || "baseline";
      const heatAvoidance = options.profile === "school-baseline" ? 0.8 : Number(options.heatAvoidance || 0);
      const costs = costProfile(options);
      let factor = BRIDGE_OR_SUBWAY_FEATURES.has(featureType) ? costs.bridgeSubwayFactor : 1;
      if (CROSSING_FEATURES.has(featureType)) {
        factor *= scenarioKey === "walkable"
          ? costs.crossingWalkableFactor
          : costs.crossingBaselineFactor;
      }
      if (weatherProof !== 1 && location !== 2) {
        factor *= 1 + Number(options.scenarioHeat || 0) * heatAvoidance * costs.heatExposureFactor;
      }
      return this.edgeHorizontalMeters[edgeId] * factor;
    }

    nextQueryStamp() {
      this.queryStamp += 1;
      if (this.queryStamp >= 0xffffffff) {
        this.scoreStamp.fill(0);
        this.closedStamp.fill(0);
        this.queryStamp = 1;
      }
      return this.queryStamp;
    }

    findPath(startNodeId, destinationNodeId, options = {}) {
      if (!this.ready) return null;
      if (!Number.isInteger(startNodeId) || !Number.isInteger(destinationNodeId)) return null;
      if (startNodeId < 0 || destinationNodeId < 0 || startNodeId >= this.nodeX.length || destinationNodeId >= this.nodeX.length) {
        return null;
      }
      this.pathQueries += 1;
      const key = this.pathCacheKey(startNodeId, destinationNodeId, options);
      if (this.pathCache.has(key)) {
        this.cacheHits += 1;
        return this.pathCache.get(key);
      }
      if (this.nodeComponent[startNodeId] !== this.nodeComponent[destinationNodeId]) {
        this.failedQueries += 1;
        return this.cachePath(key, null);
      }
      if (startNodeId === destinationNodeId) {
        const local = this.summarizePath([startNodeId], [], 0, 0, options);
        return this.cachePath(key, local);
      }

      const stamp = this.nextQueryStamp();
      const queue = new MinPriorityQueue();
      this.searchScores[startNodeId] = 0;
      this.scoreStamp[startNodeId] = stamp;
      this.previousNode[startNodeId] = -1;
      this.previousEdge[startNodeId] = -1;
      queue.push(startNodeId, this.heuristic(startNodeId, destinationNodeId, options));
      let expandedNodes = 0;
      let reached = false;

      while (queue.size) {
        const current = queue.pop();
        if (!current) break;
        const nodeId = current.node;
        if (this.closedStamp[nodeId] === stamp) continue;
        if (nodeId === destinationNodeId) {
          reached = true;
          break;
        }
        this.closedStamp[nodeId] = stamp;
        expandedNodes += 1;
        for (let index = this.adjacencyOffset[nodeId]; index < this.adjacencyOffset[nodeId + 1]; index += 1) {
          const nextNodeId = this.adjacencyNode[index];
          if (this.closedStamp[nextNodeId] === stamp) continue;
          const edgeId = this.adjacencyEdge[index];
          const baseScore = this.scoreStamp[nodeId] === stamp ? this.searchScores[nodeId] : Infinity;
          const tentative = baseScore + this.edgeCost(edgeId, options);
          if (this.scoreStamp[nextNodeId] === stamp && tentative >= this.searchScores[nextNodeId]) continue;
          this.scoreStamp[nextNodeId] = stamp;
          this.searchScores[nextNodeId] = tentative;
          this.previousNode[nextNodeId] = nodeId;
          this.previousEdge[nextNodeId] = edgeId;
          queue.push(nextNodeId, tentative + this.heuristic(nextNodeId, destinationNodeId, options));
        }
      }
      this.totalExpandedNodes += expandedNodes;
      if (!reached || this.scoreStamp[destinationNodeId] !== stamp) {
        this.failedQueries += 1;
        this.lastQuery = { startNodeId, destinationNodeId, expandedNodes, status: "unreachable" };
        return this.cachePath(key, null);
      }

      const nodeIds = [];
      const edgeIds = [];
      let cursor = destinationNodeId;
      while (cursor >= 0) {
        nodeIds.push(cursor);
        if (cursor === startNodeId) break;
        edgeIds.push(this.previousEdge[cursor]);
        cursor = this.previousNode[cursor];
      }
      if (nodeIds[nodeIds.length - 1] !== startNodeId) {
        this.failedQueries += 1;
        return null;
      }
      nodeIds.reverse();
      edgeIds.reverse();
      const result = this.summarizePath(
        nodeIds,
        edgeIds,
        this.searchScores[destinationNodeId],
        edgeIds.reduce((sum, edgeId) => sum + this.planarEdgeCost(edgeId, options), 0),
        options,
      );
      result.expandedNodes = expandedNodes;
      this.lastQuery = {
        startNodeId,
        destinationNodeId,
        expandedNodes,
        nodeCount: nodeIds.length,
        routeMeters: result.pathMeters,
        status: "matched",
      };
      return this.cachePath(key, result);
    }

    summarizePath(nodeIds, edgeIds, generalizedMeters, planarGeneralizedMeters, options = {}) {
      let pathMeters = 0;
      let effectivePathMeters = 0;
      let horizontalMeters = 0;
      let coveredMeters = 0;
      let stairMeters = 0;
      let rampMeters = 0;
      let mechanicalMeters = 0;
      let accessTimeEdgeCount = 0;
      let accessTimeMeters = 0;
      let verticalGainMeters = 0;
      let verticalLossMeters = 0;
      let effectiveVerticalGainMeters = 0;
      let effectiveVerticalLossMeters = 0;
      let maxAbsoluteGrade = 0;
      let effectiveMaxAbsoluteGrade = 0;
      let maxGradeFeatureType = 0;
      let maxUnclassifiedGrade = 0;
      let effectiveMaxUnclassifiedGrade = 0;
      let maxUnclassifiedGradeFeatureType = 0;
      let boundedUnclassifiedEdgeCount = 0;
      let boundedUnclassifiedSourceVerticalMeters = 0;
      let boundedUnclassifiedEffectiveVerticalMeters = 0;
      const costs = costProfile(options);
      edgeIds.forEach((edgeId, index) => {
        const length = this.edgeLengthMeters[edgeId];
        const horizontal = this.edgeHorizontalMeters[edgeId];
        const featureType = this.edgeFeatureType[edgeId];
        const geometry = this.effectiveEdgeGeometry(edgeId, options);
        pathMeters += length;
        effectivePathMeters += geometry.effectiveLength;
        horizontalMeters += horizontal;
        if (this.edgeWeatherProof[edgeId] === 1 || this.edgeLocation[edgeId] === 2) coveredMeters += length;
        if (STAIR_FEATURES.has(featureType)) stairMeters += length;
        if (RAMP_FEATURES.has(featureType)) rampMeters += length;
        if (MECHANICAL_FEATURES.has(featureType)) mechanicalMeters += length;
        if (this.edgeAccessTimeId[edgeId] >= 0) {
          accessTimeEdgeCount += 1;
          accessTimeMeters += length;
        }
        const vertical = (this.nodeZ[nodeIds[index + 1]] - this.nodeZ[nodeIds[index]]) * this.verticalUnitMeters;
        const effectiveVertical = Math.sign(vertical) * geometry.effectiveVertical;
        verticalGainMeters += Math.max(0, vertical);
        verticalLossMeters += Math.max(0, -vertical);
        effectiveVerticalGainMeters += Math.max(0, effectiveVertical);
        effectiveVerticalLossMeters += Math.max(0, -effectiveVertical);
        const absoluteGrade = Math.abs(vertical) / Math.max(0.001, horizontal);
        const effectiveAbsoluteGrade = Math.abs(effectiveVertical) / Math.max(0.001, horizontal);
        if (absoluteGrade > maxAbsoluteGrade) {
          maxAbsoluteGrade = absoluteGrade;
          maxGradeFeatureType = featureType;
        }
        effectiveMaxAbsoluteGrade = Math.max(effectiveMaxAbsoluteGrade, effectiveAbsoluteGrade);
        if (geometry.bounded) {
          boundedUnclassifiedEdgeCount += 1;
          boundedUnclassifiedSourceVerticalMeters += Math.abs(vertical);
          boundedUnclassifiedEffectiveVerticalMeters += Math.abs(effectiveVertical);
        }
        if (!geometry.classifiedVertical && absoluteGrade > maxUnclassifiedGrade) {
          maxUnclassifiedGrade = absoluteGrade;
          maxUnclassifiedGradeFeatureType = featureType;
        }
        if (!geometry.classifiedVertical) {
          effectiveMaxUnclassifiedGrade = Math.max(effectiveMaxUnclassifiedGrade, effectiveAbsoluteGrade);
        }
      });
      return {
        nodeIds,
        edgeIds,
        pathMeters,
        effectivePathMeters,
        horizontalMeters,
        generalizedMeters,
        planarGeneralizedMeters,
        verticalGainMeters,
        verticalLossMeters,
        effectiveVerticalGainMeters,
        effectiveVerticalLossMeters,
        maxAbsoluteGrade,
        effectiveMaxAbsoluteGrade,
        maxGradeFeatureType,
        maxUnclassifiedGrade,
        effectiveMaxUnclassifiedGrade,
        maxUnclassifiedGradeFeatureType,
        unclassifiedGradeMode: costs.unclassifiedGradeMode,
        boundedUnclassifiedEdgeCount,
        boundedUnclassifiedSourceVerticalMeters,
        boundedUnclassifiedEffectiveVerticalMeters,
        boundedUnclassifiedVerticalReductionMeters:
          boundedUnclassifiedSourceVerticalMeters - boundedUnclassifiedEffectiveVerticalMeters,
        coveredShare: pathMeters ? coveredMeters / pathMeters : 0,
        stairShare: pathMeters ? stairMeters / pathMeters : 0,
        rampShare: pathMeters ? rampMeters / pathMeters : 0,
        mechanicalShare: pathMeters ? mechanicalMeters / pathMeters : 0,
        accessTimeEdgeCount,
        accessTimeShare: pathMeters ? accessTimeMeters / pathMeters : 0,
        activeTravelShare: pathMeters ? Math.max(0, Math.min(1, 1 - mechanicalMeters / pathMeters)) : 1,
        effectiveActiveTravelShare: effectivePathMeters
          ? Math.max(0, Math.min(1, 1 - mechanicalMeters / effectivePathMeters))
          : 1,
      };
    }

    diagnostics() {
      return {
        ready: this.ready,
        nodes: this.nodeX?.length || 0,
        edges: this.edgeFrom?.length || 0,
        arcs: this.adjacencyNode?.length || 0,
        pathQueries: this.pathQueries,
        cacheHits: this.cacheHits,
        failedQueries: this.failedQueries,
        directedCoreSeedNodeId: this.directedCoreSeedNodeId ?? null,
        directedCoreNodeCount: this.directedCoreNodeCount || 0,
        directedCoreShare: this.directedCoreShare || 0,
        meanExpandedNodes: this.pathQueries - this.cacheHits
          ? this.totalExpandedNodes / Math.max(1, this.pathQueries - this.cacheHits)
          : 0,
        cacheSize: this.pathCache.size,
        lastQuery: this.lastQuery,
      };
    }
  }

  globalScope.HKIslandRouting = Object.freeze({
    HongKongIslandRoutingGraph,
    RegionalRoutingGraph: HongKongIslandRoutingGraph,
  });
})(typeof window !== "undefined" ? window : globalThis);
