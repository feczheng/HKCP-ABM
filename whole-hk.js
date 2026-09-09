const WHOLE_HK_SCOPE_ID = "whole-hong-kong";
const wholeHkState = { status: "idle", progress: 0, loading: null, report: null, error: null, cohorts: new Map(), attempts: [], attemptCount: 0, attemptTotals: new Map() };
let wholeHkContext = null;
const wholeHkLayerCache = new Map();
let wholeHkBoundaryIndex = null;
const wholeHkHomePoolCache = new Map();

function wholeHkPreciseBoundaries() {
  if (wholeHkBoundaryIndex) return wholeHkBoundaryIndex;
  const lookup = globalThis.V12_13_BOUNDARY_LOOKUP;
  const areas = new Map(wholeHkLayer("areas").map((area) => [area.id, area]));
  if (!lookup || lookup.crs !== "EPSG:2326" || lookup.simplificationMeters !== 0 ||
      lookup.areas?.length !== 452 || new Set(lookup.areas.map((area) => area.id)).size !== 452 ||
      lookup.areas.some((area) => !areas.has(area.id)) ||
      lookup.appOriginHk1980?.length !== 2 || !lookup.appOriginHk1980.every(Number.isFinite) ||
      !Number.isFinite(lookup.appUnitMeters) || !(lookup.appUnitMeters > 0)) {
    throw new Error("Missing or invalid full-resolution official DCCA boundary lookup");
  }
  for (const area of lookup.areas) {
    const b = area.bounds;
    if (!b || ![b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite) || b.minX > b.maxX || b.minY > b.maxY ||
        !Array.isArray(area.polygons) || !area.polygons.length) throw new Error(`Invalid official boundary: ${area.id}`);
    for (const polygon of area.polygons) {
      if (!Array.isArray(polygon) || !polygon.length) throw new Error(`Missing boundary rings: ${area.id}`);
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4 || ring.some((p) => !Array.isArray(p) || p.length < 2 || !p.every(Number.isFinite) ||
            p[0] < b.minX || p[0] > b.maxX || p[1] < b.minY || p[1] > b.maxY) ||
            ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) throw new Error(`Invalid boundary ring: ${area.id}`);
      }
    }
  }
  wholeHkBoundaryIndex = { ...lookup, areas: lookup.areas.map((area) => ({ ...area, modelArea: areas.get(area.id) })) };
  return wholeHkBoundaryIndex;
}

function wholeHkLocateDcca(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  const lookup = wholeHkPreciseBoundaries();
  const x = lookup.appOriginHk1980[0] + point.x * lookup.appUnitMeters;
  const y = lookup.appOriginHk1980[1] + point.y * lookup.appUnitMeters;
  for (const area of lookup.areas) {
    const b = area.bounds;
    if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) continue;
    for (const polygon of area.polygons) {
      // Even-odd handles holes without assuming source ring orientation.
      let inside = false;
      for (const ring of polygon) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
          const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
          if (Math.abs(cross) <= 1e-8 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj) && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) return area.modelArea;
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
      }
      if (inside) return area.modelArea;
    }
  }
  return null;
}

function wholeHkVerifiedHomeAnchors(dccaId, anchors) {
  const key = `${modelScopeId()}|${dccaId}`;
  if (!wholeHkHomePoolCache.has(key)) {
    wholeHkHomePoolCache.set(key, anchors.filter((building) => wholeHkLocateDcca(building)?.id === dccaId));
  }
  return wholeHkHomePoolCache.get(key);
}

function modelScopeId() {
  return wholeHkContext?.scope || world.scope;
}

function modelCohortPopulation() {
  return wholeHkContext?.population ?? world.population;
}

function isWholeHkScope() {
  return modelScopeId() === WHOLE_HK_SCOPE_ID;
}

function wholeHkRegions() {
  return [
    { id: "hong-kong-island", label: "Hong Kong Island", areas: hkIslandDccas, districts: hkIslandDistricts, schools: hkIslandSchoolLayer, pois: hkIslandPoiLayer, buildings: hkIslandBuildingLayer, cells: hkIslandBuildingDistribution, sceneCells: hkIslandSceneBuildingDistribution, anchors: hkIslandResidentialAnchors, anchorsByDcca: hkIslandResidentialAnchorsByDcca, campuses: hkIslandSchoolCampuses },
    { id: KOWLOON_SCOPE_ID, label: "Kowloon", areas: kowloonDccas, districts: kowloonDistricts, schools: kowloonSchoolLayer, pois: kowloonPoiLayer, buildings: kowloonBuildingLayer, cells: kowloonBuildingDistribution, sceneCells: kowloonSceneBuildingDistribution, anchors: kowloonResidentialAnchors, anchorsByDcca: kowloonResidentialAnchorsByDcca, campuses: kowloonSchoolCampuses },
    { id: NT_EAST_SCOPE_ID, label: "NT East", areas: ntEastDccas, districts: ntEastDistricts, schools: ntEastSchoolLayer, pois: ntEastPoiLayer, buildings: ntEastBuildingLayer, cells: ntEastBuildingDistribution, sceneCells: ntEastSceneBuildingDistribution, anchors: ntEastResidentialAnchors, anchorsByDcca: ntEastResidentialAnchorsByDcca, campuses: ntEastSchoolCampuses },
    { id: NT_WEST_SCOPE_ID, label: "NT West", areas: ntWestDccas, districts: ntWestDistricts, schools: ntWestSchoolLayer, pois: ntWestPoiLayer, buildings: ntWestBuildingLayer, cells: ntWestBuildingDistribution, sceneCells: ntWestSceneBuildingDistribution, anchors: ntWestResidentialAnchors, anchorsByDcca: ntWestResidentialAnchorsByDcca, campuses: ntWestSchoolCampuses },
    { id: ISLANDS_SCOPE_ID, label: "Islands", areas: islandsDccas, districts: islandsDistricts, schools: islandsSchoolLayer, pois: islandsPoiLayer, buildings: islandsBuildingLayer, cells: islandsBuildingDistribution, sceneCells: islandsSceneBuildingDistribution, anchors: islandsResidentialAnchors, anchorsByDcca: islandsResidentialAnchorsByDcca, campuses: islandsSchoolCampuses },
  ].map((region) => ({ ...region, ...regionalRouteRuntime(region.id) }));
}

function wholeHkLayer(name) {
  if (!wholeHkLayerCache.has(name)) {
    const values = wholeHkRegions().flatMap((region) => region[name] || []);
    wholeHkLayerCache.set(name, name === "districts" ? [...new Map(values.map((item) => [item.id, item])).values()] : values);
  }
  return wholeHkLayerCache.get(name);
}

// A synchronous regional behavior context. The shared world and clock never switch.
function withWholeHkRegion(scope, callback) {
  const cohort = wholeHkState.cohorts.get(scope);
  if (!cohort) throw new Error(`Missing whole-HK cohort: ${scope}`);
  const previous = wholeHkContext;
  const previousRandom = agentRandom;
  const previousIndexes = { schoolsByStage, poiByZoneId, poiByGroup };
  wholeHkContext = cohort;
  agentRandom = cohort.random;
  schoolsByStage = cohort.schoolsByStage;
  poiByZoneId = cohort.poiByZoneId;
  poiByGroup = cohort.poiByGroup;
  try {
    return callback();
  } finally {
    cohort.random = agentRandom;
    wholeHkContext = previous;
    agentRandom = previousRandom;
    ({ schoolsByStage, poiByZoneId, poiByGroup } = previousIndexes);
  }
}

function resetWholeHkSimulation() {
  if (!wholeHkRegions().every((region) => region.graph?.ready)) throw new Error("Whole-HK initialization requires all five graphs");
  wholeHkPreciseBoundaries();
  world.running = false;
  world.scope = WHOLE_HK_SCOPE_ID;
  world.population = Math.max(1400, Number(controls.population.value) || 2000);
  controls.population.value = String(world.population);
  world.seed = clamp(Math.trunc(Number(controls.seed?.value) || DEFAULT_AGENT_RANDOM_SEED), 1, 0xffffffff);
  world.scenario = controls.scenario.value;
  world.speed = Number(controls.speed.value);
  world.time = Number(controls.time.value);
  clearSpatialSelection();
  resetWorldSimulationState();
  wholeHkState.attempts = [];
  wholeHkState.attemptCount = 0;
  wholeHkState.attemptTotals.clear();
  wholeHkState.cohorts.clear();
  const regions = wholeHkRegions();
  const areaIds = regions.flatMap((region) => region.areas.map((area) => area.id));
  if (areaIds.length !== 452 || new Set(areaIds).size !== 452 || areaIds.some((id) => !wholeHkRoutingPackByDcca.has(id))) throw new Error("Official DCCA membership mismatch");
  const allocation = WholeHkPopulation.allocate({
    regions: regions.map((region) => ({ id: region.id, areas: region.areas.map((area) => ({ id: area.id, ages: modelAgeTargets(area.censusCalibration) })) })),
    population: world.population,
    seed: world.seed,
  });
  for (const [index, region] of regions.entries()) {
    const areaById = new Map(region.areas.map((area) => [area.id, area]));
    const profiles = allocation.profiles.filter((profile) => profile.scope === region.id)
      .map((profile) => ({ ...profile, homeZone: areaById.get(profile.homeZoneId) }));
    wholeHkState.cohorts.set(region.id, { scope: region.id, population: profiles.length, random: mulberry32((world.seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0), schoolsByStage: Object.fromEntries(Object.keys(schoolsByStage).map((key) => [key, []])), poiByZoneId: new Map(), poiByGroup: new Map() });
    withWholeHkRegion(region.id, () => {
      if (isKowloonScope()) { ensureKowloonDirectedCore(); kowloonMultimodalGraph?.load(); }
      if (isNtEastScope()) ensureNtEastDirectedCore();
      refreshPlaceZones();
      createSimulationCohort(profiles.length, profiles);
    });
  }
  wholeHkState.report = allocation.report;
  wholeHkLayerCache.clear();
  wholeHkState.status = "ready";
  wholeHkState.error = null;
  world.focusId = regions[0].areas[0].id;
  if (world.agents.length !== world.population || new Set(world.agents.map((agent) => agent.id)).size !== world.population) throw new Error("Whole-HK cohort count mismatch");
  finishSimulationReset();
}

function activateWholeHk() {
  if (wholeHkState.loading) return wholeHkState.loading;
  world.running = false;
  world.scope = WHOLE_HK_SCOPE_ID;
  controls.scope.value = WHOLE_HK_SCOPE_ID;
  wholeHkState.status = "loading";
  wholeHkState.error = null;
  wholeHkState.loading = (async () => {
    const guarded = [controls.scope, controls.toggle, controls.reset, controls.population, controls.seed];
    guarded.forEach((control) => { if (control) control.disabled = true; });
    try {
      const regions = wholeHkRegions();
      for (const [index, region] of regions.entries()) {
        if (!region.graph) throw new Error(`Missing graph: ${region.label}`);
        if (!region.graph.ready) await region.graph.load((progress) => {
          wholeHkState.progress = (index + Math.min(1, (progress.completed || 0) / Math.max(1, progress.total || 1))) / regions.length;
          if (metricEls.regionalRouting) metricEls.regionalRouting.textContent = `${region.label} ${Math.round(wholeHkState.progress * 100)}%`;
        });
        wholeHkState.progress = (index + 1) / regions.length;
      }
      world.islandRoutingStatus = world.kowloonRoutingStatus = world.ntEastRoutingStatus = world.ntWestRoutingStatus = world.islandsRoutingStatus = "ready";
      world.islandRoutingProgress = world.kowloonRoutingProgress = world.ntEastRoutingProgress = world.ntWestRoutingProgress = world.islandsRoutingProgress = 1;
      buildKowloonDisplayEdgeSample();
      buildNtEastDisplayEdgeSample();
      buildNtWestDisplayEdgeSample();
      buildIslandsDisplayEdgeSample();
      wholeHkState.status = "ready";
      updateLayerControls();
      resetWholeHkSimulation();
      populateSelects();
      populateBuildingSelect();
      fitCameraToArea(); fitMapView(); fitOsmMap();
      markOsmStaticDirty();
      updatePanels();
      return true;
    } catch (error) {
      wholeHkState.status = "error";
      wholeHkState.error = error.message;
      wholeHkState.report = null;
      world.running = false;
      world.agents = [];
      world.metrics = null;
      if (metricEls.regionalRouting) metricEls.regionalRouting.textContent = `Whole-HK unavailable: ${error.message}`;
      console.error("Whole-HK initialization stopped", error);
      return false;
    } finally {
      guarded.forEach((control) => { if (control) control.disabled = false; });
      controls.toggle.disabled = wholeHkState.status !== "ready";
    }
  })().finally(() => { wholeHkState.loading = null; });
  return wholeHkState.loading;
}

function wholeHkAttemptLedger() {
  return wholeHkState.attempts;
}

function wholeHkWalkHeld(agent) {
  return world.scope === WHOLE_HK_SCOPE_ID && agent.routeAttempt?.status === "blocked";
}

function wholeHkAssignRoute(agent, target, purpose) {
  const walking = !(agent.travelMode && agent.travelMode !== "walk" && ["school", "postschool", "home"].includes(purpose));
  agent.routeAttempt = null;
  if (!walking) {
    const result = assignAgentRouteCore(agent, target, purpose);
    agent.routeAttempt = { status: result ? "temporal-or-multimodal" : "blocked", reason: result ? null : "mechanised-route-unavailable" };
    return result;
  }
  const graph = regionalRouteRuntime(agent.scope)?.graph;
  const originArea = wholeHkLocateDcca(agent.pos);
  const destinationArea = wholeHkLocateDcca(target);
  const from = agent.currentNetworkNodeId;
  const to = target?.networkNodeId;
  const validNode = (node) => graph?.ready && Number.isInteger(node) && node >= 0 && node < graph.nodeX.length && Number.isInteger(graph.nodeComponent?.[node]) && graph.nodeComponent[node] >= 0 && graph.nodeComponent[node] < graph.manifest.graph.componentCount;
  let reason = !graph?.ready ? "graph-not-ready"
    : target?.routingScope && target.routingScope !== agent.scope ? "routing-pack-mismatch"
    : !validNode(from) || !validNode(to) ? "invalid-node-or-component"
    : !originArea || !destinationArea ? "unmapped-actual-dcca"
    : !agent.homeBuilding && (from === agent.homeNodeId || to === agent.homeNodeId) ? "home-without-source-building"
    : null;
  if (!reason) {
    const decision = dispatchWholeHkWalkingOd(originArea.id, destinationArea.id, graph.nodeComponent[from], graph.nodeComponent[to]);
    if (!decision.walkable) reason = decision.status;
    else if (decision.originPack !== regionalRouteRuntime(agent.scope).dispatcherKey) reason = "routing-pack-mismatch";
  }
  if (!reason && from === to && physicalDistanceMeters(agent.pos, target) < 3) {
    agent.route = null; agent.routeIndex = 0; agent.routePurpose = null;
    agent.routeAttempt = { status: "arrived", reason: "same-node-no-travel" };
    agent.lastRoute = { mode: "stationary", transportMode: "none", spatialStatus: "same-node-no-travel", routeMeters: 0, estimatedMinutes: 0, comparisonStatus: "excluded-no-travel" };
    return true;
  }
  if (!reason && physicalDistanceMeters(agent.pos, target) < 3) reason = "nearby-distinct-network-nodes";
  const attempt = { id: ++wholeHkState.attemptCount, agentId: agent.id, scope: agent.scope, time: world.time, elapsedMinutes: world.elapsedMinutes, purpose, originDccaId: originArea?.id || null, destinationDccaId: destinationArea?.id || null, startNodeId: from ?? null, destinationNodeId: to ?? null, status: "blocked", reason };
  wholeHkState.attempts.push(attempt);
  if (wholeHkState.attempts.length > 20000) wholeHkState.attempts.splice(0, 1000);
  let result = false;
  if (!reason) {
    agent.lastRoute = null;
    result = assignAgentRouteCore(agent, target, purpose);
    if (!result && from === to && agent.lastRoute?.mode?.endsWith("local-connector")) {
      agent.route = [{ ...target }];
      agent.routeIndex = 0;
      agent.routePurpose = purpose;
      result = true;
    }
    if (result) attempt.status = agent.lastRoute?.mode?.endsWith("local-connector") ? "local-connector" : "exact";
    else attempt.reason = agent.lastRoute?.spatialStatus || "directed-path-unavailable";
  } else {
    agent.route = null; agent.routeIndex = 0; agent.routePurpose = null;
    agent.lastRoute = { mode: "unavailable", transportMode: "walk", spatialStatus: reason, comparisonStatus: "excluded-whole-hk-blocked", startNodeId: from, destinationNodeId: to };
    world.routeFallbacks += 1;
    startAgentTrip(agent, purpose);
  }
  agent.routeAttempt = attempt;
  const key = `${agent.scope}|${purpose}|${attempt.status}`;
  const total = wholeHkState.attemptTotals.get(key) || { scope: agent.scope, purpose, status: attempt.status, count: 0 };
  total.count += 1;
  wholeHkState.attemptTotals.set(key, total);
  if (!result) {
    const history = agent.tripHistory?.find((trip) => trip.id === agent.activeTrip?.historyId);
    if (history) { history.status = "blocked"; history.blockReason = attempt.reason; history.endedAt = world.time; }
    agent.activeTrip = null;
    agent.route = null;
    agent.routePurpose = null;
  }
  return result;
}

function wholeHkAttemptSummary(purpose = "all", scope = null) {
  const result = { total: 0, exact: 0, localConnector: 0, blocked: 0 };
  for (const row of wholeHkState.attemptTotals.values()) {
    if ((purpose !== "all" && row.purpose !== purpose) || (scope && row.scope !== scope)) continue;
    result.total += row.count;
    if (row.status === "local-connector") result.localConnector += row.count;
    else if (row.status in result) result[row.status] += row.count;
  }
  return result;
}

function renderWholeHkBlockedAttempts() {
  const blocked = wholeHkState.attempts.filter((attempt) => attempt.status === "blocked" && (routeQaState.purpose === "all" || attempt.purpose === routeQaState.purpose)).slice(-8).reverse();
  if (!blocked.length) return;
  routeQaEls.outlierSubtitle.textContent = "Blocked attempts first, then realised-route diagnostics";
  for (const attempt of blocked) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "route-qa-outlier-item";
    button.textContent = `BLOCKED · Agent ${attempt.agentId} · ${attempt.purpose} · ${attempt.reason}`;
    button.addEventListener("click", () => { setSelectedAgent(attempt.agentId); setAgentObserverMode("audit"); setView("agents"); });
    routeQaEls.outlierList.prepend(button);
  }
}

function wholeHkDiagnostics() {
  const regions = wholeHkRegions().map((region) => {
    const agents = world.agents.filter((agent) => agent.scope === region.id);
    return { id: region.id, label: region.label, dccas: region.areas.length, agents: agents.length,
      representedChildren: agents.reduce((sum, agent) => sum + agent.censusWeight, 0),
      withoutSourceHome: agents.filter((agent) => !agent.homeBuilding).length,
      withoutSchool: agents.filter((agent) => !agent.schoolPoint).length,
      forcedTransfer: agents.filter((agent) => agent.networkModeOverride).length,
      attempts: wholeHkAttemptSummary("all", region.id).total,
      blocked: wholeHkAttemptSummary("all", region.id).blocked,
      ready: Boolean(region.graph?.ready) };
  });
  const attempts = wholeHkAttemptSummary();
  return { regions, report: wholeHkState.report, attempts: attempts.total, blocked: attempts.blocked };
}
