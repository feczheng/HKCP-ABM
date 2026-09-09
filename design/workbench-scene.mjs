import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { mergeGeometries } from "./vendor/BufferGeometryUtils.js";

const viewport = document.querySelector(".simulation-area");
const status = document.getElementById("wbSceneStatus");
try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xe8f0ef);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "wb-webgl";
  renderer.domElement.setAttribute("aria-label", "Interactive 3D environment with official building samples and live Agents");
  renderer.domElement.tabIndex = 0;
  viewport.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 2500);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.12;
  orbit.maxPolarAngle = Math.PI * 0.48;
  orbit.minDistance = 0.15;
  orbit.maxDistance = 900;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9babab, 2.5));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunlight.position.set(-60, 100, 30); scene.add(sunlight);
  const geography = new THREE.Group(); scene.add(geography);
  const buildings = new THREE.Group(); geography.add(buildings);
  const distribution = new THREE.Group(); geography.add(distribution);
  const network = new THREE.Group(); geography.add(network);
  const schools = new THREE.Group(); geography.add(schools);
  const pois = new THREE.Group(); geography.add(pois);
  const boundaries = new THREE.Group(); geography.add(boundaries);
  const ground = new THREE.Group(); geography.add(ground);
  const agentGeometry = new THREE.BufferGeometry();
  const agentMaterial = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, depthTest: false, transparent: true });
  agentMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;");
  };
  const points = new THREE.Points(agentGeometry, agentMaterial);
  points.frustumCulled = false; points.renderOrder = 10; geography.add(points);
  const selection = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({color: 0x253b36, wireframe: true, depthTest: false}));
  selection.visible = false; scene.add(selection);
  const selectionTrace = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: 0x263c35, depthTest: false, transparent: true}));
  selectionTrace.renderOrder = 11; geography.add(selectionTrace);
  const replayMarker = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({color: 0xd99434, depthTest: false}));
  replayMarker.renderOrder = 12; replayMarker.visible = false; scene.add(replayMarker);
  let scope = null;
  let loadedGraph = null;
  let verticalScale = 3;
  let bounds = new THREE.Box3();
  let lastAt = 0;
  let agentCount = 0;
  let deviceWidth = innerWidth;
  let viewportSize = [0, 0];
  let snapshot;
  let traceCoordinates = [];
  let pendingFocusPoints = null;
  const conversion = () => snapshot.zUnits / snapshot.units;
  function worldPoint(point, z = point.z || 0) { return new THREE.Vector3(point.x, z * conversion(), -point.y); }
  function disposeGroup(group) {
    for (const object of [...group.children]) {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else { object.material?.map?.dispose(); object.material?.dispose(); }
      group.remove(object);
    }
  }
  function lineObject(coordinates, color, opacity = 1) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(coordinates, 3));
    return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  }
  function fit() {
    if (bounds.isEmpty()) return;
    const box = bounds.clone(); box.min.y *= verticalScale; box.max.y *= verticalScale;
    const center = box.getCenter(new THREE.Vector3());
    const direction = new THREE.Vector3(0.12, 0.88, 0.56).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    let distance = 1;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const delta = new THREE.Vector3(x, y, z).sub(center);
      distance = Math.max(distance, Math.abs(delta.dot(right)) / tanH + delta.dot(direction), Math.abs(delta.dot(up)) / tanV + delta.dot(direction));
    }
    distance *= 1.13;
    orbit.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.lookAt(center); orbit.update();
  }
  function buildGeography() {
    for (const group of [buildings, distribution, boundaries, ground, schools, pois]) disposeGroup(group);
    bounds = new THREE.Box3();
    const outlines = [];
    const groundGeometries = [];
    const groundAreas = [];
    for (const area of snapshot.areas) {
      for (const ring of area.polygon || []) {
        if (ring.length < 3) continue;
        const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
        const geometry = new THREE.ShapeGeometry(shape);
        geometry.rotateX(-Math.PI / 2);
        groundGeometries.push(geometry);
        const faceCount = (geometry.index?.count || geometry.attributes.position.count) / 3;
        for (let face = 0; face < faceCount; face++) groundAreas.push(area);
        ring.forEach(([x, y], index) => {
          const next = ring[(index + 1) % ring.length];
          outlines.push(x, 0, -y, next[0], 0, -next[1]);
          bounds.expandByPoint(new THREE.Vector3(x, 0, -y));
        });
      }
    }
    if (groundGeometries.length) {
      const merged = mergeGeometries(groundGeometries, false);
      const fill = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: 0xdce7de, side: THREE.DoubleSide, transparent: true, opacity: 0.8, depthWrite: false }));
      fill.position.y = -0.015;
      fill.userData.areasByFace = groundAreas;
      ground.add(fill);
      groundGeometries.forEach((geometry) => geometry.dispose());
    }
    boundaries.add(lineObject(outlines, 0x8caba0, 0.65));
    const geometries = [];
    for (const building of snapshot.buildings) {
      if (!building.footprint?.length) continue;
      const shape = new THREE.Shape(building.footprint.map(([x, y]) => new THREE.Vector2(x, y)));
      const depth = Math.max(1, building.heightMeters || (building.height - building.base) * snapshot.zUnits) / snapshot.units;
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, (building.baseHeightMeters || 0) / snapshot.units, 0);
      geometries.push(geometry);
    }
    if (geometries.length) {
      const merged = mergeGeometries(geometries, false);
      merged.computeBoundingBox();
      if (snapshot.pilotEdges.length) bounds.copy(merged.boundingBox);
      else bounds.union(merged.boundingBox);
      buildings.add(new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: 0x6c9b93, roughness: 0.85, metalness: 0 })));
      geometries.forEach((geometry) => geometry.dispose());
    }
    // Flat density marks are aggregated cells, never extruded as fictitious buildings.
    const cells = snapshot.cells;
    const marks = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8), new THREE.MeshBasicMaterial({color: 0xadab72, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide}), cells.length);
    const transform = new THREE.Object3D();
    cells.forEach((cell, index) => {
      const radius = 0.04 + Math.sqrt(cell.areaNorm || cell.countNorm || 0.1) * 0.21;
      transform.position.set(cell.x, 0.005, -cell.y);
      transform.rotation.x = -Math.PI / 2; transform.scale.set(radius, radius, radius); transform.updateMatrix();
      marks.setMatrixAt(index, transform.matrix);
    });
    distribution.add(marks);
    function placePoints(group, source, type, size) {
      const buckets = new Map();
      for (const point of source) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        const key = type === "school" ? point.stage || "primary" : point.group || "play";
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(point.x, ((point.z || point.terrain || 0) * conversion()) + 0.006, -point.y);
      }
      for (const [key, positions] of buckets) {
        const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
        window.WorkbenchData.marker(canvas.getContext("2d"), type, key);
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        group.add(new THREE.Points(geometry, new THREE.PointsMaterial({map: texture, size, sizeAttenuation: false, transparent: true, opacity: 0.9, alphaTest: 0.1, depthTest: false})));
      }
    }
    placePoints(schools, snapshot.schools, "school", 11);
    placePoints(pois, snapshot.pois, "poi", 8);
    status.textContent = `${snapshot.buildings.length} footprint models · ${snapshot.cells.length.toLocaleString()} density cells`;
    buildNetwork();
    fit();
  }
  function buildNetwork() {
    disposeGroup(network);
    const graphs = snapshot.graphs.length ? snapshot.graphs : snapshot.graph?.ready ? [snapshot.graph] : [];
    const coordinates = [];
    if (!graphs.length) {
      for (const edge of snapshot.pilotEdges) {
        const from = snapshot.pilotNodes[edge[0]], to = snapshot.pilotNodes[edge[1]];
        if (from && to) {
          coordinates.push(from[0], from[2] * conversion(), -from[1], to[0], to[2] * conversion(), -to[1]);
          bounds.expandByPoint(new THREE.Vector3(from[0], from[2] * conversion(), -from[1]));
          bounds.expandByPoint(new THREE.Vector3(to[0], to[2] * conversion(), -to[1]));
        }
      }
      if (coordinates.length) network.add(lineObject(coordinates, 0x55867f, 0.6));
      return;
    }
    const step = Math.max(1, Math.ceil(graphs.reduce((sum, graph) => sum + graph.edgeFrom.length, 0) / 90000));
    for (const graph of graphs) {
      for (let edge = 0; edge < graph.edgeFrom.length; edge += step) {
        const from = worldPoint(graph.nodePoint(graph.edgeFrom[edge]));
        const to = worldPoint(graph.nodePoint(graph.edgeTo[edge]));
        coordinates.push(from.x, from.y + 0.003, from.z, to.x, to.y + 0.003, to.z);
      }
    }
    network.add(lineObject(coordinates, 0x55867f, 0.48));
    status.textContent = `${snapshot.buildings.length} footprint models · ${snapshot.cells.length.toLocaleString()} density cells · ${(coordinates.length / 6).toLocaleString()} display edges`;
  }
  function resize() {
    const {width, height} = viewport.getBoundingClientRect();
    if (!width || !height) return;
    const changed = width !== viewportSize[0] || height !== viewportSize[1];
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    if (snapshot && (deviceWidth !== innerWidth || (changed && window.CrossPackLab?.selection()))) fitCurrentView();
    viewportSize = [width, height];
    deviceWidth = innerWidth;
  }
  function fitCurrentView() {
    const audit = window.CrossPackLab?.selection();
    if (audit?.points.length > 1) pendingFocusPoints = audit.points;
    else fit();
  }
  new ResizeObserver(resize).observe(viewport);
  const raycaster = new THREE.Raycaster();
  let pointerStart;
  renderer.domElement.addEventListener("pointerdown", (event) => { pointerStart = [event.clientX, event.clientY]; });
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    raycaster.params.Points.threshold = camera.position.distanceTo(orbit.target) * 0.005;
    const hits = raycaster.intersectObject(points);
    if (snapshot.layers.agents && hits.length) window.WorkbenchData.select(snapshot.agents[hits[0].index]);
    else {
      const areaHit = raycaster.intersectObjects(ground.children)[0];
      if (areaHit) window.WorkbenchData.selectArea(areaHit.object.userData.areasByFace[areaHit.faceIndex]);
    }
  });
  function render(at) {
    requestAnimationFrame(render);
    if (window.WorkbenchData?.activeView() !== "scene" || at - lastAt < 40) return;
    lastAt = at;
    snapshot = window.WorkbenchData.snapshot();
    if (scope !== snapshot.scope) { scope = snapshot.scope; buildGeography(); loadedGraph = null; }
    const graphKey = snapshot.graphs.length ? snapshot.graphs.map((graph) => graph.edgeFrom.length).join(":") : snapshot.graph;
    if ((snapshot.graph?.ready || snapshot.graphs.length) && loadedGraph !== graphKey) { loadedGraph = graphKey; buildNetwork(); }
    geography.scale.y = verticalScale;
    buildings.visible = snapshot.layers.buildings; distribution.visible = snapshot.layers.buildings;
    network.visible = snapshot.layers.routes; points.visible = snapshot.layers.agents;
    schools.visible = snapshot.layers.schools; pois.visible = snapshot.layers.poi;
    if (agentCount !== snapshot.agents.length) {
      agentCount = snapshot.agents.length;
      agentGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(agentCount * 3), 3));
      agentGeometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(agentCount * 3), 3));
    }
    const positions = agentGeometry.attributes.position;
    const colors = agentGeometry.attributes.color;
    const color = new THREE.Color();
    for (let i = 0; i < agentCount; i++) {
      const agent = snapshot.agents[i];
      positions.setXYZ(i, agent.pos.x, (agent.pos.z || 0) * conversion() + 0.002, -agent.pos.y);
      color.set(snapshot.states[agent.state].color); colors.setXYZ(i, color.r, color.g, color.b);
    }
    if (positions) { positions.needsUpdate = true; colors.needsUpdate = true; }
    const selected = snapshot.agents.find((agent) => agent.id === window.WorkbenchData.selectedId());
    selection.visible = Boolean(selected && snapshot.layers.agents);
    if (selected) { selection.position.copy(worldPoint(selected.pos)); selection.position.y *= verticalScale; selection.scale.setScalar(camera.position.distanceTo(orbit.target) * 0.025); }
    const detail = window.WorkbenchData.selection();
    const coordinates = [];
    const traces = detail.type === "dcca" ? (detail.entity?.polygon || []).map((ring) => [...ring, ring[0]].map(([x, y]) => ({x, y, z: 0}))) : [detail.points];
    for (const trace of traces) for (let index = 1; index < trace.length; index++) {
      const from = worldPoint(trace[index - 1]), to = worldPoint(trace[index]);
      coordinates.push(from.x, from.y + 0.006, from.z, to.x, to.y + 0.006, to.z);
    }
    if (coordinates.length !== traceCoordinates.length || coordinates.some((value, index) => value !== traceCoordinates[index])) {
      traceCoordinates = coordinates;
      selectionTrace.geometry.dispose(); selectionTrace.geometry = new THREE.BufferGeometry();
      selectionTrace.geometry.setAttribute("position", new THREE.Float32BufferAttribute(coordinates, 3));
    }
    selectionTrace.visible = coordinates.length > 0;
    replayMarker.visible = detail.points.length > 1 && Boolean(detail.replayPoint);
    if (replayMarker.visible) {
      replayMarker.position.copy(worldPoint(detail.replayPoint)); replayMarker.position.y *= verticalScale;
      replayMarker.scale.setScalar(camera.position.distanceTo(orbit.target) * 0.055);
    }
    if (pendingFocusPoints) { focusPoints(pendingFocusPoints); pendingFocusPoints = null; }
    orbit.update(); renderer.render(scene, camera);
  }
  function focusPoints(points) {
    const box = new THREE.Box3().setFromPoints(points.map((point) => { const p = worldPoint(point); p.y *= verticalScale; return p; }));
    const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const radius = Math.max(0.04, size.length() / 2);
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = radius / Math.sin(Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect))) * 1.3;
    orbit.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(0.5, 0.8, 0.75).normalize().multiplyScalar(distance)); orbit.update();
  }
  window.WorkbenchScene = {
    ready: true, fit: fitCurrentView,
    setVisible: (visible) => { if (visible) { resize(); fitCurrentView(); } },
    setVerticalScale: (value) => { verticalScale = value; if (window.CrossPackLab?.selection()) fitCurrentView(); },
    cancelFocus: () => { pendingFocusPoints = null; },
    zoomIn: () => { camera.position.lerp(orbit.target, 0.25); },
    zoomOut: () => { camera.position.sub(orbit.target).multiplyScalar(1.3).add(orbit.target); },
    focusPoints: (points) => {
      if (!points?.length) return;
      // Apply after lazy scene construction, which performs its own extent fit.
      pendingFocusPoints = points;
    },
    focus: (entity) => { const target = worldPoint(entity.pos || entity, entity.pos?.z || entity.terrain || 0); target.y *= verticalScale; const offset = camera.position.clone().sub(orbit.target).normalize().multiplyScalar(entity.pos ? 2 : 8); orbit.target.copy(target); camera.position.copy(target).add(offset); orbit.update(); },
    diagnostics: () => {
      const corners = [];
      for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) corners.push(new THREE.Vector3(x,y*verticalScale,z).project(camera).toArray());
      const traceProjected = [];
      for (let i = 0; i < traceCoordinates.length; i += 3) traceProjected.push(new THREE.Vector3(traceCoordinates[i], traceCoordinates[i + 1] * verticalScale, traceCoordinates[i + 2]).project(camera).toArray());
      const traceBounds = traceProjected.length ? traceProjected.reduce((b, p) => ({minX: Math.min(b.minX, p[0]), maxX: Math.max(b.maxX, p[0]), minY: Math.min(b.minY, p[1]), maxY: Math.max(b.maxY, p[1]), inFrame: b.inFrame && p.every(v => Math.abs(v) <= 1)}), {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, inFrame: true}) : null;
      return {scope, agentCount, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, verticalScale, camera: camera.position.toArray(), target: orbit.target.toArray(), projectedBounds: corners, networkSegments: network.children[0]?.geometry.attributes.position.count / 2 || 0, selectionSegments: traceCoordinates.length / 6, traceBounds, replayVisible: replayMarker.visible, replayPosition: replayMarker.position.toArray()};
    },
  };
  viewport.classList.add("wb-webgl-ready"); resize(); requestAnimationFrame(render);
} catch (error) {
  status.textContent = "WebGL unavailable; original scene renderer retained.";
  console.error("Workbench 3D initialization:", error);
}
