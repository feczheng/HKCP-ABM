"use strict";

(() => {
  const view = document.getElementById("crosspackView");
  if (!view) return;
  const scopes = [["continuous-kowloon", "Kowloon"], ["new-territories-east", "NT East"], ["new-territories-west", "NT West"], ["hong-kong-island", "Hong Kong Island"], ["outlying-islands", "Islands"]];
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const button = (id, symbol, label) => `<button type="button" id="${id}" title="${label}" aria-label="${label}">${icon(symbol)}</button>`;
  const endpointForm = (side, title) => `<fieldset class="cp-endpoint"><legend>${title}</legend><div class="cp-endpoint-filters"><select id="cp-${side}-scope" aria-label="${title} region">${scopes.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select><select id="cp-${side}-kind" aria-label="${title} category"><option value="home">Home building (ground)</option><option value="school">School (ground)</option><option value="poi">Child POI (ground)</option></select></div><input id="cp-${side}-place" list="cp-${side}-options" aria-label="${title} source place" placeholder="Name or source ID" autocomplete="off"><datalist id="cp-${side}-options"></datalist><small id="cp-${side}-detail">No source place selected</small></fieldset>`;
  view.innerHTML = `<div class="cp-summary"><div><strong>Mainland connectivity</strong><span>Kowloon / NT East / NT West</span></div><span class="cp-evidence">Modelled OD audit · not a live Agent trip</span></div>
    <div class="cp-controls">${endpointForm("origin", "Origin")}${button("cp-swap", "arrow-left-right", "Swap origin and destination")}${endpointForm("destination", "Destination")}</div>
    <div class="cp-parameters"><label>Age<input id="cp-age" type="number" min="6" max="16" step="1" value="12"></label><label>Walk speed (m/min)<input id="cp-speed" type="number" min="35" max="120" step="1" value="70"></label><label>Cost scenario<select id="cp-scenario"><option value="baseline">Baseline</option><option value="walkable">Walkable streets</option><option value="heat">Very hot afternoon</option></select></label><label>Example OD<select id="cp-example"><option value="k-ne">Kowloon / NT East</option><option value="k-nw">Kowloon / NT West</option><option value="ne-nw">NT East / NT West</option></select></label><button type="button" id="cp-calculate">${icon("route")} Calculate OD</button>${button("cp-cancel", "square", "Cancel route calculation")}${button("cp-export", "download", "Export this OD audit as JSON")}</div>
    <div class="cp-status" role="status" aria-live="polite" id="cp-status">No OD calculated</div><progress id="cp-progress" max="1" value="0" hidden></progress>
    <div class="cp-visual-head"><h2>Source-network routes</h2><div>${button("cp-map-view", "map", "Show the audited route in Map explorer")}${button("cp-scene-view", "box", "Show the source network trace in 3D")}</div></div>
    <canvas id="cp-map" aria-label="Map comparing 2D and 3D source-network routes"></canvas>
    <div class="cp-legend"><span><i class="cp-key cp-3d"></i>3D minimum-cost network route</span><span><i class="cp-key cp-2d"></i>2D minimum-cost network route</span><span><i class="cp-key cp-connector"></i>Unverified access connector</span><span><b class="cp-origin">A</b>Origin</span><span><b class="cp-destination">B</b>Destination</span><span>Boundaries: 2019 DCCA</span></div>
    <div class="cp-results"><section><h2>Paired trip estimate</h2><div id="cp-metrics" class="cp-table-wrap"></div><p class="cp-note">Same directed source topology; each condition minimizes its own generalized cost. 2D removes height and vertical penalties, not network connectivity. MVPA is a modelled per-trip estimate, not an observed health outcome.</p></section><section><h2>3D route elevation</h2><canvas id="cp-profile" aria-label="Source HKPD elevation along the 3D network route"></canvas><p class="cp-note">Horizontal network distance / metres above HKPD. Access connectors and simulated building floors are excluded from this profile.</p></section></div>
    <section class="cp-audit"><h2>Evidence and exclusions</h2><div id="cp-audit"></div></section>`;
  const $ = (id) => document.getElementById(id);
  const inputs = Object.fromEntries(["origin", "destination"].map((side) => [side, { scope: $(`cp-${side}-scope`), kind: $(`cp-${side}-kind`), place: $(`cp-${side}-place`), options: $(`cp-${side}-options`), detail: $(`cp-${side}-detail`) }]));
  const state = { catalog: null, selected: { origin: null, destination: null }, result: null, worker: null, requestId: 0, busy: false, overlay: false, lastRequest: null };
  const sourceMap = new Map();
  const overlayBadge = document.createElement("div");
  overlayBadge.className = "cp-overlay-badge";
  overlayBadge.hidden = true;
  overlayBadge.innerHTML = `<div><span class="cp-overlay-title">OD audit trace · not Agent movement</span><div class="cp-overlay-legend"><span><i class="cp-key cp-3d"></i>3D route</span><span><i class="cp-key cp-2d"></i>2D route</span><span><i class="cp-key cp-connector"></i>Unverified access</span><span>A: Origin · B: Destination</span></div></div>${button("cp-clear-overlay", "x", "Clear OD audit overlay")}`;
  document.querySelector(".simulation-area").append(overlayBadge);
  const status = (text, error = false) => { $("cp-status").textContent = text; $("cp-status").classList.toggle("cp-error", error); };
  const fmt = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : "n/a";

  function catalog() {
    if (state.catalog) return state.catalog;
    const rows = [];
    for (const region of wholeHkRegions()) {
      const own = new Set(region.areas.map((area) => area.id));
      for (const kind of ["home", "school", "poi"]) {
        const places = kind === "home" ? region.anchors : kind === "school" ? region.schools : region.pois;
        const attachments = kind === "school" ? region.graph.schoolAttachments : region.graph.poiAttachments;
        for (const place of places) {
          const attachment = kind === "home" ? null : attachments.get(place.id);
          const nodeId = kind === "home" ? place.networkNodeId : attachment?.nodeId;
          if (!Number.isInteger(nodeId)) continue;
          const area = wholeHkLocateDcca(place);
          if (!area || !own.has(area.id)) continue;
          const key = `${region.id}|${kind}|${place.id}`;
          if (sourceMap.has(key)) continue;
          const height = kind === "home" ? place.base * verticalUnitMeters : attachment?.nodeElevationHkpdM;
          if (!Number.isFinite(height)) continue;
          const name = place.name || place.nameEn || place.id;
          const label = `${name === place.id ? name : `${name} [${place.id}]`} · ${area.code || area.id.replace("dcca-2019-", "").toUpperCase()}`;
          const row = { key, scope: region.id, nodeId, packBuildVersion: region.manifest.buildVersion, dccaId: area.id,
            x: place.x, y: place.y, z: height / verticalUnitMeters, kind, label, sourceId: place.id,
            source: kind === "home" ? "CSDI Building ground anchor" : kind === "school" ? "EDB school ground anchor" : "iGeoCom child POI ground anchor",
          };
          rows.push(row); sourceMap.set(key, row);
        }
      }
    }
    state.catalog = rows;
    return rows;
  }

  function candidates(side) {
    const form = inputs[side];
    return catalog().filter((row) => row.scope === form.scope.value && row.kind === form.kind.value);
  }
  function suggest(side) {
    const form = inputs[side], query = form.place.value.toLowerCase();
    const rows = candidates(side).filter((row) => !query || row.label.toLowerCase().includes(query)).slice(0, 40);
    form.options.replaceChildren(...rows.map((row) => { const option = document.createElement("option"); option.value = row.label; return option; }));
  }
  function setEndpoint(side, row) {
    const form = inputs[side];
    if (state.selected[side] !== row) invalidate();
    state.selected[side] = row;
    if (row) {
      form.scope.value = row.scope; form.kind.value = row.kind; form.place.value = row.label;
      form.detail.textContent = `${row.source} · ${row.dccaId.replace("dcca-2019-", "").toUpperCase()} · local node ${row.nodeId}`;
    } else { form.place.value = ""; form.detail.textContent = "No source place selected"; }
    suggest(side);
    drawMap();
  }
  function invalidate() {
    state.requestId += 1;
    state.result = null; clearOverlay();
    if (state.busy) { state.worker?.terminate(); state.worker = null; }
    state.busy = false;
    status("No OD calculated"); render();
  }
  function example() {
    invalidate();
    const pair = $("cp-example").value;
    const [from, to] = pair === "k-ne" ? [scopes[0][0], scopes[1][0]] : pair === "k-nw" ? [scopes[0][0], scopes[2][0]] : [scopes[1][0], scopes[2][0]];
    const homes = catalog().filter((row) => row.scope === from && row.kind === "home");
    const destinations = catalog().filter((row) => row.scope === to && row.kind === "school");
    let best = Infinity, chosen;
    for (const home of homes) for (const destination of destinations) {
      const squared = (home.x - destination.x) ** 2 + (home.y - destination.y) ** 2;
      if (squared < best) { best = squared; chosen = [home, destination]; }
    }
    if (chosen) { setEndpoint("origin", chosen[0]); setEndpoint("destination", chosen[1]); }
    else status("No source-backed endpoint pair is available", true);
  }

  function calculate() {
    const origin = state.selected.origin, destination = state.selected.destination;
    const age = Number($("cp-age").value), speed = Number($("cp-speed").value), scenario = $("cp-scenario").value;
    if (!origin || !destination) { status("Both endpoints require a source place from the list", true); return; }
    if (!Number.isInteger(age) || age < 6 || age > 16 || !Number.isFinite(speed) || speed < 35 || speed > 120) { status("Age must be 6–16; walking speed must be 35–120 m/min", true); return; }
    invalidate();
    const id = ++state.requestId;
    state.busy = true;
    const options = { scenarioKey: scenario, scenarioHeat: SCENARIOS[scenario].heat, heatAvoidance: RULE_DEFAULTS.heatAvoidance };
    state.lastRequest = { origin, destination, options, walkingSpeedMpm: speed, mobility: SCENARIOS[scenario].mobility, age };
    status("Loading source-connected graph in a background worker…"); render();
    try {
      if (!state.worker) {
        state.worker = new Worker(`cross-pack-worker.js?v=${APP_RELEASE.version}`);
        state.worker.onmessage = ({ data }) => {
          if (data.id !== state.requestId) return;
          if (data.type === "progress") {
            const p = data.progress;
            $("cp-progress").value = p.total ? p.completed / p.total : 0;
            status(p.phase === "ready" ? "Resolving source identities and computing paired paths…" : `Source graph: ${p.phase || "loading"} ${p.completed || 0}/${p.total || "…"}`);
            return;
          }
          state.busy = false;
          if (data.type === "error") {
            state.worker?.terminate(); state.worker = null;
            status(`Route engine unavailable: ${data.error}. Calculation can be retried.`, true);
          } else {
            state.result = data.result;
            status(data.result.status === "matched" ? data.result.noMovement ? "Identical origin and destination · no travel or activity generated" : `${data.result.crossPack ? "Cross-pack" : "Within-pack"} directed OD matched · source edges only` : `OD blocked: ${data.result.reason}`, data.result.status !== "matched");
          }
          render();
        };
        state.worker.onerror = () => {
          state.worker?.terminate(); state.worker = null; state.busy = false;
          status("Route worker unavailable. Calculation can be retried.", true); render();
        };
      }
      state.worker.postMessage({ id, request: state.lastRequest });
    } catch (error) { state.busy = false; status(error.message, true); render(); }
  }

  function outcomes(result) {
    if (result?.status !== "matched") return null;
    const a = result.threeD, b = result.twoD;
    const profile = { age: state.lastRequest.age, walkingSpeedMpm: result.walkingSpeedMpm };
    const route = { routeMeters: a.routeMeters, generalizedMeters: a.generalizedMeters, estimatedMinutes: a.minutes,
      planarRouteMeters: b.routeMeters, planarGeneralizedMeters: b.generalizedMeters, planarEstimatedMinutes: b.minutes,
      activeTravelShare: a.activeTravelShare, planarActiveTravelShare: 1, verticalGainMeters: a.verticalGainMeters, mechanicalShare: 1 - a.activeTravelShare };
    if (a.minutes === 0) return { threeD: emptyGeometryOutcome(), twoD: emptyGeometryOutcome() };
    return { threeD: movementGeometryOutcome(profile, route, { movingMinutes: a.minutes }, "threeD"), twoD: b.minutes === 0 ? emptyGeometryOutcome() : movementGeometryOutcome(profile, route, { movingMinutes: a.minutes }, "twoD") };
  }
  function table(result) {
    if (result?.status !== "matched") return `<p class="cp-empty">No valid route estimate</p>`;
    const out = outcomes(result), a = result.threeD, b = result.twoD;
    const rows = [["Network distance (m)", b.networkMeters, a.networkMeters], ["Access connectors (m)", b.connectorMeters, a.connectorMeters], ["Generalized cost (m)", b.generalizedMeters, a.generalizedMeters], ["Travel time (min)", b.minutes, a.minutes], ["Ascent (m)", 0, a.verticalGainMeters], ["Active travel (min)", out.twoD.activeTravelMinutes, out.threeD.activeTravelMinutes], ["MVPA estimate (min)", out.twoD.mvpaMinutes, out.threeD.mvpaMinutes], ["METy-min estimate", out.twoD.metyMinutes, out.threeD.metyMinutes]];
    return `<table><thead><tr><th>Metric</th><th>2D</th><th>3D</th><th>3D − 2D</th></tr></thead><tbody>${rows.map(([label, two, three]) => `<tr><th>${label}</th><td>${fmt(two)}</td><td>${fmt(three)}</td><td>${three - two > 0 ? "+" : ""}${fmt(three - two)}</td></tr>`).join("")}</tbody></table>`;
  }
  function render() {
    const result = state.result, valid = result?.status === "matched";
    $("cp-calculate").disabled = state.busy;
    $("cp-cancel").disabled = !state.busy;
    $("cp-export").disabled = !result;
    $("cp-map-view").disabled = !valid;
    $("cp-scene-view").disabled = !valid || !result.threeD.edgeIds.length || !window.WorkbenchScene?.ready;
    $("cp-scene-view").hidden = !document.body.classList.contains("workbench");
    $("cp-progress").hidden = !state.busy;
    $("cp-metrics").innerHTML = table(result);
    $("cp-audit").innerHTML = `<dl><div><dt>Simulation effect</dt><dd>None: population, clock, live trips and MVPA counters are unchanged</dd></div><div><dt>Source topology</dt><dd>Existing LandsD 3DPN; three mainland packs joined by verified source identities</dd></div><div><dt>Cross-water transport</dt><dd>Excluded; Hong Kong Island and Islands are not connected by this audit engine</dd></div><div><dt>Open hours</dt><dd>AccessTime retained; opening-time restrictions not enforced</dd></div><div><dt>Entrances / activity</dt><dd>Ground anchors and access connectors are not surveyed entrances; no destination activity is simulated</dd></div>${valid ? `<div><dt>Access warning</dt><dd>${result.connectors.review ? "REVIEW: an endpoint connector exceeds 100 m" : "Both endpoint connectors are within 100 m"}; A ${fmt(result.connectors.startMeters)} m / B ${fmt(result.connectors.destinationMeters)} m</dd></div><div><dt>2D / 3D edge overlap</dt><dd>${Number.isFinite(result.edgeOverlapShare) ? `${fmt(result.edgeOverlapShare * 100)}%` : "n/a"} (source edge ID overlap)</dd></div><div><dt>3D vertical features</dt><dd>Stairs ${fmt(result.threeD.stairShare * 100)}%; ramps ${fmt(result.threeD.rampShare * 100)}%; mechanical ${fmt(result.threeD.mechanicalShare * 100)}%</dd></div><div><dt>Restricted-time edges</dt><dd>${result.threeD.accessTimeEdgeCount} on the 3D route; temporal access remains unverified</dd></div>` : ""}</dl>`;
    drawMap(); drawProfile(); updateOverlayBadge();
  }

  function canvasContext(id) {
    const canvas = $(id), ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return null;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
    ctx.fillStyle = "#f0f4f3"; ctx.fillRect(0, 0, width, height);
    return { ctx, width, height };
  }
  function trace(ctx, points, project, color, dash = [], width = 2.5) {
    if (!points.length) return;
    ctx.beginPath(); points.forEach((point, index) => { const p = project(point); if (!index) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawRoutes(ctx, project, result, ratio = 1) {
    if (result?.status !== "matched") return;
    trace(ctx, result.twoD.points.slice(1, -1), project, "#83549c", [6 * ratio, 4 * ratio], 3.5 * ratio);
    trace(ctx, result.threeD.points.slice(1, -1), project, "#16796e", [], 2.5 * ratio);
    for (const path of [result.threeD.points, result.twoD.points]) {
      trace(ctx, path.slice(0, 2), project, "#bd7422", [3 * ratio, 3 * ratio], 2 * ratio);
      trace(ctx, path.slice(-2), project, "#bd7422", [3 * ratio, 3 * ratio], 2 * ratio);
    }
    const markers = result.noMovement ? [[result.origin, "A=B", "#16796e"]] : [[result.origin, "A", "#16796e"], [result.destination, "B", "#9b465e"]];
    for (const [point, label, color] of markers) {
      const p = project(point); ctx.beginPath(); ctx.arc(p.x, p.y, (result.noMovement ? 16 : 11) * ratio, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2 * ratio; ctx.stroke(); ctx.fillStyle = "white"; ctx.font = `bold ${12 * ratio}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(label, p.x, p.y + 4 * ratio);
    }
  }
  function drawMap() {
    const canvas = canvasContext("cp-map"); if (!canvas) return;
    const { ctx, width, height } = canvas;
    const result = state.result;
    const points = result?.status === "matched" ? [...result.threeD.points, ...result.twoD.points] : Object.values(state.selected).filter(Boolean);
    if (!points.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const scale = Math.min((width - 72) / Math.max(1, maxX - minX), (height - 64) / Math.max(1, maxY - minY));
    const project = (p) => ({ x: width / 2 + (p.x - cx) * scale, y: height / 2 - (p.y - cy) * scale });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.clip();
    for (const area of wholeHkLayer("areas")) {
      for (const ring of area.polygon || []) {
        ctx.beginPath(); ring.forEach(([x, y], index) => { const p = project({ x, y }); if (!index) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); ctx.closePath();
        ctx.fillStyle = "#e4ede9"; ctx.fill(); ctx.strokeStyle = "#bac9c2"; ctx.lineWidth = 0.7; ctx.stroke();
      }
    }
    if (result?.status === "matched") drawRoutes(ctx, project, result);
    else for (const [side, row] of Object.entries(state.selected)) if (row) {
      const p = project(row); ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fillStyle = side === "origin" ? "#16796e" : "#9b465e"; ctx.fill();
    }
    ctx.restore(); ctx.fillStyle = "#344942"; ctx.textAlign = "right"; ctx.font = "12px sans-serif"; ctx.fillText("N ↑", width - 18, 25);
    const meters = width > 500 ? 200 : 100;
    const bar = Math.min(width / 3, meters / appUnitMeters * scale);
    ctx.strokeStyle = "#344942"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, height - 18); ctx.lineTo(20 + bar, height - 18); ctx.stroke();
    ctx.textAlign = "left"; ctx.fillText(`${fmt(bar / scale * appUnitMeters, 0)} m`, 20, height - 27);
  }
  function drawProfile() {
    const canvas = canvasContext("cp-profile"); if (!canvas || state.result?.status !== "matched") return;
    const { ctx, width, height } = canvas, points = state.result.threeD.points.slice(1, -1);
    if (points.length < 2) {
      ctx.fillStyle = "#53635e"; ctx.font = "12px sans-serif"; ctx.fillText("No network travel", 20, 35); return;
    }
    const distances = [0];
    for (let i = 1; i < points.length; i++) distances.push(distances.at(-1) + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) * appUnitMeters);
    const elevations = points.map((p) => p.z * verticalUnitMeters);
    const low = Math.floor(Math.min(...elevations) / 10) * 10, high = Math.max(low + 10, Math.ceil(Math.max(...elevations) / 10) * 10);
    const left = 47, bottom = height - 30, top = 18;
    const project = (p, i) => ({ x: left + distances[i] / Math.max(1, distances.at(-1)) * (width - left - 20), y: bottom - (p.z * verticalUnitMeters - low) / (high - low) * (bottom - top) });
    ctx.strokeStyle = "#c6d1cc"; ctx.fillStyle = "#53635e"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
    for (const value of [low, (low + high) / 2, high]) { const y = bottom - (value - low) / (high - low) * (bottom - top); ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - 15, y); ctx.stroke(); ctx.fillText(`${fmt(value, 0)} m`, left - 7, y + 4); }
    ctx.beginPath(); points.forEach((p, i) => { const q = project(p, i); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.strokeStyle = "#16796e"; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = "left"; ctx.fillText("0 m", left, height - 10); ctx.textAlign = "right"; ctx.fillText(`${fmt(distances.at(-1), 0)} m`, width - 20, height - 10);
  }

  function updateOverlayBadge() {
    overlayBadge.hidden = !(state.overlay && ["osm", "scene"].includes(activeView));
    overlayBadge.querySelector(".cp-overlay-title").textContent = activeView === "scene" ? "Dark line: 3D network audit · not Agent movement" : "OD audit trace · not Agent movement";
    overlayBadge.querySelector(".cp-overlay-legend").hidden = activeView !== "osm";
  }
  function clearOverlay() {
    if (state.overlay) window.WorkbenchScene?.cancelFocus();
    state.overlay = false; updateOverlayBadge();
  }
  function fitMapOverlay() {
    if (!state.overlay || state.result?.status !== "matched" || activeView !== "osm") return;
    const points = [...state.result.threeD.points, ...state.result.twoD.points];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of points) {
      const p = localToLonLat(point), pixel = lonLatToWorldPixel(p.lon, p.lat, 0);
      minX = Math.min(minX, pixel.x); maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y); maxY = Math.max(maxY, pixel.y);
    }
    const bounds = osmCanvas.getBoundingClientRect(), badge = overlayBadge.getBoundingClientRect();
    const basemap = document.querySelector(".wb-basemap")?.getBoundingClientRect();
    const top = Math.max(64, basemap ? basemap.bottom - bounds.top + 16 : 0);
    const bottom = Math.max(64, bounds.bottom - badge.top + 16);
    osmMap.zoom = clamp(Math.log2(Math.min(Math.max(80, bounds.width - 72) / Math.max(0.0001, maxX - minX), Math.max(80, bounds.height - top - bottom) / Math.max(0.0001, maxY - minY))), 9, 17);
    const center = worldPixelToLonLat((minX + maxX) / 2, (minY + maxY) / 2 + (bottom - top) / (2 * 2 ** osmMap.zoom), 0);
    osmMap.centerLon = center.lon; osmMap.centerLat = center.lat;
    markOsmStaticDirty();
  }
  function showOverlay(viewId) {
    const result = state.result;
    if (result?.status !== "matched" || (viewId === "scene" && !result.threeD.edgeIds.length)) return;
    clearSpatialSelection(); state.overlay = true; setView(viewId);
    if (viewId === "osm") fitMapOverlay();
    else window.WorkbenchScene?.focusPoints(result.threeD.points.slice(1, -1));
    updateOverlayBadge();
  }
  for (const side of ["origin", "destination"]) {
    const form = inputs[side];
    for (const filter of [form.scope, form.kind]) filter.addEventListener("change", () => { invalidate(); setEndpoint(side, null); });
    form.place.addEventListener("input", () => { state.selected[side] = null; invalidate(); form.detail.textContent = "No source place selected"; suggest(side); });
    form.place.addEventListener("change", () => { const selected = candidates(side).find((row) => row.label === form.place.value); if (selected) { setEndpoint(side, selected); drawMap(); } });
  }
  for (const id of ["cp-age", "cp-speed", "cp-scenario"]) $(id).addEventListener("input", invalidate);
  $("cp-example").addEventListener("change", example);
  $("cp-swap").addEventListener("click", () => { const { origin, destination } = state.selected; invalidate(); setEndpoint("origin", destination); setEndpoint("destination", origin); drawMap(); });
  $("cp-calculate").addEventListener("click", calculate);
  $("cp-cancel").addEventListener("click", () => { invalidate(); status("Calculation cancelled"); });
  $("cp-map-view").addEventListener("click", () => showOverlay("osm"));
  $("cp-scene-view").addEventListener("click", () => showOverlay("scene"));
  $("cp-clear-overlay").addEventListener("click", clearOverlay);
  $("cp-export").addEventListener("click", () => {
    const payload = { version: APP_RELEASE.version, evidence: "Modelled OD counterfactual; no live Agent state changed", request: state.lastRequest, result: state.result, activityEstimate: outcomes(state.result) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${APP_RELEASE.version}-cross-region-OD.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const originalDrawOsm = drawOsmMap;
  drawOsmMap = function() { originalDrawOsm(); if (state.overlay) drawRoutes(osmCtx, osmProjectLocal, state.result, window.devicePixelRatio || 1); };
  const originalSelection = setSpatialSelection;
  setSpatialSelection = function(...args) { clearOverlay(); return originalSelection(...args); };
  const originalView = setView;
  setView = function(...args) { originalView(...args); updateOverlayBadge(); fitMapOverlay(); };
  new ResizeObserver(() => { if (activeView === "crosspack") { drawMap(); drawProfile(); } }).observe(view);
  new ResizeObserver(fitMapOverlay).observe(document.querySelector(".simulation-area"));
  window.CrossPackLab = {
    show: () => { try { if (!state.catalog) { catalog(); example(); } render(); window.lucide?.createIcons(); } catch (error) { status(error.message, true); } },
    selection: () => state.overlay && state.result?.status === "matched" && state.result.threeD.edgeIds.length ? { type: "route", entity: null, points: state.result.threeD.points.slice(1, -1), replayPoint: null } : null,
    catalog, state, calculate, setEndpoint, outcomes, clearOverlay,
  };
  render(); window.lucide?.createIcons();
})();
