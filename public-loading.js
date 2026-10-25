"use strict";
(() => {
  const files = new Map();
  const state = { phase: "boot", label: "Loading application data", region: "", error: "", readyRegions: 0, regions: 5 };
  let scheduled = false;
  const key = url => new URL(url, document.baseURI).pathname;
  const element = id => document.getElementById(id);
  const mb = bytes => (bytes / 1e6).toFixed(1);
  function totals() {
    let loaded = 0, total = 0;
    for (const file of files.values()) { loaded += Math.min(file.loaded, file.total); total += file.total; }
    return { loaded, total };
  }
  function render() {
    scheduled = false;
    const panel = element("publicLoading");
    if (!panel) return;
    panel.dataset.phase = state.phase;
    panel.hidden = state.phase === "dismissed";
    const done = state.phase === "ready", failed = state.phase === "error";
    const { loaded, total } = totals();
    element("publicLoadingTitle").textContent = failed ? "Model could not load" : done ? "Ready to simulate" : "Loading Hong Kong model";
    element("publicLoadingStatus").textContent = state.label;
    const progress = element("publicLoadingProgress");
    if (!total && !done) progress.removeAttribute("value");
    else progress.value = done ? 100 : Math.floor(100 * loaded / Math.max(1, total));
    element("publicLoadingPercent").textContent = total ? `${Math.floor(100 * loaded / total)}% downloaded` : "Preparing";
    element("publicLoadingBytes").textContent = total ? `${mb(loaded)} / ${mb(total)} MB of graph files` : "Public geography and model code";
    element("publicLoadingRegion").textContent = `${state.readyRegions} / ${state.regions} regional networks ready${state.region ? " · " + state.region : ""}`;
    element("publicLoadingError").hidden = !failed;
    element("publicLoadingError").textContent = state.error;
    element("publicLoadingStart").hidden = !done;
    element("publicLoadingExplore").hidden = !done;
    element("publicLoadingRetry").hidden = !failed;
    const toggle = element("toggleButton");
    if (toggle && !done && state.phase !== "dismissed") {
      toggle.disabled = true;
      toggle.setAttribute("aria-label", failed ? "Model unavailable" : "Loading model");
      toggle.title = failed ? "Model unavailable" : "Loading model";
    }
  }
  function requestRender() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(render); }
  }
  function show() {
    document.querySelector(".app")?.setAttribute("inert", "");
    document.querySelector(".app")?.setAttribute("aria-busy", "true");
    if (element("publicLoading")) element("publicLoading").hidden = false;
    render();
  }
  function dismiss() {
    state.phase = "dismissed";
    document.querySelector(".app")?.removeAttribute("inert");
    document.querySelector(".app")?.setAttribute("aria-busy", "false");
    render();
    element("toggleButton")?.focus();
  }
  function fail(error) {
    if (["dismissed", "ready", "error"].includes(state.phase)) return;
    state.phase = "error";
    state.label = "Loading stopped. Check your connection and try again.";
    state.error = String(error?.message || error || "Unknown loading error");
    show();
    element("publicLoadingRetry")?.focus();
  }
  const api = {
    get busy() { return !["ready", "dismissed", "error"].includes(state.phase); },
    snapshot: () => ({ ...state, ...totals() }),
    begin(regions) {
      state.phase = "download"; state.error = ""; state.region = "";
      state.regions = regions.length; state.readyRegions = regions.filter(r => r.graph.ready).length;
      files.clear();
      for (const region of regions) for (const chunk of region.graph.manifest.chunks) {
        files.set(key(region.graph.basePath + chunk.file), { label: region.label, total: chunk.bytesGzip, loaded: region.graph.ready ? chunk.bytesGzip : 0 });
      }
      state.label = "Downloading real 3D pedestrian networks";
      show();
    },
    async readResponse(response) {
      const file = files.get(key(response.url));
      if (!file || !response.body?.getReader) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (file) { file.loaded = file.total; requestRender(); }
        return bytes;
      }
      state.phase = "download"; state.region = file.label;
      state.label = "Downloading " + file.label + " network";
      const reader = response.body.getReader(), chunks = [];
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); length += value.length;
          file.loaded = length; requestRender();
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      file.loaded = file.total;
      state.phase = "decode"; state.label = "Decompressing " + file.label + " network";
      render();
      return bytes;
    },
    progress(region, progress, regions) {
      state.region = region.label;
      if (progress.phase === "assemble") { state.phase = "assemble"; state.label = "Building " + region.label + " routing graph"; }
      state.readyRegions = regions.filter(r => r.graph.ready).length;
      render();
    },
    async preparing(population) {
      state.phase = "agents"; state.readyRegions = state.regions; state.region = "";
      state.label = `Creating ${Number(population).toLocaleString("en")} synthetic Agents`;
      render();
      // Let the browser paint this phase before synchronous population assembly.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    },
    ready(population) {
      if (state.phase === "error") return;
      state.phase = "ready"; state.readyRegions = state.regions; state.region = "";
      state.label = `${Number(population).toLocaleString("en")} Agents ready · simulation paused`;
      document.querySelector(".app")?.setAttribute("aria-busy", "false");
      const toggle = element("toggleButton");
      if (toggle) { toggle.disabled = false; toggle.title = "Play simulation"; toggle.setAttribute("aria-label", "Play simulation"); }
      render();
      element("publicLoadingStart")?.focus();
    },
    fail,
  };
  window.PublicModelLoading = api;
  document.addEventListener("DOMContentLoaded", () => {
    element("publicLoadingStart").onclick = () => { dismiss(); if (!world.running) element("toggleButton").click(); };
    element("publicLoadingExplore").onclick = dismiss;
    element("publicLoadingRetry").onclick = () => location.reload();
    render();
  });
  window.addEventListener("error", event => {
    if (event.target?.tagName === "SCRIPT") fail("An application file could not load. Reload to try again.");
    else if (event.error) fail(event.error);
  }, true);
  window.addEventListener("unhandledrejection", event => fail(event.reason));
})();
