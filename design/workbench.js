"use strict";

(() => {
  const $ = (selector) => document.querySelector(selector);
  const el = (tag, className, html = "") => {
    const node = document.createElement(tag);
    node.className = className;
    node.innerHTML = html;
    return node;
  };
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const iconButton = (id, name, label) => `<button id="${id}" class="wb-icon" type="button" title="${label}" aria-label="${label}">${icon(name)}</button>`;
  const app = $(".app");
  const viewport = $(".simulation-area");
  const settingsPanel = $(".control-panel");
  const metrics = $(".metrics-panel");
  const displayAreas = () => isPilotScope() ? [pilotArea] : simulationZones();
  const searchableAreas = () => isPilotScope() ? [pilotArea] : visibleDccas();
  document.body.classList.add("workbench");
  const views = {
    osm:["Map explorer","map","Observe","Real Hong Kong / synthetic Agents"],
    scene:["3D environment","box","Observe","LandsD buildings / 3D pedestrian network"],
    agents:["Agent journeys","route","Observe","Synthetic walking school journeys"],
    buildings:["Building atlas","building-2","Observe","Public CSDI building geometry"],
    map:["Boundary map","scan","Observe","Official District / DCCA 2019 boundaries"],
    stats:["Live activity","chart-no-axes-combined","Analyse","Current synthetic run / not research findings"],
  };
  const nav = el("nav", "wb-nav");
  nav.setAttribute("aria-label", "Workspace views");
  nav.innerHTML = `<div class="wb-wordmark"><span class="wb-monogram">HK</span><div><strong>CHILD MOBILITY</strong><span>PUBLIC DATA EDITION</span></div></div><div class="wb-nav-scroll"></div><div class="wb-nav-foot"><span class="wb-status-dot"></span><span>Public model<strong>${APP_RELEASE.version} · Workbench</strong></span></div>`;
  for (const group of ["Observe", "Analyse", "Evidence"]) {
    const section = el("div", "wb-nav-group", `<h2>${group}</h2>`);
    for (const [id, [title, symbol, category]] of Object.entries(views)) {
      if (category !== group) continue;
      const button = $(`.tab-button[data-view="${id}"]`);
      button.innerHTML = `${icon(symbol)}<span>${title}</span>`;
      button.title = title;
      button.setAttribute("aria-label", title);
      section.append(button);
    }
    nav.querySelector(".wb-nav-scroll").append(section);
  }
  app.prepend(nav);
  const header = el("header", "wb-header", `${iconButton("wbMenu", "panel-left", "Toggle navigation")}<div class="wb-scope"><span class="wb-kicker">STUDY REGION</span></div><div class="wb-header-spacer"></div><span class="wb-local">${icon("hard-drive")} Public data</span><a class="wb-classic" href="data-sources.html" target="_blank" rel="noopener">Data & scope ${icon("arrow-up-right")}</a>${iconButton("wbSettings", "settings-2", "Simulation settings")}`);
  header.querySelector(".wb-scope").append($("#scopeSelect"));
  app.prepend(header);
  const toolbar = el("div", "wb-toolbar", `<div class="wb-view-heading"><span id="wbCategory" class="wb-kicker"></span><h1 id="wbTitle"></h1></div><span id="wbViewContext"></span><div class="wb-tools">${iconButton("wbSearch", "search", "Find Agent or DCCA")}${iconButton("wbLayers", "layers", "Map layers and legend")}${iconButton("wbInspector", "panel-right", "Toggle live inspector")}</div>`);
  app.append(toolbar);
  const cameraTools = $(".view-tools");
  toolbar.querySelector(".wb-tools").prepend(cameraTools);
  for (const [id, name, label] of [["zoomOutButton", "minus", "Zoom out"], ["zoomFitButton", "scan", "Fit region"], ["zoomInButton", "plus", "Zoom in"]]) {
    $("#" + id).innerHTML = icon(name);
    $("#" + id).title = label;
    $("#" + id).setAttribute("aria-label", label);
  }
  const oldViewBar = $(".view-bar");
  oldViewBar.remove();

  const footer = el("footer", "wb-transport", `<div class="wb-playback"></div><div class="wb-clock"><strong id="wbTime">07:00</strong><span id="wbPhase">Morning</span></div><div class="wb-timeline"><div class="wb-timeline-label"><span>SIMULATION DAY</span><span id="wbRunState">Running</span></div><div class="wb-hour-ticks"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></div><div class="wb-speed"><label for="speedRange">Speed <span id="wbSpeedValue">36x</span></label></div>`);
  footer.querySelector(".wb-playback").append($("#toggleButton"), $("#resetButton"));
  footer.querySelector(".wb-timeline").insertBefore($("#timeRange"), footer.querySelector(".wb-hour-ticks"));
  footer.querySelector(".wb-timeline-label span").textContent = "RESTART TIME";
  footer.querySelector("#timeRange").title = "Restart at selected time (resets the cohort and pauses)";
  footer.querySelector("#timeRange").setAttribute("aria-label", "Restart simulation at selected time");
  footer.querySelector(".wb-speed").append($("#speedRange"));
  app.append(footer);
  const buildingReadout = $(".building-readout");
  const buildingDetails = el("details", "wb-building-details", `<summary>Building details ${icon("chevron-down")}</summary>`);
  buildingDetails.append($(".building-select-block"), $(".building-metrics"));
  buildingReadout.append(buildingDetails);
  const buildingKey = el("button", "wb-building-key", `${icon("layers")}<span>Map key</span>`);
  buildingKey.type = "button";
  buildingKey.id = "wbBuildingKey";
  buildingKey.title = "Toggle building legend";
  buildingKey.setAttribute("aria-expanded", "false");
  $("#buildingsView").append(buildingKey);
  buildingKey.onclick = () => {
    const open = $("#buildingsView").dataset.legendOpen !== "true";
    $("#buildingsView").dataset.legendOpen = String(open);
    buildingKey.setAttribute("aria-expanded", String(open));
    if (open) buildingDetails.open = false;
  };
  buildingDetails.addEventListener("toggle", () => {
    if (buildingDetails.open) {
      $("#buildingsView").dataset.legendOpen = "false";
      buildingKey.setAttribute("aria-expanded", "false");
    }
  });
  const compactBuildings = matchMedia("(max-width: 620px)");
  buildingDetails.open = !compactBuildings.matches;
  compactBuildings.addEventListener("change", () => { buildingDetails.open = !compactBuildings.matches; });
  // The engine retains references to these outputs even when they are not displayed.
  const retained = el("div", "wb-retained");
  for (const id of ["clockDisplay", "dayPhase", "timeOutput", "speedOutput"]) {
    const node = document.getElementById(id) || oldViewBar.querySelector("#" + id);
    if (node) retained.append(node);
  }
  retained.hidden = true;
  document.body.append(retained);

  const inspector = el("aside", "wb-inspector", `<div class="wb-inspector-head"><span class="wb-kicker">LIVE MODEL</span><span class="wb-live-tag"><i></i><span id="wbLiveLabel">Running</span></span></div><div class="wb-summary"><div><strong id="wbAgentCount">2,000</strong><span>child Agents</span></div><div><strong id="wbDccaCount">120</strong><span>DCCAs in scope</span></div></div><div class="wb-focus"><label for="focusSelect">Focused area</label></div><div class="wb-selection-slot"></div><div class="wb-metrics-slot"></div>`);
  inspector.querySelector(".wb-focus").append($("#focusSelect"));
  inspector.querySelector(".wb-selection-slot").append($("#spatialSelectionInspector"));
  app.append(inspector);
  const wholeAudit = el("section", "wb-whole-audit");
  wholeAudit.setAttribute("aria-label", "Whole Hong Kong cohort audit");
  const auditDetails = el("details", "wb-audit-detail", "<summary>Population & network audit</summary>");
  auditDetails.append(wholeAudit);
  inspector.querySelector(".wb-metrics-slot").prepend(auditDetails);
  metrics.remove();
  for (const section of [...metrics.querySelectorAll(":scope > .metric-section")]) {
    const heading = section.querySelector("h2");
    if (heading?.textContent.trim() === "Activity Mix") {
      section.classList.add("wb-activity");
      inspector.querySelector(".wb-metrics-slot").append(section);
      continue;
    }
    const details = el("details", "wb-metric-detail");
    const summary = el("summary", "", `${heading?.textContent || "Model details"}${icon("chevron-down")}`);
    if (section.id === "mvpaSection") details.open = true;
    if (heading) heading.hidden = true;
    details.append(summary, section);
    inspector.querySelector(".wb-metrics-slot").append(details);
  }

  const settings = el("dialog", "wb-dialog wb-settings", `<header><div><span class="wb-kicker">EXPERIMENT</span><h2>Simulation settings</h2></div>${iconButton("wbSettingsClose", "x", "Close settings")}</header>`);
  settings.id = "wbSettingsDialog";
  settings.append(settingsPanel);
  document.body.append(settings);
  settingsPanel.querySelectorAll(".brand-block,.panel-collapse-button").forEach((node) => node.hidden = true);
  const layers = el("section", "wb-layer-popover", `<header><strong>Layers & legend</strong>${iconButton("wbLayersClose", "x", "Close layers")}</header><div class="wb-layer-status">Active view: <strong id="wbLegendView">Map explorer</strong></div>`);
  layers.id = "wbLayerPanel";
  layers.hidden = true;
  viewport.append(layers);
  layers.append($(".layer-controls"));
  const layerKey = el("div", "wb-layer-key");
  const layerEntries = [
    ["buildingsLayerToggle", "density", "Building cells; size reflects built form"],
    ["poiLayerToggle", "poi", "Not included in public edition"],
    ["schoolsLayerToggle", "school", "EDB school locations; colour indicates stage"],
    ["transportLayerToggle", "transport", "Transport access nodes"],
    ["agentsLayerToggle", "agent", "Agent clusters; number indicates count"],
    ["flowsLayerToggle", "flow", "Aggregated OD flows, not traversed routes"],
    ["routesLayerToggle", "network", "Official 3D pedestrian network display sample"],
  ];
  for (const [id, kind, description] of layerEntries) {
    const label = $("#" + id).closest("label");
    const swatch = el("span", `wb-swatch wb-swatch-${kind}`);
    label.insertBefore(swatch, label.childNodes[1]);
    label.title = description;
    const small = el("small", "", description);
    label.append(small);
  }
  layerKey.innerHTML = `<div class="wb-legend-heading">Activity state</div><div class="wb-state-key">${STATE_ORDER.map((state) => `<span><i style="background:${STATE_META[state].color}"></i>${STATE_META[state].label}</span>`).join("")}</div><div class="wb-legend-heading">School stages / POI categories</div><div class="wb-symbol-key"></div><p id="wbBoundaryKey">Outlined polygons are official DCCA boundaries. Selection is outlined in charcoal.</p>`;
  for (const [type, key, label] of [["school", "primary", "Primary"], ["school", "secondary", "Secondary"], ["school", "kindergarten", "Kindergarten"], ["school", "special", "Special"], ["poi", "play", "Play / parks"], ["poi", "sport", "Sport"], ["poi", "study", "Study / library"], ["poi", "community", "Community"], ["poi", "health", "Health"]]) {
    const item = el("span", "wb-symbol-item");
    const canvas = document.createElement("canvas");
    canvas.width = 40; canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (type === "school") drawSchoolMarker(ctx, 20, 20, key, 10, 1);
    else drawPoiSymbol(ctx, 20, 20, key, 10, 1);
    item.append(canvas, document.createTextNode(label));
    layerKey.querySelector(".wb-symbol-key").append(item);
  }
  layers.append(layerKey);
  layerKey.append(el("div", "wb-selection-key", "Charcoal outline / trace: selected DCCA or Agent journey.<br>Amber marker: route replay position, not an additional Agent.<br>Selected traces may include access connectors; detailed classification is in Agent journeys / Route audit."));
  viewport.append(layers);
  const attribution = el("div", "wb-attribution", `<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a><span> · HKSAR Government / LandsD / CSDI / EDB / DATA.GOV.HK</span>`);
  viewport.append(attribution);
  const mapStrip = el("div", "wb-map-strip", `<span class="wb-strip-label">AGENT STATES</span>${STATE_ORDER.map((state) => `<span><i style="background:${STATE_META[state].color}"></i>${STATE_META[state].label}</span>`).join("")}`);
  viewport.append(mapStrip);
  const sceneControls = el("div", "wb-scene-controls", `<span>VERTICAL SCALE</span><select id="wbVerticalScale" aria-label="3D vertical display scale"><option value="1">1x · true proportions</option><option value="3" selected>3x · visual emphasis</option><option value="10">10x · visual emphasis</option></select><small id="wbSceneStatus">Loading 3D environment</small>`);
  viewport.append(sceneControls);
  document.body.append(settings);
  settingsPanel.querySelectorAll(".control-group").forEach((section) => {
    if (!section.querySelector("input,select")) section.hidden = true;
  });
  $("#scopeSummary").hidden = true;

  const search = el("dialog", "wb-dialog wb-search", `<header><div><span class="wb-kicker">SPATIAL SEARCH</span><h2>Find an Agent or DCCA</h2></div>${iconButton("wbSearchClose", "x", "Close search")}</header><label class="wb-search-input">${icon("search")}<input id="wbSearchInput" type="search" placeholder="Agent 128, DCCA code or area name" autocomplete="off" aria-label="Agent ID or DCCA name" /></label><div id="wbSearchResults" class="wb-search-results"></div>`);
  search.id = "wbSearchDialog";
  document.body.append(search);
  const agentToolbar = $(".agent-observer-toolbar");
  agentToolbar.insertAdjacentHTML("beforeend", iconButton("wbAgentFilters", "list-filter", "Toggle cohort filters"));
  $("#wbAgentFilters").onclick = () => {
    agentToolbar.classList.toggle("wb-filters-open");
    $("#wbAgentFilters").setAttribute("aria-expanded", String(agentToolbar.classList.contains("wb-filters-open")));
  };
  const agentLegend = el("details", "wb-agent-legend", `<summary>Agent states & route evidence ${icon("chevron-down")}</summary>`);
  agentLegend.append($(".agent-observer-legend"));
  $("#agentsView").append(agentLegend);
  $("#agentsView").prepend(agentToolbar);
  const refreshSearch = () => {
    const query = $("#wbSearchInput").value.trim().toLowerCase();
    const results = $("#wbSearchResults");
    results.replaceChildren();
    const agentId = Number(query.replace(/^agent\s*#?\s*/i, ""));
    const agent = query && world.agents.find((candidate) => candidate.id === agentId);
    const matches = [...(agent ? [["agent", agent]] : []), ...searchableAreas().filter((zone) => !query || `${zone.code} ${zone.name} ${zone.id}`.toLowerCase().includes(query)).slice(0, 24).map((zone) => ["dcca", zone])];
    if (!matches.length) results.textContent = "No matching Agent or area in the current scope.";
    for (const [type, entity] of matches) {
      const button = el("button", "wb-search-result");
      button.type = "button";
      const label = type === "agent" ? `Agent ${entity.id}` : `${entity.code || ""} ${entity.name}`;
      const caption = type === "agent" ? `Age ${entity.age} · ${STATE_META[entity.state].label}` : "Area in current model scope";
      const name = el("strong", ""); name.textContent = label;
      const description = el("small", ""); description.textContent = caption;
      button.innerHTML = icon(type === "agent" ? "person-standing" : "scan");
      const text = el("span", ""); text.append(name, description); button.append(text);
      button.addEventListener("click", () => {
        if (!["scene", "map", "osm"].includes(activeView)) setView("osm");
        setSpatialSelection(type, entity, activeView);
        if (activeView === "scene" && window.WorkbenchScene) window.WorkbenchScene.focus(entity);
        else if (type === "agent" && activeView === "osm") focusOsmEntity(entity.pos, "agent");
        else if (type === "agent" && activeView === "map") focusMapArea({bounds:{minX:entity.pos.x-.5,maxX:entity.pos.x+.5,minY:entity.pos.y-.5,maxY:entity.pos.y+.5}});
        else focusSpatialEntityInView(activeView, type, entity);
        app.classList.remove("wb-inspector-hidden");
        app.classList.add("wb-inspector-open");
        search.close();
      });
      results.append(button);
    }
    lucide.createIcons();
  };
  $("#wbSearchInput").addEventListener("input", refreshSearch);
  $("#wbSearch").onclick = () => { refreshSearch(); search.showModal(); $("#wbSearchInput").focus(); };
  $("#wbSearchClose").onclick = () => search.close();
  $("#wbSettings").onclick = () => settings.showModal();
  $("#wbSettingsClose").onclick = () => settings.close();
  $("#wbMenu").onclick = () => app.classList.toggle("wb-nav-open");
  $("#wbLayers").onclick = () => { layers.hidden = !layers.hidden; $("#wbLayers").setAttribute("aria-expanded", String(!layers.hidden)); };
  $("#wbLayersClose").onclick = () => { layers.hidden = true; $("#wbLayers").setAttribute("aria-expanded", "false"); };
  $("#wbInspector").onclick = () => {
    if (window.innerWidth < 1180 || app.dataset.workspace === "analysis") app.classList.toggle("wb-inspector-open");
    else app.classList.toggle("wb-inspector-hidden");
    resizeAllCanvases();
  };
  for (const dialog of [settings, search]) dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });

  // Only presentation functions are wrapped. ABM rules, routing and random streams stay unchanged.
  const baselineSetView = setView;
  const baselineSpatialFocus = focusSpatialEntityInView;
  focusSpatialEntityInView = function(view, type, entity) {
    if (view === "scene" && type !== "agent" && entity && window.WorkbenchScene?.ready) {
      const area = type === "dcca" ? entity : selectionAreaForEntity(entity);
      if (area) focusSelectedArea(area);
      window.WorkbenchScene.focus(area || entity);
      return;
    }
    baselineSpatialFocus(view, type, entity);
  };
  const baselineSpatialSelect = setSpatialSelection;
  setSpatialSelection = function(type, entity, view) {
    baselineSpatialSelect(type, entity, view);
    if (entity) {
      app.classList.add("wb-inspector-open");
      app.classList.remove("wb-inspector-hidden");
    }
  };
  const baselineFitOsm = fitOsmMap;
  let pendingOsmFit = false;
  fitOsmMap = function() {
    if (!osmCanvas.clientWidth || !osmCanvas.clientHeight) { pendingOsmFit = true; return; }
    pendingOsmFit = false;
    baselineFitOsm();
    if (isPilotScope()) return;
    const coordinates = displayAreas().flatMap((area) => (area.polygon || []).flat().map(([x, y]) => localToLonLat({x, y})));
    if (!coordinates.length) return;
    const xs = coordinates.map((point) => lonLatToWorldPixel(point.lon, point.lat, 0).x);
    const ys = coordinates.map((point) => lonLatToWorldPixel(point.lon, point.lat, 0).y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const center = worldPixelToLonLat((minX + maxX) / 2, (minY + maxY) / 2, 0);
    osmMap.centerLon = center.lon; osmMap.centerLat = center.lat;
    osmMap.zoom = clamp(Math.floor(Math.log2(Math.min(osmCanvas.clientWidth / ((maxX - minX) * 1.1), osmCanvas.clientHeight / ((maxY - minY) * 1.1)))), 9, 16);
    markOsmStaticDirty();
  };
  const syncView = () => {
    const entry = views[activeView];
    $("#wbCategory").textContent = entry[2];
    $("#wbTitle").textContent = entry[0];
    $("#wbViewContext").textContent = entry[3];
    $("#wbLegendView").textContent = entry[0];
    app.dataset.workspace = ["scene", "map", "osm"].includes(activeView) ? "spatial" : "analysis";
    $("#wbLayers").hidden = !["scene", "map", "osm"].includes(activeView);
    $("#wbInspector").hidden = false;
    app.classList.remove("wb-inspector-open");
    for (const id of ["flowsLayerToggle", "transportLayerToggle"]) $("#" + id).closest("label").hidden = activeView === "scene";
    layers.hidden = true;
    app.classList.remove("wb-nav-open");
    window.WorkbenchScene?.setVisible(activeView === "scene");
    resizeAllCanvases();
  };
  setView = function(view) {
    baselineSetView(view); syncView();
    if (view === "osm" && pendingOsmFit) fitOsmMap();
  };
  drawOsmLegend = () => {};
  drawMapLegend = () => {};
  createAgentObserverProjection = function(bounds) {
    const ratio = devicePixelRatio || 1;
    const padding = 24 * ratio;
    const width = Math.max(1, agentCanvas.width - padding * 2);
    const height = Math.max(1, agentCanvas.height - padding * 2);
    const rangeX = Math.max(0.01, bounds.maxX - bounds.minX);
    const rangeY = Math.max(0.01, bounds.maxY - bounds.minY);
    const scale = Math.min(width / rangeX, height / rangeY);
    const x = padding + (width - rangeX * scale) / 2;
    const y = padding + (height - rangeY * scale) / 2;
    return (point) => ({x: x + (point.x - bounds.minX) * scale, y: y + (bounds.maxY - point.y) * scale});
  };
  const baselineScene = drawScene;
  drawScene = function() {
    if (!window.WorkbenchScene?.ready) baselineScene();
  };
  for (const [id, action] of [["zoomFitButton", "fit"], ["zoomInButton", "zoomIn"], ["zoomOutButton", "zoomOut"]]) {
    $("#" + id).addEventListener("click", (event) => {
      if (activeView !== "scene" || !window.WorkbenchScene?.ready) return;
      event.stopImmediatePropagation();
      window.WorkbenchScene[action]();
    }, true);
  }
  $("#wbVerticalScale").onchange = (event) => window.WorkbenchScene?.setVerticalScale(Number(event.target.value));
  let previousRunState;
  function syncLive() {
    auditDetails.hidden = !isWholeHkScope();
    wholeAudit.hidden = !isWholeHkScope();
    if (isWholeHkScope()) {
      const audit = wholeHkDiagnostics();
      const represented = audit.regions.reduce((sum, region) => sum + region.representedChildren, 0);
      const homes = audit.regions.reduce((sum, region) => sum + region.withoutSourceHome, 0);
      const schools = audit.regions.reduce((sum, region) => sum + region.withoutSchool, 0);
      const ageErrorPp = audit.report ? 100 * audit.report.singleAgeUncertainty.maxAbsoluteError / audit.report.targetTotal : null;
      wholeAudit.innerHTML = `<h2>Whole-HK cohort audit</h2><p class="wb-audit-status">${wholeHkState.status === "ready" ? "Shared clock · 5 routing packs" : `${wholeHkState.status} · ${Math.round(wholeHkState.progress * 100)}%`}</p><table><thead><tr><th>Region</th><th>DCCA</th><th>Agents</th></tr></thead><tbody>${audit.regions.map((region) => `<tr><th>${region.label}</th><td>${region.dccas}</td><td>${region.agents}</td></tr>`).join("")}</tbody></table><dl><div><dt>Represented children</dt><dd>${represented.toLocaleString(undefined, {maximumFractionDigits: 0})}</dd></div><div><dt>Within-pack walk attempts / blocked</dt><dd>${audit.attempts} / ${audit.blocked}</dd></div><div><dt>Homes without source building</dt><dd>${homes}</dd></div><div><dt>Unassigned schools</dt><dd>${schools}</dd></div></dl><p>Weights: DCCA × ages 6–8 / 9–11 / 12–16. Single ages are sampled. Contact and crowding use raw Agents.</p><p>Standard walking stays within packs. The optional mainland Agent pilot has a separate attempt log. No cross-water transfer or access-hour enforcement; timed-access routes are rejected by the pilot.</p>`;
      if (wholeHkState.error) {
        const error = el("p", "wb-audit-error"); error.textContent = wholeHkState.error; wholeAudit.append(error);
      }
      const sampling = el("p", "");
      sampling.textContent = `Single-age max error: ${ageErrorPp === null ? "pending" : `${ageErrorPp.toFixed(2)} pp`}. Walking attempts are raw counts since reset. Sparse-cohort contact and crowding are scale-dependent.`;
      wholeAudit.append(sampling);
      metricEls.regionalNetwork.textContent = "5 independent graphs · overlaps retained";
      metricEls.regionalImpedance.textContent = "Connectivity checked within each pack";
      metricEls.regionalBuildings.textContent = "Regional source records; see Building atlas";
      metricEls.regionalPlaces.textContent = `${activeResidentialAnchors().length.toLocaleString()} / ${activeSchoolLocations().length.toLocaleString()} / ${activePoiLocations().length.toLocaleString()}`;
      metricEls.regionalRouting.textContent = wholeHkState.status === "ready" ? `${audit.attempts} walk attempts · ${audit.blocked} blocked` : `${wholeHkState.status} ${Math.round(wholeHkState.progress * 100)}%`;
      metricEls.tcsSpatial.textContent = "Walk: within-pack 3DPN. Kowloon: multimodal proxy; other mechanised trips: temporal.";
    }
    $("#wbTime").textContent = formatTime(world.time);
    $("#wbPhase").textContent = `Day ${(world.dayIndex || 0) + 1}`;
    $("#wbRunState").textContent = world.running ? "Running" : "Paused";
    $("#wbLiveLabel").textContent = world.running ? "Running" : "Paused";
    $("#wbSpeedValue").textContent = `${world.speed}x`;
    $("#wbAgentCount").textContent = world.agents.length.toLocaleString();
    $("#wbDccaCount").textContent = searchableAreas().length;
    if (previousRunState !== world.running || !$("#toggleButton svg")) {
      const toggle = $("#toggleButton");
      toggle.innerHTML = icon(world.running ? "pause" : "play");
      toggle.title = world.running ? "Pause simulation" : "Run simulation";
      toggle.setAttribute("aria-label", toggle.title);
      previousRunState = world.running;
      lucide.createIcons();
    }
    inspector.querySelectorAll(".wb-metric-detail").forEach((detail) => { detail.hidden = detail.querySelector(".metric-section").hidden; });
    const label = $("#agentsLayerToggle").closest("label").querySelector("small");
    label.textContent = activeView === "scene" ? "Individual Agents; colour indicates current state" : activeView === "osm" && (osmMap.zoom <= 12 || world.population > 1200) ? "Agent clusters; number indicates count" : "Individual Agents; colour indicates current state";
    $("#buildingsLayerToggle").closest("label").querySelector("small").textContent = activeView === "scene" ? "Official footprint samples + flat density cells" : isPilotScope() ? "CSDI building footprints" : "Building cells; size reflects built form";
    $("#wbBoundaryKey").textContent = `${isRegionalScope() || isPilotScope() ? "Official DCCA outlines" : "District outlines / DCCA overlays"}. ${activeView === "scene" ? "Flat administrative surface, not a terrain mesh. Building and route elevations use source data; vertical emphasis changes display only." : "Selection is outlined in charcoal."}`;
  }
  $("#resetButton").innerHTML = icon("rotate-ccw");
  $("#resetButton").title = "Reset simulation";
  $("#resetButton").setAttribute("aria-label", "Reset simulation");
  new MutationObserver(() => {
    const toggle = $("#toggleButton");
    if (!toggle.querySelector("svg")) {
      toggle.innerHTML = icon(world.running ? "pause" : "play");
      toggle.title = world.running ? "Pause simulation" : "Run simulation";
      toggle.setAttribute("aria-label", toggle.title);
      lucide.createIcons();
    }
  }).observe($("#toggleButton"), {childList: true});
  window.WorkbenchData = {
    snapshot: () => ({scope: world.scope, agents: world.agents, areas: displayAreas(), buildings: activeBuildingModels(), cells: isPilotScope() ? [] : activeBuildingCells(), schools: activeSchoolLocations(), pois: activePoiLocations(), layers: world.layers, graph: activeRegionalRoutingGraph(), graphs: isWholeHkScope() ? wholeHkRegions().map((region) => region.graph).filter((graph) => graph?.ready) : [], pilotEdges: isPilotScope() ? pilotNetworkEdges : [], pilotNodes: isPilotScope() ? pilotNetworkNodes : [], states: STATE_META, units: appUnitMeters, zUnits: verticalUnitMeters}),
    select: (agent) => { setSpatialSelection("agent", agent, "scene"); app.classList.add("wb-inspector-open"); app.classList.remove("wb-inspector-hidden"); },
    selectArea: (area) => { setSpatialSelection("dcca", area, "scene"); app.classList.add("wb-inspector-open"); app.classList.remove("wb-inspector-hidden"); },
    selectedId: () => spatialSelection.type === "agent" ? spatialSelection.id : null,
    selection: () => {
      if (window.CrossPackLab?.selection()) return window.CrossPackLab.selection();
      const entity = selectedSpatialEntity();
      const points = entity && spatialSelection.type === "agent" ? selectedAgentRouteGeometry(entity).points : [];
      return {type: spatialSelection.type, entity, points, replayPoint: pointAlongSelectionRoute(points, spatialSelection.playbackFraction)};
    },
    activeView: () => activeView,
    marker: (ctx, type, key) => type === "school" ? drawSchoolMarker(ctx, 32, 32, key, 22, 1) : drawPoiSymbol(ctx, 32, 32, key, 22, 1),
  };
  syncView(); syncLive(); fitOsmMap(); lucide.createIcons();
  window.setInterval(syncLive, 300);
  new ResizeObserver(() => resizeAllCanvases()).observe(viewport);
})();
