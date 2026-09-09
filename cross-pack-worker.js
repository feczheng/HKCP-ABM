"use strict";

self.window = self;
importScripts("island-routing.js", "data/v12_13_boundary_lookup.js", "data/v12_14_mainland_routing/manifest.js", "cross-pack-routing.js?v=12.14.1");
const router = new CrossPackRouting.Router({ manifest: V12_14_MAINLAND_ROUTING_MANIFEST });

self.onmessage = async ({ data }) => {
  const { id, request } = data;
  try {
    await router.load((progress) => self.postMessage({ id, type: "progress", progress }));
    const result = router.route(request);
    self.postMessage({ id, type: "result", result });
  } catch (error) {
    self.postMessage({ id, type: "error", error: error.message });
  }
};
