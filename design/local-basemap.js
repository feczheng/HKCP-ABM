"use strict";

// Local cartographic context from the model's bundled geographic sources.
(() => {
  function englishName(record, fallback) {
    const name = record.nameEn || record.name || "";
    // Some imported station names concatenate Chinese and English. Keep the
    // supplied English part; never invent a translation for Chinese-only names.
    const english = name.replace(/\p{Script=Han}+/gu, "").replace(/[（）【】]/g, " ").replace(/\s+/g, " ").trim();
    return /[a-z]/i.test(english) ? english : fallback;
  }
  function drawLocalMap(ctx, ratio) {
    const data = window.HK_REAL_GEO_DATA;
    if (!data) return;
    const width = osmCanvas.width, height = osmCanvas.height;
    const intersects = (points, margin = 0) => points.some(p => p.x >= -margin && p.x <= width + margin && p.y >= -margin && p.y <= height + margin)
      || (Math.min(...points.map(p => p.x)) <= width && Math.max(...points.map(p => p.x)) >= 0
        && Math.min(...points.map(p => p.y)) <= height && Math.max(...points.map(p => p.y)) >= 0);
    function shape(ring, fill, stroke, lineWidth) {
      if (!ring?.length) return;
      const points = ring.map(([x, y]) => osmProjectLocal({x, y}));
      if (!intersects(points)) return;
      ctx.beginPath();
      points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth * ratio; ctx.stroke();
    }
    // Administrative polygons include some water. Deliberately use a neutral
    // background: these are boundaries, not inferred coastlines or land cover.
    for (const district of data.districts || []) for (const ring of district.polygon || []) {
      shape(ring, "#e9eae4", "#a8b4ac", 0.85);
    }
    if (osmMap.zoom >= 12) {
      for (const area of data.dccas2019 || []) for (const ring of area.polygon || []) {
        shape(ring, null, "#c9d0c7", 0.55);
      }
      // Reuse the same projection and actual bundled graph as model overlays.
      // No network is invented while a regional graph is still loading.
      if (typeof isPilotScope === "function" && isPilotScope()) drawPilotNetwork2D(ctx, osmProjectLocal, 0.24);
      else if (typeof isRegionalScope === "function" && isRegionalScope()) drawRegionalNetwork2D(ctx, osmProjectLocal, 0.24);
    }
    if (osmMap.zoom >= 14) for (const building of data.buildings || []) {
      shape(building.footprint, "#d5dbd3", "#bbc7be", 0.55);
    }
    const occupied = [];
    function label(text, lon, lat, fontSize, color, dot = false) {
      if (!text || !Number.isFinite(lon) || !Number.isFinite(lat)) return;
      const p = osmProjectLonLat(lon, lat);
      if (p.x < 12 * ratio || p.x > width - 12 * ratio || p.y < 16 * ratio || p.y > height - 16 * ratio) return;
      ctx.font = `${fontSize >= 12 ? "600 " : ""}${fontSize * ratio}px system-ui, sans-serif`;
      const textWidth = ctx.measureText(text).width;
      const box = {left: p.x - textWidth / 2 - 4 * ratio, right: p.x + textWidth / 2 + 4 * ratio,
        top: p.y - (fontSize + 5) * ratio, bottom: p.y + 5 * ratio};
      if (occupied.some(b => b.left < box.right && b.right > box.left && b.top < box.bottom && b.bottom > box.top)) return;
      occupied.push(box);
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.lineWidth = 3 * ratio; ctx.strokeStyle = "#f3f2ed"; ctx.strokeText(text, p.x, p.y);
      ctx.fillStyle = color; ctx.fillText(text, p.x, p.y);
      if (dot) { ctx.beginPath(); ctx.arc(p.x, p.y + 4 * ratio, 1.8 * ratio, 0, Math.PI * 2); ctx.fill(); }
    }
    const areas = osmMap.zoom >= 13 ? data.dccas2019 : data.districts;
    for (const area of areas || []) label(englishName(area, area.code || area.id), area.lon, area.lat, osmMap.zoom >= 13 ? 11 : 13, "#51645c");
    if (osmMap.zoom >= 13) {
      const names = new Set();
      for (const node of data.mobilityNodes || []) {
        if (!["rail_station", "ferry_terminal"].includes(node.type) || !node.name || names.has(node.name)) continue;
        names.add(node.name); label(englishName(node, node.type === "rail_station" ? "Rail station" : "Ferry terminal"), node.lon, node.lat, 10, "#4f6e7b", true);
      }
    }
    if (osmMap.zoom >= 15) for (const school of data.schoolLocations || []) {
      label(englishName(school, school.id), school.lon, school.lat, 10, "#6b6d62", true);
    }
  }
  window.ChildrenABMLocalMap = {draw: drawLocalMap};
})();
