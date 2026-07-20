"use strict";

const STATE_META = {
  sleep: { label: "Sleep", color: "#7a67a8" },
  home: { label: "Home", color: "#3d78a7" },
  commute: { label: "Commute", color: "#d99434" },
  school: { label: "School", color: "#247b72" },
  outdoor: { label: "Outdoor", color: "#6f9d45" },
  activity: { label: "Activity", color: "#c76571" },
};

const STATE_ORDER = ["sleep", "home", "commute", "school", "outdoor", "activity"];

const SCENARIOS = {
  baseline: {
    name: "Baseline school day",
    schoolOpen: true,
    outdoorFactor: 1,
    activityFactor: 1,
    heat: 0.45,
    mobility: 1,
    contact: 1,
  },
  walkable: {
    name: "Walkable school streets",
    schoolOpen: true,
    outdoorFactor: 1.28,
    activityFactor: 1.05,
    heat: 0.38,
    mobility: 1.15,
    contact: 1.08,
  },
  heat: {
    name: "Very hot afternoon",
    schoolOpen: true,
    outdoorFactor: 0.36,
    activityFactor: 1.12,
    heat: 1.2,
    mobility: 0.92,
    contact: 0.9,
  },
  exam: {
    name: "Exam week",
    schoolOpen: true,
    outdoorFactor: 0.48,
    activityFactor: 1.24,
    heat: 0.42,
    mobility: 0.88,
    contact: 0.82,
  },
  typhoon: {
    name: "Typhoon shelter day",
    schoolOpen: false,
    outdoorFactor: 0.04,
    activityFactor: 0.38,
    heat: 0.18,
    mobility: 0.18,
    contact: 0.28,
  },
};

const RULE_DEFAULTS = Object.freeze({
  crowdAvoidance: 0.7,
  destinationCrowdPenalty: 0.85,
  contactSensitivity: 1,
  parkAttraction: 1,
  heatAvoidance: 0.8,
});

const INTERACTION_CELL_SIZE = 0.45;
const INTERACTION_HEIGHT_SIZE = 7;

const realGeoData = window.HK_REAL_GEO_DATA || null;
const appUnitMeters = realGeoData?.metadata?.appUnitMeters || 600;
const verticalUnitMeters = realGeoData?.metadata?.verticalUnitMeters || 6;

const syntheticZones = [
  {
    id: "cw-dcca",
    code: "DCCA C&W",
    name: "Central and Western DCCA",
    type: "DCCA",
    x: -68,
    y: -12,
    radius: 13,
    terrain: 9,
    height: 66,
    density: 0.92,
    schools: 0.85,
    parks: 0.34,
    transit: 0.96,
    childWeight: 0.72,
    color: "#53a39b",
  },
  {
    id: "wc-dcca",
    code: "DCCA WC",
    name: "Wan Chai DCCA",
    type: "DCCA",
    x: -44,
    y: -7,
    radius: 12,
    terrain: 6,
    height: 58,
    density: 0.88,
    schools: 0.78,
    parks: 0.29,
    transit: 0.95,
    childWeight: 0.64,
    color: "#df9f43",
  },
  {
    id: "east-dcca",
    code: "DCCA E",
    name: "Eastern DCCA",
    type: "DCCA",
    x: -18,
    y: -4,
    radius: 15,
    terrain: 5,
    height: 52,
    density: 0.82,
    schools: 0.82,
    parks: 0.43,
    transit: 0.87,
    childWeight: 0.88,
    color: "#6da04f",
  },
  {
    id: "ssp-tpu",
    code: "TPU SSP",
    name: "Sham Shui Po TPU cluster",
    type: "TPU",
    x: -38,
    y: 22,
    radius: 14,
    terrain: 4,
    height: 55,
    density: 0.94,
    schools: 0.76,
    parks: 0.24,
    transit: 0.9,
    childWeight: 1.0,
    color: "#ce717a",
  },
  {
    id: "klncity-tpu",
    code: "TPU KC",
    name: "Kowloon City TPU cluster",
    type: "TPU",
    x: -10,
    y: 24,
    radius: 15,
    terrain: 5,
    height: 50,
    density: 0.82,
    schools: 0.9,
    parks: 0.39,
    transit: 0.82,
    childWeight: 0.86,
    color: "#9b75b9",
  },
  {
    id: "kt-dcca",
    code: "DCCA KT",
    name: "Kwun Tong DCCA",
    type: "DCCA",
    x: 18,
    y: 18,
    radius: 17,
    terrain: 6,
    height: 62,
    density: 0.9,
    schools: 0.84,
    parks: 0.31,
    transit: 0.88,
    childWeight: 1.06,
    color: "#3e86b6",
  },
  {
    id: "st-tpu",
    code: "TPU ST",
    name: "Sha Tin TPU cluster",
    type: "TPU",
    x: 10,
    y: 58,
    radius: 20,
    terrain: 10,
    height: 44,
    density: 0.74,
    schools: 0.89,
    parks: 0.55,
    transit: 0.75,
    childWeight: 1.12,
    color: "#4c9f88",
  },
  {
    id: "tp-tpu",
    code: "TPU TP",
    name: "Tai Po TPU cluster",
    type: "TPU",
    x: 35,
    y: 80,
    radius: 18,
    terrain: 12,
    height: 34,
    density: 0.56,
    schools: 0.74,
    parks: 0.68,
    transit: 0.58,
    childWeight: 0.74,
    color: "#82a44c",
  },
  {
    id: "yl-tpu",
    code: "TPU YL",
    name: "Yuen Long TPU cluster",
    type: "TPU",
    x: -48,
    y: 78,
    radius: 21,
    terrain: 4,
    height: 32,
    density: 0.62,
    schools: 0.7,
    parks: 0.5,
    transit: 0.55,
    childWeight: 1.08,
    color: "#d58b42",
  },
  {
    id: "tm-dcca",
    code: "DCCA TM",
    name: "Tuen Mun DCCA",
    type: "DCCA",
    x: -75,
    y: 57,
    radius: 19,
    terrain: 5,
    height: 38,
    density: 0.68,
    schools: 0.78,
    parks: 0.57,
    transit: 0.62,
    childWeight: 0.94,
    color: "#bc7466",
  },
  {
    id: "islands-tpu",
    code: "TPU IS",
    name: "Islands TPU cluster",
    type: "TPU",
    x: -83,
    y: -44,
    radius: 17,
    terrain: 16,
    height: 24,
    density: 0.3,
    schools: 0.52,
    parks: 0.74,
    transit: 0.42,
    childWeight: 0.36,
    color: "#5a9fc3",
  },
  {
    id: "sk-dcca",
    code: "DCCA SK",
    name: "Sai Kung DCCA",
    type: "DCCA",
    x: 58,
    y: 42,
    radius: 18,
    terrain: 18,
    height: 30,
    density: 0.42,
    schools: 0.62,
    parks: 0.78,
    transit: 0.48,
    childWeight: 0.48,
    color: "#7b9f58",
  },
];

const zones = (realGeoData ? realGeoData.districts : syntheticZones).map((zone) => ({
  ...zone,
  buildings: [],
}));
const focusAreas = realGeoData
  ? [
      ...zones,
      ...realGeoData.dccas2019.map((area) => ({
        ...area,
        color: area.color || "#20232a",
      })),
    ]
  : zones;
const focusAreaById = new Map(focusAreas.map((area) => [area.id, area]));
const realBuildingLayer = realGeoData ? realGeoData.buildings : [];
const realSchoolLayer = realGeoData?.schoolLocations || [];
const schoolsByStage = {
  kindergarten: [],
  primary: [],
  secondary: [],
  special: [],
  other: [],
};
const buildingDistribution = realGeoData?.buildingDistribution || [];
const sceneBuildingDistribution = [...buildingDistribution]
  .filter((cell) => Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45) >= 0.018)
  .sort(
    (a, b) =>
      Math.max(b.areaNorm || 0, (b.countNorm || 0) * 0.45) -
      Math.max(a.areaNorm || 0, (a.countNorm || 0) * 0.45),
  )
  .slice(0, 280);
const officialBuildingSource = realGeoData?.metadata?.sources?.find((source) =>
  source.name?.includes("CSDI Building"),
);

const sceneCanvas = document.getElementById("sceneCanvas");
const sceneCtx = sceneCanvas.getContext("2d");
const mapCanvas = document.getElementById("mapCanvas");
const mapCtx = mapCanvas.getContext("2d");
const osmCanvas = document.getElementById("osmCanvas");
const osmCtx = osmCanvas.getContext("2d");
const buildingCanvas = document.getElementById("buildingCanvas");
const buildingCtx = buildingCanvas.getContext("2d");
const buildingsView = document.getElementById("buildingsView");
const statsView = document.getElementById("statsView");
const rulesView = document.getElementById("rulesView");
const tooltip = document.getElementById("tooltip");

const controls = {
  scenario: document.getElementById("scenarioSelect"),
  focus: document.getElementById("focusSelect"),
  population: document.getElementById("populationRange"),
  populationOutput: document.getElementById("populationOutput"),
  speed: document.getElementById("speedRange"),
  speedOutput: document.getElementById("speedOutput"),
  time: document.getElementById("timeRange"),
  timeOutput: document.getElementById("timeOutput"),
  zoomOut: document.getElementById("zoomOutButton"),
  zoomFit: document.getElementById("zoomFitButton"),
  zoomIn: document.getElementById("zoomInButton"),
  cameraTools: document.querySelector(".view-tools"),
  building: document.getElementById("buildingSelect"),
  toggle: document.getElementById("toggleButton"),
  reset: document.getElementById("resetButton"),
  resetRules: document.getElementById("resetRulesButton"),
  clock: document.getElementById("clockDisplay"),
  phase: document.getElementById("dayPhase"),
  ruleInputs: {
    crowdAvoidance: document.getElementById("crowdAvoidanceRange"),
    destinationCrowdPenalty: document.getElementById("destinationCrowdRange"),
    contactSensitivity: document.getElementById("contactSensitivityRange"),
    parkAttraction: document.getElementById("parkAttractionRange"),
    heatAvoidance: document.getElementById("heatAvoidanceRange"),
  },
  ruleOutputs: {
    crowdAvoidance: document.getElementById("crowdAvoidanceOutput"),
    destinationCrowdPenalty: document.getElementById("destinationCrowdOutput"),
    contactSensitivity: document.getElementById("contactSensitivityOutput"),
    parkAttraction: document.getElementById("parkAttractionOutput"),
    heatAvoidance: document.getElementById("heatAvoidanceOutput"),
  },
};

const metricEls = {
  focusName: document.getElementById("focusName"),
  focusType: document.getElementById("focusType"),
  focusArea: document.getElementById("focusArea"),
  focusHeight: document.getElementById("focusHeight"),
  focusMaxBuilding: document.getElementById("focusMaxBuilding"),
  focusVolume: document.getElementById("focusVolume"),
  focusChildren: document.getElementById("focusChildren"),
  focusDensity: document.getElementById("focusDensity"),
  focusFloor: document.getElementById("focusFloor"),
  focusHeat: document.getElementById("focusHeat"),
  focusResidentChildren: document.getElementById("focusResidentChildren"),
  focusSchools: document.getElementById("focusSchools"),
  focusParks: document.getElementById("focusParks"),
  focusActivities: document.getElementById("focusActivities"),
  school: document.getElementById("schoolMetric"),
  commute: document.getElementById("commuteMetric"),
  outdoor: document.getElementById("outdoorMetric"),
  contact: document.getElementById("contactMetric"),
  crowded: document.getElementById("crowdedMetric"),
  exposure: document.getElementById("exposureMetric"),
  avoidance: document.getElementById("avoidanceMetric"),
  scenarioSchool: document.getElementById("scenarioSchool"),
  scenarioOutdoor: document.getElementById("scenarioOutdoor"),
  scenarioActivity: document.getElementById("scenarioActivity"),
  scenarioHeat: document.getElementById("scenarioHeat"),
  scenarioMobility: document.getElementById("scenarioMobility"),
  scenarioContact: document.getElementById("scenarioContact"),
  boundarySource: document.getElementById("boundarySource"),
  buildingSource: document.getElementById("buildingSource"),
  behaviourSource: document.getElementById("behaviourSource"),
  buildingName: document.getElementById("buildingName"),
  buildingHeight: document.getElementById("buildingHeight"),
  buildingLevels: document.getElementById("buildingLevels"),
  buildingFootprint: document.getElementById("buildingFootprint"),
  buildingModelSource: document.getElementById("buildingModelSource"),
  activityList: document.getElementById("activityList"),
  statsGrid: document.getElementById("statsGrid"),
  activityStack: document.getElementById("activityStack"),
  historyChart: document.getElementById("historyChart"),
};

const world = {
  agents: [],
  time: 7 * 60,
  population: 2000,
  scenario: "baseline",
  focusId: zones[0]?.id || "cw-dcca",
  running: true,
  speed: 36,
  metrics: null,
  buildingId: realBuildingLayer[0]?.id || "",
  history: [],
  lastHistoryHour: -1,
  elapsedMinutes: 0,
  avoidedDestinations: 0,
  rules: { ...RULE_DEFAULTS },
  interactionField: {
    cells: new Map(),
    zoneOccupancy: new Map(),
  },
};

const camera = {
  yaw: -0.72,
  pitch: 0.82,
  zoom: realGeoData ? 3.85 : 3.45,
  target: realGeoData ? { x: 0, y: 0, z: 9 } : { x: -8, y: 30, z: 14 },
};

const pointer = {
  dragging: false,
  lastX: 0,
  lastY: 0,
  x: 0,
  y: 0,
};

const buildingCamera = {
  yaw: -0.72,
  pitch: 0.82,
  zoom: 1,
};

const buildingPointer = {
  dragging: false,
  lastX: 0,
  lastY: 0,
  totalMove: 0,
};

const osmMap = {
  centerLon: 114.17,
  centerLat: 22.34,
  zoom: 10,
};

const osmPointer = {
  dragging: false,
  lastX: 0,
  lastY: 0,
  totalMove: 0,
};

const osmTileCache = new Map();
const osmStaticCanvas = document.createElement("canvas");
const osmStaticCtx = osmStaticCanvas.getContext("2d");
let osmStaticDirty = true;
let localToLonLatTransform = null;

let activeView = "scene";
let lastFrame = performance.now();
let lastMetricsAt = 0;
let lastRenderAt = 0;

function mulberry32(seed) {
  return function nextRandom() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const geometryRandom = mulberry32(42021);
const agentRandom = mulberry32(91307);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = amount < 1 ? 0 : 255;
  const t = amount < 1 ? 1 - amount : amount - 1;
  const nr = Math.round(r + (mix - r) * t);
  const ng = Math.round(g + (mix - g) * t);
  const nb = Math.round(b + (mix - b) * t);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function formatTime(minutes) {
  const dayMinute = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(dayMinute / 60);
  const mins = dayMinute % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function dayPhase(minutes) {
  const t = ((minutes % 1440) + 1440) % 1440;
  if (t < 360) return "Night";
  if (t < 720) return "Morning";
  if (t < 1080) return "Afternoon";
  if (t < 1320) return "Evening";
  return "Night";
}

function weightedChoice(items, weightFn, random = agentRandom) {
  const total = items.reduce((sum, item) => sum + Math.max(0.001, weightFn(item)), 0);
  let pick = random() * total;
  for (const item of items) {
    pick -= Math.max(0.001, weightFn(item));
    if (pick <= 0) return item;
  }
  return items[items.length - 1];
}

function solve3x3(matrix, vector) {
  const a = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < 3; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 3; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-9) return [0, 0, 0];
    if (pivot !== col) [a[pivot], a[col]] = [a[col], a[pivot]];
    const divisor = a[col][col];
    for (let k = col; k < 4; k += 1) a[col][k] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let k = col; k < 4; k += 1) a[row][k] -= factor * a[col][k];
    }
  }
  return [a[0][3], a[1][3], a[2][3]];
}

function fitLocalToLonLat() {
  if (!realGeoData) return null;
  const rows = zones.filter((zone) => Number.isFinite(zone.lon) && Number.isFinite(zone.lat));
  if (rows.length < 3) return null;
  const normal = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const lonVector = [0, 0, 0];
  const latVector = [0, 0, 0];
  rows.forEach((zone) => {
    const basis = [1, zone.x, zone.y];
    for (let r = 0; r < 3; r += 1) {
      lonVector[r] += basis[r] * zone.lon;
      latVector[r] += basis[r] * zone.lat;
      for (let c = 0; c < 3; c += 1) normal[r][c] += basis[r] * basis[c];
    }
  });
  return {
    lon: solve3x3(normal, lonVector),
    lat: solve3x3(normal, latVector),
  };
}

function localToLonLat(point) {
  if (!localToLonLatTransform) return { lon: 114.17, lat: 22.34 };
  const basis = [1, point.x, point.y];
  return {
    lon: localToLonLatTransform.lon.reduce((sum, coef, index) => sum + coef * basis[index], 0),
    lat: localToLonLatTransform.lat.reduce((sum, coef, index) => sum + coef * basis[index], 0),
  };
}

function computeAreaBounds(area) {
  if (!area.polygon) {
    return {
      minX: area.x - area.radius,
      maxX: area.x + area.radius,
      minY: area.y - area.radius,
      maxY: area.y + area.radius,
    };
  }
  const xs = [];
  const ys = [];
  area.polygon.forEach((ring) => {
    ring.forEach(([x, y]) => {
      xs.push(x);
      ys.push(y);
    });
  });
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function computeCombinedBounds(areas) {
  return areas.reduce(
    (bounds, area) => {
      const b = area.bounds || computeAreaBounds(area);
      return {
        minX: Math.min(bounds.minX, b.minX),
        maxX: Math.max(bounds.maxX, b.maxX),
        minY: Math.min(bounds.minY, b.minY),
        maxY: Math.max(bounds.maxY, b.maxY),
      };
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

function fitCameraToArea(area = null) {
  const bounds = area ? area.bounds || computeAreaBounds(area) : computeCombinedBounds(zones);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const range = Math.max(width, height);
  camera.target = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: Math.max(8, (area?.height || 18) * 0.24),
  };
  camera.zoom = clamp(470 / range, 2.1, 8.8);
}

function zoomCamera(factor) {
  camera.zoom = clamp(camera.zoom * factor, 1.7, 9.4);
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInArea(point, area) {
  if (!area?.polygon) return distance2D(point, area) <= area.radius;
  return area.polygon.some((ring) => pointInRing(point, ring));
}

function areaRings(area, z = area.terrain || 0, scale = 1) {
  if (!area?.polygon) return [zoneEllipse(area, z, scale)];
  return area.polygon
    .filter((ring) => ring.length >= 3)
    .map((ring) =>
      ring.map(([x, y]) => ({
        x: area.x + (x - area.x) * scale,
        y: area.y + (y - area.y) * scale,
        z,
      })),
    );
}

function largestRing(area) {
  if (!area?.polygon?.length) return null;
  return area.polygon.reduce((best, ring) => (ring.length > best.length ? ring : best), area.polygon[0]);
}

function areaContainsBuilding(area, building) {
  return pointInArea({ x: building.x, y: building.y }, area);
}

function setupSchoolLocations() {
  Object.values(schoolsByStage).forEach((items) => {
    items.length = 0;
  });

  realSchoolLayer.forEach((school) => {
    school.zone = focusAreaById.get(school.zoneId) || zones.find((zone) => pointInArea(school, zone)) || null;
    const stage = school.stage && schoolsByStage[school.stage] ? school.stage : "other";
    schoolsByStage[stage].push(school);
  });
}

function setupZones() {
  focusAreas.forEach((area) => {
    area.bounds = computeAreaBounds(area);
  });

  if (realGeoData) {
    zones.forEach((zone) => {
      zone.buildings = realBuildingLayer.filter((building) => areaContainsBuilding(zone, building));
      zone.homeAnchor = { x: zone.x, y: zone.y, z: zone.terrain + Math.max(7, zone.height * 0.34) };
      zone.schoolAnchor = offsetPoint(zone, 0.18, 0.05, zone.terrain + Math.max(5, zone.height * 0.18));
      zone.parkAnchor = offsetPoint(zone, -0.08, 0.18, zone.terrain + 1.2);
      zone.activityAnchor = offsetPoint(zone, 0.12, -0.12, zone.terrain + Math.max(6, zone.height * 0.24));
    });
    setupSchoolLocations();
    return;
  }

  zones.forEach((zone, zoneIndex) => {
    zone.buildings = [];
    const count = Math.round(5 + zone.density * 9 + zone.radius / 4);
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399 + zoneIndex * 0.67;
      const ring = 0.18 + 0.74 * geometryRandom();
      const cx = zone.x + Math.cos(angle) * zone.radius * ring * (0.75 + geometryRandom() * 0.45);
      const cy = zone.y + Math.sin(angle) * zone.radius * ring * (0.62 + geometryRandom() * 0.42);
      const width = 2.4 + geometryRandom() * 3.8;
      const depth = 2.8 + geometryRandom() * 4.4;
      const height =
        zone.terrain +
        7 +
        zone.height * (0.18 + zone.density * 0.42 + geometryRandom() * 0.36);
      zone.buildings.push({
        x: cx,
        y: cy,
        width,
        depth,
        base: zone.terrain,
        height,
      });
    }

    zone.homeAnchor = offsetPoint(zone, -0.18, -0.08, zone.terrain + Math.max(9, zone.height * 0.45));
    zone.schoolAnchor = offsetPoint(zone, 0.2, 0.08, zone.terrain + Math.max(8, zone.height * 0.24));
    zone.parkAnchor = offsetPoint(zone, -0.05, 0.3, zone.terrain + 1.2);
    zone.activityAnchor = offsetPoint(zone, 0.28, -0.22, zone.terrain + Math.max(10, zone.height * 0.34));
  });
  setupSchoolLocations();
}

function offsetPoint(zone, xFactor, yFactor, z) {
  return {
    x: zone.x + zone.radius * xFactor,
    y: zone.y + zone.radius * yFactor,
    z,
  };
}

function populateSelects() {
  controls.focus.innerHTML = "";
  const addOption = (parent, area) => {
    const option = document.createElement("option");
    option.value = area.id;
    option.textContent = `${area.code} - ${area.name}`;
    parent.append(option);
  };

  if (realGeoData) {
    const districtGroup = document.createElement("optgroup");
    districtGroup.label = "Official 18 Districts";
    zones.forEach((zone) => addOption(districtGroup, zone));
    controls.focus.append(districtGroup);

    const dccaGroup = document.createElement("optgroup");
    dccaGroup.label = "Official 2019 DCCA boundaries";
    realGeoData.dccas2019.forEach((area) => addOption(dccaGroup, area));
    controls.focus.append(dccaGroup);
  } else {
    zones.forEach((zone) => addOption(controls.focus, zone));
  }
  controls.focus.value = world.focusId;
}

function populateBuildingSelect() {
  controls.building.innerHTML = "";
  if (!realBuildingLayer.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No building data loaded";
    controls.building.append(option);
    world.buildingId = "";
    return;
  }

  realBuildingLayer.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = `${building.name} - ${formatNumber(building.heightMeters || 0, 0)} m`;
    controls.building.append(option);
  });

  world.buildingId = realBuildingLayer.some((building) => building.id === world.buildingId)
    ? world.buildingId
    : realBuildingLayer[0].id;
  controls.building.value = world.buildingId;
  updateBuildingPanel();
}

function selectedBuilding() {
  return realBuildingLayer.find((building) => building.id === world.buildingId) || realBuildingLayer[0] || null;
}

function updateBuildingPanel() {
  const building = selectedBuilding();
  if (!building) {
    metricEls.buildingName.textContent = "No building data";
    metricEls.buildingHeight.textContent = "n/a";
    metricEls.buildingLevels.textContent = "n/a";
    metricEls.buildingFootprint.textContent = "n/a";
    metricEls.buildingModelSource.textContent = "No source";
    return;
  }

  metricEls.buildingName.textContent = building.name;
  metricEls.buildingHeight.textContent = `${formatNumber(building.heightMeters || 0, 1)} m`;
  metricEls.buildingLevels.textContent = building.levels ? formatNumber(building.levels, 1) : "n/a";
  metricEls.buildingFootprint.textContent = `${formatNumber(building.areaSqm || 0, 0)} m2`;
  metricEls.buildingModelSource.textContent = building.heightSource || building.source || "OSM";
}

function makeActivityMeters() {
  metricEls.activityList.innerHTML = "";
  metricEls.activityStack.innerHTML = "";
  STATE_ORDER.forEach((state) => {
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `
      <span>${STATE_META[state].label}</span>
      <div class="activity-meter"><span style="background:${STATE_META[state].color}"></span></div>
      <strong>0%</strong>
    `;
    metricEls.activityList.append(item);

    const stack = document.createElement("div");
    stack.className = "stack-bar";
    stack.dataset.state = state;
    stack.innerHTML = `
      <div class="stack-fill" style="height:2px;background:${STATE_META[state].color}"></div>
      <div class="stack-label">${STATE_META[state].label}</div>
    `;
    metricEls.activityStack.append(stack);
  });
}

function randomPointInZone(zone, random = agentRandom, radiusMultiplier = 0.55) {
  if (zone.polygon && zone.bounds) {
    const centerBias = clamp(radiusMultiplier, 0.12, 0.95);
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const x = lerp(zone.x, zone.bounds.minX + random() * (zone.bounds.maxX - zone.bounds.minX), centerBias);
      const y = lerp(zone.y, zone.bounds.minY + random() * (zone.bounds.maxY - zone.bounds.minY), centerBias);
      if (pointInArea({ x, y }, zone)) return { x, y };
    }
    const ring = largestRing(zone);
    if (ring) {
      const [x, y] = ring[Math.floor(random() * ring.length)];
      return { x: lerp(zone.x, x, 0.55), y: lerp(zone.y, y, 0.55) };
    }
  }
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * zone.radius * radiusMultiplier;
  return {
    x: zone.x + Math.cos(angle) * radius,
    y: zone.y + Math.sin(angle) * radius * 0.76,
  };
}

function schoolStageForAge(age) {
  if (age < 6) return "kindergarten";
  if (age < 12) return "primary";
  return "secondary";
}

function chooseSchool(homeZone, age) {
  if (!realSchoolLayer.length) return null;
  const stage = schoolStageForAge(age);
  const stageCandidates = [
    ...(schoolsByStage[stage] || []),
    ...(stage === "secondary" ? schoolsByStage.special : []),
  ];
  const maxDistance = age < 9 ? 42 : age < 13 ? 62 : 90;
  const candidates = stageCandidates.filter((school) => school.zone && distance2D(school, homeZone) <= maxDistance);
  const fallback = candidates.length ? candidates : stageCandidates.length ? stageCandidates : realSchoolLayer;
  return weightedChoice(fallback, (school) => {
    const dist = Math.max(0.35, distance2D(school, homeZone));
    const zone = school.zone || homeZone;
    const districtPull = zone.id === homeZone.id ? 1.55 : 1;
    const schoolService = 0.45 + (zone.schools || 0.5) * 0.65;
    const transit = 0.55 + (zone.transit || 0.5) * 0.45;
    return districtPull * schoolService * transit * (1 / Math.pow(dist, age < 9 ? 1.42 : 1.02));
  });
}

function chooseSchoolZone(homeZone, age) {
  const school = chooseSchool(homeZone, age);
  if (school?.zone) return school.zone;
  const maxDistance = age < 9 ? 42 : age < 13 ? 62 : 90;
  const candidates = zones.filter((zone) => distance2D(zone, homeZone) <= maxDistance);
  return weightedChoice(candidates.length ? candidates : zones, (zone) => {
    const dist = Math.max(1, distance2D(zone, homeZone));
    return zone.schools * zone.transit * (1 / Math.pow(dist, age < 9 ? 1.55 : 1.05));
  });
}

function interactionCellCoordinates(point) {
  return {
    x: Math.floor(point.x / INTERACTION_CELL_SIZE),
    y: Math.floor(point.y / INTERACTION_CELL_SIZE),
    z: Math.floor(point.z / INTERACTION_HEIGHT_SIZE),
  };
}

function interactionCellKey(x, y, z) {
  return `${x},${y},${z}`;
}

function buildInteractionField() {
  const cells = new Map();
  const zoneOccupancy = new Map();

  for (const agent of world.agents) {
    const zoneId = agent.target?.zone?.id;
    if (zoneId) zoneOccupancy.set(zoneId, (zoneOccupancy.get(zoneId) || 0) + 1);
    if (!["school", "outdoor", "activity"].includes(agent.state)) continue;

    const cell = interactionCellCoordinates(agent.pos);
    const key = interactionCellKey(cell.x, cell.y, cell.z);
    const entry = cells.get(key) || { count: 0, x: 0, y: 0, z: 0 };
    entry.count += 1;
    entry.x += agent.pos.x;
    entry.y += agent.pos.y;
    entry.z += agent.pos.z;
    cells.set(key, entry);
  }

  world.interactionField = { cells, zoneOccupancy };
}

function zoneCrowding(zone) {
  const occupancy = world.interactionField?.zoneOccupancy?.get(zone.id) || 0;
  const totalWeight = zones.reduce((sum, item) => sum + Math.max(0.05, item.childWeight || 0.5), 0);
  const expected = Math.max(10, world.population * (Math.max(0.05, zone.childWeight || 0.5) / totalWeight) * 0.32);
  return occupancy / expected;
}

function chooseActivityZone(homeZone, agent) {
  const candidates = zones.filter((zone) => distance2D(zone, homeZone) <= agent.mobilityRadius);
  const scenario = SCENARIOS[world.scenario];
  return weightedChoice(candidates.length ? candidates : zones, (zone) => {
    const dist = Math.max(1, distance2D(zone, homeZone));
    const heightFactor = clamp((zone.heightMeters || zone.height * verticalUnitMeters) / 180, 0, 1);
    const environment =
      zone.parks * 0.46 * world.rules.parkAttraction +
      (zone.activityService || 0.4) * 0.18 +
      zone.transit * 0.27 +
      zone.density * 0.12 +
      zone.schools * 0.035 +
      heightFactor * scenario.heat * 0.08;
    const heatPenalty =
      scenario.heat * world.rules.heatAvoidance * (1 - zone.parks * 0.65) * 0.22;
    const crowdPenalty = zoneCrowding(zone) * world.rules.destinationCrowdPenalty * 0.38;
    return Math.max(0.015, (environment - heatPenalty - crowdPenalty + 0.12) / Math.sqrt(dist));
  });
}

function localInteraction(agent) {
  if (!["school", "outdoor", "activity"].includes(agent.state)) {
    return { crowding: 0, avoidX: 0, avoidY: 0 };
  }

  const origin = interactionCellCoordinates(agent.pos);
  let neighbours = 0;
  let avoidX = 0;
  let avoidY = 0;

  for (let ix = -1; ix <= 1; ix += 1) {
    for (let iy = -1; iy <= 1; iy += 1) {
      const entry = world.interactionField.cells.get(
        interactionCellKey(origin.x + ix, origin.y + iy, origin.z),
      );
      if (!entry) continue;
      const ownCell = ix === 0 && iy === 0;
      const count = Math.max(0, entry.count - (ownCell ? 1 : 0));
      if (!count) continue;

      const centerX = entry.x / entry.count;
      const centerY = entry.y / entry.count;
      let dx = agent.pos.x - centerX;
      let dy = agent.pos.y - centerY;
      let dist = Math.hypot(dx, dy);
      if (dist < 0.08) {
        const angle = ((agent.id * 137.5) % 360) * (Math.PI / 180);
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        dist = 1;
      }
      const weight = count / (0.8 + dist);
      avoidX += (dx / dist) * weight;
      avoidY += (dy / dist) * weight;
      neighbours += count;
    }
  }

  const avoidLength = Math.hypot(avoidX, avoidY);
  if (avoidLength > 0) {
    avoidX /= avoidLength;
    avoidY /= avoidLength;
  }
  return { crowding: neighbours, avoidX, avoidY };
}

function recordAvoidedDestination(agent) {
  if (agent.avoidedDestinationToday) return;
  agent.avoidedDestinationToday = true;
  world.avoidedDestinations += 1;
}

function resetSimulation() {
  world.population = Number(controls.population.value);
  world.scenario = controls.scenario.value;
  world.focusId = controls.focus.value;
  world.speed = Number(controls.speed.value);
  world.time = Number(controls.time.value);
  world.agents = [];
  world.history = [];
  world.lastHistoryHour = -1;
  world.elapsedMinutes = 0;
  world.avoidedDestinations = 0;
  world.interactionField = { cells: new Map(), zoneOccupancy: new Map() };

  for (let i = 0; i < world.population; i += 1) {
    const age = 3 + Math.floor(agentRandom() * 15);
    const homeZone = weightedChoice(zones, (zone) => (zone.childWeight || 0.5) * (0.45 + (zone.density || 0.5) * 0.45));
    const schoolPoint = chooseSchool(homeZone, age);
    const schoolZone = schoolPoint?.zone || chooseSchoolZone(homeZone, age);
    const activityZone = chooseActivityZone(homeZone, { mobilityRadius: age < 9 ? 44 : age < 13 ? 62 : 82 });
    const homePoint = randomPointInZone(homeZone, agentRandom, 0.5);
    const homeFloor = Math.max(
      1,
      Math.round(1 + agentRandom() * Math.max(2, (homeZone.height / 3) * (0.35 + homeZone.density * 0.5))),
    );
    const agent = {
      id: i + 1,
      age,
      homeZone,
      schoolZone,
      schoolPoint,
      activityZone,
      homeFloor,
      pos: {
        x: homePoint.x,
        y: homePoint.y,
        z: homeZone.terrain + homeFloor * 3,
      },
      target: null,
      state: "home",
      taskKey: "",
      speed: 0.055 + age * 0.004 + agentRandom() * 0.025,
      outdoorPreference: clamp(0.25 + agentRandom() * 0.7 + (age < 9 ? 0.12 : -0.04), 0.05, 0.95),
      activityPreference: clamp(0.25 + agentRandom() * 0.65 + (age > 11 ? 0.14 : 0), 0.05, 0.95),
      mobilityRadius: age < 9 ? 38 + agentRandom() * 14 : age < 13 ? 52 + agentRandom() * 22 : 68 + agentRandom() * 34,
      schoolShift: Math.round((agentRandom() - 0.5) * 22),
      scheduleNoise: Math.round((agentRandom() - 0.5) * 18),
      heatDose: 0,
      contactDose: 0,
      distanceTravelled: 0,
      verticalMinutes: 0,
      contacts: 0,
      localCrowding: 0,
      crowdTolerance: 2 + Math.floor(agentRandom() * 6),
      lastCrowdReroute: -1000,
      reroutesToday: 0,
      activityChoiceStale: false,
      avoidedDestinationToday: false,
    };
    agent.target = locationForTask(agent, { state: "home", dest: "home" });
    world.agents.push(agent);
  }

  buildInteractionField();
  world.metrics = computeMetrics();
  updatePanels();
}

function getTask(agent, minuteAbsolute) {
  const scenario = SCENARIOS[world.scenario];
  const minute = ((minuteAbsolute + agent.scheduleNoise) % 1440 + 1440) % 1440;
  const schoolStart = 8 * 60 + agent.schoolShift;
  const schoolEnd = 15 * 60 + 25 + Math.round(agent.age > 11 ? 24 : -12);

  if (minute < 6 * 60 + 15) return { state: "sleep", dest: "home" };
  if (!scenario.schoolOpen) {
    if (minute < 8 * 60) return { state: "home", dest: "home" };
    if (minute < 12 * 60) return { state: "activity", dest: "home" };
    if (minute < 18 * 60) return { state: agent.outdoorPreference * scenario.outdoorFactor > 0.7 ? "outdoor" : "home", dest: "home" };
    if (minute < 21 * 60 + 30) return { state: "home", dest: "home" };
    return { state: "sleep", dest: "home" };
  }

  if (minute < schoolStart - 48) return { state: "home", dest: "home" };
  if (minute < schoolStart) return { state: "commute", dest: "school" };
  if (minute < schoolEnd) return { state: "school", dest: "school" };
  if (minute < schoolEnd + 38) return { state: "commute", dest: "postschool" };
  if (minute < 18 * 60 + 35) {
    const heatResponse = clamp(
      scenario.heat * world.rules.heatAvoidance * (1 - agent.activityZone.parks * 0.55) * 0.58,
      0,
      0.92,
    );
    const playScore =
      agent.outdoorPreference *
      scenario.outdoorFactor *
      (agent.activityZone.parks * world.rules.parkAttraction + 0.35) *
      (1 - heatResponse);
    const activityScore =
      agent.activityPreference *
      scenario.activityFactor *
      (0.58 + (agent.activityZone.activityService || 0.4) * 0.24 + agent.activityZone.schools * 0.08);
    if (playScore > activityScore * 0.82) return { state: "outdoor", dest: "activity" };
    return { state: "activity", dest: "activity" };
  }
  if (minute < 19 * 60 + 15) return { state: "commute", dest: "home" };
  if (minute < 21 * 60 + 45) return { state: "home", dest: "home" };
  return { state: "sleep", dest: "home" };
}

function locationForTask(agent, task) {
  const scenario = SCENARIOS[world.scenario];
  let zone = agent.homeZone;
  let anchor = agent.homeZone.homeAnchor;
  let radiusMultiplier = 0.32;
  let z = agent.homeZone.terrain + agent.homeFloor * 3;
  let fixedPoint = null;

  if (task.dest === "school" || task.state === "school") {
    zone = agent.schoolZone;
    if (agent.schoolPoint) {
      fixedPoint = agent.schoolPoint;
      anchor = { x: agent.schoolPoint.x, y: agent.schoolPoint.y, z: zone.terrain + Math.max(4, zone.height * 0.16) };
      radiusMultiplier = 0.04;
    } else {
      anchor = zone.schoolAnchor;
      radiusMultiplier = 0.26;
    }
    z = zone.terrain + 4 + Math.min(zone.height * 0.45, 2 + (agent.age % 8) * 3);
  } else if (task.dest === "activity" || task.dest === "postschool") {
    zone = agent.activityZone;
    if (task.state === "outdoor") {
      anchor = zone.parkAnchor;
      radiusMultiplier = 0.48 + zone.parks * 0.18;
      z = zone.terrain + 1.4;
    } else {
      anchor = zone.activityAnchor;
      radiusMultiplier = 0.28;
      z = zone.terrain + 5 + Math.min(zone.height * 0.42, 8 + agent.age * 1.4);
    }
  }

  if (task.dest === "home" || task.state === "sleep" || (world.scenario === "typhoon" && task.dest !== "school")) {
    zone = agent.homeZone;
    anchor = zone.homeAnchor;
    radiusMultiplier = task.state === "sleep" ? 0.18 : 0.28;
    z = zone.terrain + agent.homeFloor * 3;
  }

  const point = fixedPoint
    ? {
        x: fixedPoint.x + (agentRandom() - 0.5) * 0.18,
        y: fixedPoint.y + (agentRandom() - 0.5) * 0.18,
      }
    : randomPointInZone(zone, agentRandom, radiusMultiplier);
  if (fixedPoint && !pointInArea(point, zone)) {
    point.x = fixedPoint.x;
    point.y = fixedPoint.y;
  }
  return {
    x: lerp(anchor.x, point.x, 0.55),
    y: lerp(anchor.y, point.y, 0.55),
    z: z + (agentRandom() - 0.5) * 1.2,
    zone,
    scenarioMobility: scenario.mobility,
  };
}

function updateAgent(agent, simMinutes) {
  const task = getTask(agent, world.time);
  const wanderBucket = Math.floor(world.time / (task.state === "commute" ? 240 : 18));
  const nextKey = `${task.state}:${task.dest}:${wanderBucket}`;
  if (nextKey !== agent.taskKey) {
    const stateChanged = task.state !== agent.state;
    if (["outdoor", "activity"].includes(task.state) && (stateChanged || agent.activityChoiceStale)) {
      const previousZone = agent.activityZone;
      const nextZone = chooseActivityZone(agent.homeZone, agent);
      if (
        nextZone.id !== previousZone.id &&
        zoneCrowding(previousZone) > zoneCrowding(nextZone) + 0.05
      ) {
        recordAvoidedDestination(agent);
      }
      agent.activityZone = nextZone;
      agent.activityChoiceStale = false;
    }
    agent.taskKey = nextKey;
    agent.state = task.state;
    agent.target = locationForTask(agent, task);
  }

  const interaction = localInteraction(agent);
  agent.localCrowding = interaction.crowding;
  if (["school", "outdoor", "activity"].includes(agent.state)) {
    const stateExposure = agent.state === "school" ? 1 : agent.state === "activity" ? 0.74 : 0.46;
    agent.contactDose +=
      interaction.crowding *
      simMinutes *
      stateExposure *
      SCENARIOS[world.scenario].contact *
      world.rules.contactSensitivity *
      0.001;
  }

  if (
    ["outdoor", "activity"].includes(agent.state) &&
    interaction.crowding > agent.crowdTolerance &&
    agent.reroutesToday < 2 &&
    world.elapsedMinutes - agent.lastCrowdReroute > 30
  ) {
    const previousZone = agent.activityZone;
    const nextZone = chooseActivityZone(agent.homeZone, agent);
    agent.lastCrowdReroute = world.elapsedMinutes;
    if (nextZone.id !== previousZone.id) {
      agent.activityZone = nextZone;
      agent.target = locationForTask(agent, task);
      recordAvoidedDestination(agent);
      agent.reroutesToday += 1;
    }
  }

  const dx = agent.target.x - agent.pos.x;
  const dy = agent.target.y - agent.pos.y;
  const dz = agent.target.z - agent.pos.z;
  const dist = Math.hypot(dx, dy, dz * 0.45);
  const scenario = SCENARIOS[world.scenario];
  const stateSpeed = agent.state === "commute" ? 1.38 : agent.state === "outdoor" ? 0.72 : 0.45;
  const move = agent.speed * simMinutes * scenario.mobility * stateSpeed;

  if (dist > 0.05) {
    const t = Math.min(1, move / dist);
    const baseX = agent.pos.x + dx * t;
    const baseY = agent.pos.y + dy * t;
    const avoidance =
      dist > 0.8
        ? Math.min(0.68, world.rules.crowdAvoidance * interaction.crowding / (interaction.crowding + 5))
        : 0;
    const sideStep = Math.min(move * 0.7, INTERACTION_CELL_SIZE * 0.08) * avoidance;
    const candidate = {
      x: baseX + interaction.avoidX * sideStep,
      y: baseY + interaction.avoidY * sideStep,
    };
    const nextPoint = pointInArea(candidate, agent.target.zone) ? candidate : { x: baseX, y: baseY };
    const travelled = Math.hypot(nextPoint.x - agent.pos.x, nextPoint.y - agent.pos.y);
    agent.pos.x = nextPoint.x;
    agent.pos.y = nextPoint.y;
    agent.pos.z += dz * t;
    agent.distanceTravelled += travelled;
  }

  if (agent.state === "outdoor") {
    const heatMultiplier = scenario.heat * (1.1 - agent.target.zone.parks * 0.45);
    agent.heatDose += simMinutes * heatMultiplier * 0.015;
  }

  const zoneFloor = Math.max(0, (agent.pos.z - agent.homeZone.terrain) / 3);
  agent.verticalMinutes += Math.max(0, zoneFloor) * simMinutes;
}

function stepSimulation(realDeltaMs) {
  const simMinutes = Math.min(8, (realDeltaMs / 1000) * world.speed);
  const previousTime = world.time;
  world.time = (world.time + simMinutes) % 1440;
  world.elapsedMinutes += simMinutes;
  if (world.time < previousTime) {
    world.avoidedDestinations = 0;
    world.agents.forEach((agent) => {
      agent.heatDose = 0;
      agent.contactDose = 0;
      agent.distanceTravelled = 0;
      agent.reroutesToday = 0;
      agent.avoidedDestinationToday = false;
    });
  }
  controls.time.value = String(Math.floor(world.time));
  buildInteractionField();
  world.agents.forEach((agent) => updateAgent(agent, simMinutes));
}

function computeMetrics() {
  const counts = Object.fromEntries(STATE_ORDER.map((state) => [state, 0]));
  let heatTotal = 0;
  let verticalTotal = 0;
  let contacts = 0;
  let crowdedChildren = 0;
  let contactExposure = 0;
  let distanceTravelled = 0;
  let contactClusters = 0;
  const focus = focusAreaById.get(world.focusId) || zones[0];
  const focusAgents = [];

  world.agents.forEach((agent) => {
    counts[agent.state] += 1;
    heatTotal += agent.heatDose;
    verticalTotal += Math.max(0, (agent.pos.z - agent.homeZone.terrain) / 3);
    contactExposure += agent.contactDose;
    distanceTravelled += agent.distanceTravelled;
    if (agent.localCrowding > agent.crowdTolerance) crowdedChildren += 1;
    if (pointInArea(agent.pos, focus)) focusAgents.push(agent);
  });

  world.interactionField.cells.forEach((entry) => {
    if (entry.count > 1) contacts += entry.count * Math.min(8, Math.log2(entry.count + 1));
    if (entry.count >= 4) contactClusters += 1;
  });

  const odFlows = new Map();
  world.agents.forEach((agent) => {
    const key = `${agent.homeZone.code} -> ${agent.schoolZone.code}`;
    odFlows.set(key, (odFlows.get(key) || 0) + 1);
  });
  const topOdFlow = [...odFlows.entries()].sort((a, b) => b[1] - a[1])[0] || ["n/a", 0];

  const focusArea = focus.areaKm2 || Math.PI * Math.pow(focus.radius * 0.12, 2);
  const focusHeightKm = focus.heightMeters ? focus.heightMeters / 1000 : (focus.height * verticalUnitMeters) / 1000;
  const focusVolume = focusArea * Math.max(0.03, focusHeightKm);
  const focusDensity = focusAgents.length / Math.max(0.001, focusVolume);
  const focusFloor =
    focusAgents.reduce((sum, agent) => sum + Math.max(0, (agent.pos.z - focus.terrain) / 3), 0) /
    Math.max(1, focusAgents.length);
  const focusOutdoor = focusAgents.filter((agent) => agent.state === "outdoor").length / Math.max(1, focusAgents.length);
  const heatLoad = focusOutdoor * SCENARIOS[world.scenario].heat * (1.12 - focus.parks * 0.48);
  const residentChildrenProxy = focus.schoolAgePopulationProxy || focus.childUnder15 || 0;
  const focusSchoolCount = focus.schoolCount || 0;
  const focusParkCount = focus.parkVenueCount || 0;
  const focusActivityVenueCount = focus.activityVenueCount || 0;

  const currentHour = Math.floor(world.time / 60);
  if (currentHour !== world.lastHistoryHour) {
    world.lastHistoryHour = currentHour;
    world.history[currentHour] = {
      hour: currentHour,
      outdoor: counts.outdoor / world.population,
      commute: counts.commute / world.population,
      school: counts.school / world.population,
      heat: heatLoad,
    };
  }

  return {
    counts,
    focus,
    focusAgents,
    focusArea,
    focusVolume,
    focusHeightMeters: focusHeightKm * 1000,
    focusMaxBuildingMeters: focus.maxBuildingMeters || 0,
    focusDensity,
    focusFloor,
    residentChildrenProxy,
    focusSchoolCount,
    focusParkCount,
    focusActivityVenueCount,
    heatLoad,
    heatTotal,
    verticalMean: verticalTotal / Math.max(1, world.population),
    contactIndex: (contacts / Math.max(1, world.population)) * SCENARIOS[world.scenario].contact * 100,
    contactExposure: contactExposure / Math.max(1, world.population),
    crowdedShare: crowdedChildren / Math.max(1, world.population),
    contactClusters,
    avoidedDestinations: world.avoidedDestinations,
    meanTravelKm: (distanceTravelled * appUnitMeters) / 1000 / Math.max(1, world.population),
    topOdFlow,
    schoolShare: counts.school / world.population,
    commuteShare: counts.commute / world.population,
    outdoorShare: counts.outdoor / world.population,
  };
}

function updatePanels() {
  const metrics = world.metrics || computeMetrics();
  controls.populationOutput.value = world.population.toLocaleString();
  controls.speedOutput.value = `${world.speed}x`;
  controls.timeOutput.value = formatTime(world.time);
  controls.clock.textContent = formatTime(world.time);
  controls.phase.textContent = dayPhase(world.time);
  controls.toggle.textContent = world.running ? "Pause" : "Play";

  const scenario = SCENARIOS[world.scenario];
  metricEls.focusName.textContent = metrics.focus.name;
  metricEls.focusType.textContent = metrics.focus.type;
  metricEls.focusArea.textContent = `${formatNumber(metrics.focusArea, 2)} km2`;
  metricEls.focusHeight.textContent = `${formatNumber(metrics.focusHeightMeters, 0)} m`;
  metricEls.focusMaxBuilding.textContent = metrics.focusMaxBuildingMeters
    ? `${formatNumber(metrics.focusMaxBuildingMeters, 0)} m`
    : "n/a";
  metricEls.focusVolume.textContent = `${formatNumber(metrics.focusVolume, 3)} km3`;
  metricEls.focusChildren.textContent = String(metrics.focusAgents.length);
  metricEls.focusDensity.textContent = `${metrics.focusDensity.toFixed(1)} / km3`;
  metricEls.focusFloor.textContent = metrics.focusFloor.toFixed(1);
  metricEls.focusHeat.textContent = metrics.heatLoad.toFixed(2);
  metricEls.school.textContent = `${Math.round(metrics.schoolShare * 100)}%`;
  metricEls.commute.textContent = `${Math.round(metrics.commuteShare * 100)}%`;
  metricEls.outdoor.textContent = `${Math.round(metrics.outdoorShare * 100)}%`;
  metricEls.contact.textContent = metrics.contactIndex.toFixed(0);
  metricEls.crowded.textContent = `${Math.round(metrics.crowdedShare * 100)}%`;
  metricEls.exposure.textContent = metrics.contactExposure.toFixed(1);
  metricEls.avoidance.textContent = metrics.avoidedDestinations.toLocaleString();
  metricEls.scenarioSchool.textContent = scenario.schoolOpen ? "Yes" : "No";
  metricEls.scenarioOutdoor.textContent = scenario.outdoorFactor.toFixed(2);
  metricEls.scenarioActivity.textContent = scenario.activityFactor.toFixed(2);
  metricEls.scenarioHeat.textContent = scenario.heat.toFixed(2);
  metricEls.scenarioMobility.textContent = scenario.mobility.toFixed(2);
  metricEls.scenarioContact.textContent = scenario.contact.toFixed(2);
  metricEls.boundarySource.textContent = realGeoData ? "HAD District + EAC DCCA" : "Synthetic";
  metricEls.buildingSource.textContent =
    realGeoData && officialBuildingSource
      ? `${(officialBuildingSource.recordCount || 0).toLocaleString()} CSDI / ${realBuildingLayer.length} shown`
      : realGeoData
        ? `${realBuildingLayer.length} real building models`
        : "Synthetic";
  metricEls.behaviourSource.textContent = "Model coefficients";
  updateBuildingPanel();

  Array.from(metricEls.activityList.children).forEach((item, index) => {
    const state = STATE_ORDER[index];
    const share = metrics.counts[state] / Math.max(1, world.population);
    item.querySelector(".activity-meter span").style.width = `${Math.round(share * 100)}%`;
    item.querySelector("strong").textContent = `${Math.round(share * 100)}%`;
  });

  Array.from(metricEls.activityStack.children).forEach((item) => {
    const state = item.dataset.state;
    const share = metrics.counts[state] / Math.max(1, world.population);
    item.querySelector(".stack-fill").style.height = `${Math.max(2, share * 160)}px`;
  });

  if (activeView === "stats" || metricEls.statsGrid.children.length === 0) {
    updateStatsView(metrics);
  }
}

function updateStatsView(metrics) {
  const statData = [
    ["Children", world.population.toLocaleString()],
    ["Mean floor", metrics.verticalMean.toFixed(1)],
    ["3D density", metrics.focusDensity.toFixed(1)],
    ["Focus volume", metrics.focusVolume.toFixed(3)],
    ["Height basis", `${formatNumber(metrics.focusHeightMeters, 0)} m`],
    ["Max building", metrics.focusMaxBuildingMeters ? `${formatNumber(metrics.focusMaxBuildingMeters, 0)} m` : "n/a"],
    ["Contact index", metrics.contactIndex.toFixed(0)],
    ["Mean daily exposure", metrics.contactExposure.toFixed(1)],
    ["Crowded children", `${Math.round(metrics.crowdedShare * 100)}%`],
    ["Contact clusters", metrics.contactClusters.toLocaleString()],
    ["Avoided destinations", metrics.avoidedDestinations.toLocaleString()],
    ["Mean travel", `${metrics.meanTravelKm.toFixed(1)} km`],
    ["Largest school OD", `${metrics.topOdFlow[0]} (${metrics.topOdFlow[1]})`],
    ["Heat dose", metrics.heatTotal.toFixed(1)],
    ["School share", `${Math.round(metrics.schoolShare * 100)}%`],
    ["Outdoor share", `${Math.round(metrics.outdoorShare * 100)}%`],
    [
      "Official buildings",
      officialBuildingSource?.recordCount ? officialBuildingSource.recordCount.toLocaleString() : "n/a",
    ],
    ["3D model subset", realBuildingLayer.length.toLocaleString()],
    ["Focus area", metrics.focus.type],
    ["Data mode", realGeoData ? "Real GIS" : "Synthetic"],
    ["Scenario", SCENARIOS[world.scenario].name],
  ];
  metricEls.statsGrid.innerHTML = statData
    .map(
      ([label, value]) => `
      <article class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `,
    )
    .join("");

  metricEls.historyChart.innerHTML = Array.from({ length: 24 }, (_, hour) => {
    const entry = world.history[hour];
    const value = entry ? Math.max(entry.outdoor, entry.commute, entry.school * 0.65, entry.heat * 0.55) : 0;
    const color =
      entry && entry.heat > 0.45
        ? STATE_META.activity.color
        : entry && entry.school > entry.outdoor
          ? STATE_META.school.color
          : STATE_META.outdoor.color;
    return `
      <div class="history-column" title="${String(hour).padStart(2, "0")}:00">
        <div class="history-bar" style="height:${Math.max(2, value * 126)}px;background:${color}"></div>
      </div>
    `;
  }).join("");
}

function markOsmStaticDirty() {
  osmStaticDirty = true;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

function resizeAllCanvases() {
  const resized = [sceneCanvas, mapCanvas, osmCanvas, buildingCanvas].some((canvas) => resizeCanvas(canvas));
  if (resized) markOsmStaticDirty();
}

function project(point) {
  const dx = point.x - camera.target.x;
  const dy = point.y - camera.target.y;
  const dz = point.z - camera.target.z;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const x1 = dx * cosYaw - dy * sinYaw;
  const y1 = dx * sinYaw + dy * cosYaw;
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const y2 = y1 * cosPitch - dz * sinPitch;
  const z2 = y1 * sinPitch + dz * cosPitch;
  const perspective = 620 / Math.max(220, 620 + y2);
  const baseScale = Math.min(sceneCanvas.width, sceneCanvas.height) / 760;
  const scale = camera.zoom * perspective * baseScale;
  return {
    x: sceneCanvas.width * 0.5 + x1 * scale,
    y: sceneCanvas.height * 0.64 - z2 * scale,
    depth: y2,
    scale,
  };
}

function projectedPath(ctx, points) {
  points.forEach((point, index) => {
    const p = project(point);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
}

function zoneEllipse(zone, z = zone.terrain, scale = 1) {
  const points = [];
  const segments = 34;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: zone.x + Math.cos(angle) * zone.radius * 1.12 * scale,
      y: zone.y + Math.sin(angle) * zone.radius * 0.76 * scale,
      z,
    });
  }
  return points;
}

function distributionColor(cell, alpha = 0.56) {
  const intensity = clamp(Math.sqrt(cell.areaNorm || cell.countNorm || 0), 0, 1);
  const heightSignal = clamp((cell.maxHeightMeters || cell.avgHeightMeters || 0) / 180, 0, 1);
  const low = { r: 48, g: 117, b: 122 };
  const mid = { r: 217, g: 148, b: 52 };
  const high = { r: 199, g: 101, b: 113 };
  const a = heightSignal > 0.48 ? mid : low;
  const b = heightSignal > 0.48 ? high : mid;
  const t = heightSignal > 0.48 ? (heightSignal - 0.48) / 0.52 : heightSignal / 0.48;
  const mix = {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
  return `rgba(${mix.r}, ${mix.g}, ${mix.b}, ${alpha * (0.35 + intensity * 0.65)})`;
}

function distributionColumnFaces(cell) {
  const footprint = 0.42 + Math.sqrt(cell.areaNorm || cell.countNorm || 0) * 1.85;
  const height = clamp(
    0.55 + Math.sqrt(cell.areaNorm || 0) * 4.2 + Math.sqrt((cell.maxHeightMeters || 0) / 180) * 5.8,
    0.75,
    12.5,
  );
  const x0 = cell.x - footprint / 2;
  const x1 = cell.x + footprint / 2;
  const y0 = cell.y - footprint / 2;
  const y1 = cell.y + footprint / 2;
  const p = {
    b0: { x: x0, y: y0, z: 0 },
    b1: { x: x1, y: y0, z: 0 },
    b2: { x: x1, y: y1, z: 0 },
    b3: { x: x0, y: y1, z: 0 },
    t0: { x: x0, y: y0, z: height },
    t1: { x: x1, y: y0, z: height },
    t2: { x: x1, y: y1, z: height },
    t3: { x: x0, y: y1, z: height },
  };
  const color = distributionColor(cell, 0.58);
  const faces = [
    [p.b0, p.b1, p.t1, p.t0, color],
    [p.b1, p.b2, p.t2, p.t1, distributionColor(cell, 0.48)],
    [p.b2, p.b3, p.t3, p.t2, distributionColor(cell, 0.4)],
    [p.b3, p.b0, p.t0, p.t3, distributionColor(cell, 0.5)],
    [p.t0, p.t1, p.t2, p.t3, distributionColor(cell, 0.72)],
  ];
  return faces.map((face) => ({
    type: "distribution",
    points: face.slice(0, 4),
    color: face[4],
    depth: face.slice(0, 4).reduce((sum, point) => sum + project(point).depth, 0) / 4,
  }));
}

function drawScene() {
  const ctx = sceneCtx;
  const w = sceneCanvas.width;
  const h = sceneCanvas.height;
  ctx.clearRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#cfe7e5");
  sky.addColorStop(0.52, "#e5eadc");
  sky.addColorStop(1, "#c2d9d7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawGroundGrid(ctx);
  drawTravelLines(ctx);

  const faces = [];
  zones.forEach((zone) => {
    faces.push({
      type: "footprint",
      depth: project({ x: zone.x, y: zone.y, z: zone.terrain }).depth - 8,
      zone,
    });

    if (!realGeoData) {
      zone.buildings.forEach((building) => {
        faces.push(...buildingFaces(building, zone.color));
      });
    }
  });

  if (realGeoData) {
    sceneBuildingDistribution.forEach((cell) => {
      faces.push(...distributionColumnFaces(cell));
    });
  }

  faces.sort((a, b) => b.depth - a.depth);
  faces.forEach((face) => {
    if (face.type === "footprint") drawZoneFootprint(ctx, face.zone);
    else drawFace(ctx, face);
  });

  drawFocusVolume(ctx);
  drawAgents(ctx);
  drawLegendStrip(ctx);
  drawHeightScale(ctx);
}

function drawGroundGrid(ctx) {
  ctx.save();
  ctx.lineWidth = 1 * (window.devicePixelRatio || 1);
  for (let x = -110; x <= 90; x += 10) {
    const a = project({ x, y: -68, z: 0 });
    const b = project({ x, y: 108, z: 0 });
    ctx.strokeStyle = x % 30 === 0 ? "rgba(60, 81, 69, 0.18)" : "rgba(60, 81, 69, 0.09)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let y = -68; y <= 108; y += 10) {
    const a = project({ x: -110, y, z: 0 });
    const b = project({ x: 90, y, z: 0 });
    ctx.strokeStyle = y % 30 === 0 ? "rgba(60, 81, 69, 0.18)" : "rgba(60, 81, 69, 0.09)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawZoneFootprint(ctx, zone) {
  ctx.save();
  areaRings(zone).forEach((points) => {
    ctx.beginPath();
    projectedPath(ctx, points);
    ctx.closePath();
    ctx.fillStyle = rgba(zone.color, zone.id === world.focusId ? 0.46 : 0.25);
    ctx.fill();
    ctx.strokeStyle = rgba(zone.color, zone.id === world.focusId ? 0.92 : 0.54);
    ctx.lineWidth = zone.id === world.focusId ? 2.2 * (window.devicePixelRatio || 1) : 1 * (window.devicePixelRatio || 1);
    ctx.stroke();
  });

  const label = project({ x: zone.x, y: zone.y, z: zone.terrain + 1 });
  ctx.fillStyle = "rgba(32, 35, 42, 0.72)";
  ctx.font = `${11 * (window.devicePixelRatio || 1)}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(zone.code, label.x, label.y - 4);
  ctx.restore();
}

function buildingFaces(building, color) {
  if (building.footprint?.length >= 4) return polygonBuildingFaces(building, color);

  const x0 = building.x - building.width / 2;
  const x1 = building.x + building.width / 2;
  const y0 = building.y - building.depth / 2;
  const y1 = building.y + building.depth / 2;
  const z0 = building.base;
  const z1 = building.height;
  const p = {
    b0: { x: x0, y: y0, z: z0 },
    b1: { x: x1, y: y0, z: z0 },
    b2: { x: x1, y: y1, z: z0 },
    b3: { x: x0, y: y1, z: z0 },
    t0: { x: x0, y: y0, z: z1 },
    t1: { x: x1, y: y0, z: z1 },
    t2: { x: x1, y: y1, z: z1 },
    t3: { x: x0, y: y1, z: z1 },
  };
  const faces = [
    [p.b0, p.b1, p.t1, p.t0, shade(color, 1.18)],
    [p.b1, p.b2, p.t2, p.t1, shade(color, 0.88)],
    [p.b2, p.b3, p.t3, p.t2, shade(color, 0.74)],
    [p.b3, p.b0, p.t0, p.t3, shade(color, 0.96)],
    [p.t0, p.t1, p.t2, p.t3, shade(color, 1.28)],
  ];
  return faces.map((face) => ({
    type: "building",
    points: face.slice(0, 4),
    color: face[4],
    depth: face.slice(0, 4).reduce((sum, point) => sum + project(point).depth, 0) / 4,
  }));
}

function polygonBuildingFaces(building, color) {
  const base = building.base || 0;
  const top = building.height || 8;
  const ring = building.footprint.map(([x, y]) => ({ x, y }));
  const points = ring[0].x === ring[ring.length - 1].x && ring[0].y === ring[ring.length - 1].y ? ring.slice(0, -1) : ring;
  const sideFaces = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const shadeAmount = i % 2 === 0 ? 0.84 : 1.08;
    const facePoints = [
      { x: a.x, y: a.y, z: base },
      { x: b.x, y: b.y, z: base },
      { x: b.x, y: b.y, z: top },
      { x: a.x, y: a.y, z: top },
    ];
    sideFaces.push({
      type: "building",
      points: facePoints,
      color: shade(color, shadeAmount),
      depth: facePoints.reduce((sum, point) => sum + project(point).depth, 0) / facePoints.length,
    });
  }
  const topPoints = points.map((point) => ({ x: point.x, y: point.y, z: top }));
  sideFaces.push({
    type: "building",
    points: topPoints,
    color: shade(color, 1.24),
    depth: topPoints.reduce((sum, point) => sum + project(point).depth, 0) / topPoints.length - 1,
  });
  return sideFaces;
}

function drawFace(ctx, face) {
  ctx.save();
  ctx.beginPath();
  projectedPath(ctx, face.points);
  ctx.closePath();
  ctx.fillStyle = face.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(38, 48, 43, 0.16)";
  ctx.lineWidth = 0.8 * (window.devicePixelRatio || 1);
  ctx.stroke();
  ctx.restore();
}

function drawTravelLines(ctx) {
  const pairs = new Map();
  world.agents.forEach((agent) => {
    if (agent.state !== "commute") return;
    const key = `${agent.homeZone.id}:${agent.schoolZone.id}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  });

  ctx.save();
  pairs.forEach((count, key) => {
    const [homeId, schoolId] = key.split(":");
    const home = zones.find((zone) => zone.id === homeId);
    const school = zones.find((zone) => zone.id === schoolId);
    if (!home || !school || count < 2) return;
    const mid = {
      x: (home.x + school.x) / 2,
      y: (home.y + school.y) / 2,
      z: Math.max(home.terrain, school.terrain) + 14 + Math.min(18, count * 0.08),
    };
    const start = project({ x: home.x, y: home.y, z: home.terrain + 2 });
    const ctrl = project(mid);
    const end = project({ x: school.x, y: school.y, z: school.terrain + 2 });
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, end.x, end.y);
    ctx.strokeStyle = `rgba(217, 148, 52, ${clamp(count / 90, 0.12, 0.58)})`;
    ctx.lineWidth = clamp(count / 12, 1, 6) * (window.devicePixelRatio || 1);
    ctx.stroke();
  });
  ctx.restore();
}

function drawFocusVolume(ctx) {
  const focus = focusAreaById.get(world.focusId) || zones[0];
  const baseRings = areaRings(focus, focus.terrain, 1.02);
  const topRings = areaRings(focus, focus.terrain + focus.height, 1.02);
  ctx.save();
  topRings.forEach((top, ringIndex) => {
    ctx.beginPath();
    projectedPath(ctx, top);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fill();
    ctx.strokeStyle = "rgba(32, 35, 42, 0.46)";
    ctx.lineWidth = 1.5 * (window.devicePixelRatio || 1);
    ctx.stroke();

    const base = baseRings[ringIndex] || [];
    const stride = Math.max(1, Math.floor(base.length / 10));
    for (let i = 0; i < base.length; i += stride) {
      const a = project(base[i]);
      const b = project(top[i]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = "rgba(32, 35, 42, 0.2)";
      ctx.stroke();
    }
  });
  ctx.restore();
}

function drawAgents(ctx) {
  const agents = world.agents
    .map((agent) => ({ agent, projected: project(agent.pos) }))
    .sort((a, b) => b.projected.depth - a.projected.depth);

  ctx.save();
  agents.forEach(({ agent, projected }) => {
    const groundZ = agent.target?.zone?.terrain ?? agent.homeZone.terrain;
    const heightAboveGround = Math.max(0, agent.pos.z - groundZ);
    const ground = project({ x: agent.pos.x, y: agent.pos.y, z: groundZ });
    const radius = clamp(projected.scale * 1.9, 2.2, 7.5) * (window.devicePixelRatio || 1);
    if (heightAboveGround > 3.5) {
      ctx.beginPath();
      ctx.moveTo(ground.x, ground.y);
      ctx.lineTo(projected.x, projected.y);
      ctx.strokeStyle = rgba(STATE_META[agent.state].color, 0.32);
      ctx.lineWidth = Math.max(1, radius * 0.18);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, radius * 1.35, radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(32, 35, 42, 0.12)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = STATE_META[agent.state].color;
    ctx.fill();
    ctx.strokeStyle = agent.localCrowding >= 4 ? "rgba(217, 148, 52, 0.94)" : "rgba(255, 255, 255, 0.82)";
    ctx.lineWidth = agent.localCrowding >= 4 ? Math.max(1.5, radius * 0.34) : Math.max(1, radius * 0.22);
    ctx.stroke();
  });
  ctx.restore();
}

function drawLegendStrip(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const x = 18 * ratio;
  const y = sceneCanvas.height - 30 * ratio;
  let cursor = x;
  ctx.save();
  ctx.font = `${11 * ratio}px Inter, sans-serif`;
  STATE_ORDER.forEach((state) => {
    ctx.fillStyle = STATE_META[state].color;
    ctx.fillRect(cursor, y, 11 * ratio, 11 * ratio);
    ctx.fillStyle = "rgba(32, 35, 42, 0.74)";
    ctx.fillText(STATE_META[state].label, cursor + 16 * ratio, y + 10 * ratio);
    cursor += (STATE_META[state].label.length * 7 + 30) * ratio;
  });
  ctx.restore();
}

function drawHeightScale(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const focus = focusAreaById.get(world.focusId) || zones[0];
  const buildingMax = realBuildingLayer.reduce((max, building) => Math.max(max, building.heightMeters || 0), 0);
  const maxMeters = Math.max(60, focus.heightMeters || 0, buildingMax);
  const scaleHeight = 116 * ratio;
  const x = sceneCanvas.width - 86 * ratio;
  const y = sceneCanvas.height - 58 * ratio;

  ctx.save();
  ctx.fillStyle = "rgba(251, 251, 248, 0.82)";
  ctx.strokeStyle = "rgba(32, 35, 42, 0.18)";
  ctx.lineWidth = 1 * ratio;
  ctx.beginPath();
  ctx.roundRect(x - 42 * ratio, y - scaleHeight - 28 * ratio, 72 * ratio, scaleHeight + 48 * ratio, 8 * ratio);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(32, 35, 42, 0.72)";
  ctx.lineWidth = 2 * ratio;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - scaleHeight);
  ctx.stroke();

  ctx.font = `${10 * ratio}px Inter, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(32, 35, 42, 0.76)";
  const ticks = [0, 0.5, 1];
  ticks.forEach((tick) => {
    const ty = y - scaleHeight * tick;
    ctx.beginPath();
    ctx.moveTo(x - 6 * ratio, ty);
    ctx.lineTo(x + 6 * ratio, ty);
    ctx.stroke();
    ctx.fillText(`${Math.round(maxMeters * tick)}m`, x - 10 * ratio, ty + 3 * ratio);
  });

  ctx.textAlign = "center";
  ctx.font = `${9 * ratio}px Inter, sans-serif`;
  ctx.fillText("Height", x - 6 * ratio, y - scaleHeight - 12 * ratio);
  ctx.fillText(`${verticalUnitMeters}m/unit`, x - 6 * ratio, y + 16 * ratio);
  ctx.restore();
}

function buildingModel(building) {
  const sourceRing = building.footprint?.length
    ? building.footprint
    : [
        [building.x - 0.04, building.y - 0.04],
        [building.x + 0.04, building.y - 0.04],
        [building.x + 0.04, building.y + 0.04],
        [building.x - 0.04, building.y + 0.04],
        [building.x - 0.04, building.y - 0.04],
      ];
  const ring = sourceRing.map(([x, y]) => ({
    x: (x - building.x) * appUnitMeters,
    y: (y - building.y) * appUnitMeters,
  }));
  const points =
    ring.length > 1 && ring[0].x === ring[ring.length - 1].x && ring[0].y === ring[ring.length - 1].y
      ? ring.slice(0, -1)
      : ring;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const height = Math.max(3, building.heightMeters || building.height * verticalUnitMeters || 18);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    height,
  };
  bounds.centerX = (bounds.minX + bounds.maxX) / 2;
  bounds.centerY = (bounds.minY + bounds.maxY) / 2;
  bounds.width = Math.max(1, bounds.maxX - bounds.minX);
  bounds.depth = Math.max(1, bounds.maxY - bounds.minY);
  bounds.size = Math.max(bounds.width, bounds.depth, bounds.height * 0.72, 40);
  return { building, points, bounds };
}

function projectBuilding(point, model) {
  const dx = point.x - model.bounds.centerX;
  const dy = point.y - model.bounds.centerY;
  const dz = point.z;
  const cosYaw = Math.cos(buildingCamera.yaw);
  const sinYaw = Math.sin(buildingCamera.yaw);
  const x1 = dx * cosYaw - dy * sinYaw;
  const y1 = dx * sinYaw + dy * cosYaw;
  const cosPitch = Math.cos(buildingCamera.pitch);
  const sinPitch = Math.sin(buildingCamera.pitch);
  const y2 = y1 * cosPitch - dz * sinPitch;
  const z2 = y1 * sinPitch + dz * cosPitch;
  const scale = (Math.min(buildingCanvas.width, buildingCanvas.height) * 0.52 * buildingCamera.zoom) / model.bounds.size;
  return {
    x: buildingCanvas.width * 0.62 + x1 * scale,
    y: buildingCanvas.height * 0.56 - z2 * scale,
    depth: y2,
  };
}

function buildingViewerFaces(model) {
  const color = "#247b72";
  const base = 0;
  const top = model.bounds.height;
  const faces = [];
  for (let i = 0; i < model.points.length; i += 1) {
    const a = model.points[i];
    const b = model.points[(i + 1) % model.points.length];
    const facePoints = [
      { x: a.x, y: a.y, z: base },
      { x: b.x, y: b.y, z: base },
      { x: b.x, y: b.y, z: top },
      { x: a.x, y: a.y, z: top },
    ];
    faces.push({
      points: facePoints,
      color: shade(color, i % 2 === 0 ? 0.82 : 1.08),
      depth: facePoints.reduce((sum, point) => sum + projectBuilding(point, model).depth, 0) / facePoints.length,
    });
  }
  const topPoints = model.points.map((point) => ({ x: point.x, y: point.y, z: top }));
  faces.push({
    points: topPoints,
    color: shade(color, 1.26),
    depth: topPoints.reduce((sum, point) => sum + projectBuilding(point, model).depth, 0) / topPoints.length - 1,
  });
  return faces;
}

function drawBuildingPath(ctx, points, model) {
  points.forEach((point, index) => {
    const projected = projectBuilding(point, model);
    if (index === 0) ctx.moveTo(projected.x, projected.y);
    else ctx.lineTo(projected.x, projected.y);
  });
}

function drawBuildingGrid(ctx, model) {
  const ratio = window.devicePixelRatio || 1;
  const extent = Math.max(model.bounds.width, model.bounds.depth, 90) * 0.8;
  const step = Math.max(20, Math.round(extent / 4 / 10) * 10);
  ctx.save();
  ctx.strokeStyle = "rgba(60, 81, 69, 0.14)";
  ctx.lineWidth = 1 * ratio;
  for (let offset = -extent; offset <= extent; offset += step) {
    const a = projectBuilding({ x: -extent, y: offset, z: 0 }, model);
    const b = projectBuilding({ x: extent, y: offset, z: 0 }, model);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    const c = projectBuilding({ x: offset, y: -extent, z: 0 }, model);
    const d = projectBuilding({ x: offset, y: extent, z: 0 }, model);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBuildingRuler(ctx, model) {
  const ratio = window.devicePixelRatio || 1;
  const offset = Math.max(model.bounds.width, model.bounds.depth) * 0.66 + 18;
  const base = projectBuilding({ x: model.bounds.maxX + offset, y: model.bounds.maxY, z: 0 }, model);
  const top = projectBuilding({ x: model.bounds.maxX + offset, y: model.bounds.maxY, z: model.bounds.height }, model);
  ctx.save();
  ctx.strokeStyle = "rgba(32, 35, 42, 0.72)";
  ctx.fillStyle = "rgba(32, 35, 42, 0.76)";
  ctx.lineWidth = 2 * ratio;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();

  ctx.font = `${11 * ratio}px Inter, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  [0, 0.5, 1].forEach((tick) => {
    const p = projectBuilding(
      { x: model.bounds.maxX + offset, y: model.bounds.maxY, z: model.bounds.height * tick },
      model,
    );
    ctx.beginPath();
    ctx.moveTo(p.x - 7 * ratio, p.y);
    ctx.lineTo(p.x + 7 * ratio, p.y);
    ctx.stroke();
    ctx.fillText(`${Math.round(model.bounds.height * tick)}m`, p.x + 12 * ratio, p.y);
  });
  ctx.restore();
}

function buildingMapProject(point) {
  const bounds = computeCombinedBounds(zones);
  const ratio = window.devicePixelRatio || 1;
  const width = buildingCanvas.width / ratio;
  const height = buildingCanvas.height / ratio;
  const pad = 7;
  const minX = bounds.minX - pad;
  const maxX = bounds.maxX + pad;
  const minY = bounds.minY - pad;
  const maxY = bounds.maxY + pad;
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
  const usedWidth = (maxX - minX) * scale;
  const usedHeight = (maxY - minY) * scale;
  return {
    x: ((width - usedWidth) / 2 + (point.x - minX) * scale) * ratio,
    y: ((height + usedHeight) / 2 - (point.y - minY) * scale) * ratio,
    scale: scale * ratio,
  };
}

function drawBuildingMapArea(ctx, area, options = {}) {
  if (!area.polygon) return;
  const ratio = window.devicePixelRatio || 1;
  area.polygon.forEach((ring) => {
    ctx.beginPath();
    ring.forEach(([x, y], index) => {
      const p = buildingMapProject({ x, y });
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    if (options.fill) {
      ctx.fillStyle = rgba(area.color || "#247b72", options.alpha ?? 0.18);
      ctx.fill();
    }
    ctx.strokeStyle = options.stroke || rgba(area.color || "#20232a", options.strokeAlpha ?? 0.55);
    ctx.lineWidth = (options.width ?? 1) * ratio;
    ctx.stroke();
  });
}

function drawBuildingDistributionMap(ctx) {
  const ratio = window.devicePixelRatio || 1;
  buildingDistribution.forEach((cell) => {
    const signal = Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45);
    if (signal < 0.01) return;
    const p = buildingMapProject(cell);
    const radius = (1.8 + Math.sqrt(signal) * 11) * ratio;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = distributionColor(cell, 0.52);
    ctx.fill();
  });
}

function drawSelectedBuildingOnMap(ctx, building) {
  if (!building?.footprint?.length) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  ctx.beginPath();
  building.footprint.forEach(([x, y], index) => {
    const p = buildingMapProject({ x, y });
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(32, 35, 42, 0.18)";
  ctx.fill();
  ctx.strokeStyle = "rgba(32, 35, 42, 0.92)";
  ctx.lineWidth = 2.4 * ratio;
  ctx.stroke();

  const p = buildingMapProject(building);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7 * ratio, 0, Math.PI * 2);
  ctx.fillStyle = "#20232a";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2 * ratio;
  ctx.stroke();
  ctx.restore();
}

function drawBuildingMapAgents(ctx) {
  const ratio = window.devicePixelRatio || 1;
  world.agents.forEach((agent) => {
    const p = buildingMapProject(agent.pos);
    ctx.beginPath();
    ctx.arc(p.x, p.y, (agent.state === "commute" ? 3.2 : 2.6) * ratio, 0, Math.PI * 2);
    ctx.fillStyle = STATE_META[agent.state].color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.86)";
    ctx.lineWidth = 1.1 * ratio;
    ctx.stroke();
  });
}

function drawBuildingDistributionLegend(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const width = 296 * ratio;
  const height = 116 * ratio;
  const x = buildingCanvas.width - width - 20 * ratio;
  const y = buildingCanvas.height - height - 20 * ratio;
  ctx.save();
  ctx.fillStyle = "rgba(251, 251, 248, 0.9)";
  ctx.strokeStyle = "rgba(32, 35, 42, 0.16)";
  ctx.lineWidth = ratio;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8 * ratio);
  ctx.fill();
  ctx.stroke();
  ctx.font = `800 ${12 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.82)";
  ctx.fillText("Building distribution", x + 14 * ratio, y + 22 * ratio);
  const rows = [
    ["CSDI density / footprint", "rgba(217,148,52,0.52)"],
    ["Selected building", "#20232a"],
    ["Child agent state", STATE_META.commute.color],
  ];
  ctx.font = `700 ${11 * ratio}px Inter, sans-serif`;
  rows.forEach(([label, color], index) => {
    const yy = y + (50 + index * 22) * ratio;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 24 * ratio, yy, 5.5 * ratio, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(32, 35, 42, 0.72)";
    ctx.fillText(label, x + 44 * ratio, yy + 1 * ratio);
  });
  ctx.restore();
}

function selectNearestBuildingOnMap(xCss, yCss) {
  const ratio = window.devicePixelRatio || 1;
  let best = null;
  realBuildingLayer.forEach((building) => {
    const p = buildingMapProject(building);
    const dist = Math.hypot(p.x / ratio - xCss, p.y / ratio - yCss);
    if (dist < 28 && (!best || dist < best.dist)) best = { building, dist };
  });
  if (!best) return;
  world.buildingId = best.building.id;
  controls.building.value = world.buildingId;
  updateBuildingPanel();
}

function drawBuildingViewer() {
  const ctx = buildingCtx;
  const w = buildingCanvas.width;
  const h = buildingCanvas.height;
  ctx.clearRect(0, 0, w, h);

  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#cfe7e5");
  background.addColorStop(0.54, "#e8eadb");
  background.addColorStop(1, "#c3dbd7");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const grid = ctx.createLinearGradient(0, 0, w, h);
  grid.addColorStop(0, "rgba(255,255,255,0.34)");
  grid.addColorStop(1, "rgba(36,123,114,0.08)");
  ctx.fillStyle = grid;
  ctx.fillRect(0, 0, w, h);

  drawBuildingDistributionMap(ctx);

  if (realGeoData) {
    realGeoData.dccas2019.forEach((area) => {
      drawBuildingMapArea(ctx, area, {
        fill: false,
        stroke: area.id === world.focusId ? "rgba(32, 35, 42, 0.65)" : "rgba(32, 35, 42, 0.08)",
        width: area.id === world.focusId ? 1.5 : 0.35,
      });
    });
  }

  zones.forEach((zone) => {
    drawBuildingMapArea(ctx, zone, {
      fill: zone.id === world.focusId,
      alpha: 0.12,
      strokeAlpha: zone.id === world.focusId ? 0.96 : 0.55,
      width: zone.id === world.focusId ? 2.2 : 1.0,
    });

    const p = buildingMapProject(zone);
    ctx.fillStyle = "rgba(32, 35, 42, 0.66)";
    ctx.font = `${10 * (window.devicePixelRatio || 1)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(zone.code, p.x, p.y + 3 * (window.devicePixelRatio || 1));
  });

  drawSelectedBuildingOnMap(ctx, selectedBuilding());
  drawBuildingMapAgents(ctx);
  drawBuildingDistributionLegend(ctx);
}

function mapProject(point, canvas) {
  const bounds = zones.reduce(
    (acc, zone) => ({
      minX: Math.min(acc.minX, zone.bounds?.minX ?? zone.x - zone.radius),
      maxX: Math.max(acc.maxX, zone.bounds?.maxX ?? zone.x + zone.radius),
      minY: Math.min(acc.minY, zone.bounds?.minY ?? zone.y - zone.radius),
      maxY: Math.max(acc.maxY, zone.bounds?.maxY ?? zone.y + zone.radius),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const pad = 6;
  const minX = bounds.minX - pad;
  const maxX = bounds.maxX + pad;
  const minY = bounds.minY - pad;
  const maxY = bounds.maxY + pad;
  return {
    x: ((point.x - minX) / (maxX - minX)) * canvas.width,
    y: canvas.height - ((point.y - minY) / (maxY - minY)) * canvas.height,
  };
}

function drawMapArea(ctx, area, options = {}) {
  const fill = options.fill ?? true;
  const alpha = options.alpha ?? 0.36;
  const strokeAlpha = options.strokeAlpha ?? 0.7;
  const width = options.width ?? 1.4;
  const rings = area.polygon
    ? area.polygon.map((ring) => ring.map(([x, y]) => mapProject({ x, y }, mapCanvas)))
    : [
        Array.from({ length: 34 }, (_, i) => {
          const angle = (i / 34) * Math.PI * 2;
          return mapProject(
            {
              x: area.x + Math.cos(angle) * area.radius * 1.12,
              y: area.y + Math.sin(angle) * area.radius * 0.76,
            },
            mapCanvas,
          );
        }),
      ];

  rings.forEach((points) => {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = rgba(area.color, alpha);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(area.color, strokeAlpha);
    ctx.lineWidth = width * (window.devicePixelRatio || 1);
    ctx.stroke();
  });
}

function drawMapBuildingDistribution(ctx) {
  const ratio = window.devicePixelRatio || 1;
  buildingDistribution.forEach((cell) => {
    const signal = Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45);
    if (signal < 0.012) return;
    const p = mapProject(cell, mapCanvas);
    const radius = (1.5 + Math.sqrt(signal) * 9) * ratio;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = distributionColor(cell, 0.42);
    ctx.fill();
  });
}

function drawMap() {
  const ctx = mapCtx;
  const w = mapCanvas.width;
  const h = mapCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#c8e2df";
  ctx.fillRect(0, 0, w, h);

  if (realGeoData) {
    realGeoData.dccas2019.forEach((area) => {
      drawMapArea(ctx, area, {
        fill: false,
        strokeAlpha: area.id === world.focusId ? 0.72 : 0.12,
        width: area.id === world.focusId ? 1.8 : 0.45,
      });
    });
  }

  zones.forEach((zone) => {
    drawMapArea(ctx, zone, {
      alpha: zone.id === world.focusId ? 0.62 : 0.36,
      strokeAlpha: zone.id === world.focusId ? 1 : 0.7,
      width: zone.id === world.focusId ? 3 : 1.4,
    });
    const p = mapProject(zone, mapCanvas);
    ctx.fillStyle = "#20232a";
    ctx.font = `${11 * (window.devicePixelRatio || 1)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(zone.code, p.x, p.y + 4);
  });

  drawMapBuildingDistribution(ctx);

  world.agents.forEach((agent) => {
    const p = mapProject(agent.pos, mapCanvas);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.1 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
    ctx.fillStyle = STATE_META[agent.state].color;
    ctx.fill();
  });

  drawMapLegend(ctx);
}

function drawMapLegend(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const width = 238 * ratio;
  const height = 190 * ratio;
  const x = 24 * ratio;
  const y = mapCanvas.height - height - 24 * ratio;
  ctx.save();
  ctx.fillStyle = "rgba(251, 251, 248, 0.9)";
  ctx.strokeStyle = "rgba(32, 35, 42, 0.18)";
  ctx.lineWidth = 1 * ratio;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8 * ratio);
  ctx.fill();
  ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.font = `800 ${12 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.82)";
  ctx.fillText("Map legend", x + 14 * ratio, y + 20 * ratio);

  const rows = [
    { label: "18 District boundary", color: "#53a39b", kind: "fill" },
    { label: "DCCA 2019 linework", color: "#20232a", kind: "line" },
    { label: "Building density", color: "#d99434", kind: "density" },
    { label: "Selected focus area", color: "#20232a", kind: "focus" },
    { label: "Child agent state", color: STATE_META.commute.color, kind: "dot" },
  ];

  ctx.font = `700 ${12 * ratio}px Inter, sans-serif`;
  rows.forEach((item, index) => {
    const yy = y + (50 + index * 26) * ratio;
    const symbolX = x + 22 * ratio;
    if (item.kind === "fill") {
      ctx.fillStyle = rgba(item.color, 0.42);
      ctx.fillRect(symbolX - 8 * ratio, yy - 7 * ratio, 20 * ratio, 14 * ratio);
      ctx.strokeStyle = rgba(item.color, 0.9);
      ctx.strokeRect(symbolX - 8 * ratio, yy - 7 * ratio, 20 * ratio, 14 * ratio);
    } else if (item.kind === "line") {
      ctx.strokeStyle = "rgba(32, 35, 42, 0.55)";
      ctx.lineWidth = 1.6 * ratio;
      ctx.beginPath();
      ctx.moveTo(symbolX - 10 * ratio, yy);
      ctx.lineTo(symbolX + 14 * ratio, yy);
      ctx.stroke();
    } else if (item.kind === "density") {
      ctx.fillStyle = "rgba(217, 148, 52, 0.5)";
      ctx.beginPath();
      ctx.arc(symbolX + 2 * ratio, yy, 6 * ratio, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === "focus") {
      ctx.strokeStyle = "rgba(32, 35, 42, 0.9)";
      ctx.lineWidth = 3 * ratio;
      ctx.strokeRect(symbolX - 8 * ratio, yy - 7 * ratio, 20 * ratio, 14 * ratio);
    } else {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(symbolX + 2 * ratio, yy, 5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(32, 35, 42, 0.72)";
    ctx.fillText(item.label, x + 52 * ratio, yy);
  });

  ctx.restore();
}

function lonLatToWorldPixel(lon, lat, zoom) {
  const sinLat = Math.sin((clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180);
  const scale = 2 ** zoom * 256;
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function worldPixelToLonLat(x, y, zoom) {
  const scale = 2 ** zoom * 256;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lon, lat };
}

function osmProjectLonLat(lon, lat) {
  const ratio = window.devicePixelRatio || 1;
  const viewWidth = osmCanvas.width / ratio;
  const viewHeight = osmCanvas.height / ratio;
  const center = lonLatToWorldPixel(osmMap.centerLon, osmMap.centerLat, osmMap.zoom);
  const point = lonLatToWorldPixel(lon, lat, osmMap.zoom);
  return {
    x: (point.x - center.x + viewWidth / 2) * ratio,
    y: (point.y - center.y + viewHeight / 2) * ratio,
  };
}

function osmProjectLocal(point) {
  const ll = localToLonLat(point);
  return osmProjectLonLat(ll.lon, ll.lat);
}

function getOsmTile(z, x, y) {
  const tileCount = 2 ** z;
  if (y < 0 || y >= tileCount) return null;
  const wrappedX = ((x % tileCount) + tileCount) % tileCount;
  const key = `${z}/${wrappedX}/${y}`;
  let tile = osmTileCache.get(key);
  if (!tile) {
    tile = new Image();
    tile.crossOrigin = "anonymous";
    tile.decoding = "async";
    tile.onload = markOsmStaticDirty;
    tile.onerror = markOsmStaticDirty;
    tile.src = `https://tile.openstreetmap.org/${z}/${wrappedX}/${y}.png`;
    osmTileCache.set(key, tile);
  }
  return tile;
}

function drawOsmTiles(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const tileSize = 256;
  const tileDrawSize = tileSize * ratio;
  const viewWidth = osmCanvas.width / ratio;
  const viewHeight = osmCanvas.height / ratio;
  const center = lonLatToWorldPixel(osmMap.centerLon, osmMap.centerLat, osmMap.zoom);
  const minTileX = Math.floor((center.x - viewWidth / 2) / tileSize) - 1;
  const maxTileX = Math.floor((center.x + viewWidth / 2) / tileSize) + 1;
  const minTileY = Math.floor((center.y - viewHeight / 2) / tileSize) - 1;
  const maxTileY = Math.floor((center.y + viewHeight / 2) / tileSize) + 1;

  ctx.fillStyle = "#dfe7df";
  ctx.fillRect(0, 0, osmCanvas.width, osmCanvas.height);

  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      const tile = getOsmTile(osmMap.zoom, x, y);
      const drawX = (x * tileSize - center.x + viewWidth / 2) * ratio;
      const drawY = (y * tileSize - center.y + viewHeight / 2) * ratio;
      if (tile?.complete && tile.naturalWidth > 0) {
        ctx.drawImage(tile, drawX, drawY, tileDrawSize, tileDrawSize);
      } else {
        ctx.fillStyle = y % 2 === x % 2 ? "#e8eadb" : "#dbe7e1";
        ctx.fillRect(drawX, drawY, tileDrawSize, tileDrawSize);
      }
    }
  }
}

function drawOsmArea(ctx, area, options = {}) {
  if (!area.polygon) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  area.polygon.forEach((ring) => {
    ctx.beginPath();
    ring.forEach(([x, y], index) => {
      const p = osmProjectLocal({ x, y });
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    if (options.fill) {
      ctx.fillStyle = rgba(area.color || "#247b72", options.alpha ?? 0.18);
      ctx.fill();
    }
    ctx.strokeStyle = options.stroke || rgba(area.color || "#20232a", options.strokeAlpha ?? 0.72);
    ctx.lineWidth = (options.width ?? 1.2) * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawOsmBuildingDistribution(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const cells = buildingDistribution.length ? buildingDistribution : [];
  ctx.save();
  cells.forEach((cell) => {
    const signal = Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45);
    if (signal < 0.01) return;
    const p = osmProjectLonLat(cell.lon, cell.lat);
    const radius = (2.2 + Math.sqrt(signal) * 13.5) * ratio;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = distributionColor(cell, 0.48);
    ctx.fill();
  });
  ctx.restore();
}

function drawOsmTravelLines(ctx) {
  const pairs = new Map();
  world.agents.forEach((agent) => {
    if (agent.state !== "commute") return;
    const key = `${agent.homeZone.id}:${agent.schoolZone.id}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  });
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  pairs.forEach((count, key) => {
    if (count < 2) return;
    const [homeId, schoolId] = key.split(":");
    const home = zones.find((zone) => zone.id === homeId);
    const school = zones.find((zone) => zone.id === schoolId);
    if (!home || !school) return;
    const start = osmProjectLonLat(home.lon, home.lat);
    const end = osmProjectLonLat(school.lon, school.lat);
    const ctrl = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 - Math.min(48 * ratio, count * 0.55 * ratio),
    };
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, end.x, end.y);
    ctx.strokeStyle = `rgba(217, 148, 52, ${clamp(count / 75, 0.18, 0.72)})`;
    ctx.lineWidth = clamp(count / 14, 1, 7) * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawOsmAgents(ctx) {
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  world.agents.forEach((agent) => {
    const ll = localToLonLat(agent.pos);
    const p = osmProjectLonLat(ll.lon, ll.lat);
    const radius = (agent.state === "commute" ? 3.4 : 2.7) * ratio;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = STATE_META[agent.state].color;
    ctx.fill();
    ctx.strokeStyle = agent.localCrowding >= 4 ? "rgba(217,148,52,0.94)" : "rgba(255,255,255,0.86)";
    ctx.lineWidth = (agent.localCrowding >= 4 ? 1.8 : 1.2) * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawOsmLegend(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const width = 284 * ratio;
  const height = 146 * ratio;
  const x = 18 * ratio;
  const y = osmCanvas.height - height - 18 * ratio;
  ctx.save();
  ctx.fillStyle = "rgba(251, 251, 248, 0.91)";
  ctx.strokeStyle = "rgba(32, 35, 42, 0.16)";
  ctx.lineWidth = ratio;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8 * ratio);
  ctx.fill();
  ctx.stroke();

  const rows = [
    { label: "Building footprint density", kind: "density" },
    { label: "District / DCCA boundaries", kind: "boundary" },
    { label: "Child agents and commute flows", kind: "agent" },
  ];
  ctx.font = `800 ${12 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.82)";
  ctx.fillText("OSM macro map", x + 14 * ratio, y + 22 * ratio);
  ctx.font = `700 ${11 * ratio}px Inter, sans-serif`;
  rows.forEach((row, index) => {
    const yy = y + (52 + index * 26) * ratio;
    const sx = x + 24 * ratio;
    if (row.kind === "density") {
      ctx.fillStyle = "rgba(217,148,52,0.5)";
      ctx.beginPath();
      ctx.arc(sx, yy, 7 * ratio, 0, Math.PI * 2);
      ctx.fill();
    } else if (row.kind === "boundary") {
      ctx.strokeStyle = "rgba(32,35,42,0.64)";
      ctx.lineWidth = 2 * ratio;
      ctx.strokeRect(sx - 8 * ratio, yy - 6 * ratio, 18 * ratio, 12 * ratio);
    } else {
      ctx.fillStyle = STATE_META.commute.color;
      ctx.beginPath();
      ctx.arc(sx, yy, 5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(32, 35, 42, 0.72)";
    ctx.fillText(row.label, x + 48 * ratio, yy + 1 * ratio);
  });

  ctx.textAlign = "right";
  ctx.font = `700 ${10 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.58)";
  ctx.fillText("© OpenStreetMap contributors", osmCanvas.width - 14 * ratio, osmCanvas.height - 12 * ratio);
  ctx.restore();
}

function drawOsmStaticLayer(ctx) {
  drawOsmTiles(ctx);
  drawOsmBuildingDistribution(ctx);

  if (realGeoData) {
    realGeoData.dccas2019.forEach((area) => {
      drawOsmArea(ctx, area, {
        fill: false,
        stroke: area.id === world.focusId ? "rgba(32, 35, 42, 0.78)" : "rgba(32, 35, 42, 0.12)",
        width: area.id === world.focusId ? 1.8 : 0.45,
      });
    });
  }

  zones.forEach((zone) => {
    drawOsmArea(ctx, zone, {
      fill: zone.id === world.focusId,
      alpha: 0.16,
      strokeAlpha: zone.id === world.focusId ? 0.96 : 0.62,
      width: zone.id === world.focusId ? 2.4 : 1.1,
    });
  });
}

function ensureOsmStaticLayer() {
  if (osmStaticCanvas.width !== osmCanvas.width || osmStaticCanvas.height !== osmCanvas.height) {
    osmStaticCanvas.width = osmCanvas.width;
    osmStaticCanvas.height = osmCanvas.height;
    markOsmStaticDirty();
  }

  if (!osmStaticDirty) return;
  osmStaticCtx.clearRect(0, 0, osmStaticCanvas.width, osmStaticCanvas.height);
  drawOsmStaticLayer(osmStaticCtx);
  osmStaticDirty = false;
}

function drawOsmMap() {
  const ctx = osmCtx;
  ctx.clearRect(0, 0, osmCanvas.width, osmCanvas.height);
  ensureOsmStaticLayer();
  ctx.drawImage(osmStaticCanvas, 0, 0);
  drawOsmTravelLines(ctx);
  drawOsmAgents(ctx);
  drawOsmLegend(ctx);
}

function fitOsmMap() {
  if (!zones.length) return;
  const lonValues = zones.map((zone) => zone.lon).filter(Number.isFinite);
  const latValues = zones.map((zone) => zone.lat).filter(Number.isFinite);
  osmMap.centerLon = (Math.min(...lonValues) + Math.max(...lonValues)) / 2;
  osmMap.centerLat = (Math.min(...latValues) + Math.max(...latValues)) / 2;
  osmMap.zoom = 10;
  markOsmStaticDirty();
}

function zoomOsmMap(delta) {
  osmMap.zoom = clamp(osmMap.zoom + delta, 9, 15);
  markOsmStaticDirty();
}

function panOsmMap(dxCss, dyCss) {
  const center = lonLatToWorldPixel(osmMap.centerLon, osmMap.centerLat, osmMap.zoom);
  const next = worldPixelToLonLat(center.x - dxCss, center.y - dyCss, osmMap.zoom);
  osmMap.centerLon = next.lon;
  osmMap.centerLat = next.lat;
  markOsmStaticDirty();
}

function selectNearestOsmZone(xCss, yCss) {
  const ratio = window.devicePixelRatio || 1;
  let best = null;
  zones.forEach((zone) => {
    const p = osmProjectLonLat(zone.lon, zone.lat);
    const dist = Math.hypot(p.x / ratio - xCss, p.y / ratio - yCss);
    if (dist < 42 && (!best || dist < best.dist)) best = { zone, dist };
  });
  if (!best) return;
  world.focusId = best.zone.id;
  controls.focus.value = best.zone.id;
  world.metrics = computeMetrics();
  markOsmStaticDirty();
  updatePanels();
}

function updateTooltip() {
  if (activeView !== "scene" || pointer.dragging) {
    tooltip.hidden = true;
    return;
  }
  const ratio = window.devicePixelRatio || 1;
  let best = null;
  for (const zone of zones) {
    const p = project({ x: zone.x, y: zone.y, z: zone.terrain + 4 });
    const dist = Math.hypot(p.x / ratio - pointer.x, p.y / ratio - pointer.y);
    if (dist < 30 && (!best || dist < best.dist)) best = { dist, zone };
  }

  if (!best) {
    tooltip.hidden = true;
    return;
  }

  const metrics = world.metrics;
  const isFocus = metrics && metrics.focus.id === best.zone.id;
  tooltip.innerHTML = `
    <strong>${best.zone.name}</strong>
    ${best.zone.type} | ${best.zone.areaKm2 ? `${best.zone.areaKm2.toFixed(1)} km2 | ` : ""}${best.zone.source || "synthetic geometry"}
    <br>height ${best.zone.heightMeters ? `${best.zone.heightMeters.toFixed(0)} m` : "model"} | ${best.zone.heightSource || "model height"}
    ${best.zone.maxBuildingMeters ? `<br>max building ${best.zone.maxBuildingMeters.toFixed(0)} m` : ""}
    ${isFocus ? `<br>3D density ${metrics.focusDensity.toFixed(1)} / km3` : ""}
  `;
  tooltip.style.left = `${pointer.x + 14}px`;
  tooltip.style.top = `${pointer.y + 14}px`;
  tooltip.hidden = false;
}

function setView(view) {
  activeView = view;
  document.querySelectorAll(".tab-button").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  sceneCanvas.classList.toggle("active", view === "scene");
  mapCanvas.classList.toggle("active", view === "map");
  osmCanvas.classList.toggle("active", view === "osm");
  buildingsView.classList.toggle("active", view === "buildings");
  rulesView.classList.toggle("active", view === "rules");
  statsView.classList.toggle("active", view === "stats");
  controls.cameraTools.hidden = !["scene", "osm"].includes(view);
  controls.cameraTools.style.display = ["scene", "osm"].includes(view) ? "" : "none";
  if (view === "stats") updateStatsView(world.metrics || computeMetrics());
  if (view === "buildings") updateBuildingPanel();
  resizeAllCanvases();
}

function updateRuleControls() {
  Object.keys(RULE_DEFAULTS).forEach((key) => {
    controls.ruleInputs[key].value = String(world.rules[key]);
    controls.ruleOutputs[key].value = world.rules[key].toFixed(2);
  });
}

function bindEvents() {
  controls.toggle.addEventListener("click", () => {
    world.running = !world.running;
    updatePanels();
  });

  controls.reset.addEventListener("click", resetSimulation);

  controls.resetRules.addEventListener("click", () => {
    world.rules = { ...RULE_DEFAULTS };
    updateRuleControls();
    world.agents.forEach((agent) => {
      agent.taskKey = "";
      agent.activityChoiceStale = true;
    });
  });

  Object.keys(RULE_DEFAULTS).forEach((key) => {
    controls.ruleInputs[key].addEventListener("input", () => {
      world.rules[key] = Number(controls.ruleInputs[key].value);
      controls.ruleOutputs[key].value = world.rules[key].toFixed(2);
      if (key === "parkAttraction" || key === "heatAvoidance" || key === "destinationCrowdPenalty") {
        world.agents.forEach((agent) => {
          agent.taskKey = "";
          agent.activityChoiceStale = true;
        });
      }
    });
  });

  controls.building.addEventListener("change", () => {
    world.buildingId = controls.building.value;
    updateBuildingPanel();
  });

  controls.zoomOut.addEventListener("click", () => {
    if (activeView === "osm") zoomOsmMap(-1);
    else zoomCamera(0.82);
  });

  controls.zoomFit.addEventListener("click", () => {
    if (activeView === "osm") fitOsmMap();
    else fitCameraToArea();
  });

  controls.zoomIn.addEventListener("click", () => {
    if (activeView === "osm") zoomOsmMap(1);
    else zoomCamera(1.22);
  });

  controls.population.addEventListener("input", () => {
    controls.populationOutput.value = Number(controls.population.value).toLocaleString();
  });
  controls.population.addEventListener("change", resetSimulation);

  controls.speed.addEventListener("input", () => {
    world.speed = Number(controls.speed.value);
    controls.speedOutput.value = `${world.speed}x`;
  });

  controls.scenario.addEventListener("change", () => {
    world.scenario = controls.scenario.value;
    world.agents.forEach((agent) => {
      agent.taskKey = "";
      agent.heatDose = 0;
      agent.activityChoiceStale = true;
    });
  });

  controls.focus.addEventListener("change", () => {
    world.focusId = controls.focus.value;
    fitCameraToArea(focusAreaById.get(world.focusId));
    world.metrics = computeMetrics();
    markOsmStaticDirty();
    updatePanels();
  });

  controls.time.addEventListener("input", () => {
    world.time = Number(controls.time.value);
    world.agents.forEach((agent) => {
      agent.taskKey = "";
    });
    world.metrics = computeMetrics();
    updatePanels();
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  sceneCanvas.addEventListener("pointerdown", (event) => {
    pointer.dragging = true;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    sceneCanvas.setPointerCapture(event.pointerId);
  });

  sceneCanvas.addEventListener("pointermove", (event) => {
    const rect = sceneCanvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    if (!pointer.dragging) return;
    const dx = event.clientX - pointer.lastX;
    const dy = event.clientY - pointer.lastY;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    camera.yaw += dx * 0.006;
    camera.pitch = clamp(camera.pitch + dy * 0.004, 0.38, 1.18);
  });

  sceneCanvas.addEventListener("pointerup", (event) => {
    pointer.dragging = false;
    sceneCanvas.releasePointerCapture(event.pointerId);
  });

  sceneCanvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const boundedDelta = clamp(event.deltaY, -240, 240);
      zoomCamera(Math.exp(-boundedDelta * 0.0015));
    },
    { passive: false },
  );

  sceneCanvas.addEventListener("click", () => {
    const ratio = window.devicePixelRatio || 1;
    let best = null;
    zones.forEach((zone) => {
      const p = project({ x: zone.x, y: zone.y, z: zone.terrain + 4 });
      const dist = Math.hypot(p.x / ratio - pointer.x, p.y / ratio - pointer.y);
      if (dist < 34 && (!best || dist < best.dist)) best = { zone, dist };
    });
    if (best) {
      world.focusId = best.zone.id;
      controls.focus.value = best.zone.id;
      world.metrics = computeMetrics();
      markOsmStaticDirty();
      updatePanels();
    }
  });

  osmCanvas.addEventListener("pointerdown", (event) => {
    osmPointer.dragging = true;
    osmPointer.lastX = event.clientX;
    osmPointer.lastY = event.clientY;
    osmPointer.totalMove = 0;
    osmCanvas.setPointerCapture(event.pointerId);
  });

  osmCanvas.addEventListener("pointermove", (event) => {
    if (!osmPointer.dragging) return;
    const dx = event.clientX - osmPointer.lastX;
    const dy = event.clientY - osmPointer.lastY;
    osmPointer.lastX = event.clientX;
    osmPointer.lastY = event.clientY;
    osmPointer.totalMove += Math.hypot(dx, dy);
    panOsmMap(dx, dy);
  });

  osmCanvas.addEventListener("pointerup", (event) => {
    const rect = osmCanvas.getBoundingClientRect();
    if (osmPointer.totalMove < 5) {
      selectNearestOsmZone(event.clientX - rect.left, event.clientY - rect.top);
    }
    osmPointer.dragging = false;
    osmCanvas.releasePointerCapture(event.pointerId);
  });

  osmCanvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomOsmMap(event.deltaY > 0 ? -1 : 1);
    },
    { passive: false },
  );

  buildingCanvas.addEventListener("pointerdown", (event) => {
    buildingPointer.dragging = true;
    buildingPointer.lastX = event.clientX;
    buildingPointer.lastY = event.clientY;
    buildingPointer.totalMove = 0;
    buildingCanvas.setPointerCapture(event.pointerId);
  });

  buildingCanvas.addEventListener("pointermove", (event) => {
    if (!buildingPointer.dragging) return;
    const dx = event.clientX - buildingPointer.lastX;
    const dy = event.clientY - buildingPointer.lastY;
    buildingPointer.lastX = event.clientX;
    buildingPointer.lastY = event.clientY;
    buildingPointer.totalMove += Math.hypot(dx, dy);
  });

  buildingCanvas.addEventListener("pointerup", (event) => {
    const rect = buildingCanvas.getBoundingClientRect();
    if (buildingPointer.totalMove < 5) {
      selectNearestBuildingOnMap(event.clientX - rect.left, event.clientY - rect.top);
    }
    buildingPointer.dragging = false;
    buildingCanvas.releasePointerCapture(event.pointerId);
  });

  buildingCanvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );

  window.addEventListener("resize", resizeAllCanvases);
}

function frame(now) {
  const minFrameMs = activeView === "scene" ? 1000 / 24 : activeView === "stats" ? 1000 / 8 : 1000 / 20;
  if (now - lastRenderAt < minFrameMs) {
    requestAnimationFrame(frame);
    return;
  }
  lastRenderAt = now;

  const dt = Math.min(160, now - lastFrame);
  lastFrame = now;
  resizeAllCanvases();

  if (world.running) stepSimulation(dt);

  const metricsInterval = world.population > 1200 ? 520 : 220;
  if (now - lastMetricsAt > metricsInterval) {
    world.metrics = computeMetrics();
    updatePanels();
    lastMetricsAt = now;
  }

  if (activeView === "scene") {
    drawScene();
    updateTooltip();
  } else if (activeView === "map") {
    drawMap();
    tooltip.hidden = true;
  } else if (activeView === "osm") {
    drawOsmMap();
    tooltip.hidden = true;
  } else if (activeView === "buildings") {
    drawBuildingViewer();
    tooltip.hidden = true;
  } else {
    tooltip.hidden = true;
  }

  requestAnimationFrame(frame);
}

setupZones();
localToLonLatTransform = fitLocalToLonLat();
fitCameraToArea();
fitOsmMap();
populateSelects();
populateBuildingSelect();
makeActivityMeters();
updateRuleControls();
bindEvents();
resetSimulation();
setView(realGeoData ? "osm" : "scene");
requestAnimationFrame(frame);
