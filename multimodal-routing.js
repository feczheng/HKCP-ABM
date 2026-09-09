"use strict";

(function exposeKowloonMultimodalRouting(globalScope) {
  const MODE_POLICIES = Object.freeze({
    rail: { family: "rail", speedMpm: 520, waitMinutes: 4, stopBased: true },
    lrt: { family: "rail", speedMpm: 360, waitMinutes: 4, stopBased: true },
    tram: { family: "rail", speedMpm: 210, waitMinutes: 5, stopBased: true },
    ferry: { family: "ferry", speedMpm: 360, waitMinutes: 8, stopBased: true },
    franchised_bus: { family: "road", speedMpm: 280, waitMinutes: 6, stopBased: true },
    public_light_bus: { family: "road", speedMpm: 300, waitMinutes: 5, stopBased: true },
    school_bus: { family: "road", speedMpm: 330, waitMinutes: 4, stopBased: false },
    private_vehicle: { family: "road", speedMpm: 420, waitMinutes: 2, stopBased: false },
    taxi: { family: "road", speedMpm: 400, waitMinutes: 4, stopBased: false },
    bicycle: { family: "road", speedMpm: 230, waitMinutes: 0, stopBased: false },
    other: { family: "road", speedMpm: 280, waitMinutes: 5, stopBased: false },
  });

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
      const first = { node: this.nodes[0], priority: this.priorities[0] };
      const lastNode = this.nodes.pop();
      const lastPriority = this.priorities.pop();
      if (!this.nodes.length) return first;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.nodes.length) break;
        const child = right < this.nodes.length && this.priorities[right] < this.priorities[left]
          ? right
          : left;
        if (this.priorities[child] >= lastPriority) break;
        this.nodes[index] = this.nodes[child];
        this.priorities[index] = this.priorities[child];
        index = child;
      }
      this.nodes[index] = lastNode;
      this.priorities[index] = lastPriority;
      return first;
    }
  }

  class ModeGraph {
    constructor(key, source, scope) {
      this.key = key;
      this.source = source;
      this.appUnitMeters = scope.appUnitMeters;
      this.nodeStride = source.nodeStride;
      this.edgeStride = source.edgeStride;
      const nodeCount = source.nodesDecimeters.length / source.nodeStride;
      const edgeCount = source.edges.length / source.edgeStride;
      this.nodeX = new Float32Array(nodeCount);
      this.nodeY = new Float32Array(nodeCount);
      this.nodeComponent = Uint16Array.from(source.nodeComponents);
      this.componentSizes = Uint32Array.from(source.componentSizes);
      this.primaryComponent = source.primaryComponent;
      for (let nodeId = 0; nodeId < nodeCount; nodeId += 1) {
        const offset = nodeId * source.nodeStride;
        this.nodeX[nodeId] = source.nodesDecimeters[offset] / 10 / this.appUnitMeters;
        this.nodeY[nodeId] = source.nodesDecimeters[offset + 1] / 10 / this.appUnitMeters;
      }
      this.edgeFrom = new Uint32Array(edgeCount);
      this.edgeTo = new Uint32Array(edgeCount);
      this.edgeLengthMeters = new Float32Array(edgeCount);
      this.edgeDirection = new Int8Array(edgeCount);
      this.edgeDurationSeconds = new Uint16Array(edgeCount);
      this.edgeKind = new Uint8Array(edgeCount);
      for (let edgeId = 0; edgeId < edgeCount; edgeId += 1) {
        const offset = edgeId * source.edgeStride;
        this.edgeFrom[edgeId] = source.edges[offset];
        this.edgeTo[edgeId] = source.edges[offset + 1];
        this.edgeLengthMeters[edgeId] = source.edges[offset + 2] / 10;
        this.edgeDirection[edgeId] = source.edges[offset + 3];
        this.edgeDurationSeconds[edgeId] = source.edges[offset + 4];
        this.edgeKind[edgeId] = source.edges[offset + 5];
      }
      this.buildAdjacency();
      this.buildSpatialIndex();
      this.searchScores = new Float64Array(nodeCount);
      this.previousNode = new Int32Array(nodeCount);
      this.previousEdge = new Int32Array(nodeCount);
      this.scoreStamp = new Uint32Array(nodeCount);
      this.closedStamp = new Uint32Array(nodeCount);
      this.queryStamp = 0;
      this.pathCache = new Map();
      this.pathCacheMax = 1600;
      this.pathQueries = 0;
      this.cacheHits = 0;
      this.failedQueries = 0;
      this.totalExpandedNodes = 0;
    }

    buildAdjacency() {
      const degree = new Uint32Array(this.nodeX.length + 1);
      let arcCount = 0;
      for (let edgeId = 0; edgeId < this.edgeFrom.length; edgeId += 1) {
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
      for (let nodeId = 1; nodeId <= this.nodeX.length; nodeId += 1) {
        degree[nodeId] += degree[nodeId - 1];
      }
      const cursor = degree.slice(0, this.nodeX.length);
      this.adjacencyOffset = degree;
      this.adjacencyNode = new Uint32Array(arcCount);
      this.adjacencyEdge = new Uint32Array(arcCount);
      for (let edgeId = 0; edgeId < this.edgeFrom.length; edgeId += 1) {
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

    buildSpatialIndex() {
      this.gridCellUnits = 350 / this.appUnitMeters;
      this.spatialGrid = new Map();
      for (let nodeId = 0; nodeId < this.nodeX.length; nodeId += 1) {
        const key = this.gridKey(this.nodeX[nodeId], this.nodeY[nodeId]);
        const bucket = this.spatialGrid.get(key) || [];
        bucket.push(nodeId);
        this.spatialGrid.set(key, bucket);
      }
    }

    gridKey(x, y) {
      return `${Math.floor(x / this.gridCellUnits)}:${Math.floor(y / this.gridCellUnits)}`;
    }

    nodePoint(nodeId) {
      if (!Number.isInteger(nodeId) || nodeId < 0 || nodeId >= this.nodeX.length) return null;
      return { x: this.nodeX[nodeId], y: this.nodeY[nodeId], z: 0, nodeId };
    }

    snapPoint(point, primaryOnly = false, maxRadius = 18) {
      const baseX = Math.floor(point.x / this.gridCellUnits);
      const baseY = Math.floor(point.y / this.gridCellUnits);
      let bestNodeId = -1;
      let bestSquared = Infinity;
      for (let radius = 0; radius <= maxRadius; radius += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          for (let dy = -radius; dy <= radius; dy += 1) {
            if (radius && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
            const bucket = this.spatialGrid.get(`${baseX + dx}:${baseY + dy}`) || [];
            for (const nodeId of bucket) {
              if (primaryOnly && this.nodeComponent[nodeId] !== this.primaryComponent) continue;
              const deltaX = this.nodeX[nodeId] - point.x;
              const deltaY = this.nodeY[nodeId] - point.y;
              const squared = deltaX * deltaX + deltaY * deltaY;
              if (squared >= bestSquared) continue;
              bestSquared = squared;
              bestNodeId = nodeId;
            }
          }
        }
        if (bestNodeId >= 0 && radius > 1) break;
      }
      if (bestNodeId < 0) return null;
      return {
        nodeId: bestNodeId,
        component: this.nodeComponent[bestNodeId],
        snapMeters: Math.sqrt(bestSquared) * this.appUnitMeters,
        ...this.nodePoint(bestNodeId),
      };
    }

    nextStamp() {
      this.queryStamp += 1;
      if (this.queryStamp >= 0xffffffff) {
        this.scoreStamp.fill(0);
        this.closedStamp.fill(0);
        this.queryStamp = 1;
      }
      return this.queryStamp;
    }

    heuristic(fromNodeId, toNodeId, speedMpm) {
      return Math.hypot(
        this.nodeX[toNodeId] - this.nodeX[fromNodeId],
        this.nodeY[toNodeId] - this.nodeY[fromNodeId],
      ) * this.appUnitMeters / speedMpm;
    }

    edgeMinutes(edgeId, speedMpm) {
      return this.edgeLengthMeters[edgeId] / speedMpm + this.edgeDurationSeconds[edgeId] / 60;
    }

    cacheResult(key, result) {
      if (!this.pathCache.has(key) && this.pathCache.size >= this.pathCacheMax) {
        this.pathCache.delete(this.pathCache.keys().next().value);
      }
      this.pathCache.set(key, result);
      return result;
    }

    findPath(startNodeId, destinationNodeId, speedMpm) {
      this.pathQueries += 1;
      if (![startNodeId, destinationNodeId].every(Number.isInteger)) return null;
      if (this.nodeComponent[startNodeId] !== this.nodeComponent[destinationNodeId]) {
        this.failedQueries += 1;
        return null;
      }
      const key = `${startNodeId}:${destinationNodeId}:${Math.round(speedMpm)}`;
      if (this.pathCache.has(key)) {
        this.cacheHits += 1;
        return this.pathCache.get(key);
      }
      if (startNodeId === destinationNodeId) {
        return this.cacheResult(key, {
          nodeIds: [startNodeId],
          edgeIds: [],
          pathMeters: 0,
          travelMinutes: 0,
          transferCount: 0,
          expandedNodes: 0,
        });
      }
      const stamp = this.nextStamp();
      const queue = new MinPriorityQueue();
      this.searchScores[startNodeId] = 0;
      this.scoreStamp[startNodeId] = stamp;
      this.previousNode[startNodeId] = -1;
      this.previousEdge[startNodeId] = -1;
      queue.push(startNodeId, this.heuristic(startNodeId, destinationNodeId, speedMpm));
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
        for (let arc = this.adjacencyOffset[nodeId]; arc < this.adjacencyOffset[nodeId + 1]; arc += 1) {
          const nextNodeId = this.adjacencyNode[arc];
          if (this.closedStamp[nextNodeId] === stamp) continue;
          const edgeId = this.adjacencyEdge[arc];
          const tentative = this.searchScores[nodeId] + this.edgeMinutes(edgeId, speedMpm);
          if (this.scoreStamp[nextNodeId] === stamp && tentative >= this.searchScores[nextNodeId]) continue;
          this.scoreStamp[nextNodeId] = stamp;
          this.searchScores[nextNodeId] = tentative;
          this.previousNode[nextNodeId] = nodeId;
          this.previousEdge[nextNodeId] = edgeId;
          queue.push(nextNodeId, tentative + this.heuristic(nextNodeId, destinationNodeId, speedMpm));
        }
      }
      this.totalExpandedNodes += expandedNodes;
      if (!reached) {
        this.failedQueries += 1;
        return this.cacheResult(key, null);
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
      nodeIds.reverse();
      edgeIds.reverse();
      const result = {
        nodeIds,
        edgeIds,
        pathMeters: edgeIds.reduce((sum, edgeId) => sum + this.edgeLengthMeters[edgeId], 0),
        travelMinutes: this.searchScores[destinationNodeId],
        transferCount: edgeIds.filter((edgeId) => this.edgeKind[edgeId] === 1).length,
        expandedNodes,
      };
      return this.cacheResult(key, result);
    }

    diagnostics() {
      return {
        nodes: this.nodeX.length,
        edges: this.edgeFrom.length,
        arcs: this.adjacencyNode.length,
        components: this.componentSizes.length,
        primaryComponentShare: this.componentSizes[this.primaryComponent] / Math.max(1, this.nodeX.length),
        pathQueries: this.pathQueries,
        cacheHits: this.cacheHits,
        failedQueries: this.failedQueries,
        meanExpandedNodes: this.pathQueries - this.cacheHits
          ? this.totalExpandedNodes / Math.max(1, this.pathQueries - this.cacheHits)
          : 0,
      };
    }
  }

  class KowloonMultimodalGraph {
    constructor(payload) {
      if (!payload?.graphs || !payload?.stops) throw new Error("Invalid Kowloon multimodal payload");
      this.payload = payload;
      this.ready = false;
      this.graphs = {};
      this.stops = {};
      this.stopGrid = {};
      this.journeyQueries = 0;
      this.journeyFailures = 0;
    }

    load() {
      if (this.ready) return this;
      for (const family of ["road", "rail", "ferry"]) {
        this.graphs[family] = new ModeGraph(family, this.payload.graphs[family], this.payload.scope);
        this.stops[family] = this.payload.stops[family].map((row) => ({
          id: row[0],
          name: row[1],
          x: row[2] / 10 / this.payload.scope.appUnitMeters,
          y: row[3] / 10 / this.payload.scope.appUnitMeters,
          z: 0,
          nodeId: row[4],
          snapMeters: row[5] / 10,
          type: row[6],
          component: row[7],
        }));
        this.buildStopGrid(family);
      }
      this.ready = true;
      return this;
    }

    buildStopGrid(family) {
      const cellUnits = 900 / this.payload.scope.appUnitMeters;
      const grid = new Map();
      for (const stop of this.stops[family]) {
        const key = `${Math.floor(stop.x / cellUnits)}:${Math.floor(stop.y / cellUnits)}`;
        const bucket = grid.get(key) || [];
        bucket.push(stop);
        grid.set(key, bucket);
      }
      this.stopGrid[family] = { cellUnits, grid };
    }

    policy(modeKey) {
      return MODE_POLICIES[modeKey] || MODE_POLICIES.other;
    }

    nearestStops(family, point, limit = 5) {
      const index = this.stopGrid[family];
      if (!index) return [];
      const baseX = Math.floor(point.x / index.cellUnits);
      const baseY = Math.floor(point.y / index.cellUnits);
      const candidates = [];
      const seen = new Set();
      for (let radius = 0; radius <= 6 && candidates.length < limit * 4; radius += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          for (let dy = -radius; dy <= radius; dy += 1) {
            if (radius && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
            for (const stop of index.grid.get(`${baseX + dx}:${baseY + dy}`) || []) {
              if (seen.has(stop.id)) continue;
              seen.add(stop.id);
              candidates.push({
                ...stop,
                accessMeters: Math.hypot(stop.x - point.x, stop.y - point.y) * this.payload.scope.appUnitMeters,
              });
            }
          }
        }
      }
      return candidates.sort((left, right) => left.accessMeters - right.accessMeters).slice(0, limit);
    }

    endpointCandidates(policy, point) {
      const graph = this.graphs[policy.family];
      if (!policy.stopBased) {
        const snapped = graph.snapPoint(point, policy.family === "road");
        return snapped ? [{ ...snapped, id: "direct-road-access", name: "Direct road access", accessMeters: snapped.snapMeters }] : [];
      }
      return this.nearestStops(policy.family, point, policy.family === "ferry" ? 10 : 5);
    }

    findJourney(modeKey, startPoint, destinationPoint) {
      this.load();
      this.journeyQueries += 1;
      const policy = this.policy(modeKey);
      const graph = this.graphs[policy.family];
      const starts = this.endpointCandidates(policy, startPoint);
      const destinations = this.endpointCandidates(policy, destinationPoint);
      let bestPair = null;
      for (const start of starts) {
        for (const destination of destinations) {
          if (start.component !== destination.component) continue;
          const lowerBound =
            start.accessMeters / 75 +
            destination.accessMeters / 75 +
            graph.heuristic(start.nodeId, destination.nodeId, policy.speedMpm);
          if (!bestPair || lowerBound < bestPair.lowerBound) {
            bestPair = { start, destination, lowerBound };
          }
        }
      }
      if (!bestPair) {
        this.journeyFailures += 1;
        return null;
      }
      const path = graph.findPath(bestPair.start.nodeId, bestPair.destination.nodeId, policy.speedMpm);
      if (!path) {
        this.journeyFailures += 1;
        return null;
      }
      return {
        modeKey,
        family: policy.family,
        speedMpm: policy.speedMpm,
        waitMinutes: policy.waitMinutes,
        boarding: bestPair.start,
        alighting: bestPair.destination,
        path,
        points: path.nodeIds.map((nodeId) => graph.nodePoint(nodeId)),
      };
    }

    diagnostics() {
      return {
        ready: this.ready,
        journeyQueries: this.journeyQueries,
        journeyFailures: this.journeyFailures,
        graphs: Object.fromEntries(
          Object.entries(this.graphs).map(([key, graph]) => [key, graph.diagnostics()]),
        ),
      };
    }
  }

  globalScope.KowloonMultimodalRouting = Object.freeze({
    KowloonMultimodalGraph,
    MODE_POLICIES,
  });
})(typeof window !== "undefined" ? window : globalThis);
