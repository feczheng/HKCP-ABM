"use strict";

(() => {
  const storageKey = "children-abm.basemap";
  const osmCredit = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>';
  const sources = {
    osm: {maxZoom: 19, url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, credit: osmCredit},
    topo: {maxZoom: 17, url: (z, x, y) => `https://tile.opentopomap.org/${z}/${x}/${y}.png`, credit: `${osmCredit}, SRTM · <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA</a>)`},
  };
  const styles = {
    gray: {label: "OSM Gray", source: "osm", filter: "grayscale(1) brightness(1.06) contrast(0.88)", background: "#edf0f0"},
    standard: {label: "OSM Standard", source: "osm", filter: "none", background: "#e3ebe2"},
    dark: {label: "OSM Dark", source: "osm", filter: "grayscale(1) invert(1) brightness(0.72) contrast(0.85)", background: "#292d2e"},
    topo: {label: "OpenTopoMap", source: "topo", filter: "none", background: "#e7eddf"},
    none: {label: "No basemap", source: null, filter: "none", background: "#eff3f2"},
  };
  let selected = "gray";
  try {
    const saved = localStorage.getItem(storageKey);
    if (Object.hasOwn(styles, saved)) selected = saved;
  } catch { /* Storage can be disabled without disabling the map. */ }
  const viewport = document.querySelector(".simulation-area");
  const panel = document.createElement("section");
  panel.className = "wb-basemap";
  panel.setAttribute("aria-label", "Basemap display");
  panel.innerHTML = '<label for="wbBasemap">BASEMAP</label><select id="wbBasemap" aria-label="Basemap"></select><div class="wb-basemap-status" role="status" aria-live="polite"></div><button class="wb-basemap-retry" type="button" hidden>Retry failed tiles</button>';
  viewport.append(panel);
  const select = panel.querySelector("select");
  for (const [value, style] of Object.entries(styles)) select.add(new Option(style.label, value));
  select.value = selected;
  const status = panel.querySelector(".wb-basemap-status");
  const retry = panel.querySelector("button");
  const attribution = document.querySelector(".wb-attribution");
  attribution.innerHTML = '<div class="wb-basemap-credit"></div><div class="wb-data-credit">LandsD / CSDI · EDB · iGeoCom</div>';
  const credit = attribution.querySelector(".wb-basemap-credit");
  const cache = new Map();
  let visibleKeys = new Set();
  let lastStatus = "";
  let state = {loaded: 0, loading: 0, failed: 0};
  function updateStatus() {
    state = {loaded: 0, loading: 0, failed: 0};
    for (const key of visibleKeys) state[cache.get(key)?.state || "loading"]++;
    const message = state.failed ? "Basemap partly unavailable; model layers remain active." : state.loading ? "Loading basemap…" : "";
    if (message !== lastStatus) { status.textContent = message; lastStatus = message; }
    status.hidden = !message;
    retry.hidden = state.failed === 0;
    panel.dataset.state = state.failed ? "error" : state.loading ? "loading" : "ready";
  }
  function refreshStyle() {
    const style = styles[selected];
    credit.innerHTML = style.source ? sources[style.source].credit : "";
    viewport.dataset.basemap = selected;
    osmCanvas.setAttribute("aria-label", `${style.label} child activity map`);
    visibleKeys = new Set(); updateStatus(); markOsmStaticDirty();
  }
  select.addEventListener("change", () => {
    selected = select.value;
    try { localStorage.setItem(storageKey, selected); } catch { /* Session preference still works. */ }
    refreshStyle();
  });
  retry.addEventListener("click", () => {
    for (const key of visibleKeys) if (cache.get(key)?.state === "failed") cache.delete(key);
    markOsmStaticDirty();
  });
  osmCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? osmCanvas.clientHeight : 1;
    const pixels = event.deltaY * unit;
    if (!Number.isFinite(pixels) || pixels === 0) return;
    const delta = clamp(-pixels / 480, -0.35, 0.35);
    // A focused place can start above the normal zoom range; never snap it back on the first scroll.
    const minimum = Math.min(osmMap.zoom, isPilotScope() ? 13 : 9);
    const maximum = Math.max(osmMap.zoom, isPilotScope() ? 17 : 15);
    osmMap.zoom = clamp(osmMap.zoom + delta, minimum, maximum);
    markOsmStaticDirty();
  }, {capture: true, passive: false});
  function tile(sourceId, z, x, y) {
    const wrappedX = ((x % 2 ** z) + 2 ** z) % 2 ** z;
    const key = `${sourceId}/${z}/${wrappedX}/${y}`;
    visibleKeys.add(key);
    let record = cache.get(key);
    if (!record) {
      const image = new Image();
      record = {image, state: "loading"};
      cache.set(key, record);
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      const complete = (value) => {
        record.state = value;
        if (visibleKeys.has(key)) { markOsmStaticDirty(); updateStatus(); }
      };
      image.onload = () => complete("loaded");
      image.onerror = () => complete("failed");
      image.src = sources[sourceId].url(z, wrappedX, y);
    }
    // A bounded display cache; evicted images still use the browser's normal HTTP cache.
    cache.delete(key); cache.set(key, record);
    return record;
  }
  drawOsmTiles = function(ctx) {
    const style = styles[selected];
    const ratio = window.devicePixelRatio || 1;
    const width = osmCanvas.width / ratio, height = osmCanvas.height / ratio;
    visibleKeys = new Set();
    ctx.save();
    ctx.filter = "none";
    ctx.fillStyle = style.background;
    ctx.fillRect(0, 0, osmCanvas.width, osmCanvas.height);
    if (style.source) {
      const zoom = Math.min(Math.floor(osmMap.zoom), sources[style.source].maxZoom);
      const scale = 2 ** (osmMap.zoom - zoom);
      const center = lonLatToWorldPixel(osmMap.centerLon, osmMap.centerLat, zoom);
      const left = center.x - width / scale / 2, top = center.y - height / scale / 2;
      const right = center.x + width / scale / 2, bottom = center.y + height / scale / 2;
      ctx.filter = style.filter;
      // Only visible tiles. Higher display zooms reuse native parent tiles, not missing zoom levels.
      for (let y = Math.max(0, Math.floor(top / 256)); y < Math.min(2 ** zoom, Math.ceil(bottom / 256)); y++) {
        for (let x = Math.floor(left / 256); x < Math.ceil(right / 256); x++) {
          const record = tile(style.source, zoom, x, y);
          if (record.state === "loaded") ctx.drawImage(record.image, (x * 256 - left) * scale * ratio, (y * 256 - top) * scale * ratio, 256 * scale * ratio, 256 * scale * ratio);
        }
      }
    }
    ctx.restore();
    for (const key of cache.keys()) {
      if (cache.size <= 384) break;
      if (!visibleKeys.has(key)) cache.delete(key);
    }
    updateStatus();
  };
  window.WorkbenchBasemaps = {
    diagnostics: () => ({selected, source: styles[selected].source, filter: styles[selected].filter, ...state, cacheSize: cache.size, visibleKeys: [...visibleKeys]}),
  };
  refreshStyle();
})();
