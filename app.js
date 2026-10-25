"use strict";

const APP_RELEASE = Object.freeze({
  version: "V12.19.4",
  label: "Public data edition: real geography; synthetic walking school journeys",
});

const STATE_META = {
  sleep: { label: "Sleep", color: "#7a67a8" },
  home: { label: "Home", color: "#3d78a7" },
  commute: { label: "Commute", color: "#d99434" },
  school: { label: "School", color: "#247b72" },
  outdoor: { label: "Outdoor", color: "#6f9d45" },
  activity: { label: "Activity", color: "#c76571" },
};

const STATE_ORDER = ["sleep", "home", "commute", "school", "outdoor", "activity"];
const AGENT_OBSERVER_MAX_TRIPS = 8;
const AGENT_OBSERVER_MAX_STATE_EVENTS = 24;
const AGENT_OBSERVER_MAX_TRACE_POINTS = 96;

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

const realGeoData = window.HK_REAL_GEO_DATA || null;
const hk3dpnMetadata = window.HK_3DPN_METADATA || null;
const hkIslandModel = window.HK_ISLAND_MODEL || null;
const hkIslandRoutingManifest = window.HK_ISLAND_ROUTING_MANIFEST || null;
const hkIslandRoutingGraph = hkIslandRoutingManifest && window.HKIslandRouting?.HongKongIslandRoutingGraph
  ? new window.HKIslandRouting.HongKongIslandRoutingGraph(hkIslandRoutingManifest)
  : null;
const comparisonReference = window.V12_2_COMPARISON_RESULTS || null;
const routeCalibrationBundle = window.V12_6_ROUTE_CALIBRATION || null;
const routeCalibrationReference = routeCalibrationBundle?.reference || null;
const routeCalibrationOverrides = window.ABM_ROUTE_CALIBRATION_OVERRIDES || null;
const islandSchoolAccessBundle = window.V12_6_SCHOOL_ACCESS || null;
const islandPoiAccessBundle = window.V12_6_POI_ACCESS || null;
const kowloonAccessBundle = window.V12_9_3_KOWLOON_ACCESS || null;
const ntEastAccessBundle = window.V12_10_NT_EAST_ACCESS || null;
const ntWestAccessBundle = window.V12_11_NT_WEST_ACCESS || null;
const islandsAccessBundle = window.V12_11_ISLANDS_ACCESS || null;
const kowloonCalibrationBundle = window.V12_9_4_KOWLOON_CALIBRATION || null;
const kowloonMultimodalPayload = window.V12_9_4_KOWLOON_MULTIMODAL || null;
const kowloonMultimodalTimeCalibration = window.V12_9_4_KOWLOON_MULTIMODAL_TIME_CALIBRATION || null;
const kowloonMultimodalTimeCalibrationEnabled =
  window.ABM_MULTIMODAL_TIME_CALIBRATION_ENABLED !== false;
const kowloonMultimodalGraph = kowloonMultimodalPayload && window.KowloonMultimodalRouting?.KowloonMultimodalGraph
  ? new window.KowloonMultimodalRouting.KowloonMultimodalGraph(kowloonMultimodalPayload)
  : null;
const validationReference = window.V12_7_VALIDATION || null;
const populationScaleReference = window.V12_7_1_POPULATION_SCALE || null;
const kowloonExperimentReference = window.V12_9_4_KOWLOON_EXPERIMENT || null;
const v12_8RoutingManifest = window.V12_8_ROUTING_MANIFEST || null;
const v12_8RoutingEvidence = window.V12_8_ROUTING_EVIDENCE || null;
const v12_8RoutingGraph = v12_8RoutingManifest && window.HKIslandRouting?.RegionalRoutingGraph
  ? new window.HKIslandRouting.RegionalRoutingGraph(v12_8RoutingManifest, { pathCacheMax: 128 })
  : null;
const v12_9KowloonRoutingManifest = window.V12_9_KOWLOON_ROUTING_MANIFEST || null;
const v12_9KowloonRoutingEvidence = window.V12_9_KOWLOON_ROUTING_EVIDENCE || null;
const v12_9KowloonRoutingGraph = v12_9KowloonRoutingManifest && window.HKIslandRouting?.RegionalRoutingGraph
  ? new window.HKIslandRouting.RegionalRoutingGraph(v12_9KowloonRoutingManifest, { pathCacheMax: 900 })
  : null;
const KOWLOON_SCOPE_ID = v12_9KowloonRoutingManifest?.scope?.id || "continuous-kowloon";
const v12_10NtEastRoutingManifest = window.V12_10_NT_EAST_ROUTING_MANIFEST || null;
const v12_10NtEastRoutingEvidence = window.V12_10_NT_EAST_ROUTING_EVIDENCE || null;
const v12_10NtEastAgentEvidence = window.V12_10_NT_EAST_AGENT_EVIDENCE || null;
const wholeHkRoutingDispatcher = window.V12_11_WHOLE_HK_DISPATCHER || null;
const terrainReliabilityReference = window.V12_12_TERRAIN_RELIABILITY || null;
const wholeHkRoutingPackByDcca = new Map(wholeHkRoutingDispatcher?.dccaAssignments || []);
const v12_10NtEastRoutingGraph = v12_10NtEastRoutingManifest && window.HKIslandRouting?.RegionalRoutingGraph
  ? new window.HKIslandRouting.RegionalRoutingGraph(v12_10NtEastRoutingManifest, { pathCacheMax: 900 })
  : null;
const NT_EAST_SCOPE_ID = v12_10NtEastRoutingManifest?.scope?.id || "new-territories-east";
const v12_11NtWestRoutingManifest = window.V12_11_NT_WEST_ROUTING_MANIFEST || null;
const v12_11NtWestRoutingEvidence = window.V12_11_NT_WEST_ROUTING_EVIDENCE || null;
const v12_11NtWestAgentEvidence = window.V12_11_NT_WEST_AGENT_EVIDENCE || null;
const v12_11NtWestRoutingGraph = v12_11NtWestRoutingManifest && window.HKIslandRouting?.RegionalRoutingGraph
  ? new window.HKIslandRouting.RegionalRoutingGraph(v12_11NtWestRoutingManifest, { pathCacheMax: 900 })
  : null;
const NT_WEST_SCOPE_ID = v12_11NtWestRoutingManifest?.scope?.id || "new-territories-west";
const v12_11IslandsRoutingManifest = window.V12_11_ISLANDS_ROUTING_MANIFEST || null;
const v12_11IslandsRoutingEvidence = window.V12_11_ISLANDS_ROUTING_EVIDENCE || null;
const v12_11IslandsAgentEvidence = window.V12_11_ISLANDS_AGENT_EVIDENCE || null;
const v12_11IslandsRoutingGraph = v12_11IslandsRoutingManifest && window.HKIslandRouting?.RegionalRoutingGraph
  ? new window.HKIslandRouting.RegionalRoutingGraph(v12_11IslandsRoutingManifest, { pathCacheMax: 700 })
  : null;
const ISLANDS_SCOPE_ID = v12_11IslandsRoutingManifest?.scope?.id || "outlying-islands";
const expansionRoutingPacks = Object.freeze({});
const islandSchoolAccessByHomeNode = new Map(
  (islandSchoolAccessBundle?.byHomeNode || []).map(([homeNodeId, primaryCampuses, secondaryCampuses]) => [
    homeNodeId,
    { primary: primaryCampuses, secondary: secondaryCampuses },
  ]),
);
const islandPoiOutboundByNode = new Map(
  (islandPoiAccessBundle?.outboundByNode || []).map((row) => [row[0], row.slice(1)]),
);
const islandPoiReturnByHomeNode = new Map(
  (islandPoiAccessBundle?.returnByHomeNode || []).map((row) => [row[0], row.slice(1)]),
);
const kowloonSchoolAccessByHomeNode = new Map(
  (kowloonAccessBundle?.school?.byHomeNode || []).map(([homeNodeId, primaryCampuses, secondaryCampuses]) => [
    homeNodeId,
    { primary: primaryCampuses, secondary: secondaryCampuses },
  ]),
);
const kowloonPoiOutboundByNode = new Map(
  (kowloonAccessBundle?.poi?.outboundByNode || []).map((row) => [row[0], row.slice(1)]),
);
const kowloonPoiReturnByHomeNode = new Map(
  (kowloonAccessBundle?.poi?.returnByHomeNode || []).map((row) => [row[0], row.slice(1)]),
);
const ntEastSchoolAccessByHomeNode = new Map(
  (ntEastAccessBundle?.school?.byHomeNode || []).map(([homeNodeId, primaryCampuses, secondaryCampuses]) => [
    homeNodeId,
    { primary: primaryCampuses, secondary: secondaryCampuses },
  ]),
);
const ntEastPoiOutboundByNode = new Map(
  (ntEastAccessBundle?.poi?.outboundByNode || []).map((row) => [row[0], row.slice(1)]),
);
const ntEastPoiReturnByHomeNode = new Map(
  (ntEastAccessBundle?.poi?.returnByHomeNode || []).map((row) => [row[0], row.slice(1)]),
);
const ntWestSchoolAccessByHomeNode = new Map(
  (ntWestAccessBundle?.school?.byHomeNode || []).map(([homeNodeId, primaryCampuses, secondaryCampuses]) => [
    homeNodeId,
    { primary: primaryCampuses, secondary: secondaryCampuses },
  ]),
);
const ntWestPoiOutboundByNode = new Map(
  (ntWestAccessBundle?.poi?.outboundByNode || []).map((row) => [row[0], row.slice(1)]),
);
const ntWestPoiReturnByHomeNode = new Map(
  (ntWestAccessBundle?.poi?.returnByHomeNode || []).map((row) => [row[0], row.slice(1)]),
);
const islandsSchoolAccessByHomeNode = new Map(
  (islandsAccessBundle?.school?.byHomeNode || []).map(([homeNodeId, primaryCampuses, secondaryCampuses]) => [
    homeNodeId,
    { primary: primaryCampuses, secondary: secondaryCampuses },
  ]),
);
const islandsPoiOutboundByNode = new Map(
  (islandsAccessBundle?.poi?.outboundByNode || []).map((row) => [row[0], row.slice(1)]),
);
const islandsPoiReturnByHomeNode = new Map(
  (islandsAccessBundle?.poi?.returnByHomeNode || []).map((row) => [row[0], row.slice(1)]),
);
const ROUTE_CALIBRATION_MODE = window.ABM_ROUTE_CALIBRATION_MODE || routeCalibrationBundle?.defaultMode || "calibrated";
const ROUTE_CALIBRATION_ENABLED = ROUTE_CALIBRATION_MODE !== "baseline";
const routeCalibrationDefaults =
  routeCalibrationBundle || {
    version: "fallback",
    homeAttachment: { preferredSnapMeters: 100, fallbackSnapMeters: 180, weightDecayMeters: 85 },
    schoolChoice: {
      directCircuityPrior: 1.28,
      candidateLimit: 24,
      maxWalkMinutesByTcsGroup: { primary_1_3: 20, primary_4_6: 25, secondary_1_3: 30 },
      networkTimeDecayMinutesByTcsGroup: { primary_1_3: 6.5, primary_4_6: 8, secondary_1_3: 10 },
      sameDccaPull: 1.28,
      sameDistrictPull: 1.12,
      loadBalanceStartRatio: 0.78,
      loadBalanceStrength: 3.2,
      connectorDecayMeters: 90,
    },
    poiChoice: {
      candidateLimit: 80,
      maxDirectMeters: { outdoorYoung: 1400, outdoorOlder: 2200, activityYoung: 2200, activityOlder: 3400 },
      distanceDecayMeters: { outdoorYoung: 650, outdoorOlder: 950, activityYoung: 900, activityOlder: 1350 },
      connectorDecayMeters: 100,
    },
    routeQuality: {
      connectorReviewMeters: 100,
      connectorCriticalMeters: 250,
      connectorShareReview: 0.2,
      circuityReview: 2.5,
      circuityCritical: 4,
      routeCriticalMeters: 6000,
      gradeReview: 0.45,
      gradeCritical: 1,
      minimumNetworkShare: 0.9,
      schoolTimeCriticalBufferMinutes: 10,
    },
  };
const ROUTE_CALIBRATION = Object.freeze({
  ...routeCalibrationDefaults,
  ...(routeCalibrationOverrides || {}),
  homeAttachment: {
    ...routeCalibrationDefaults.homeAttachment,
    ...(routeCalibrationOverrides?.homeAttachment || {}),
  },
  schoolChoice: {
    ...routeCalibrationDefaults.schoolChoice,
    ...(routeCalibrationOverrides?.schoolChoice || {}),
  },
  poiChoice: {
    ...routeCalibrationDefaults.poiChoice,
    ...(routeCalibrationOverrides?.poiChoice || {}),
  },
  routeQuality: {
    ...routeCalibrationDefaults.routeQuality,
    ...(routeCalibrationOverrides?.routeQuality || {}),
  },
});
const MODEL_PARAMETERS = Object.freeze(
  realGeoData?.modelParameters || {
    version: "fallback",
    population: { agentAgeMin: 6, agentAgeMax: 16 },
    walking: {
      speedMetersPerMinute: {
        kindergarten: { min: 58, max: 68 },
        primary: { min: 66, max: 78 },
        secondary: { min: 72, max: 86 },
      },
      adultAccompanimentProbability: { kindergarten: 0.85, primary: 0.45, secondary: 0.12 },
    },
    schoolSchedule: {
      startMinute: 480,
      startHalfRangeMinutes: 11,
      arrivalBufferMinMinutes: 3,
      arrivalBufferMaxMinutes: 8,
    },
    schoolChoice: {
      fallbackCapacityByStage: { kindergarten: 180, primary: 650, secondary: 750, special: 120, other: 400 },
      networkTimeDecayMinutes: { kindergarten: 6.5, primary: 8.5, secondary: 11 },
      maxWalkMinutes: { kindergarten: 20, primary: 30, secondary: 40 },
      longWalkThresholdMinutes: 20,
      longWalkDecayMinutes: 5,
      sameDccaPull: 1.22,
      loadBalanceStartRatio: 0.72,
      loadBalanceStrength: 3.2,
    },
    householdSynthesis: { maxModelChildrenPerHousehold: 3 },
    poiChoice: { preferenceWeights: {} },
  },
);
const TCS_WALK_TARGETS = Object.freeze(
  realGeoData?.calibrationTargets?.tcs2022WalkOnly || {
    meanJourneyMinutes: 12,
    atMost10MinuteShare: 0.64,
    over15MinuteShare: 0.15,
    homeBasedSchoolMorningPeak: "07:00-08:00",
  },
);
const PHYSICAL_ACTIVITY_PARAMETERS = Object.freeze(
  MODEL_PARAMETERS.physicalActivity || {
    metricName: "Modelled expected MVPA",
    mvpaThresholdMety: 4,
    vigorousThresholdMety: 6,
    guidelines: {
      schoolAge: { ageMin: 6, ageMax: 17, dailyAverageMvpaMinutes: 60 },
      earlyYears: { ageMin: 3, ageMax: 5, dailyMvpaMinutes: 60, dailyTotalActivityMinutes: 180 },
    },
    externalValidation: { daily60MinuteShare: 0.056 },
    metyAgeBands: [
      { key: "6-9", ageMin: 6, ageMax: 9 },
      { key: "10-12", ageMin: 10, ageMax: 12 },
      { key: "13-15", ageMin: 13, ageMax: 15 },
      { key: "16-18", ageMin: 16, ageMax: 18 },
    ],
    walkingMetyByMph: {
      "6-9": [{ mph: 2, mety: 2.8 }, { mph: 3, mety: 3.8 }, { mph: 4, mety: 4.8 }],
      "10-12": [{ mph: 2, mety: 3 }, { mph: 3, mety: 4.1 }, { mph: 4, mety: 5.2 }],
      "13-15": [{ mph: 2, mety: 3.2 }, { mph: 3, mety: 4.3 }, { mph: 4, mety: 5.6 }],
      "16-18": [{ mph: 2, mety: 3.4 }, { mph: 3, mety: 4.5 }, { mph: 4, mety: 6 }],
    },
    slopeMetyGainPerGrade: 10,
    maxSlopeMetyGain: 3,
    personalPropensity: { min: 0.7, max: 1.3 },
    school: {
      activeFractionByStage: { kindergarten: 0.075, primary: 0.055, secondary: 0.04 },
      activeMetyByAgeBand: { "6-9": 5.9, "10-12": 6.1, "13-15": 6.2, "16-18": 6.4 },
      restMetyByAgeBand: { "6-9": 1.6, "10-12": 1.5, "13-15": 1.5, "16-18": 1.4 },
    },
    destinationProfiles: {
      play: {
        outdoorActiveFraction: 0.38,
        activityActiveFraction: 0.22,
        activeMetyByAgeBand: { "6-9": 5.7, "10-12": 5.9, "13-15": 6, "16-18": 6.1 },
        restMety: 2.2,
      },
      sport: {
        outdoorActiveFraction: 0.58,
        activityActiveFraction: 0.5,
        activeMetyByAgeBand: { "6-9": 6.7, "10-12": 7, "13-15": 7.2, "16-18": 7.5 },
        restMety: 2.5,
      },
      community: {
        outdoorActiveFraction: 0.1,
        activityActiveFraction: 0.08,
        activeMetyByAgeBand: { "6-9": 4.6, "10-12": 4.9, "13-15": 5.1, "16-18": 5.4 },
        restMety: 1.8,
      },
    },
    inactiveMety: { sleep: 1, home: 1.5, commuteWaiting: 1.5 },
  },
);
const TCS2011_CHILD_MOBILITY = Object.freeze(
  MODEL_PARAMETERS.tcs2011ChildMobility || {
    schemaVersion: "fallback",
    cohort: { modelAgeMin: 6, modelAgeMax: 16, eligibleRespondents: 0, mentorProposalRespondents: 0 },
    modelPolicy: { mvpaAccounting: "conservative-active-segments" },
    groups: {
      primary_1_3: {
        label: "Primary 1-3",
        ageMin: 6,
        ageMax: 8,
        modes: [{ key: "walk", label: "Walk only", share: 1, activeTravelShareConservative: 1 }],
        outboundDeparture: { bins: [{ startMinute: 420, endMinute: 479, weightedMeanMinute: 450, share: 1 }] },
        outboundJourneyTime: { meanMinutes: 20, p10Minutes: 10, p25Minutes: 15, p50Minutes: 20, p75Minutes: 25, p90Minutes: 35 },
      },
      primary_4_6: {
        label: "Primary 4-6",
        ageMin: 9,
        ageMax: 11,
        modes: [{ key: "walk", label: "Walk only", share: 1, activeTravelShareConservative: 1 }],
        outboundDeparture: { bins: [{ startMinute: 420, endMinute: 479, weightedMeanMinute: 450, share: 1 }] },
        outboundJourneyTime: { meanMinutes: 22, p10Minutes: 10, p25Minutes: 15, p50Minutes: 20, p75Minutes: 30, p90Minutes: 40 },
      },
      secondary_1_3: {
        label: "Secondary 1-3",
        ageMin: 12,
        ageMax: 16,
        modes: [{ key: "walk", label: "Walk only", share: 1, activeTravelShareConservative: 1 }],
        outboundDeparture: { bins: [{ startMinute: 420, endMinute: 479, weightedMeanMinute: 450, share: 1 }] },
        outboundJourneyTime: { meanMinutes: 25, p10Minutes: 15, p25Minutes: 20, p50Minutes: 25, p75Minutes: 35, p90Minutes: 45 },
      },
    },
  },
);
const TCS_MODE_LABELS = Object.freeze(
  Object.fromEntries(
    Object.values(TCS2011_CHILD_MOBILITY.groups || {})
      .flatMap((group) => group.modes || [])
      .map((mode) => [mode.key, mode.label]),
  ),
);
const appUnitMeters = realGeoData?.metadata?.appUnitMeters || 600;
const verticalUnitMeters = realGeoData?.metadata?.verticalUnitMeters || 6;
const FLOOR_HEIGHT_METERS = 3.2;
const FLOOR_HEIGHT_UNITS = FLOOR_HEIGHT_METERS / verticalUnitMeters;
const PERSON_HEIGHT_UNITS = 1.35 / verticalUnitMeters;
const INTERACTION_CELL_SIZE = 36 / appUnitMeters;
const INTERACTION_HEIGHT_SIZE = FLOOR_HEIGHT_UNITS * 1.35;

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
const dccaAreas = realGeoData
  ? realGeoData.dccas2019.map((area) => ({
      ...area,
      color: area.color || "#20232a",
    }))
  : [];
const focusAreas = realGeoData
  ? [
      ...zones,
      ...dccaAreas,
    ]
  : zones;
const focusAreaById = new Map(focusAreas.map((area) => [area.id, area]));
const hkIslandDccaIdSet = new Set(hkIslandModel?.scope?.dccaIds || []);
const hkIslandDistrictIdSet = new Set(hkIslandModel?.scope?.districtIds || []);
const hkIslandDccas = dccaAreas
  .filter((area) => hkIslandDccaIdSet.has(area.id))
  .sort((a, b) => a.code.localeCompare(b.code));
const hkIslandDistricts = zones.filter((area) => hkIslandDistrictIdSet.has(area.id));
const kowloonDccaIdSet = new Set(v12_9KowloonRoutingManifest?.scope?.dccaIds || []);
const kowloonDccas = dccaAreas
  .filter((area) => kowloonDccaIdSet.has(area.id))
  .sort((a, b) => a.code.localeCompare(b.code));
const kowloonDistrictIdSet = new Set(kowloonDccas.map((area) => area.parentDistrictId).filter(Boolean));
const kowloonDistricts = zones.filter((area) => kowloonDistrictIdSet.has(area.id));
const ntEastDccaIdSet = new Set(v12_10NtEastRoutingManifest?.scope?.dccaIds || []);
const ntEastDccas = dccaAreas
  .filter((area) => ntEastDccaIdSet.has(area.id))
  .sort((a, b) => a.code.localeCompare(b.code));
const ntEastDistrictIdSet = new Set(ntEastDccas.map((area) => area.parentDistrictId).filter(Boolean));
const ntEastDistricts = zones.filter((area) => ntEastDistrictIdSet.has(area.id));
const ntWestDccaIdSet = new Set(v12_11NtWestRoutingManifest?.scope?.dccaIds || []);
const ntWestDccas = dccaAreas
  .filter((area) => ntWestDccaIdSet.has(area.id))
  .sort((a, b) => a.code.localeCompare(b.code));
const ntWestDistrictIdSet = new Set(ntWestDccas.map((area) => area.parentDistrictId).filter(Boolean));
const ntWestDistricts = zones.filter((area) => ntWestDistrictIdSet.has(area.id));
const islandsDccaIdSet = new Set(v12_11IslandsRoutingManifest?.scope?.dccaIds || []);
const islandsDccas = dccaAreas
  .filter((area) => islandsDccaIdSet.has(area.id))
  .sort((a, b) => a.code.localeCompare(b.code));
const islandsDistrictIdSet = new Set(islandsDccas.map((area) => area.parentDistrictId).filter(Boolean));
const islandsDistricts = zones.filter((area) => islandsDistrictIdSet.has(area.id));
const hkIslandNetworkProfileByDcca = new Map(
  (hkIslandModel?.dccaNetworkProfiles || []).map((profile) => [profile.dccaId, profile]),
);
const hkIslandResidentialAnchors = (hkIslandRoutingManifest?.attachments?.residentialBuildings || []).map(
  ([id, dccaId, x, y, networkNodeId, networkSnapMeters, baseHeightMeters, heightMeters, levels, areaSqm, residentialShare, homeWeight, evidenceCode]) => ({
    id: `hki-home-${id}`,
    buildingId: id,
    dccaId,
    x,
    y,
    networkNodeId,
    networkSnapMeters,
    base: baseHeightMeters / verticalUnitMeters,
    height: (baseHeightMeters + heightMeters) / verticalUnitMeters,
    heightMeters,
    levels,
    areaSqm,
    residentialShare,
    homeWeight,
    evidenceCode,
    source: "CSDI Building + OP residential evidence",
  }),
);
const hkIslandResidentialAnchorsByDcca = new Map();
hkIslandResidentialAnchors.forEach((building) => {
  const bucket = hkIslandResidentialAnchorsByDcca.get(building.dccaId) || [];
  bucket.push(building);
  hkIslandResidentialAnchorsByDcca.set(building.dccaId, bucket);
});
const kowloonResidentialAnchors = (v12_9KowloonRoutingManifest?.attachments?.residentialBuildings || []).map(
  ([id, dccaId, x, y, networkNodeId, networkSnapMeters, baseHeightMeters, heightMeters, levels, areaSqm, residentialShare, homeWeight, evidenceCode]) => ({
    id: `kowloon-home-${id}`,
    buildingId: id,
    dccaId,
    x,
    y,
    networkNodeId,
    networkSnapMeters,
    base: baseHeightMeters / verticalUnitMeters,
    height: (baseHeightMeters + heightMeters) / verticalUnitMeters,
    heightMeters,
    levels,
    areaSqm,
    residentialShare,
    homeWeight,
    evidenceCode,
    source: "CSDI Building + OP residential evidence",
  }),
);
const kowloonResidentialAnchorsByDcca = new Map();
kowloonResidentialAnchors.forEach((building) => {
  const bucket = kowloonResidentialAnchorsByDcca.get(building.dccaId) || [];
  bucket.push(building);
  kowloonResidentialAnchorsByDcca.set(building.dccaId, bucket);
});
const ntEastResidentialAnchors = (v12_10NtEastRoutingManifest?.attachments?.residentialBuildings || []).map(
  ([id, dccaId, x, y, networkNodeId, networkSnapMeters, baseHeightMeters, heightMeters, levels, areaSqm, residentialShare, homeWeight, evidenceCode]) => ({
    id: `nt-east-home-${id}`,
    buildingId: id,
    dccaId,
    x,
    y,
    networkNodeId,
    networkSnapMeters,
    base: baseHeightMeters / verticalUnitMeters,
    height: (baseHeightMeters + heightMeters) / verticalUnitMeters,
    heightMeters,
    levels,
    areaSqm,
    residentialShare,
    homeWeight,
    evidenceCode,
    source: evidenceCode?.includes("fallback")
      ? "CSDI unnamed Tower + Census-populated DCCA fallback"
      : "CSDI Building + OP residential evidence",
  }),
);
const ntEastResidentialAnchorsByDcca = new Map();
ntEastResidentialAnchors.forEach((building) => {
  const bucket = ntEastResidentialAnchorsByDcca.get(building.dccaId) || [];
  bucket.push(building);
  ntEastResidentialAnchorsByDcca.set(building.dccaId, bucket);
});
function decodeV12_11ResidentialAnchors(manifest, prefix) {
  return (manifest?.attachments?.residentialBuildings || []).map(
    ([id, dccaId, x, y, networkNodeId, networkSnapMeters, baseHeightMeters, heightMeters, levels, areaSqm, residentialShare, homeWeight, evidenceCode, componentId]) => ({
      id: `${prefix}-home-${id}`,
      buildingId: id,
      dccaId,
      x,
      y,
      networkNodeId,
      networkSnapMeters,
      componentId: componentId ?? 0,
      base: baseHeightMeters / verticalUnitMeters,
      height: (baseHeightMeters + heightMeters) / verticalUnitMeters,
      heightMeters,
      levels,
      areaSqm,
      residentialShare,
      homeWeight,
      evidenceCode,
      source: "CSDI Building + OP residential evidence",
    }),
  );
}

function groupResidentialAnchorsByDcca(anchors) {
  const grouped = new Map();
  anchors.forEach((building) => {
    const bucket = grouped.get(building.dccaId) || [];
    bucket.push(building);
    grouped.set(building.dccaId, bucket);
  });
  return grouped;
}

const ntWestResidentialAnchors = decodeV12_11ResidentialAnchors(v12_11NtWestRoutingManifest, "nt-west");
const ntWestResidentialAnchorsByDcca = groupResidentialAnchorsByDcca(ntWestResidentialAnchors);
const islandsResidentialAnchors = decodeV12_11ResidentialAnchors(v12_11IslandsRoutingManifest, "islands");
const islandsResidentialAnchorsByDcca = groupResidentialAnchorsByDcca(islandsResidentialAnchors);
const kowloonSchoolAttachmentById = new Map(
  (v12_9KowloonRoutingManifest?.attachments?.schools || []).map(
    ([id, nodeId, snapMeters, nodeElevationHkpdM]) => [id, { nodeId, snapMeters, nodeElevationHkpdM }],
  ),
);
const kowloonPoiAttachmentById = new Map(
  (v12_9KowloonRoutingManifest?.attachments?.childPois || []).map(
    ([id, nodeId, snapMeters, nodeElevationHkpdM]) => [id, { nodeId, snapMeters, nodeElevationHkpdM }],
  ),
);
const ntEastSchoolAttachmentById = new Map(
  (v12_10NtEastRoutingManifest?.attachments?.schools || []).map(
    ([id, nodeId, snapMeters, nodeElevationHkpdM]) => [id, { nodeId, snapMeters, nodeElevationHkpdM }],
  ),
);
const ntEastPoiAttachmentById = new Map(
  (v12_10NtEastRoutingManifest?.attachments?.childPois || []).map(
    ([id, nodeId, snapMeters, nodeElevationHkpdM]) => [id, { nodeId, snapMeters, nodeElevationHkpdM }],
  ),
);
function decodeV12_11PlaceAttachments(manifest, type) {
  return new Map(
    (manifest?.attachments?.[type] || []).map(
      ([id, nodeId, snapMeters, nodeElevationHkpdM, componentId]) => [
        id,
        { nodeId, snapMeters, nodeElevationHkpdM, componentId: componentId ?? 0 },
      ],
    ),
  );
}

const ntWestSchoolAttachmentById = decodeV12_11PlaceAttachments(v12_11NtWestRoutingManifest, "schools");
const ntWestPoiAttachmentById = decodeV12_11PlaceAttachments(v12_11NtWestRoutingManifest, "childPois");
const islandsSchoolAttachmentById = decodeV12_11PlaceAttachments(v12_11IslandsRoutingManifest, "schools");
const islandsPoiAttachmentById = decodeV12_11PlaceAttachments(v12_11IslandsRoutingManifest, "childPois");
const HK_ISLAND_DISTRICT_COLORS = Object.freeze({
  "district-central-western": "#27847b",
  "district-wan-chai": "#4d78a1",
  "district-eastern": "#6f9654",
  "district-southern": "#bd6975",
});
hkIslandDccas.forEach((area) => {
  const profile = hkIslandNetworkProfileByDcca.get(area.id) || null;
  area.networkProfile = profile;
  area.color = HK_ISLAND_DISTRICT_COLORS[area.parentDistrictId] || "#59656c";
  if (profile) {
    area.networkElevationHkpdM = profile.medianElevationHkpdM;
    area.terrain = profile.medianElevationHkpdM / verticalUnitMeters;
  }
});
kowloonDccas.forEach((area) => {
  const anchors = kowloonResidentialAnchorsByDcca.get(area.id) || [];
  const elevations = anchors.map((anchor) => anchor.base * verticalUnitMeters).sort((a, b) => a - b);
  const medianElevation = elevations.length ? elevations[Math.floor(elevations.length / 2)] : 0;
  area.networkProfile = {
    dccaId: area.id,
    edgeCount: v12_9KowloonRoutingManifest?.dccaEdgeCounts?.[area.id] || 0,
    medianElevationHkpdM: medianElevation,
  };
  area.networkElevationHkpdM = medianElevation;
  area.terrain = medianElevation / verticalUnitMeters;
  area.color = {
    "district-yau-tsim-mong": "#397f77",
    "district-sham-shui-po": "#54799a",
    "district-kowloon-city": "#739451",
    "district-wong-tai-sin": "#b87542",
    "district-kwun-tong": "#b96571",
  }[area.parentDistrictId] || "#59656c";
});
ntEastDccas.forEach((area) => {
  const anchors = ntEastResidentialAnchorsByDcca.get(area.id) || [];
  const elevations = anchors.map((anchor) => anchor.base * verticalUnitMeters).sort((a, b) => a - b);
  const medianElevation = elevations.length ? elevations[Math.floor(elevations.length / 2)] : 0;
  area.networkProfile = {
    dccaId: area.id,
    edgeCount: v12_10NtEastRoutingManifest?.dccaEdgeCounts?.[area.id] || 0,
    medianElevationHkpdM: medianElevation,
  };
  area.networkElevationHkpdM = medianElevation;
  area.terrain = medianElevation / verticalUnitMeters;
  area.color = {
    "district-sha-tin": "#347d74",
    "district-tai-po": "#4c78a0",
    "district-north": "#76924f",
    "district-sai-kung": "#bd6a72",
  }[area.parentDistrictId] || "#59656c";
});
function applyRegionalDccaProfiles(dccas, anchorsByDcca, manifest, districtColors) {
  dccas.forEach((area) => {
    const anchors = anchorsByDcca.get(area.id) || [];
    const elevations = anchors.map((anchor) => anchor.base * verticalUnitMeters).sort((a, b) => a - b);
    const medianElevation = elevations.length ? elevations[Math.floor(elevations.length / 2)] : 0;
    area.networkProfile = {
      dccaId: area.id,
      edgeCount: manifest?.dccaEdgeCounts?.[area.id] || 0,
      medianElevationHkpdM: medianElevation,
    };
    area.networkElevationHkpdM = medianElevation;
    area.terrain = medianElevation / verticalUnitMeters;
    area.color = districtColors[area.parentDistrictId] || "#59656c";
  });
}

applyRegionalDccaProfiles(ntWestDccas, ntWestResidentialAnchorsByDcca, v12_11NtWestRoutingManifest, {
  "district-tsuen-wan": "#3d7f78",
  "district-kwai-tsing": "#55789d",
  "district-tuen-mun": "#779452",
  "district-yuen-long": "#bd6d72",
});
applyRegionalDccaProfiles(islandsDccas, islandsResidentialAnchorsByDcca, v12_11IslandsRoutingManifest, {
  "district-islands": "#a87343",
});
const realBuildingLayer = realGeoData ? realGeoData.buildings : [];
const realSchoolLayer = realGeoData?.schoolLocations || [];
const mobilityNodeLayer = realGeoData?.mobilityNodes || [];
const realPoiLayer = realGeoData?.poiLocations || [];
const realPoiById = new Map(realPoiLayer.map((poi) => [poi.id, poi]));
const islandPoiByAccessIndex = (islandPoiAccessBundle?.poiIds || []).map(
  (poiId) => realPoiById.get(poiId) || null,
);
const kowloonPoiByAccessIndex = (kowloonAccessBundle?.poi?.poiIds || []).map(
  (poiId) => realPoiById.get(poiId) || null,
);
const ntEastPoiByAccessIndex = (ntEastAccessBundle?.poi?.poiIds || []).map(
  (poiId) => realPoiById.get(poiId) || null,
);
const ntWestPoiByAccessIndex = (ntWestAccessBundle?.poi?.poiIds || []).map(
  (poiId) => realPoiById.get(poiId) || null,
);
const islandsPoiByAccessIndex = (islandsAccessBundle?.poi?.poiIds || []).map(
  (poiId) => realPoiById.get(poiId) || null,
);
const hkIslandSchoolLayer = realSchoolLayer.filter((school) => hkIslandDccaIdSet.has(school.dccaId));
const hkIslandPoiLayer = realPoiLayer.filter((poi) => hkIslandDccaIdSet.has(poi.dccaId));
const kowloonSchoolLayer = realSchoolLayer.filter(
  (school) => kowloonDccaIdSet.has(school.dccaId) && kowloonSchoolAttachmentById.has(school.id),
);
const kowloonPoiLayer = realPoiLayer.filter(
  (poi) => kowloonDccaIdSet.has(poi.dccaId) && kowloonPoiAttachmentById.has(poi.id),
);
const ntEastSchoolLayer = realSchoolLayer.filter(
  (school) => ntEastDccaIdSet.has(school.dccaId) && ntEastSchoolAttachmentById.has(school.id),
);
const ntEastPoiLayer = realPoiLayer.filter(
  (poi) => ntEastDccaIdSet.has(poi.dccaId) && ntEastPoiAttachmentById.has(poi.id),
);
const ntWestSchoolLayer = realSchoolLayer.filter(
  (school) => ntWestDccaIdSet.has(school.dccaId) && ntWestSchoolAttachmentById.has(school.id),
);
const ntWestPoiLayer = realPoiLayer.filter(
  (poi) => ntWestDccaIdSet.has(poi.dccaId) && ntWestPoiAttachmentById.has(poi.id),
);
const islandsSchoolLayer = realSchoolLayer.filter(
  (school) => islandsDccaIdSet.has(school.dccaId) && islandsSchoolAttachmentById.has(school.id),
);
const islandsPoiLayer = realPoiLayer.filter(
  (poi) => islandsDccaIdSet.has(poi.dccaId) && islandsPoiAttachmentById.has(poi.id),
);
const hkIslandMobilityNodeLayer = mobilityNodeLayer.filter((node) =>
  hkIslandDccas.some((area) => pointInArea(node, area)),
);
const hkIslandBuildingLayer = realBuildingLayer.filter((building) =>
  hkIslandDccas.some((area) => pointInArea(building, area)),
);
const kowloonBuildingLayer = realBuildingLayer.filter((building) =>
  kowloonDccas.some((area) => pointInArea(building, area)),
);
const ntEastBuildingLayer = realBuildingLayer.filter((building) =>
  ntEastDccas.some((area) => pointInArea(building, area)),
);
const ntWestBuildingLayer = realBuildingLayer.filter((building) =>
  ntWestDccas.some((area) => pointInArea(building, area)),
);
const islandsBuildingLayer = realBuildingLayer.filter((building) =>
  islandsDccas.some((area) => pointInArea(building, area)),
);
const hkIslandBuildingDistribution = (realGeoData?.buildingDistribution || []).filter((cell) =>
  hkIslandDccas.some((area) => pointInArea(cell, area)),
);
const kowloonBuildingDistribution = (realGeoData?.buildingDistribution || []).filter((cell) =>
  kowloonDccas.some((area) => pointInArea(cell, area)),
);
const ntEastBuildingDistribution = (realGeoData?.buildingDistribution || []).filter((cell) =>
  ntEastDccas.some((area) => pointInArea(cell, area)),
);
const ntWestBuildingDistribution = (realGeoData?.buildingDistribution || []).filter((cell) =>
  ntWestDccas.some((area) => pointInArea(cell, area)),
);
const islandsBuildingDistribution = (realGeoData?.buildingDistribution || []).filter((cell) =>
  islandsDccas.some((area) => pointInArea(cell, area)),
);
const pilotRegistry = realGeoData?.pilots || {};
const pilotByScope = new Map(Object.values(pilotRegistry).map((pilot) => [pilot.id, pilot]));
const PILOT_MAX_SNAP_METERS = 140;
const PILOT_SCHOOL_CAPACITY_PRIOR = Object.freeze(MODEL_PARAMETERS.schoolChoice.fallbackCapacityByStage);
const PILOT_VERTICAL_FEATURES = new Set([8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21]);
const PILOT_MECHANICAL_FEATURES = new Set([8, 9, 10, 13, 16, 17, 18, 21]);
const PILOT_STAIR_FEATURES = new Set([12, 20]);
const PILOT_RAMP_FEATURES = new Set([11, 19]);
const PILOT_CROSSING_FEATURES = new Set([30, 31, 32, 33]);
let activePilot = pilotRegistry.r34 || Object.values(pilotRegistry)[0] || null;
let activePilotKey = activePilot?.key || null;
let pilotArea = null;
let pilotNetwork = null;
let pilotNetworkNodes = [];
let pilotNetworkEdges = [];
let pilotBuildingLayer = [];
let pilotHomeBuildings = [];
let pilotSchoolLayer = [];
let pilotSchoolCampuses = [];
let pilotPoiLayer = [];
let pilotNetworkEdgeGroups = { vertical: [], crossing: [], covered: [], open: [] };
let pilotAdjacency = null;
const pilotPathCache = new Map();
const PILOT_PATH_CACHE_MAX = 4000;

function pilotEndpointRecord(record, pilotKey) {
  const nodeId = record.pilotNodeIds?.[pilotKey] ?? (pilotKey === "r34" ? record.pilotNodeId : null);
  if (!Number.isInteger(nodeId)) return null;
  const snapValue = record.pilotSnapMeters;
  const snapMeters =
    snapValue && typeof snapValue === "object" ? snapValue[pilotKey] : pilotKey === "r34" ? snapValue : null;
  return { ...record, pilotNodeId: nodeId, pilotSnapMeters: snapMeters };
}

function groupPilotSchoolCampuses(schools) {
  return [...schools.reduce((campuses, school) => {
    const normalizedName = school.name.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
    const key = `${school.stage || "other"}:${normalizedName}`;
    const members = campuses.get(key) || [];
    members.push(school);
    campuses.set(key, members);
    return campuses;
  }, new Map()).entries()].map(([campusId, members]) => {
    const representative = members.reduce((best, school) =>
      (school.pilotSnapMeters ?? Infinity) < (best.pilotSnapMeters ?? Infinity) ? school : best,
    );
    const permittedByRegistration = new Map();
    members.forEach((school) => {
      if (school.registrationSchoolNumber && school.permittedAccommodation > 0) {
        permittedByRegistration.set(school.registrationSchoolNumber, school.permittedAccommodation);
      }
    });
    const permittedAccommodation = [...permittedByRegistration.values()].reduce((sum, value) => sum + value, 0);
    representative.campusId = campusId;
    representative.edbRecordCount = members.length;
    representative.permittedAccommodation = permittedAccommodation || null;
    representative.capacityPrior = permittedAccommodation ||
      (PILOT_SCHOOL_CAPACITY_PRIOR[representative.stage] || PILOT_SCHOOL_CAPACITY_PRIOR.other) *
        (1 + Math.max(0, members.length - 1) * 0.22);
    representative.capacitySource = permittedAccommodation
      ? "EDB classroom permitted accommodation"
      : "Stage capacity prior fallback";
    return representative;
  });
}

function activatePilot(pilot) {
  activePilot = pilot || null;
  activePilotKey = activePilot?.key || null;
  pilotArea = activePilot ? focusAreaById.get(activePilot.dccaId) || null : null;
  if (pilotArea) {
    pilotArea.color = "#4c9f88";
    if (activePilot.center) {
      pilotArea.x = activePilot.center.x;
      pilotArea.y = activePilot.center.y;
      pilotArea.lon = activePilot.center.lon;
      pilotArea.lat = activePilot.center.lat;
    }
  }
  pilotNetwork = activePilot?.network || null;
  pilotNetworkNodes = pilotNetwork?.nodes || [];
  pilotNetworkEdges = pilotNetwork?.edges || [];
  pilotBuildingLayer = activePilot?.buildings || [];
  const homeIds = new Set(activePilot?.homeBuildingIds || []);
  pilotHomeBuildings = pilotBuildingLayer.filter(
    (building) => homeIds.has(building.id) && Number.isInteger(building.networkNodeId),
  );
  pilotSchoolLayer = realSchoolLayer.map((school) => pilotEndpointRecord(school, activePilotKey)).filter(Boolean);
  pilotSchoolCampuses = groupPilotSchoolCampuses(pilotSchoolLayer);
  pilotPoiLayer = realPoiLayer.map((poi) => pilotEndpointRecord(poi, activePilotKey)).filter(Boolean);
  pilotNetworkEdgeGroups = { vertical: [], crossing: [], covered: [], open: [] };
  pilotNetworkEdges.forEach((edge) => {
    if (PILOT_VERTICAL_FEATURES.has(edge[3])) pilotNetworkEdgeGroups.vertical.push(edge);
    else if (PILOT_CROSSING_FEATURES.has(edge[3])) pilotNetworkEdgeGroups.crossing.push(edge);
    else if (edge[4] === 1 || edge[5] === 2) pilotNetworkEdgeGroups.covered.push(edge);
    else pilotNetworkEdgeGroups.open.push(edge);
  });
  pilotAdjacency = null;
  pilotPathCache.clear();
}

activatePilot(activePilot);
let poiByZoneId = new Map();
let poiByGroup = new Map();
const POI_GROUP_META = {
  play: { label: "Play / parks", color: "#5d9145", shape: "circle" },
  sport: { label: "Sports", color: "#d18432", shape: "square" },
  study: { label: "Study / library", color: "#3f78a5", shape: "diamond" },
  community: { label: "Community", color: "#8a66a1", shape: "triangle" },
  health: { label: "Health context", color: "#bd6570", shape: "cross" },
};
let schoolsByStage = {
  kindergarten: [],
  primary: [],
  secondary: [],
  special: [],
  other: [],
};
let hkIslandSchoolCampuses = [];
let hkIslandSchoolCampusById = new Map();
let kowloonSchoolCampuses = [];
let kowloonSchoolCampusById = new Map();
let ntEastSchoolCampuses = [];
let ntEastSchoolCampusById = new Map();
let ntWestSchoolCampuses = [];
let ntWestSchoolCampusById = new Map();
let islandsSchoolCampuses = [];
let islandsSchoolCampusById = new Map();
const buildingDistribution = realGeoData?.buildingDistribution || [];
const sceneBuildingDistribution = [...buildingDistribution]
  .filter((cell) => Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45) >= 0.018)
  .sort(
    (a, b) =>
      Math.max(b.areaNorm || 0, (b.countNorm || 0) * 0.45) -
      Math.max(a.areaNorm || 0, (a.countNorm || 0) * 0.45),
  )
  .slice(0, 280);
const hkIslandSceneBuildingDistribution = [...hkIslandBuildingDistribution]
  .filter((cell) => Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45) >= 0.012)
  .sort(
    (a, b) =>
      Math.max(b.areaNorm || 0, (b.countNorm || 0) * 0.45) -
      Math.max(a.areaNorm || 0, (a.countNorm || 0) * 0.45),
  )
  .slice(0, 180);
const kowloonSceneBuildingDistribution = [...kowloonBuildingDistribution]
  .filter((cell) => Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45) >= 0.012)
  .sort(
    (a, b) =>
      Math.max(b.areaNorm || 0, (b.countNorm || 0) * 0.45) -
      Math.max(a.areaNorm || 0, (a.countNorm || 0) * 0.45),
  )
  .slice(0, 220);
const ntEastSceneBuildingDistribution = [...ntEastBuildingDistribution]
  .filter((cell) => Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45) >= 0.012)
  .sort(
    (a, b) =>
      Math.max(b.areaNorm || 0, (b.countNorm || 0) * 0.45) -
      Math.max(a.areaNorm || 0, (a.countNorm || 0) * 0.45),
  )
  .slice(0, 240);
const ntWestSceneBuildingDistribution = [...ntWestBuildingDistribution]
  .filter((cell) => Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45) >= 0.012)
  .sort(
    (a, b) =>
      Math.max(b.areaNorm || 0, (b.countNorm || 0) * 0.45) -
      Math.max(a.areaNorm || 0, (a.countNorm || 0) * 0.45),
  )
  .slice(0, 240);
const islandsSceneBuildingDistribution = [...islandsBuildingDistribution]
  .filter((cell) => Math.max(cell.areaNorm || 0, (cell.countNorm || 0) * 0.45) >= 0.01)
  .sort(
    (a, b) =>
      Math.max(b.areaNorm || 0, (b.countNorm || 0) * 0.45) -
      Math.max(a.areaNorm || 0, (a.countNorm || 0) * 0.45),
  )
  .slice(0, 180);
const officialBuildingSource = realGeoData?.metadata?.sources?.find((source) =>
  source.name?.includes("CSDI Building"),
);

const sceneCanvas = document.getElementById("sceneCanvas");
const sceneCtx = sceneCanvas.getContext("2d");
const mapCanvas = document.getElementById("mapCanvas");
const mapCtx = mapCanvas.getContext("2d");
const osmCanvas = document.getElementById("osmCanvas");
const osmCtx = osmCanvas.getContext("2d");
const agentCanvas = document.getElementById("agentCanvas");
const agentCtx = agentCanvas.getContext("2d");
const agentProfileCanvas = document.getElementById("agentProfileCanvas");
const agentProfileCtx = agentProfileCanvas.getContext("2d");
const routeQaCanvas = document.getElementById("routeQaCanvas");
const routeQaCtx = routeQaCanvas.getContext("2d");
const terrainQaCanvas = document.getElementById("terrainQaCanvas");
const terrainQaCtx = terrainQaCanvas.getContext("2d");
const buildingCanvas = document.getElementById("buildingCanvas");
const buildingCtx = buildingCanvas.getContext("2d");
const comparisonMetricsCanvas = document.getElementById("comparisonMetricsCanvas");
const comparisonMetricsCtx = comparisonMetricsCanvas.getContext("2d");
const comparisonDistributionCanvas = document.getElementById("comparisonDistributionCanvas");
const comparisonDistributionCtx = comparisonDistributionCanvas.getContext("2d");
const expansionCanvas = document.getElementById("expansionCanvas");
const expansionCtx = expansionCanvas.getContext("2d");
const kowloonLabCanvas = document.getElementById("kowloonLabCanvas");
const kowloonLabCtx = kowloonLabCanvas.getContext("2d");
const appShell = document.querySelector(".app");
const simulationArea = document.querySelector(".simulation-area");
const buildingsView = document.getElementById("buildingsView");
const agentsView = document.getElementById("agentsView");
const routeQaView = document.getElementById("routeQaView");
const terrainQaView = document.getElementById("terrainQaView");
const validationView = document.getElementById("validationView");
const kowloonLabView = document.getElementById("kowloonLabView");
const expansionView = document.getElementById("expansionView");
const statsView = document.getElementById("statsView");
const rulesView = document.getElementById("rulesView");
const comparisonView = document.getElementById("comparisonView");
const tooltip = document.getElementById("tooltip");
const spatialSelectionEls = {
  inspector: document.getElementById("spatialSelectionInspector"),
  type: document.getElementById("spatialSelectionType"),
  title: document.getElementById("spatialSelectionTitle"),
  subtitle: document.getElementById("spatialSelectionSubtitle"),
  close: document.getElementById("spatialSelectionClose"),
  metrics: document.getElementById("spatialSelectionMetrics"),
  replay: document.getElementById("spatialSelectionReplay"),
  replayOutput: document.getElementById("spatialSelectionReplayOutput"),
  replayToggle: document.getElementById("spatialSelectionReplayToggle"),
  replayRange: document.getElementById("spatialSelectionReplayRange"),
  primary: document.getElementById("spatialSelectionPrimary"),
  secondary: document.getElementById("spatialSelectionSecondary"),
};
const expansionEls = {
  regionSelect: document.getElementById("expansionRegionSelect"),
  regionalStatus: document.getElementById("expansionRegionalStatus"),
  pendingStatus: document.getElementById("expansionPendingStatus"),
  mapTitle: document.getElementById("expansionMapTitle"),
  ledgerTitle: document.getElementById("expansionLedgerTitle"),
  claimTitle: document.getElementById("expansionClaimTitle"),
  supportedClaim: document.getElementById("expansionSupportedClaim"),
  unsupportedClaim: document.getElementById("expansionUnsupportedClaim"),
  loadStatus: document.getElementById("expansionLoadStatus"),
  routeSelect: document.getElementById("expansionRouteSelect"),
  previousRoute: document.getElementById("previousExpansionRoute"),
  nextRoute: document.getElementById("nextExpansionRoute"),
  hkDcca: document.getElementById("expansionHkDcca"),
  hkGraph: document.getElementById("expansionHkGraph"),
  hkEdges: document.getElementById("expansionHkEdges"),
  hkTiles: document.getElementById("expansionHkTiles"),
  hkLength: document.getElementById("expansionHkLength"),
  hkChildren: document.getElementById("expansionHkChildren"),
  hkPlaces: document.getElementById("expansionHkPlaces"),
  regionalGraph: document.getElementById("expansionRegionalGraph"),
  regionalCoverage: document.getElementById("expansionRegionalCoverage"),
  regionalComponent: document.getElementById("expansionRegionalComponent"),
  regionalLength: document.getElementById("expansionRegionalLength"),
  regionalBuffer: document.getElementById("expansionRegionalBuffer"),
  regionalPlaces: document.getElementById("expansionRegionalPlaces"),
  residentialEvidence: document.getElementById("expansionResidentialEvidence"),
  regionalChildren: document.getElementById("expansionRegionalChildren"),
  crossTile: document.getElementById("expansionCrossTile"),
  routeOd: document.getElementById("expansionRouteOd"),
  routeDistance: document.getElementById("expansionRouteDistance"),
  routeCost: document.getElementById("expansionRouteCost"),
  routeGain: document.getElementById("expansionRouteGain"),
  routeTiles: document.getElementById("expansionRouteTiles"),
  routeFeatures: document.getElementById("expansionRouteFeatures"),
};

const controls = {
  collapseControls: document.getElementById("collapseControlsButton"),
  collapseMetrics: document.getElementById("collapseMetricsButton"),
  controlsCollapseIcon: document.getElementById("controlsCollapseIcon"),
  metricsCollapseIcon: document.getElementById("metricsCollapseIcon"),
  releaseBadge: document.getElementById("releaseBadge"),
  releaseScopeStatus: document.getElementById("releaseScopeStatus"),
  scenario: document.getElementById("scenarioSelect"),
  scope: document.getElementById("scopeSelect"),
  scopeSummary: document.getElementById("scopeSummary"),
  focus: document.getElementById("focusSelect"),
  population: document.getElementById("populationRange"),
  populationOutput: document.getElementById("populationOutput"),
  seed: document.getElementById("seedInput"),
  speed: document.getElementById("speedRange"),
  speedOutput: document.getElementById("speedOutput"),
  time: document.getElementById("timeRange"),
  timeOutput: document.getElementById("timeOutput"),
  zoomOut: document.getElementById("zoomOutButton"),
  zoomFit: document.getElementById("zoomFitButton"),
  zoomIn: document.getElementById("zoomInButton"),
  cameraTools: document.querySelector(".view-tools"),
  building: document.getElementById("buildingSelect"),
  buildingMacro: document.getElementById("buildingMacroButton"),
  buildingModel: document.getElementById("buildingModelButton"),
  toggle: document.getElementById("toggleButton"),
  reset: document.getElementById("resetButton"),
  resetRules: document.getElementById("resetRulesButton"),
  clock: document.getElementById("clockDisplay"),
  phase: document.getElementById("dayPhase"),
  layerInputs: {
    buildings: document.getElementById("buildingsLayerToggle"),
    poi: document.getElementById("poiLayerToggle"),
    schools: document.getElementById("schoolsLayerToggle"),
    transport: document.getElementById("transportLayerToggle"),
    agents: document.getElementById("agentsLayerToggle"),
    flows: document.getElementById("flowsLayerToggle"),
    routes: document.getElementById("routesLayerToggle"),
  },
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
  focusResidentChildrenLabel: document.getElementById("focusResidentChildrenLabel"),
  focusResidentChildren: document.getElementById("focusResidentChildren"),
  focusSchools: document.getElementById("focusSchools"),
  focusParks: document.getElementById("focusParks"),
  focusActivities: document.getElementById("focusActivities"),
  focusChildPois: document.getElementById("focusChildPois"),
  focusPlayPois: document.getElementById("focusPlayPois"),
  focusSportPois: document.getElementById("focusSportPois"),
  focusStudyPois: document.getElementById("focusStudyPois"),
  focusTransportNodes: document.getElementById("focusTransportNodes"),
  focusMobilityAccess: document.getElementById("focusMobilityAccess"),
  school: document.getElementById("schoolMetric"),
  commute: document.getElementById("commuteMetric"),
  outdoor: document.getElementById("outdoorMetric"),
  poiUsage: document.getElementById("poiUsageMetric"),
  contact: document.getElementById("contactMetric"),
  crowded: document.getElementById("crowdedMetric"),
  exposure: document.getElementById("exposureMetric"),
  avoidance: document.getElementById("avoidanceMetric"),
  mvpaMean: document.getElementById("mvpaMeanMetric"),
  mvpaGuideline: document.getElementById("mvpaGuidelineMetric"),
  mvpaEarlyYears: document.getElementById("mvpaEarlyYearsMetric"),
  mvpaTravel: document.getElementById("mvpaTravelMetric"),
  mvpaSchool: document.getElementById("mvpaSchoolMetric"),
  mvpaOutdoor: document.getElementById("mvpaOutdoorMetric"),
  mvpaActivity: document.getElementById("mvpaActivityMetric"),
  mvpaVigorous: document.getElementById("mvpaVigorousMetric"),
  mvpaMety: document.getElementById("mvpaMetyMetric"),
  mvpaTracked: document.getElementById("mvpaTrackedMetric"),
  scenarioSchool: document.getElementById("scenarioSchool"),
  scenarioOutdoor: document.getElementById("scenarioOutdoor"),
  scenarioActivity: document.getElementById("scenarioActivity"),
  scenarioHeat: document.getElementById("scenarioHeat"),
  scenarioMobility: document.getElementById("scenarioMobility"),
  scenarioContact: document.getElementById("scenarioContact"),
  boundarySource: document.getElementById("boundarySource"),
  buildingSource: document.getElementById("buildingSource"),
  behaviourSource: document.getElementById("behaviourSource"),
  tcsMobilitySource: document.getElementById("tcsMobilitySource"),
  pedestrianNetworkSource: document.getElementById("pedestrianNetworkSource"),
  physicalActivitySource: document.getElementById("physicalActivitySource"),
  buildingName: document.getElementById("buildingName"),
  buildingHeight: document.getElementById("buildingHeight"),
  buildingLevels: document.getElementById("buildingLevels"),
  buildingFootprint: document.getElementById("buildingFootprint"),
  buildingModelSource: document.getElementById("buildingModelSource"),
  activityList: document.getElementById("activityList"),
  statsGrid: document.getElementById("statsGrid"),
  activityStack: document.getElementById("activityStack"),
  historyChart: document.getElementById("historyChart"),
  statsStatusLine: document.getElementById("statsStatusLine"),
  pilotSection: document.getElementById("pilotRoutingSection"),
  pilotCalibrationSection: document.getElementById("pilotCalibrationSection"),
  pilotNetwork: document.getElementById("pilotNetworkMetric"),
  pilotGraph: document.getElementById("pilotGraphMetric"),
  pilotRouted: document.getElementById("pilotRoutedMetric"),
  pilotCircuity: document.getElementById("pilotCircuityMetric"),
  pilotVertical: document.getElementById("pilotVerticalMetric"),
  pilotFallback: document.getElementById("pilotFallbackMetric"),
  pilotAgentWeight: document.getElementById("pilotAgentWeightMetric"),
  pilotHomes: document.getElementById("pilotHomesMetric"),
  pilotSchoolCampuses: document.getElementById("pilotSchoolCampusesMetric"),
  pilotSchoolWalk: document.getElementById("pilotSchoolWalkMetric"),
  pilotSchoolShort: document.getElementById("pilotSchoolShortMetric"),
  pilotSchoolLong: document.getElementById("pilotSchoolLongMetric"),
  pilotSchoolLocal: document.getElementById("pilotSchoolLocalMetric"),
  pilotSchoolPeak: document.getElementById("pilotSchoolPeakMetric"),
  pilotSchoolOnTime: document.getElementById("pilotSchoolOnTimeMetric"),
  weightedPopulation: document.getElementById("weightedPopulationMetric"),
  parameterVersion: document.getElementById("parameterVersionMetric"),
  tcsCohort: document.getElementById("tcsCohortMetric"),
  tcsModeMix: document.getElementById("tcsModeMixMetric"),
  tcsTransitMix: document.getElementById("tcsTransitMixMetric"),
  tcsActiveShare: document.getElementById("tcsActiveShareMetric"),
  tcsJourney: document.getElementById("tcsJourneyMetric"),
  tcsSpatial: document.getElementById("tcsSpatialMetric"),
  syntheticHouseholds: document.getElementById("syntheticHouseholdsMetric"),
  stageResidual: document.getElementById("stageResidualMetric"),
  householdResidual: document.getElementById("householdResidualMetric"),
  adultAccompanied: document.getElementById("adultAccompaniedMetric"),
  schoolCapacity: document.getElementById("schoolCapacityMetric"),
  walkLimitFallback: document.getElementById("walkLimitFallbackMetric"),
  homeDistrictSchool: document.getElementById("homeDistrictSchoolMetric"),
  graphDistrictCoverage: document.getElementById("graphDistrictCoverageMetric"),
  poiAssignment: document.getElementById("poiAssignmentMetric"),
  pilotTitle: document.getElementById("pilotTitle"),
  pilotSchoolLocalLabel: document.getElementById("pilotSchoolLocalLabel"),
  regionalSection: document.getElementById("regionalModelSection"),
  regionalDcca: document.getElementById("regionalDccaMetric"),
  regionalPopulation: document.getElementById("regionalPopulationMetric"),
  regionalBuildings: document.getElementById("regionalBuildingsMetric"),
  regionalPlaces: document.getElementById("regionalPlacesMetric"),
  regionalNetwork: document.getElementById("regionalNetworkMetric"),
  regionalImpedance: document.getElementById("regionalImpedanceMetric"),
  regionalRouting: document.getElementById("regionalRoutingMetric"),
};

const comparisonEls = {
  referenceButton: document.getElementById("comparisonReferenceButton"),
  liveButton: document.getElementById("comparisonLiveButton"),
  runLabel: document.getElementById("comparisonRunLabel"),
  walkTimeDelta: document.getElementById("comparisonWalkTimeDelta"),
  mvpaDelta: document.getElementById("comparisonMvpaDelta"),
  ascentDelta: document.getElementById("comparisonAscentDelta"),
  guidelineDelta: document.getElementById("comparisonGuidelineDelta"),
  domainRows: document.getElementById("comparisonDomainRows"),
};

const agentObserverEls = {
  toolbar: document.querySelector(".agent-observer-toolbar"),
  cohortButton: document.getElementById("agentCohortButton"),
  followButton: document.getElementById("agentFollowButton"),
  auditButton: document.getElementById("agentAuditButton"),
  travelFilter: document.getElementById("agentTravelFilter"),
  stateFilter: document.getElementById("agentStateFilter"),
  ageFilter: document.getElementById("agentAgeFilter"),
  areaFilter: document.getElementById("agentAreaFilter"),
  previousButton: document.getElementById("previousAgentButton"),
  nextButton: document.getElementById("nextAgentButton"),
  idInput: document.getElementById("agentIdInput"),
  eyebrow: document.getElementById("agentObserverEyebrow"),
  title: document.getElementById("agentObserverTitle"),
  subtitle: document.getElementById("agentObserverSubtitle"),
  state: document.getElementById("agentObserverState"),
  age: document.getElementById("agentObserverAge"),
  home: document.getElementById("agentObserverHome"),
  mode: document.getElementById("agentObserverMode"),
  mvpa: document.getElementById("agentObserverMvpa"),
  trips: document.getElementById("agentObserverTrips"),
  timeline: document.getElementById("agentTimelineTrack"),
  routeAudit: document.getElementById("agentRouteAudit"),
  readout: document.querySelector(".agent-observer-readout"),
  tripSelect: document.getElementById("agentTripSelect"),
  routeTitle: document.getElementById("agentRouteTitle"),
  routeGeometry: document.getElementById("agentRouteGeometry"),
  routeNetwork: document.getElementById("agentRouteNetwork"),
  routeDistance: document.getElementById("agentRouteDistance"),
  routeTime: document.getElementById("agentRouteTime"),
  routeAscent: document.getElementById("agentRouteAscent"),
  routeGrade: document.getElementById("agentRouteGrade"),
  routeQuality: document.getElementById("agentRouteQuality"),
  routeVertical: document.getElementById("agentRouteVertical"),
  routeFeatures: document.getElementById("agentRouteFeatures"),
  routeEndpoints: document.getElementById("agentRouteEndpoints"),
  routeAccessTime: document.getElementById("agentRouteAccessTime"),
  routeLegSplit: document.getElementById("agentRouteLegSplit"),
  routeStops: document.getElementById("agentRouteStops"),
};

const routeQaEls = {
  kicker: document.getElementById("routeQaKicker"),
  title: document.getElementById("routeQaTitle"),
  modeGroup: document.getElementById("routeQaModeGroup"),
  baselineButton: document.getElementById("routeQaBaselineButton"),
  calibratedButton: document.getElementById("routeQaCalibratedButton"),
  purpose: document.getElementById("routeQaPurposeSelect"),
  issue: document.getElementById("routeQaIssueSelect"),
  runLabel: document.getElementById("routeQaRunLabel"),
  mapSubtitle: document.getElementById("routeQaMapSubtitle"),
  schoolTime: document.getElementById("routeQaSchoolTime"),
  schoolTimeDelta: document.getElementById("routeQaSchoolTimeDelta"),
  connector: document.getElementById("routeQaConnector"),
  connectorDelta: document.getElementById("routeQaConnectorDelta"),
  issueRate: document.getElementById("routeQaIssueRate"),
  issueDelta: document.getElementById("routeQaIssueDelta"),
  networkShare: document.getElementById("routeQaNetworkShare"),
  failureRate: document.getElementById("routeQaFailureRate"),
  durationShape: document.getElementById("routeQaDurationShape"),
  durationTarget: document.getElementById("routeQaDurationTarget"),
  schoolAccess: document.getElementById("routeQaSchoolAccess"),
  schoolAccessNote: document.getElementById("routeQaSchoolAccessNote"),
  outlierSubtitle: document.getElementById("routeQaOutlierSubtitle"),
  outlierList: document.getElementById("routeQaOutlierList"),
  mapTitle: document.getElementById("routeQaMapTitle"),
  legendTitle: document.getElementById("routeQaLegendTitle"),
  legendNote: document.getElementById("routeQaLegendNote"),
  causeLedger: document.getElementById("routeQaCauseLedger"),
  networkMethod: document.getElementById("routeQaNetworkMethod"),
  endpointMethod: document.getElementById("routeQaEndpointMethod"),
  calibrationMethod: document.getElementById("routeQaCalibrationMethod"),
  claimBoundary: document.getElementById("routeQaClaimBoundary"),
};

const terrainQaEls = {
  internalStatus: document.getElementById("terrainQaInternalStatus"),
  externalStatus: document.getElementById("terrainQaExternalStatus"),
  dccaMetric: document.getElementById("terrainQaDccaMetric"),
  odMetric: document.getElementById("terrainQaOdMetric"),
  originMetric: document.getElementById("terrainQaOriginMetric"),
  edgeMetric: document.getElementById("terrainQaEdgeMetric"),
  changedMetric: document.getElementById("terrainQaChangedMetric"),
  timeMetric: document.getElementById("terrainQaTimeMetric"),
  mvpaMetric: document.getElementById("terrainQaMvpaMetric"),
  regionSelect: document.getElementById("terrainQaRegionSelect"),
  metricSelect: document.getElementById("terrainQaMetricSelect"),
  mapTitle: document.getElementById("terrainQaMapTitle"),
  mapSubtitle: document.getElementById("terrainQaMapSubtitle"),
  legendTitle: document.getElementById("terrainQaLegendTitle"),
  legendNote: document.getElementById("terrainQaLegendNote"),
  legendItems: document.getElementById("terrainQaLegendItems"),
  detailTitle: document.getElementById("terrainQaDetailTitle"),
  detailSubtitle: document.getElementById("terrainQaDetailSubtitle"),
  detailMetrics: document.getElementById("terrainQaDetailMetrics"),
  detailNote: document.getElementById("terrainQaDetailNote"),
  regionRows: document.getElementById("terrainQaRegionRows"),
  routeRows: document.getElementById("terrainQaRouteRows"),
  featuresSubtitle: document.getElementById("terrainQaFeaturesSubtitle"),
  featureRows: document.getElementById("terrainQaFeatureRows"),
  gateRows: document.getElementById("terrainQaGateRows"),
};

const validationEls = {
  kicker: document.getElementById("validationKicker"),
  scopeNote: document.getElementById("validationScopeNote"),
  runLabel: document.getElementById("validationRunLabel"),
  internalStatus: document.getElementById("validationInternalStatus"),
  externalStatus: document.getElementById("validationExternalStatus"),
  gateMetric: document.getElementById("validationGateMetric"),
  runMetric: document.getElementById("validationRunMetric"),
  runDesign: document.getElementById("validationRunDesign"),
  dccaMetric: document.getElementById("validationDccaMetric"),
  routeMetric: document.getElementById("validationRouteMetric"),
  routeDesign: document.getElementById("validationRouteDesign"),
  externalMetric: document.getElementById("validationExternalMetric"),
  scaleRunMetric: document.getElementById("populationScaleRunMetric"),
  scaleRunDesign: document.getElementById("populationScaleRunDesign"),
  scaleStatus: document.getElementById("populationScaleStatus"),
  scaleTable: document.getElementById("populationScaleTable"),
  scaleStabilityList: document.getElementById("populationScaleStabilityList"),
  scaleLedgerList: document.getElementById("populationScaleLedgerList"),
  scaleFindingList: document.getElementById("populationScaleFindingList"),
  effectList: document.getElementById("validationEffectList"),
  outcomeList: document.getElementById("validationOutcomeList"),
  routeCostList: document.getElementById("validationRouteCostList"),
  dccaList: document.getElementById("validationDccaList"),
  gateList: document.getElementById("validationGateList"),
  claimList: document.getElementById("validationClaimList"),
};
let validationViewRendered = false;

const kowloonLabEls = {
  runLabel: document.getElementById("kowloonLabRunLabel"),
  internalStatus: document.getElementById("kowloonLabInternalStatus"),
  externalStatus: document.getElementById("kowloonLabExternalStatus"),
  gateMetric: document.getElementById("kowloonLabGateMetric"),
  holdoutMetric: document.getElementById("kowloonLabHoldoutMetric"),
  spatialMetric: document.getElementById("kowloonLabSpatialMetric"),
  runMetric: document.getElementById("kowloonLabRunMetric"),
  liveStatus: document.getElementById("kowloonLabLiveStatus"),
  groupRows: document.getElementById("kowloonLabGroupRows"),
  timingRows: document.getElementById("kowloonLabTimingRows"),
  networkCards: document.getElementById("kowloonLabNetworkCards"),
  scaleRows: document.getElementById("kowloonLabScaleRows"),
  gateList: document.getElementById("kowloonLabGateList"),
};
let kowloonLabViewRendered = false;

const world = {
  agents: [],
  households: [],
  time: 7 * 60,
  population: 2000,
  seed: 91307,
  scope: v12_11NtWestRoutingManifest ? NT_WEST_SCOPE_ID : v12_10NtEastRoutingManifest ? NT_EAST_SCOPE_ID : hkIslandModel?.scope?.id || activePilot?.id || "hong-kong",
  scenario: "baseline",
  focusId: v12_11NtWestRoutingManifest
    ? ntWestDccas[0]?.id
    : v12_10NtEastRoutingManifest
      ? ntEastDccas[0]?.id
    : hkIslandDccas[0]?.id || pilotArea?.id || zones[0]?.id || "cw-dcca",
  running: true,
  speed: 36,
  metrics: null,
  buildingId: realBuildingLayer[0]?.id || "",
  buildingMode: "macro",
  history: [],
  lastHistoryHour: -1,
  elapsedMinutes: 0,
  comparisonWindowMinutes: 0,
  avoidedDestinations: 0,
  routedTrips: 0,
  routeFallbacks: 0,
  temporallyCalibratedTrips: 0,
  multimodalRoutedTrips: 0,
  multimodalRouteFallbacks: 0,
  multimodalTripsByMode: {},
  tripSequence: 0,
  routeCalibrationMode: ROUTE_CALIBRATION_MODE,
  islandRoutingStatus: hkIslandRoutingGraph ? "pending" : "unavailable",
  islandRoutingProgress: 0,
  kowloonRoutingStatus: v12_9KowloonRoutingGraph ? "pending" : "unavailable",
  kowloonRoutingProgress: 0,
  ntEastRoutingStatus: v12_10NtEastRoutingGraph ? "pending" : "unavailable",
  ntEastRoutingProgress: 0,
  ntWestRoutingStatus: v12_11NtWestRoutingGraph ? "pending" : "unavailable",
  ntWestRoutingProgress: 0,
  islandsRoutingStatus: v12_11IslandsRoutingGraph ? "pending" : "unavailable",
  islandsRoutingProgress: 0,
  rules: { ...RULE_DEFAULTS },
  layers: {
    buildings: true,
    poi: true,
    schools: Boolean(v12_11NtWestRoutingManifest || v12_10NtEastRoutingManifest || hkIslandModel || activePilot),
    transport: false,
    agents: true,
    flows: true,
    routes: Boolean(v12_11NtWestRoutingManifest || v12_10NtEastRoutingManifest || hkIslandModel || activePilot),
  },
  interactionField: {
    cells: new Map(),
    zoneOccupancy: new Map(),
    poiOccupancy: new Map(),
  },
};

const agentObserver = {
  mode: "cohort",
  selectedAgentId: 1,
  selectedTripId: null,
  travelFilter: "all",
  stateFilter: "all",
  ageFilter: "all",
  areaFilter: "all",
  followRadiusMeters: 1800,
  geometryCacheKey: null,
  geometryCache: null,
  lastControlPopulation: 0,
  lastAreaScope: null,
};

const spatialSelection = {
  type: null,
  id: null,
  sourceView: null,
  playbackFraction: 0,
  playbackPlaying: false,
  playbackLastAt: 0,
  clickKey: "",
  clickIndex: 0,
};

const routeQaState = {
  mode: "calibrated",
  purpose: "all",
  issue: "all",
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
  totalMove: 0,
  hasPosition: false,
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

const mapViewport = {
  bounds: null,
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
let kowloonDisplayEdgeIds = [];
let ntEastDisplayEdgeIds = [];
let ntWestDisplayEdgeIds = [];
let islandsDisplayEdgeIds = [];

let activeView = "scene";
let comparisonMode = "reference";
const terrainQaState = {
  regionKey: "all",
  metric: "topologyChangedShare",
  selectedDccaId: null,
  hitAreas: [],
};
const expansionState = {
  regionKey: v12_11NtWestRoutingManifest ? "ntWest" : v12_10NtEastRoutingManifest ? "ntEast" : v12_9KowloonRoutingManifest ? "kowloon" : "wts",
  statusByRegion: {
    ntWest: v12_11NtWestRoutingGraph ? "idle" : "unavailable",
    islands: v12_11IslandsRoutingGraph ? "idle" : "unavailable",
    ntEast: v12_10NtEastRoutingGraph ? "idle" : "unavailable",
    kowloon: v12_9KowloonRoutingGraph ? "idle" : "unavailable",
    wts: v12_8RoutingGraph ? "idle" : "unavailable",
  },
  progressByRegion: { ntWest: 0, islands: 0, ntEast: 0, kowloon: 0, wts: 0 },
  selectedRouteIndex: 0,
  loadPromises: {},
};
const panelState = {
  controlsCollapsed: false,
  metricsCollapsed: false,
};
let lastFrame = performance.now();
let lastMetricsAt = 0;
let lastRenderAt = 0;
let hongKongMapBounds = null;

function mulberry32(seed) {
  return function nextRandom() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const geometryRandom = mulberry32(42021);
const DEFAULT_AGENT_RANDOM_SEED = 91307;
let agentRandom = mulberry32(DEFAULT_AGENT_RANDOM_SEED);

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

function floorToZ(zone, floor = 0) {
  return (zone?.terrain || 0) + PERSON_HEIGHT_UNITS + Math.max(0, floor) * FLOOR_HEIGHT_UNITS;
}

function zToFloor(z, zone) {
  return Math.max(0, (z - (zone?.terrain || 0) - PERSON_HEIGHT_UNITS) / FLOOR_HEIGHT_UNITS);
}

function occupiedFloor(agent, zone = agent.target?.zone || agent.homeZone) {
  if (
    agent.scope?.startsWith("pilot-") ||
    agent.scope === "hong-kong-island" ||
    agent.scope === KOWLOON_SCOPE_ID ||
    agent.scope === NT_EAST_SCOPE_ID ||
    agent.scope === NT_WEST_SCOPE_ID ||
    agent.scope === ISLANDS_SCOPE_ID
  ) {
    if (agent.state === "commute" || agent.route?.length) return 0;
    const groundZ = agent.target?.groundZ ?? 0;
    return Math.max(0, (agent.pos.z - groundZ - PERSON_HEIGHT_UNITS) / FLOOR_HEIGHT_UNITS);
  }
  return zToFloor(agent.pos.z, zone);
}

function parsePoiFloor(label) {
  if (!label) return 0;
  const text = String(label).toUpperCase();
  if (/\b(G|LG|UG)\/?F\b/.test(text)) return 0;
  const match = text.match(/\b(\d{1,2})(?:ST|ND|RD|TH)?\s*\/?F\b/);
  return match ? clamp(Number(match[1]), 0, 40) : 0;
}

function mobilityAccessFor(item) {
  return clamp(item?.mobilityAccess ?? item?.transportAccess ?? item?.transit ?? 0.55, 0.18, 1.08);
}

function accessAdjustedDistance(origin, destination, options = {}) {
  const straight = Math.max(0.18, distance2D(origin, destination));
  const originAccess = mobilityAccessFor(origin);
  const destinationZone = destination.zone || destination;
  const destinationAccess = mobilityAccessFor(destinationZone);
  const schoolAccess = options.school ? mobilityAccessFor(options.school) : destination.transportAccess || destinationAccess;
  const blendedAccess = clamp(((originAccess + destinationAccess) / 2) * 0.72 + schoolAccess * 0.28, 0.18, 1.08);
  const accessFriction = 1.34 - blendedAccess * 0.46;
  const weakAccessPenalty = straight > 55 && blendedAccess < 0.42 ? 1.18 : 1;
  return straight * accessFriction * weakAccessPenalty;
}

function isPilotScope() {
  return modelScopeId() === activePilot?.id && Boolean(activePilot && pilotArea && pilotNetworkNodes.length);
}

function isIslandScope() {
  return modelScopeId() === hkIslandModel?.scope?.id && hkIslandDccas.length === 80;
}

function isKowloonScope() {
  return modelScopeId() === KOWLOON_SCOPE_ID && kowloonDccas.length === 135;
}

function isNtEastScope() {
  return modelScopeId() === NT_EAST_SCOPE_ID && ntEastDccas.length === 107;
}

function isNtWestScope() {
  return modelScopeId() === NT_WEST_SCOPE_ID && ntWestDccas.length === 120;
}

function isOutlyingIslandsScope() {
  return modelScopeId() === ISLANDS_SCOPE_ID && islandsDccas.length === 10;
}

function isRegionalScope() {
  return isWholeHkScope() || isIslandScope() || isKowloonScope() || isNtEastScope() || isNtWestScope() || isOutlyingIslandsScope();
}

function isV12_11Scope() {
  return isNtWestScope() || isOutlyingIslandsScope();
}

function isLiveRegionalRouteQaScope() {
  return isWholeHkScope() || isKowloonScope() || isNtEastScope() || isV12_11Scope();
}

function activeRegionalRoutingStatus() {
  if (isWholeHkScope()) return wholeHkState.status;
  if (isKowloonScope()) return world.kowloonRoutingStatus;
  if (isNtEastScope()) return world.ntEastRoutingStatus;
  if (isNtWestScope()) return world.ntWestRoutingStatus;
  if (isOutlyingIslandsScope()) return world.islandsRoutingStatus;
  return world.islandRoutingStatus;
}

function activeRegionalRoutingProgress() {
  if (isWholeHkScope()) return wholeHkState.progress;
  if (isKowloonScope()) return world.kowloonRoutingProgress;
  if (isNtEastScope()) return world.ntEastRoutingProgress;
  if (isNtWestScope()) return world.ntWestRoutingProgress;
  if (isOutlyingIslandsScope()) return world.islandsRoutingProgress;
  return world.islandRoutingProgress;
}

function regionalScopeLabel() {
  if (isWholeHkScope()) return "Whole Hong Kong · 452 DCCAs";
  if (isIslandScope()) return "Hong Kong Island · 80 DCCAs";
  if (isKowloonScope()) return "Continuous Kowloon · 135 DCCAs";
  if (isNtEastScope()) return "New Territories East · 107 DCCAs";
  if (isNtWestScope()) return "New Territories West · 120 DCCAs";
  if (isOutlyingIslandsScope()) return "Outlying Islands · 10 DCCAs";
  return "Hong Kong";
}

function regionalNetworkLegendLabel() {
  if (isWholeHkScope()) return "Five official 3DPN packs; within-pack walking only";
  if (isKowloonScope()) return "Sampled Kowloon official 3D pedestrian graph";
  if (isNtEastScope()) return "Sampled NT East official 3D pedestrian graph";
  if (isNtWestScope()) return "Sampled NT West official 3D pedestrian graph";
  if (isOutlyingIslandsScope()) return "Sampled Islands official 3D pedestrian components";
  return "Sampled HKI official 3D pedestrian graph";
}

function isPopulationWeightedScope() {
  return isPilotScope() || isRegionalScope();
}

function simulationZones() {
  if (isWholeHkScope()) return wholeHkLayer("areas");
  if (isIslandScope()) return hkIslandDccas;
  if (isKowloonScope()) return kowloonDccas;
  if (isNtEastScope()) return ntEastDccas;
  if (isNtWestScope()) return ntWestDccas;
  if (isOutlyingIslandsScope()) return islandsDccas;
  return zones;
}

function visibleDistricts() {
  if (isWholeHkScope()) return wholeHkLayer("districts");
  if (isIslandScope()) return hkIslandDistricts;
  if (isKowloonScope()) return kowloonDistricts;
  if (isNtEastScope()) return ntEastDistricts;
  if (isNtWestScope()) return ntWestDistricts;
  if (isOutlyingIslandsScope()) return islandsDistricts;
  return zones;
}

function visibleDccas() {
  if (isWholeHkScope()) return wholeHkLayer("areas");
  if (isIslandScope()) return hkIslandDccas;
  if (isKowloonScope()) return kowloonDccas;
  if (isNtEastScope()) return ntEastDccas;
  if (isNtWestScope()) return ntWestDccas;
  if (isOutlyingIslandsScope()) return islandsDccas;
  return dccaAreas;
}

function activeSchoolLocations() {
  if (isWholeHkScope()) return wholeHkLayer("schools");
  if (isPilotScope()) return pilotSchoolLayer;
  if (isIslandScope()) return hkIslandSchoolLayer;
  if (isKowloonScope()) return kowloonSchoolLayer;
  if (isNtEastScope()) return ntEastSchoolLayer;
  if (isNtWestScope()) return ntWestSchoolLayer;
  if (isOutlyingIslandsScope()) return islandsSchoolLayer;
  return realSchoolLayer;
}

function activePoiLocations() {
  if (isWholeHkScope()) return wholeHkLayer("pois");
  if (isPilotScope()) return pilotPoiLayer;
  if (isIslandScope()) return hkIslandPoiLayer;
  if (isKowloonScope()) return kowloonPoiLayer;
  if (isNtEastScope()) return ntEastPoiLayer;
  if (isNtWestScope()) return ntWestPoiLayer;
  if (isOutlyingIslandsScope()) return islandsPoiLayer;
  return realPoiLayer;
}

function activeBuildingModels() {
  if (isWholeHkScope()) return wholeHkLayer("buildings");
  if (isPilotScope()) return pilotBuildingLayer;
  if (isIslandScope()) return hkIslandBuildingLayer;
  if (isKowloonScope()) return kowloonBuildingLayer;
  if (isNtEastScope()) return ntEastBuildingLayer;
  if (isNtWestScope()) return ntWestBuildingLayer;
  if (isOutlyingIslandsScope()) return islandsBuildingLayer;
  return realBuildingLayer;
}

function activeBuildingCells() {
  if (isWholeHkScope()) return wholeHkLayer("cells");
  if (isIslandScope()) return hkIslandBuildingDistribution;
  if (isKowloonScope()) return kowloonBuildingDistribution;
  if (isNtEastScope()) return ntEastBuildingDistribution;
  if (isNtWestScope()) return ntWestBuildingDistribution;
  if (isOutlyingIslandsScope()) return islandsBuildingDistribution;
  return buildingDistribution;
}

function activeRegionalBounds() {
  if (isPilotScope() && pilotNetwork?.bounds) return pilotNetwork.bounds;
  return computeCombinedBounds(simulationZones());
}

function dccaNetworkProfile(area) {
  if (isWholeHkScope()) return area?.networkProfile || hkIslandNetworkProfileByDcca.get(area?.id) || null;
  return isKowloonScope() || isNtEastScope() || isNtWestScope() || isOutlyingIslandsScope()
    ? area?.networkProfile || null
    : hkIslandNetworkProfileByDcca.get(area?.id) || null;
}

function activeMobilityNodes() {
  if (isIslandScope()) return hkIslandMobilityNodeLayer;
  if (isKowloonScope()) {
    return mobilityNodeLayer.filter((node) => kowloonDccas.some((area) => pointInArea(node, area)));
  }
  if (isNtEastScope()) {
    return mobilityNodeLayer.filter((node) => ntEastDccas.some((area) => pointInArea(node, area)));
  }
  if (isNtWestScope()) {
    return mobilityNodeLayer.filter((node) => ntWestDccas.some((area) => pointInArea(node, area)));
  }
  if (isOutlyingIslandsScope()) {
    return mobilityNodeLayer.filter((node) => islandsDccas.some((area) => pointInArea(node, area)));
  }
  return mobilityNodeLayer;
}

function activeSceneBuildingCells() {
  if (isWholeHkScope()) return wholeHkLayer("sceneCells");
  if (isIslandScope()) return hkIslandSceneBuildingDistribution;
  if (isKowloonScope()) return kowloonSceneBuildingDistribution;
  if (isNtEastScope()) return ntEastSceneBuildingDistribution;
  if (isNtWestScope()) return ntWestSceneBuildingDistribution;
  if (isOutlyingIslandsScope()) return islandsSceneBuildingDistribution;
  return sceneBuildingDistribution;
}

function activeResidentialAnchors() {
  if (isWholeHkScope()) return wholeHkLayer("anchors");
  if (isIslandScope()) return hkIslandResidentialAnchors;
  if (isKowloonScope()) return kowloonResidentialAnchors;
  if (isNtEastScope()) return ntEastResidentialAnchors;
  if (isNtWestScope()) return ntWestResidentialAnchors;
  if (isOutlyingIslandsScope()) return islandsResidentialAnchors;
  return [];
}

function activeResidentialAnchorsByDcca() {
  if (isWholeHkScope()) return new Map(wholeHkRegions().flatMap((region) => [...region.anchorsByDcca]));
  if (isIslandScope()) return hkIslandResidentialAnchorsByDcca;
  if (isKowloonScope()) return kowloonResidentialAnchorsByDcca;
  if (isNtEastScope()) return ntEastResidentialAnchorsByDcca;
  if (isNtWestScope()) return ntWestResidentialAnchorsByDcca;
  if (isOutlyingIslandsScope()) return islandsResidentialAnchorsByDcca;
  return new Map();
}

function activeRegionalRoutingGraph() {
  if (isIslandScope()) return hkIslandRoutingGraph;
  if (isKowloonScope()) return v12_9KowloonRoutingGraph;
  if (isNtEastScope()) return v12_10NtEastRoutingGraph;
  if (isNtWestScope()) return v12_11NtWestRoutingGraph;
  if (isOutlyingIslandsScope()) return v12_11IslandsRoutingGraph;
  return null;
}

function activeRegionalRoutingManifest() {
  if (isIslandScope()) return hkIslandRoutingManifest;
  if (isKowloonScope()) return v12_9KowloonRoutingManifest;
  if (isNtEastScope()) return v12_10NtEastRoutingManifest;
  if (isNtWestScope()) return v12_11NtWestRoutingManifest;
  if (isOutlyingIslandsScope()) return v12_11IslandsRoutingManifest;
  return null;
}

function ensureKowloonDirectedCore() {
  if (!v12_9KowloonRoutingGraph?.ready || v12_9KowloonRoutingGraph.directedCoreMask) return;
  const seed = kowloonResidentialAnchors.find((anchor) => Number.isInteger(anchor.networkNodeId));
  if (!seed) return;
  v12_9KowloonRoutingGraph.buildDirectedCore(seed.networkNodeId);
}

function ensureNtEastDirectedCore() {
  if (!v12_10NtEastRoutingGraph?.ready || v12_10NtEastRoutingGraph.directedCoreMask) return;
  const seed = ntEastResidentialAnchors.find((anchor) => Number.isInteger(anchor.networkNodeId));
  if (!seed) return;
  v12_10NtEastRoutingGraph.buildDirectedCore(seed.networkNodeId);
}

function blendedRegionalNetworkProfile(origin, destination) {
  const profiles = [dccaNetworkProfile(origin), dccaNetworkProfile(destination)].filter(Boolean);
  const fallback = hkIslandModel?.network || {};
  const mean = (key, defaultValue) =>
    profiles.length
      ? profiles.reduce((sum, profile) => sum + (Number(profile[key]) || defaultValue), 0) / profiles.length
      : Number(fallback[key]) || defaultValue;
  return {
    length3dToPlanarRatio: mean("length3dToPlanarRatio", 1),
    regional3dImpedanceRatio: mean("regional3dImpedanceRatio", 1),
    expectedAscentMetersPerKm: mean("expectedAscentMetersPerKm", 0),
    mechanicalLengthShare: mean("mechanicalLengthShare", 0),
    coveredLengthShare: mean("coveredLengthShare", 0),
  };
}

function pilotNodePoint(nodeId) {
  const node = pilotNetworkNodes[nodeId];
  if (!node) return null;
  return { x: node[0], y: node[1], z: node[2], nodeId };
}

function islandNodePoint(nodeId) {
  return hkIslandRoutingGraph?.nodePoint(nodeId) || null;
}

function kowloonNodePoint(nodeId) {
  return v12_9KowloonRoutingGraph?.nodePoint(nodeId) || null;
}

function ntEastNodePoint(nodeId) {
  return v12_10NtEastRoutingGraph?.nodePoint(nodeId) || null;
}

function ntWestNodePoint(nodeId) {
  return v12_11NtWestRoutingGraph?.nodePoint(nodeId) || null;
}

function islandsNodePoint(nodeId) {
  return v12_11IslandsRoutingGraph?.nodePoint(nodeId) || null;
}

function activeRegionalNodePoint(nodeId) {
  return activeRegionalRoutingGraph()?.nodePoint(nodeId) || null;
}

function regionalPlaceNodeId(place) {
  if (isIslandScope()) return place?.islandNodeId;
  if (isKowloonScope()) return place?.kowloonNodeId;
  if (isNtEastScope()) return place?.ntEastNodeId;
  if (isNtWestScope()) return place?.ntWestNodeId;
  if (isOutlyingIslandsScope()) return place?.islandsNodeId;
  return null;
}

function regionalPlaceSnapMeters(place) {
  if (isIslandScope()) return place?.islandSnapMeters;
  if (isKowloonScope()) return place?.kowloonSnapMeters;
  if (isNtEastScope()) return place?.ntEastSnapMeters;
  if (isNtWestScope()) return place?.ntWestSnapMeters;
  if (isOutlyingIslandsScope()) return place?.islandsSnapMeters;
  return null;
}

function regionalPlaceComponentId(place) {
  if (isNtWestScope()) return place?.ntWestComponentId;
  if (isOutlyingIslandsScope()) return place?.islandsComponentId;
  const nodeId = regionalPlaceNodeId(place) ?? place?.networkNodeId;
  return Number.isInteger(nodeId) ? activeRegionalRoutingGraph()?.nodeComponent?.[nodeId] : null;
}

function routeCostContext(profile = "scenario", snapshot = null) {
  const baseline = profile === "school-baseline";
  const scenarioKey = snapshot?.routingScenarioKey || (baseline ? "baseline" : world.scenario);
  const scenarioHeat = Number.isFinite(snapshot?.routingScenarioHeat)
    ? snapshot.routingScenarioHeat
    : SCENARIOS[scenarioKey]?.heat ?? SCENARIOS.baseline.heat;
  const heatAvoidance = Number.isFinite(snapshot?.routingHeatAvoidance)
    ? snapshot.routingHeatAvoidance
    : baseline
      ? RULE_DEFAULTS.heatAvoidance
      : world.rules.heatAvoidance;
  return { profile, scenarioKey, scenarioHeat, heatAvoidance };
}

function islandRoutingOptions(profile = "scenario", snapshot = null) {
  const context = routeCostContext(profile, snapshot);
  return {
    profile: context.profile,
    scenarioKey: context.scenarioKey,
    scenarioHeat: context.scenarioHeat,
    heatAvoidance: context.heatAvoidance,
  };
}

function physicalDistanceMeters(a, b) {
  if (!a || !b) return 0;
  const horizontal = Math.hypot(a.x - b.x, a.y - b.y) * appUnitMeters;
  const vertical = Math.abs((a.z || 0) - (b.z || 0)) * verticalUnitMeters;
  return Math.hypot(horizontal, vertical);
}

function planarDistanceMeters(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y) * appUnitMeters;
}

class MinPriorityQueue {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(node, priority) {
    const item = { node, priority };
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= priority) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.items.length) break;
        const child = right < this.items.length && this.items[right].priority < this.items[left].priority ? right : left;
        if (this.items[child].priority >= last.priority) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
}

function ensurePilotAdjacency() {
  if (pilotAdjacency || !pilotNetworkNodes.length) return pilotAdjacency;
  pilotAdjacency = Array.from({ length: pilotNetworkNodes.length }, () => []);
  pilotNetworkEdges.forEach((edge, edgeIndex) => {
    const from = edge[0];
    const to = edge[1];
    const direction = edge[6] || 0;
    if (direction >= 0) pilotAdjacency[from].push([to, edgeIndex]);
    if (direction <= 0) pilotAdjacency[to].push([from, edgeIndex]);
  });
  return pilotAdjacency;
}

function pilotEdgeCost(edge, profile = "scenario", routingContext = null) {
  const length = edge[2] || 0;
  const featureType = edge[3] || 1;
  const weatherProof = edge[4] || 3;
  const location = edge[5] || 1;
  const gradient = Math.abs(edge[7] || 0);
  const context = routingContext || routeCostContext(profile);
  const scenarioKey = context.scenarioKey;
  const heatAvoidance = context.heatAvoidance;
  let factor = 1;
  let fixedCost = 0;
  if ([12, 20].includes(featureType)) factor *= 1.34;
  else if ([11, 19].includes(featureType)) factor *= 1.12;
  else if ([8, 9, 16, 17].includes(featureType)) factor *= 1.08;
  else if ([10, 13, 18, 21].includes(featureType)) fixedCost += 35;
  else if ([2, 4].includes(featureType)) factor *= 1.04;
  if (PILOT_CROSSING_FEATURES.has(featureType)) {
    factor *= scenarioKey === "walkable" ? 1.03 : 1.12;
  }
  if (weatherProof !== 1 && location !== 2) {
    factor *= 1 + context.scenarioHeat * heatAvoidance * 0.18;
  }
  factor *= 1 + Math.min(0.35, gradient * 1.8);
  return length * factor + fixedCost;
}

function pilotEdgeHorizontalMeters(edge) {
  const from = pilotNetworkNodes[edge[0]];
  const to = pilotNetworkNodes[edge[1]];
  if (!from || !to) return 0;
  return Math.hypot(to[0] - from[0], to[1] - from[1]) * appUnitMeters;
}

function pilotPlanarEdgeCost(edge, profile = "scenario", routingContext = null) {
  const horizontalMeters = pilotEdgeHorizontalMeters(edge);
  const featureType = edge[3] || 1;
  const weatherProof = edge[4] || 3;
  const location = edge[5] || 1;
  const context = routingContext || routeCostContext(profile);
  const scenarioKey = context.scenarioKey;
  const heatAvoidance = context.heatAvoidance;
  let factor = [2, 4].includes(featureType) ? 1.04 : 1;
  if (PILOT_CROSSING_FEATURES.has(featureType)) {
    factor *= scenarioKey === "walkable" ? 1.03 : 1.12;
  }
  if (weatherProof !== 1 && location !== 2) {
    factor *= 1 + context.scenarioHeat * heatAvoidance * 0.18;
  }
  return horizontalMeters * factor;
}

function pilotHeuristic(fromId, toId) {
  const from = pilotNodePoint(fromId);
  const to = pilotNodePoint(toId);
  return physicalDistanceMeters(from, to);
}

function pilotPathKey(startNodeId, destinationNodeId, profile = "scenario", routingContext = null) {
  const context = routingContext || routeCostContext(profile);
  return [
    activePilotKey,
    context.scenarioKey,
    context.scenarioHeat.toFixed(3),
    context.heatAvoidance.toFixed(3),
    startNodeId,
    destinationNodeId,
  ].join(":");
}

function findPilotPath(startNodeId, destinationNodeId, profile = "scenario", routingContext = null) {
  if (!Number.isInteger(startNodeId) || !Number.isInteger(destinationNodeId)) return null;
  if (!pilotNetworkNodes[startNodeId] || !pilotNetworkNodes[destinationNodeId]) return null;
  const context = routingContext || routeCostContext(profile);
  const key = pilotPathKey(startNodeId, destinationNodeId, profile, context);
  if (pilotPathCache.has(key)) return pilotPathCache.get(key);
  if (startNodeId === destinationNodeId) {
    const result = {
      nodeIds: [startNodeId],
      pathMeters: 0,
      horizontalMeters: 0,
      generalizedMeters: 0,
      planarGeneralizedMeters: 0,
      verticalGainMeters: 0,
      verticalLossMeters: 0,
      maxAbsoluteGrade: 0,
      coveredShare: 0,
      stairShare: 0,
      rampShare: 0,
      mechanicalShare: 0,
      activeTravelShare: 1,
    };
    pilotPathCache.set(key, result);
    return result;
  }

  const adjacency = ensurePilotAdjacency();
  if (!adjacency) return null;
  const count = pilotNetworkNodes.length;
  const scores = new Float64Array(count);
  scores.fill(Infinity);
  const previous = new Int32Array(count);
  previous.fill(-1);
  const previousEdge = new Int32Array(count);
  previousEdge.fill(-1);
  const closed = new Uint8Array(count);
  const queue = new MinPriorityQueue();
  scores[startNodeId] = 0;
  queue.push(startNodeId, pilotHeuristic(startNodeId, destinationNodeId));

  while (queue.size) {
    const current = queue.pop();
    if (!current) break;
    const nodeId = current.node;
    if (closed[nodeId]) continue;
    if (nodeId === destinationNodeId) break;
    closed[nodeId] = 1;
    for (const [nextId, edgeIndex] of adjacency[nodeId]) {
      if (closed[nextId]) continue;
      const tentative = scores[nodeId] + pilotEdgeCost(pilotNetworkEdges[edgeIndex], profile, context);
      if (tentative >= scores[nextId]) continue;
      scores[nextId] = tentative;
      previous[nextId] = nodeId;
      previousEdge[nextId] = edgeIndex;
      queue.push(nextId, tentative + pilotHeuristic(nextId, destinationNodeId));
    }
  }

  if (previous[destinationNodeId] < 0) {
    pilotPathCache.set(key, null);
    return null;
  }
  const nodeIds = [];
  const edgeIds = [];
  let cursor = destinationNodeId;
  while (cursor >= 0) {
    nodeIds.push(cursor);
    if (cursor === startNodeId) break;
    edgeIds.push(previousEdge[cursor]);
    cursor = previous[cursor];
  }
  if (nodeIds[nodeIds.length - 1] !== startNodeId) {
    pilotPathCache.set(key, null);
    return null;
  }
  nodeIds.reverse();
  edgeIds.reverse();
  let pathMeters = 0;
  let horizontalMeters = 0;
  let coveredMeters = 0;
  let verticalGainMeters = 0;
  let verticalLossMeters = 0;
  let maxAbsoluteGrade = 0;
  let planarGeneralizedMeters = 0;
  let stairMeters = 0;
  let rampMeters = 0;
  let mechanicalMeters = 0;
  edgeIds.forEach((edgeId, index) => {
    const edge = pilotNetworkEdges[edgeId];
    const edgeMeters = edge[2] || 0;
    pathMeters += edgeMeters;
    if (edge[4] === 1 || edge[5] === 2) coveredMeters += edgeMeters;
    if (PILOT_STAIR_FEATURES.has(edge[3])) stairMeters += edgeMeters;
    if (PILOT_RAMP_FEATURES.has(edge[3])) rampMeters += edgeMeters;
    if (PILOT_MECHANICAL_FEATURES.has(edge[3])) mechanicalMeters += edgeMeters;
    const from = pilotNetworkNodes[nodeIds[index]];
    const to = pilotNetworkNodes[nodeIds[index + 1]];
    const horizontal = from && to ? Math.hypot(to[0] - from[0], to[1] - from[1]) * appUnitMeters : 0;
    const vertical = ((to?.[2] || 0) - (from?.[2] || 0)) * verticalUnitMeters;
    horizontalMeters += horizontal;
    verticalGainMeters += Math.max(0, vertical);
    verticalLossMeters += Math.max(0, -vertical);
    maxAbsoluteGrade = Math.max(maxAbsoluteGrade, Math.abs(vertical) / Math.max(0.001, horizontal));
    planarGeneralizedMeters += pilotPlanarEdgeCost(edge, profile, context);
  });
  const result = {
    nodeIds,
    edgeIds,
    pathMeters,
    horizontalMeters,
    generalizedMeters: scores[destinationNodeId],
    planarGeneralizedMeters,
    verticalGainMeters,
    verticalLossMeters,
    maxAbsoluteGrade,
    coveredShare: pathMeters ? coveredMeters / pathMeters : 0,
    stairShare: pathMeters ? stairMeters / pathMeters : 0,
    rampShare: pathMeters ? rampMeters / pathMeters : 0,
    mechanicalShare: pathMeters ? mechanicalMeters / pathMeters : 0,
    activeTravelShare: pathMeters ? clamp(1 - mechanicalMeters / pathMeters, 0, 1) : 1,
  };
  if (pilotPathCache.size >= PILOT_PATH_CACHE_MAX) pilotPathCache.delete(pilotPathCache.keys().next().value);
  pilotPathCache.set(key, result);
  return result;
}

function clearPilotRouteCache() {
  pilotPathCache.clear();
  hkIslandRoutingGraph?.clearPathCache();
}

function signedClockDifference(minute, referenceMinute) {
  let difference = minute - referenceMinute;
  if (difference > 720) difference -= 1440;
  if (difference < -720) difference += 1440;
  return difference;
}

function elapsedClockMinutes(startMinute, endMinute) {
  return ((endMinute - startMinute) % 1440 + 1440) % 1440;
}

function observerPoint(point) {
  return {
    x: Number(point?.x || 0),
    y: Number(point?.y || 0),
    z: Number(point?.z || 0),
  };
}

function resampleObserverPoints(source, maximumPoints = AGENT_OBSERVER_MAX_TRACE_POINTS) {
  if (source.length <= maximumPoints) return source;
  const cumulative = new Float64Array(source.length);
  for (let index = 1; index < source.length; index += 1) {
    cumulative[index] = cumulative[index - 1] + physicalDistanceMeters(source[index - 1], source[index]);
  }
  const totalMeters = cumulative.at(-1);
  if (totalMeters <= 0.001) return [source[0]];
  const sampled = [];
  let segment = 1;
  for (let index = 0; index < maximumPoints; index += 1) {
    const targetMeters = (index / (maximumPoints - 1)) * totalMeters;
    while (segment < cumulative.length - 1 && cumulative[segment] < targetMeters) segment += 1;
    const previousDistance = cumulative[segment - 1];
    const segmentDistance = Math.max(0.001, cumulative[segment] - previousDistance);
    const fraction = clamp((targetMeters - previousDistance) / segmentDistance, 0, 1);
    const previous = source[segment - 1];
    const current = source[segment];
    sampled.push({
      x: previous.x + (current.x - previous.x) * fraction,
      y: previous.y + (current.y - previous.y) * fraction,
      z: previous.z + (current.z - previous.z) * fraction,
    });
  }
  return sampled;
}

function captureAgentRouteTrace(agent) {
  const source = [observerPoint(agent.pos)];
  if (agent.route?.length) {
    agent.route.forEach((point) => source.push(observerPoint(point)));
  } else if (agent.target) {
    source.push(observerPoint(agent.target));
  }
  const sampled = resampleObserverPoints(source);
  const trace = new Float32Array(sampled.length * 3);
  sampled.forEach((point, index) => {
    trace[index * 3] = point.x;
    trace[index * 3 + 1] = point.y;
    trace[index * 3 + 2] = point.z;
  });
  return trace;
}

function assessRouteQuality(agent, route, purpose = agent?.routePurpose || "unknown") {
  if (!route || route.transportMode && route.transportMode !== "walk" || route.mode === "tcs-temporal-schematic") {
    return { status: "not-spatial", flags: [], criticalCount: 0, reviewCount: 0 };
  }
  const thresholds = ROUTE_CALIBRATION.routeQuality || {};
  const routeMeters = Math.max(0, Number(route.routeMeters || route.directMeters) || 0);
  const connectorMeters = Math.max(
    0,
    Number(route.horizontalConnectorMeters ?? route.connectorMeters) || 0,
  );
  const circuity = Math.max(0, Number(route.circuity) || 0);
  const maxUnclassifiedGrade = Math.max(
    0,
    Number(route.maxUnclassifiedGrade ?? route.maxAbsoluteGrade) || 0,
  );
  const networkMeters = Math.max(0, Number(route.networkRouteMeters) || 0);
  const networkShare = networkMeters > 0 ? networkMeters / Math.max(1, networkMeters + connectorMeters) : 0;
  const flags = [];
  const add = (code, severity, label) => flags.push({ code, severity, label });
  if (connectorMeters > (thresholds.connectorCriticalMeters || 250)) {
    add("connector-critical", "critical", `Horizontal connector ${connectorMeters.toFixed(0)} m`);
  } else if (
    connectorMeters > (thresholds.connectorReviewMeters || 100) ||
    (routeMeters > 0 && connectorMeters / routeMeters > (thresholds.connectorShareReview || 0.2))
  ) {
    add("connector-review", "review", `Horizontal connector ${connectorMeters.toFixed(0)} m`);
  }
  if (circuity > (thresholds.circuityCritical || 4)) {
    add("circuity-critical", "critical", `Circuity ${circuity.toFixed(2)}x`);
  } else if (circuity > (thresholds.circuityReview || 2.5)) {
    add("circuity-review", "review", `Circuity ${circuity.toFixed(2)}x`);
  }
  if (routeMeters > (thresholds.routeCriticalMeters || 6000)) {
    add("route-length-critical", "critical", `Route ${(routeMeters / 1000).toFixed(1)} km`);
  }
  if (maxUnclassifiedGrade > (thresholds.gradeCritical || 1)) {
    add("grade-critical", "critical", `Unclassified grade ${(maxUnclassifiedGrade * 100).toFixed(0)}%`);
  } else if (maxUnclassifiedGrade > (thresholds.gradeReview || 0.45)) {
    add("grade-review", "review", `Unclassified grade ${(maxUnclassifiedGrade * 100).toFixed(0)}%`);
  }
  if (String(route.mode || "").endsWith("-3dpn-od-a-star") && networkShare < (thresholds.minimumNetworkShare || 0.9)) {
    add("network-share-review", "review", `Network share ${(networkShare * 100).toFixed(0)}%`);
  }
  if (purpose === "school") {
    const walkLimit = routeCalibrationWalkLimit(agent);
    const minutes = Math.max(0, Number(route.estimatedMinutes) || 0);
    if (minutes > walkLimit + (thresholds.schoolTimeCriticalBufferMinutes || 10)) {
      add("school-time-critical", "critical", `School walk ${minutes.toFixed(1)} min`);
    } else if (minutes > walkLimit) {
      add("school-time-review", "review", `School walk ${minutes.toFixed(1)} min`);
    }
  }
  const criticalCount = flags.filter((flag) => flag.severity === "critical").length;
  const reviewCount = flags.length - criticalCount;
  return {
    status: criticalCount ? "critical" : reviewCount ? "review" : "pass",
    flags,
    criticalCount,
    reviewCount,
    networkShare,
  };
}

function snapshotAgentRoute(agent) {
  const route = agent.lastRoute || {};
  const quality = assessRouteQuality(agent, route, agent.routePurpose);
  return {
    ...(route.nodeNamespace ? { nodeNamespace: route.nodeNamespace, controlledPilot: true,
      activeWalkingMinutes: route.activeWalkingMinutes, unverifiedAccessMinutes: route.unverifiedAccessMinutes,
      mechanicalMinutes: route.mechanicalMinutes } : {}),
    mode: route.mode || "straight",
    transportMode: route.transportMode || agent.travelMode || "walk",
    spatialStatus: route.spatialStatus || "not-recorded",
    comparisonStatus: route.comparisonStatus || "not-compared",
    startNodeId: Number.isInteger(route.startNodeId) ? route.startNodeId : null,
    destinationNodeId: Number.isInteger(route.destinationNodeId) ? route.destinationNodeId : null,
    directMeters: Number(route.directMeters || route.routeMeters || 0),
    circuity: Number(route.circuity || 1),
    routeMeters: Number(route.routeMeters || route.directMeters || 0),
    planarRouteMeters: Number(route.planarRouteMeters ?? route.routeMeters ?? route.directMeters ?? 0),
    generalizedMeters: Number(route.generalizedMeters || route.routeMeters || route.directMeters || 0),
    estimatedMinutes: Number(route.estimatedMinutes || 0),
    planarEstimatedMinutes: Number(route.planarEstimatedMinutes ?? route.estimatedMinutes ?? 0),
    accountingVersion: route.accountingVersion || null,
    activeWalkingMinutes: route.activeWalkingMinutes ?? null,
    unverifiedAccessMinutes: route.unverifiedAccessMinutes ?? null,
    mechanicalMinutes: route.mechanicalMinutes ?? null,
    verticalGainMeters: Number(route.verticalGainMeters || 0),
    maxAbsoluteGrade: Number(route.maxAbsoluteGrade || 0),
    maxGradeFeatureType: Number(route.maxGradeFeatureType || 0),
    maxUnclassifiedGrade: Number(route.maxUnclassifiedGrade || 0),
    maxUnclassifiedGradeFeatureType: Number(route.maxUnclassifiedGradeFeatureType || 0),
    coveredShare: Number(route.coveredShare || 0),
    stairShare: Number(route.stairShare || 0),
    rampShare: Number(route.rampShare || 0),
    mechanicalShare: Number(route.mechanicalShare || 0),
    accessTimeEdgeCount: Number(route.accessTimeEdgeCount || 0),
    accessTimeShare: Number(route.accessTimeShare || 0),
    activeTravelShare: Number(route.activeTravelShare ?? 1),
    modeFamily: route.modeFamily || null,
    accessWalkMeters: Number(route.accessWalkMeters || 0),
    egressWalkMeters: Number(route.egressWalkMeters || 0),
    accessWalkMinutes: Number(route.accessWalkMinutes || 0),
    egressWalkMinutes: Number(route.egressWalkMinutes || 0),
    lineHaulMeters: Number(route.lineHaulMeters || 0),
    lineHaulMinutes: Number(route.lineHaulMinutes || 0),
    waitMinutes: Number(route.waitMinutes || 0),
    baseWaitMinutes: Number(route.baseWaitMinutes || 0),
    calibrationResidualMinutes: Number(route.calibrationResidualMinutes || 0),
    boardingStop: route.boardingStop || null,
    alightingStop: route.alightingStop || null,
    transferCount: Number(route.transferCount || 0),
    lineHaulElevationModel: route.lineHaulElevationModel || null,
    expandedNodes: Number(route.expandedNodes || 0),
    connectorMeters: Number(route.connectorMeters || 0),
    horizontalConnectorMeters: Number(route.horizontalConnectorMeters ?? route.connectorMeters ?? 0),
    verticalConnectorMeters: Number(route.verticalConnectorMeters || 0),
    startHorizontalConnectorMeters: Number(route.startHorizontalConnectorMeters ?? route.startConnectorMeters ?? 0),
    destinationHorizontalConnectorMeters: Number(route.destinationHorizontalConnectorMeters ?? route.destinationConnectorMeters ?? 0),
    startConnectorMeters: Number(route.startConnectorMeters || 0),
    destinationConnectorMeters: Number(route.destinationConnectorMeters || 0),
    networkRouteMeters: Number(
      route.networkRouteMeters ?? Math.max(0, Number(route.routeMeters || 0) - Number(route.connectorMeters || 0)),
    ),
    routeNodeCount: Number(route.routeNodeCount || 0),
    routingProfile: route.routingProfile || "scenario",
    routingScenarioKey: route.routingScenarioKey || world.scenario,
    routingScenarioHeat: Number(route.routingScenarioHeat ?? SCENARIOS[world.scenario]?.heat ?? 0),
    routingHeatAvoidance: Number(route.routingHeatAvoidance ?? world.rules.heatAvoidance),
    qualityStatus: quality.status,
    qualityFlags: quality.flags,
    networkShare: Number(quality.networkShare || 0),
  };
}

function resetAgentObserverHistory(agent, state = agent.state || "home") {
  agent.tripHistory = [];
  agent.stateHistory = [{ time: world.time, state, destination: agent.target?.label || null }];
}

function recordAgentStateEvent(agent, state, destination = null, time = world.time, label = null) {
  const history = agent.stateHistory || (agent.stateHistory = []);
  const previous = history.at(-1);
  if (previous?.state === state) return;
  history.push({ time, state, destination, ...(label ? { label } : {}) });
  if (history.length > AGENT_OBSERVER_MAX_STATE_EVENTS) history.shift();
}

function startAgentTrip(agent, purpose, expectedMinutes = null) {
  if (!purpose || physicalDistanceMeters(agent.pos, agent.target) < 3) return;
  if (purpose === "school" && agent.state !== "commute") return;
  prepareRouteAccounting(agent);
  if (agent.route && !agent.routePurpose) agent.routePurpose = purpose;
  const historyId = ++world.tripSequence;
  const routeSnapshot = snapshotAgentRoute(agent);
  const tripHistory = agent.tripHistory || (agent.tripHistory = []);
  tripHistory.push({
    id: historyId,
    scope: agent.scope,
    purpose,
    status: "active",
    startedAt: world.time,
    endedAt: null,
    actualMinutes: null,
    origin: observerPoint(agent.pos),
    destination: observerPoint(agent.target),
    destinationLabel: agent.target?.poi?.name || agent.target?.school?.name || agent.target?.zone?.name || purpose,
    scenario: world.scenario,
    route: routeSnapshot,
    trace: captureAgentRouteTrace(agent),
  });
  if (tripHistory.length > AGENT_OBSERVER_MAX_TRIPS) tripHistory.shift();
  agent.activeTrip = {
    purpose,
    historyId,
    startedAt: world.time,
    expectedMinutes,
    elapsedMinutes: 0,
    startNodeId: agent.lastRoute?.startNodeId ?? agent.currentNetworkNodeId,
    destinationNodeId: agent.lastRoute?.destinationNodeId ?? agent.target?.networkNodeId,
  };
  recordPairedRouteComparison(agent, agent.lastRoute);
}

function completeAgentTrip(agent, purpose) {
  const trip = agent.activeTrip;
  if (!trip || (purpose && trip.purpose !== purpose)) return;
  const actualMinutes = Number.isFinite(trip.elapsedMinutes)
    ? trip.elapsedMinutes
    : elapsedClockMinutes(trip.startedAt, world.time);
  if (trip.purpose === "school") {
    const arrivalMinute = (trip.startedAt + actualMinutes) % 1440;
    const lateness = signedClockDifference(arrivalMinute, agent.schoolStartMinute);
    agent.schoolArrivalMinute = arrivalMinute;
    agent.schoolActualTravelMinutes = actualMinutes;
    agent.schoolRouteExpectedMinutes = trip.expectedMinutes;
    agent.schoolRouteStartNodeId = trip.startNodeId;
    agent.schoolRouteDestinationNodeId = trip.destinationNodeId;
    agent.schoolLatenessMinutes = Math.max(0, lateness);
    agent.schoolOnTime = lateness <= 5;
  }
  const historyRecord = agent.tripHistory?.find((record) => record.id === trip.historyId);
  if (historyRecord) {
    historyRecord.status = "complete";
    historyRecord.endedAt = (trip.startedAt + actualMinutes) % 1440;
    historyRecord.actualMinutes = actualMinutes;
  }
  agent.activeTrip = null;
}

function kowloonMultimodalWalkLeg(startPoint, startNodeId, destinationPoint, destinationNodeId) {
  if (
    !v12_9KowloonRoutingGraph?.ready ||
    !Number.isInteger(startNodeId) ||
    !Number.isInteger(destinationNodeId)
  ) {
    return null;
  }
  const path = v12_9KowloonRoutingGraph.findPath(
    startNodeId,
    destinationNodeId,
    islandRoutingOptions(),
  );
  if (!path) return null;
  const startNetworkPoint = kowloonNodePoint(startNodeId);
  const destinationNetworkPoint = kowloonNodePoint(destinationNodeId);
  if (!startNetworkPoint || !destinationNetworkPoint) return null;
  const startConnectorMeters = physicalDistanceMeters(startPoint, startNetworkPoint);
  const destinationConnectorMeters = physicalDistanceMeters(destinationNetworkPoint, destinationPoint);
  const startPlanarConnectorMeters = planarDistanceMeters(startPoint, startNetworkPoint);
  const destinationPlanarConnectorMeters = planarDistanceMeters(destinationNetworkPoint, destinationPoint);
  return {
    path,
    routeMeters: path.pathMeters + startConnectorMeters + destinationConnectorMeters,
    generalizedMeters: path.generalizedMeters + startConnectorMeters + destinationConnectorMeters,
    planarRouteMeters: path.horizontalMeters + startPlanarConnectorMeters + destinationPlanarConnectorMeters,
    planarGeneralizedMeters:
      path.planarGeneralizedMeters + startPlanarConnectorMeters + destinationPlanarConnectorMeters,
    verticalGainMeters:
      path.verticalGainMeters +
      Math.max(0, ((startNetworkPoint.z || 0) - (startPoint.z || 0)) * verticalUnitMeters) +
      Math.max(0, ((destinationPoint.z || 0) - (destinationNetworkPoint.z || 0)) * verticalUnitMeters),
    points: networkAccountingPoints(path, kowloonNodePoint, (id) => ({
      meters: v12_9KowloonRoutingGraph.edgeLengthMeters[id],
      horizontalMeters: v12_9KowloonRoutingGraph.edgeHorizontalMeters[id],
      generalizedMeters: v12_9KowloonRoutingGraph.edgeCost(id, islandRoutingOptions()),
      planarGeneralizedMeters: v12_9KowloonRoutingGraph.planarEdgeCost(id, islandRoutingOptions()),
      kind: HKActivityAccounting.isMechanical(v12_9KowloonRoutingGraph.edgeFeatureType[id]) ? "mechanical" : "walk",
    })).map((point) => ({
      ...point,
      travelKind: "active-access",
    })),
    startConnectorMeters,
    destinationConnectorMeters,
    startPlanarConnectorMeters,
    destinationPlanarConnectorMeters,
  };
}

function pushDistinctRoutePoint(points, point) {
  if (!point) return;
  const previous = points.at(-1);
  if (
    previous &&
    Math.hypot(previous.x - point.x, previous.y - point.y) * appUnitMeters < 0.15 &&
    Math.abs((previous.z || 0) - (point.z || 0)) * verticalUnitMeters < 0.15
  ) {
    if (Number.isInteger(point.nodeId)) previous.nodeId = point.nodeId;
    return;
  }
  points.push(point);
}

function annotateMultimodalRouteTiming(routePoints, startPoint, durations) {
  const distances = { "active-access": 0, "line-haul": 0, "active-egress": 0 };
  let previous = startPoint;
  routePoints.forEach((point) => {
    const kind = point.travelKind || "line-haul";
    const meters = physicalDistanceMeters(previous, point);
    point.segmentMeters = meters;
    distances[kind] = (distances[kind] || 0) + meters;
    previous = point;
  });
  routePoints.forEach((point) => {
    const kind = point.travelKind || "line-haul";
    const duration = Math.max(0, Number(durations[kind]) || 0);
    const categoryMeters = Math.max(0, distances[kind] || 0);
    point.segmentMetersPerMinute = duration > 0 && categoryMeters > 0
      ? categoryMeters / duration
      : 0;
  });
  const waitingPoint = routePoints.find((point) => point.travelKind === "line-haul") || routePoints.at(-1);
  if (waitingPoint) waitingPoint.waitMinutesRemaining = Math.max(0, Number(durations.wait) || 0);
}

function assignKowloonMultimodalRoute(agent, target, purpose) {
  if (
    !kowloonMultimodalGraph?.ready ||
    !v12_9KowloonRoutingGraph?.ready ||
    !Number.isInteger(agent.currentNetworkNodeId) ||
    !Number.isInteger(target?.networkNodeId)
  ) {
    return false;
  }
  const journey = kowloonMultimodalGraph.findJourney(agent.travelMode, agent.pos, target);
  if (!journey) return false;
  const boardingWalkSnap = v12_9KowloonRoutingGraph.snapPoint(journey.boarding);
  const alightingWalkSnap = v12_9KowloonRoutingGraph.snapPoint(journey.alighting);
  if (!boardingWalkSnap || !alightingWalkSnap) return false;
  const boardingPoint = {
    x: journey.boarding.x,
    y: journey.boarding.y,
    z: boardingWalkSnap.point.z,
  };
  const alightingPoint = {
    x: journey.alighting.x,
    y: journey.alighting.y,
    z: alightingWalkSnap.point.z,
  };
  const access = kowloonMultimodalWalkLeg(
    agent.pos,
    agent.currentNetworkNodeId,
    boardingPoint,
    boardingWalkSnap.nodeId,
  );
  const egress = kowloonMultimodalWalkLeg(
    alightingPoint,
    alightingWalkSnap.nodeId,
    target,
    target.networkNodeId,
  );
  if (!access || !egress) return false;

  const walkingSpeed = Math.max(35, agent.walkingSpeedMpm || 70);
  const scenarioMobility = Math.max(0.1, SCENARIOS[world.scenario].mobility);
  const accessMinutes = access.generalizedMeters / walkingSpeed / scenarioMobility;
  const egressMinutes = egress.generalizedMeters / walkingSpeed / scenarioMobility;
  const planarAccessMinutes = access.planarGeneralizedMeters / walkingSpeed / scenarioMobility;
  const planarEgressMinutes = egress.planarGeneralizedMeters / walkingSpeed / scenarioMobility;
  const lineHaulMinutes = journey.path.travelMinutes / scenarioMobility;
  const baseWaitMinutes = journey.waitMinutes / scenarioMobility;
  const timeCalibration = kowloonMultimodalTimeCalibrationEnabled
    ? kowloonMultimodalTimeCalibration?.groups?.[agent.tcsGroupKey]
    : null;
  const calibrationResidualMinutes = Math.max(
    0,
    Number(timeCalibration?.additiveResidualMinutes) || 0,
  ) / scenarioMobility;
  const waitMinutes = baseWaitMinutes + calibrationResidualMinutes;
  const estimatedMinutes = Math.max(2, accessMinutes + lineHaulMinutes + waitMinutes + egressMinutes);
  const planarEstimatedMinutes = Math.max(
    2,
    planarAccessMinutes + lineHaulMinutes + waitMinutes + planarEgressMinutes,
  );
  const lineHaulMeters = journey.path.pathMeters;
  const routeMeters = access.routeMeters + lineHaulMeters + egress.routeMeters;
  const generalizedMeters =
    access.generalizedMeters + lineHaulMeters + egress.generalizedMeters;
  const planarRouteMeters = access.planarRouteMeters + lineHaulMeters + egress.planarRouteMeters;
  const planarGeneralizedMeters =
    access.planarGeneralizedMeters + lineHaulMeters + egress.planarGeneralizedMeters;
  const directMeters = Math.max(1, physicalDistanceMeters(agent.pos, target));
  const activeTravelMinutes = accessMinutes + egressMinutes;
  const routePoints = [];
  access.points.forEach((point) => pushDistinctRoutePoint(routePoints, point));
  pushDistinctRoutePoint(routePoints, { ...boardingPoint, travelKind: "active-access" });
  const linePointCount = Math.max(1, journey.points.length - 1);
  journey.points.forEach((point, index) => {
    pushDistinctRoutePoint(routePoints, {
      x: point.x,
      y: point.y,
      z: lerp(boardingPoint.z, alightingPoint.z, index / linePointCount),
      modeNodeId: point.nodeId,
      travelKind: "line-haul",
    });
  });
  pushDistinctRoutePoint(routePoints, {
    ...alightingWalkSnap.point,
    nodeId: alightingWalkSnap.nodeId,
    travelKind: "active-egress",
  });
  egress.points.slice(1).forEach((point) => pushDistinctRoutePoint(routePoints, {
    ...point,
    travelKind: "active-egress",
  }));
  pushDistinctRoutePoint(routePoints, {
    x: target.x,
    y: target.y,
    z: target.z,
    nodeId: target.networkNodeId,
    terminal: true,
    travelKind: "active-egress",
  });
  annotateMultimodalRouteTiming(routePoints, agent.pos, {
    "active-access": accessMinutes,
    "line-haul": lineHaulMinutes,
    "active-egress": egressMinutes,
    wait: waitMinutes,
  });

  agent.route = routePoints;
  agent.routeIndex = 0;
  agent.routePurpose = purpose;
  agent.lastRoute = {
    mode: `kowloon-osm-${journey.family}-plus-3dpn`,
    modeFamily: journey.family,
    transportMode: agent.travelMode,
    spatialStatus: "complete-spatial-multimodal-proxy",
    source: "OpenStreetMap topology + LandsD 3DPN access/egress",
    startNodeId: agent.currentNetworkNodeId,
    destinationNodeId: target.networkNodeId,
    routeMeters,
    generalizedMeters,
    estimatedMinutes,
    planarRouteMeters,
    planarGeneralizedMeters,
    planarEstimatedMinutes,
    metersPerMinuteOverride: routeMeters / estimatedMinutes,
    directMeters,
    circuity: routeMeters / directMeters,
    connectorMeters:
      access.startConnectorMeters +
      access.destinationConnectorMeters +
      egress.startConnectorMeters +
      egress.destinationConnectorMeters,
    horizontalConnectorMeters:
      access.startPlanarConnectorMeters +
      access.destinationPlanarConnectorMeters +
      egress.startPlanarConnectorMeters +
      egress.destinationPlanarConnectorMeters,
    verticalConnectorMeters: 0,
    startHorizontalConnectorMeters: access.startPlanarConnectorMeters,
    destinationHorizontalConnectorMeters: egress.destinationPlanarConnectorMeters,
    startConnectorMeters: access.startConnectorMeters,
    destinationConnectorMeters: egress.destinationConnectorMeters,
    verticalGainMeters: access.verticalGainMeters + egress.verticalGainMeters,
    verticalLossMeters: Number(access.path.verticalLossMeters || 0) + Number(egress.path.verticalLossMeters || 0),
    maxAbsoluteGrade: Math.max(
      Number(access.path.maxAbsoluteGrade || 0),
      Number(egress.path.maxAbsoluteGrade || 0),
    ),
    maxGradeFeatureType:
      access.path.maxAbsoluteGrade >= egress.path.maxAbsoluteGrade
        ? access.path.maxGradeFeatureType
        : egress.path.maxGradeFeatureType,
    maxUnclassifiedGrade: Math.max(
      Number(access.path.maxUnclassifiedGrade || 0),
      Number(egress.path.maxUnclassifiedGrade || 0),
    ),
    maxUnclassifiedGradeFeatureType:
      access.path.maxUnclassifiedGrade >= egress.path.maxUnclassifiedGrade
        ? access.path.maxUnclassifiedGradeFeatureType
        : egress.path.maxUnclassifiedGradeFeatureType,
    coveredShare:
      (access.path.coveredShare * access.path.pathMeters +
        egress.path.coveredShare * egress.path.pathMeters) /
      Math.max(1, routeMeters),
    stairShare:
      (access.path.stairShare * access.path.pathMeters +
        egress.path.stairShare * egress.path.pathMeters) /
      Math.max(1, routeMeters),
    rampShare:
      (access.path.rampShare * access.path.pathMeters +
        egress.path.rampShare * egress.path.pathMeters) /
      Math.max(1, routeMeters),
    mechanicalShare: lineHaulMeters / Math.max(1, routeMeters),
    activeTravelShare: activeTravelMinutes / estimatedMinutes,
    planarActiveTravelShare:
      (planarAccessMinutes + planarEgressMinutes) / planarEstimatedMinutes,
    accessTimeEdgeCount:
      (access.path.accessTimeEdgeCount || 0) + (egress.path.accessTimeEdgeCount || 0),
    accessTimeShare:
      ((access.path.accessTimeShare || 0) * access.path.pathMeters +
        (egress.path.accessTimeShare || 0) * egress.path.pathMeters) /
      Math.max(1, routeMeters),
    expandedNodes:
      Number(access.path.expandedNodes || 0) +
      Number(journey.path.expandedNodes || 0) +
      Number(egress.path.expandedNodes || 0),
    networkRouteMeters: access.path.pathMeters + lineHaulMeters + egress.path.pathMeters,
    routeNodeCount: routePoints.length,
    accessWalkMeters: access.routeMeters,
    egressWalkMeters: egress.routeMeters,
    accessWalkMinutes: accessMinutes,
    egressWalkMinutes: egressMinutes,
    lineHaulMeters,
    lineHaulMinutes,
    waitMinutes,
    baseWaitMinutes,
    calibrationResidualMinutes,
    boardingStop: journey.boarding.name,
    alightingStop: journey.alighting.name,
    transferCount: journey.path.transferCount,
    lineHaulElevationModel: "endpoint-linear-display-proxy",
    routingProfile: "v12.9.4-multimodal",
    routingScenarioKey: world.scenario,
    routingScenarioHeat: SCENARIOS[world.scenario].heat,
    routingHeatAvoidance: world.rules.heatAvoidance,
    comparisonStatus: "matched-kowloon-spatial-multimodal",
    regionLabel: "continuous Kowloon",
  };
  if (purpose === "school") {
    agent.schoolRouteMeters = routeMeters;
    agent.schoolGeneralizedMeters = generalizedMeters;
    agent.schoolTravelMinutes = estimatedMinutes;
  }
  agent.lastNetworkRoute = agent.lastRoute;
  agent.usedNetworkRouteToday = true;
  startAgentTrip(agent, purpose, estimatedMinutes);
  world.multimodalRoutedTrips += 1;
  world.multimodalTripsByMode[agent.travelMode] =
    (world.multimodalTripsByMode[agent.travelMode] || 0) + 1;
  return true;
}

function assignTcsTemporalRoute(agent, target, purpose) {
  const directMeters = physicalDistanceMeters(agent.pos, target);
  if (directMeters < 3) return false;
  const scenarioMobility = Math.max(0.1, SCENARIOS[world.scenario].mobility);
  const estimatedMinutes = Math.max(2, (agent.tcsJourneyMinutes || 30) / scenarioMobility);
  const destinationNodeId = target?.networkNodeId;
  agent.route = [
    {
      x: target.x,
      y: target.y,
      z: target.z,
      nodeId: destinationNodeId,
      terminal: true,
    },
  ];
  agent.routeIndex = 0;
  agent.routePurpose = purpose;
  agent.lastRoute = {
    mode: "tcs-temporal-schematic",
    transportMode: agent.travelMode,
    spatialStatus: "schematic-until-tpusb-crosswalk",
    startNodeId: agent.currentNetworkNodeId,
    destinationNodeId,
    routeMeters: directMeters,
    generalizedMeters: directMeters,
    estimatedMinutes,
    planarRouteMeters: directMeters,
    planarGeneralizedMeters: directMeters,
    planarEstimatedMinutes: estimatedMinutes,
    metersPerMinuteOverride: directMeters / estimatedMinutes,
    directMeters,
    circuity: 1,
    verticalGainMeters: 0,
    coveredShare: 0,
    stairShare: 0,
    rampShare: 0,
    mechanicalShare: 1,
    activeTravelShare: agent.activeTravelShare,
    planarActiveTravelShare: agent.activeTravelShare,
    connectorMeters: 0,
    networkRouteMeters: 0,
    routeNodeCount: 0,
    comparisonStatus: "shared-temporal-schematic",
  };
  startAgentTrip(agent, purpose, estimatedMinutes);
  world.temporallyCalibratedTrips += 1;
  return true;
}

function regionalRouteRuntime(scopeId) {
  if (scopeId === "hong-kong-island") {
    return {
      graph: hkIslandRoutingGraph,
      manifest: hkIslandRoutingManifest,
      pointForNode: islandNodePoint,
      prefix: "island",
      dispatcherKey: "hkIsland",
      label: "Hong Kong Island",
    };
  }
  if (scopeId === KOWLOON_SCOPE_ID) {
    return {
      graph: v12_9KowloonRoutingGraph,
      manifest: v12_9KowloonRoutingManifest,
      pointForNode: kowloonNodePoint,
      prefix: "kowloon",
      dispatcherKey: "kowloon",
      label: "continuous Kowloon",
    };
  }
  if (scopeId === NT_EAST_SCOPE_ID) {
    return {
      graph: v12_10NtEastRoutingGraph,
      manifest: v12_10NtEastRoutingManifest,
      pointForNode: ntEastNodePoint,
      prefix: "nt-east",
      dispatcherKey: "ntEast",
      label: "New Territories East",
    };
  }
  if (scopeId === NT_WEST_SCOPE_ID) {
    return {
      graph: v12_11NtWestRoutingGraph,
      manifest: v12_11NtWestRoutingManifest,
      pointForNode: ntWestNodePoint,
      prefix: "nt-west",
      dispatcherKey: "ntWest",
      label: "New Territories West",
    };
  }
  if (scopeId === ISLANDS_SCOPE_ID) {
    return {
      graph: v12_11IslandsRoutingGraph,
      manifest: v12_11IslandsRoutingManifest,
      pointForNode: islandsNodePoint,
      prefix: "islands",
      dispatcherKey: "islands",
      label: "Outlying Islands",
    };
  }
  return null;
}

function dispatchWholeHkWalkingOd(
  originDccaId,
  destinationDccaId,
  originComponentId = null,
  destinationComponentId = null,
) {
  const originPack = wholeHkRoutingPackByDcca.get(originDccaId) || null;
  const destinationPack = wholeHkRoutingPackByDcca.get(destinationDccaId) || null;
  if (!originPack || !destinationPack) {
    return { status: "unmapped-dcca", walkable: false, originPack, destinationPack };
  }
  if (originPack !== destinationPack) {
    return { status: "cross-region-mechanised-required", walkable: false, originPack, destinationPack };
  }
  if (
    Number.isInteger(originComponentId) &&
    Number.isInteger(destinationComponentId) &&
    originComponentId !== destinationComponentId
  ) {
    return {
      status: "cross-component-mechanised-required",
      walkable: false,
      originPack,
      destinationPack,
      originComponentId,
      destinationComponentId,
    };
  }
  return {
    status: "same-pack-same-component",
    walkable: true,
    originPack,
    destinationPack,
    originComponentId,
    destinationComponentId,
  };
}

function assignRegionalNetworkRoute(agent, target, purpose) {
  const runtime = regionalRouteRuntime(agent.scope);
  if (!runtime) return false;
  const { graph, manifest, pointForNode, prefix: routePrefix, label: regionLabel, dispatcherKey } = runtime;
  const directMeters = Math.max(1, physicalDistanceMeters(agent.pos, target));
  if (directMeters < 3) return false;
  const startNodeId = agent.currentNetworkNodeId;
  const destinationNodeId = target?.networkNodeId;
  if (
    !graph?.ready ||
    !Number.isInteger(startNodeId) ||
    !Number.isInteger(destinationNodeId)
  ) {
    agent.lastRoute = {
      mode: "straight",
      transportMode: "walk",
      spatialStatus: graph?.ready ? "endpoint-not-snapped" : `${routePrefix}-graph-not-ready`,
      directMeters,
      comparisonStatus: `excluded-${routePrefix}-network-fallback`,
    };
    world.routeFallbacks += 1;
    startAgentTrip(agent, purpose);
    return false;
  }

  const startComponentId = graph.nodeComponent?.[startNodeId];
  const destinationComponentId = graph.nodeComponent?.[destinationNodeId];
  const originDccaId = agent.homeZone?.id;
  const destinationDccaId = target?.zone?.id || target?.dccaId || agent.homeZone?.id;
  const dispatch = dispatchWholeHkWalkingOd(
    originDccaId,
    destinationDccaId,
    startComponentId,
    destinationComponentId,
  );
  const incompatibleDispatcherPack = dispatch.originPack && dispatch.originPack !== dispatcherKey;
  if (!dispatch.walkable || incompatibleDispatcherPack) {
    agent.lastRoute = {
      mode: "unavailable",
      transportMode: "walk",
      spatialStatus: incompatibleDispatcherPack ? "routing-pack-mismatch" : dispatch.status,
      startNodeId,
      destinationNodeId,
      startComponentId,
      destinationComponentId,
      originDccaId,
      destinationDccaId,
      originPack: dispatch.originPack,
      destinationPack: dispatch.destinationPack,
      directMeters,
      comparisonStatus: `excluded-${routePrefix}-cross-component-walk`,
    };
    world.routeFallbacks += 1;
    startAgentTrip(agent, purpose);
    return false;
  }

  const scenarioMobility = Math.max(0.1, SCENARIOS[world.scenario].mobility);
  const routingOptions = islandRoutingOptions();
  if (startNodeId === destinationNodeId) {
    const localMeters = physicalDistanceMeters(agent.pos, target);
    const planarMeters = planarDistanceMeters(agent.pos, target);
    const estimatedMinutes = localMeters / Math.max(35, agent.walkingSpeedMpm || 70) / scenarioMobility;
    const planarEstimatedMinutes = planarMeters / Math.max(35, agent.walkingSpeedMpm || 70) / scenarioMobility;
    agent.lastRoute = {
      mode: `${routePrefix}-local-connector`,
      transportMode: "walk",
      spatialStatus: "same-3dpn-node",
      startNodeId,
      destinationNodeId,
      routeMeters: localMeters,
      generalizedMeters: localMeters,
      estimatedMinutes,
      planarRouteMeters: planarMeters,
      planarGeneralizedMeters: planarMeters,
      planarEstimatedMinutes,
      directMeters,
      circuity: localMeters / directMeters,
      verticalGainMeters: Math.max(0, ((target.z || 0) - (agent.pos.z || 0)) * verticalUnitMeters),
      coveredShare: 0,
      stairShare: 0,
      rampShare: 0,
      mechanicalShare: 0,
      activeTravelShare: 1,
      planarActiveTravelShare: 1,
      connectorMeters: localMeters,
      horizontalConnectorMeters: planarMeters,
      verticalConnectorMeters: Math.abs(((target.z || 0) - (agent.pos.z || 0)) * verticalUnitMeters),
      startHorizontalConnectorMeters: planarMeters,
      destinationHorizontalConnectorMeters: 0,
      startConnectorMeters: localMeters,
      destinationConnectorMeters: 0,
      networkRouteMeters: 0,
      routeNodeCount: 1,
      routingProfile: routingOptions.profile,
      routingScenarioKey: routingOptions.scenarioKey,
      routingScenarioHeat: routingOptions.scenarioHeat,
      routingHeatAvoidance: routingOptions.heatAvoidance,
      comparisonStatus: `matched-${routePrefix}-local-connector`,
    };
    agent.currentNetworkNodeId = destinationNodeId;
    startAgentTrip(agent, purpose, estimatedMinutes);
    return false;
  }

  const path = graph.findPath(
    startNodeId,
    destinationNodeId,
    routingOptions,
  );
  if (!path) {
    agent.lastRoute = {
      mode: "straight",
      transportMode: "walk",
      spatialStatus: "unreachable-directed-3dpn-od",
      startNodeId,
      destinationNodeId,
      directMeters,
      comparisonStatus: `excluded-${routePrefix}-network-fallback`,
    };
    world.routeFallbacks += 1;
    startAgentTrip(agent, purpose);
    return false;
  }

  const startPoint = pointForNode(startNodeId);
  const destinationPoint = pointForNode(destinationNodeId);
  const startConnectorMeters = physicalDistanceMeters(agent.pos, startPoint);
  const destinationConnectorMeters = physicalDistanceMeters(destinationPoint, target);
  const connectorMeters = startConnectorMeters + destinationConnectorMeters;
  const startHorizontalConnectorMeters = planarDistanceMeters(agent.pos, startPoint);
  const destinationHorizontalConnectorMeters = planarDistanceMeters(destinationPoint, target);
  const planarConnectorMeters = startHorizontalConnectorMeters + destinationHorizontalConnectorMeters;
  const verticalConnectorMeters =
    Math.abs(((agent.pos.z || 0) - (startPoint?.z || 0)) * verticalUnitMeters) +
    Math.abs(((target.z || 0) - (destinationPoint?.z || 0)) * verticalUnitMeters);
  const routeMeters = path.pathMeters + connectorMeters;
  const generalizedMeters = path.generalizedMeters + connectorMeters;
  const planarRouteMeters = path.horizontalMeters + planarConnectorMeters;
  const planarGeneralizedMeters = path.planarGeneralizedMeters + planarConnectorMeters;
  const estimatedMinutes = generalizedMeters / Math.max(35, agent.walkingSpeedMpm || 70) / scenarioMobility;
  const planarEstimatedMinutes =
    planarGeneralizedMeters / Math.max(35, agent.walkingSpeedMpm || 70) / scenarioMobility;
  const pathShare = path.pathMeters / Math.max(1, routeMeters);
  const mechanicalShare = path.mechanicalShare * pathShare;
  const points = networkAccountingPoints(path, pointForNode, (id) => ({
    meters: graph.edgeLengthMeters[id], horizontalMeters: graph.edgeHorizontalMeters[id],
    generalizedMeters: graph.edgeCost(id, routingOptions), planarGeneralizedMeters: graph.planarEdgeCost(id, routingOptions),
    kind: HKActivityAccounting.isMechanical(graph.edgeFeatureType[id]) ? "mechanical" : "walk",
  }));
  points.push({
    x: target.x,
    y: target.y,
    z: target.z,
    nodeId: destinationNodeId,
    terminal: true,
  });
  agent.route = points;
  agent.routeIndex = 0;
  agent.routePurpose = purpose;
  agent.lastRoute = {
    mode: `${routePrefix}-3dpn-od-a-star`,
    transportMode: "walk",
    spatialStatus: `complete-${routePrefix}-directed-3dpn`,
    source: manifest?.source?.dataset,
    startNodeId,
    destinationNodeId,
    routeMeters,
    generalizedMeters,
    estimatedMinutes,
    planarRouteMeters,
    planarGeneralizedMeters,
    planarEstimatedMinutes,
    directMeters,
    circuity: routeMeters / directMeters,
    connectorMeters,
    horizontalConnectorMeters: planarConnectorMeters,
    verticalConnectorMeters,
    startHorizontalConnectorMeters,
    destinationHorizontalConnectorMeters,
    startConnectorMeters,
    destinationConnectorMeters,
    verticalGainMeters:
      path.verticalGainMeters +
      Math.max(0, ((startPoint?.z || 0) - (agent.pos.z || 0)) * verticalUnitMeters) +
      Math.max(0, ((target.z || 0) - (destinationPoint?.z || 0)) * verticalUnitMeters),
    verticalLossMeters: path.verticalLossMeters,
    maxAbsoluteGrade: path.maxAbsoluteGrade,
    maxGradeFeatureType: path.maxGradeFeatureType || 0,
    maxUnclassifiedGrade: path.maxUnclassifiedGrade || 0,
    maxUnclassifiedGradeFeatureType: path.maxUnclassifiedGradeFeatureType || 0,
    coveredShare: path.coveredShare * pathShare,
    stairShare: path.stairShare * pathShare,
    rampShare: path.rampShare * pathShare,
    mechanicalShare,
    accessTimeEdgeCount: path.accessTimeEdgeCount || 0,
    accessTimeShare: (path.accessTimeShare || 0) * pathShare,
    activeTravelShare: clamp(1 - mechanicalShare, 0, 1),
    planarActiveTravelShare: 1,
    expandedNodes: path.expandedNodes,
    networkRouteMeters: path.pathMeters,
    routeNodeCount: path.nodeIds.length,
    routingProfile: routingOptions.profile,
    routingScenarioKey: routingOptions.scenarioKey,
    routingScenarioHeat: routingOptions.scenarioHeat,
    routingHeatAvoidance: routingOptions.heatAvoidance,
    comparisonStatus: `matched-${routePrefix}-official-3dpn-od`,
    regionLabel,
  };
  if (purpose === "school") {
    agent.schoolRouteMeters = routeMeters;
    agent.schoolGeneralizedMeters = generalizedMeters;
    agent.schoolTravelMinutes = estimatedMinutes;
  }
  agent.lastNetworkRoute = agent.lastRoute;
  agent.usedNetworkRouteToday = true;
  startAgentTrip(agent, purpose, estimatedMinutes);
  world.routedTrips += 1;
  return true;
}

function assignAgentRoute(agent, target, purpose = null) {
  if (isWholeHkScope()) return withWholeHkRegion(agent.scope, () => wholeHkAssignRoute(agent, target, purpose));
  if (world.scope === WHOLE_HK_SCOPE_ID) return wholeHkAssignRoute(agent, target, purpose);
  return assignAgentRouteCore(agent, target, purpose);
}

function assignAgentRouteCore(agent, target, purpose = null) {
  agent.route = null;
  agent.routeIndex = 0;
  agent.routePurpose = null;
  if (
    agent.travelMode &&
    agent.travelMode !== "walk" &&
    ["school", "postschool", "home"].includes(purpose)
  ) {
    if (agent.scope === KOWLOON_SCOPE_ID && isKowloonScope()) {
      if (assignKowloonMultimodalRoute(agent, target, purpose)) return true;
      world.multimodalRouteFallbacks += 1;
    }
    return assignTcsTemporalRoute(agent, target, purpose);
  }
  if (
    (agent.scope === "hong-kong-island" && isIslandScope()) ||
    (agent.scope === KOWLOON_SCOPE_ID && isKowloonScope()) ||
    (agent.scope === NT_EAST_SCOPE_ID && isNtEastScope()) ||
    (agent.scope === NT_WEST_SCOPE_ID && isNtWestScope()) ||
    (agent.scope === ISLANDS_SCOPE_ID && isOutlyingIslandsScope())
  ) {
    return assignRegionalNetworkRoute(agent, target, purpose);
  }
  if (agent.scope !== activePilot?.id || !isPilotScope()) return false;
  const startNodeId = agent.currentNetworkNodeId;
  const destinationNodeId = target?.networkNodeId;
  if (!Number.isInteger(startNodeId) || !Number.isInteger(destinationNodeId)) {
    agent.lastRoute = {
      mode: "straight",
      spatialStatus: "pilot-endpoint-not-snapped",
      directMeters: physicalDistanceMeters(agent.pos, target),
      comparisonStatus: "excluded-straight-fallback",
    };
    world.routeFallbacks += 1;
    startAgentTrip(agent, purpose);
    return false;
  }
  const routingContext = routeCostContext();
  if (startNodeId === destinationNodeId) {
    const localMeters = physicalDistanceMeters(agent.pos, target);
    const planarMeters = planarDistanceMeters(agent.pos, target);
    const estimatedMinutes =
      localMeters /
      Math.max(35, agent.walkingSpeedMpm || 70) /
      Math.max(0.1, SCENARIOS[world.scenario].mobility);
    const planarEstimatedMinutes =
      planarMeters /
      Math.max(35, agent.walkingSpeedMpm || 70) /
      Math.max(0.1, SCENARIOS[world.scenario].mobility);
    agent.lastRoute = {
      mode: "local",
      spatialStatus: "same-pilot-3dpn-node",
      startNodeId,
      destinationNodeId,
      routeMeters: localMeters,
      generalizedMeters: localMeters,
      estimatedMinutes,
      planarRouteMeters: planarMeters,
      planarGeneralizedMeters: planarMeters,
      planarEstimatedMinutes,
      directMeters: localMeters,
      circuity: 1,
      verticalGainMeters: Math.max(0, ((target.z || 0) - (agent.pos.z || 0)) * verticalUnitMeters),
      coveredShare: 0,
      stairShare: 0,
      rampShare: 0,
      mechanicalShare: 0,
      activeTravelShare: 1,
      planarActiveTravelShare: 1,
      connectorMeters: localMeters,
      horizontalConnectorMeters: planarMeters,
      verticalConnectorMeters: Math.abs(((target.z || 0) - (agent.pos.z || 0)) * verticalUnitMeters),
      startHorizontalConnectorMeters: planarMeters,
      destinationHorizontalConnectorMeters: 0,
      startConnectorMeters: localMeters,
      destinationConnectorMeters: 0,
      networkRouteMeters: 0,
      routeNodeCount: 1,
      routingProfile: routingContext.profile,
      routingScenarioKey: routingContext.scenarioKey,
      routingScenarioHeat: routingContext.scenarioHeat,
      routingHeatAvoidance: routingContext.heatAvoidance,
      comparisonStatus: "matched-local-connector",
    };
    agent.currentNetworkNodeId = destinationNodeId;
    if (localMeters >= 3) startAgentTrip(agent, purpose, estimatedMinutes);
    return false;
  }
  const path = findPilotPath(startNodeId, destinationNodeId, "scenario", routingContext);
  if (!path) {
    agent.lastRoute = {
      mode: "straight",
      spatialStatus: "unreachable-pilot-directed-3dpn-od",
      directMeters: physicalDistanceMeters(agent.pos, target),
      comparisonStatus: "excluded-straight-fallback",
    };
    world.routeFallbacks += 1;
    startAgentTrip(agent, purpose);
    return false;
  }
  const startPoint = pilotNodePoint(startNodeId);
  const destinationPoint = pilotNodePoint(destinationNodeId);
  const directMeters = Math.max(1, physicalDistanceMeters(agent.pos, target));
  const startConnectorMeters = physicalDistanceMeters(agent.pos, startPoint);
  const destinationConnectorMeters = physicalDistanceMeters(destinationPoint, target);
  const connectorMeters = startConnectorMeters + destinationConnectorMeters;
  const startHorizontalConnectorMeters = planarDistanceMeters(agent.pos, startPoint);
  const destinationHorizontalConnectorMeters = planarDistanceMeters(destinationPoint, target);
  const planarConnectorMeters = startHorizontalConnectorMeters + destinationHorizontalConnectorMeters;
  const verticalConnectorMeters =
    Math.abs(((agent.pos.z || 0) - (startPoint?.z || 0)) * verticalUnitMeters) +
    Math.abs(((target.z || 0) - (destinationPoint?.z || 0)) * verticalUnitMeters);
  const routeMeters = path.pathMeters + connectorMeters;
  const generalizedMeters = (path.generalizedMeters || path.pathMeters) + connectorMeters;
  const planarRouteMeters = path.horizontalMeters + planarConnectorMeters;
  const planarGeneralizedMeters = (path.planarGeneralizedMeters || path.horizontalMeters) + planarConnectorMeters;
  const estimatedMinutes = generalizedMeters / Math.max(35, agent.walkingSpeedMpm || 70) / Math.max(0.1, SCENARIOS[world.scenario].mobility);
  const planarEstimatedMinutes =
    planarGeneralizedMeters /
    Math.max(35, agent.walkingSpeedMpm || 70) /
    Math.max(0.1, SCENARIOS[world.scenario].mobility);
  const points = networkAccountingPoints(path, pilotNodePoint, (id) => ({
    meters: pilotNetworkEdges[id][2], horizontalMeters: pilotEdgeHorizontalMeters(pilotNetworkEdges[id]),
    generalizedMeters: pilotEdgeCost(pilotNetworkEdges[id], "scenario", routingContext),
    planarGeneralizedMeters: pilotPlanarEdgeCost(pilotNetworkEdges[id], "scenario", routingContext),
    kind: HKActivityAccounting.isMechanical(pilotNetworkEdges[id][3]) ? "mechanical" : "walk",
  }));
  points.push({ x: target.x, y: target.y, z: target.z, nodeId: destinationNodeId, terminal: true });
  agent.route = points;
  agent.routeIndex = 0;
  agent.routePurpose = purpose;
  agent.lastRoute = {
    mode: "network",
    spatialStatus: "complete-pilot-directed-3dpn",
    startNodeId,
    destinationNodeId,
    routeMeters,
    generalizedMeters,
    estimatedMinutes,
    planarRouteMeters,
    planarGeneralizedMeters,
    planarEstimatedMinutes,
    directMeters,
    circuity: routeMeters / directMeters,
    verticalGainMeters: path.verticalGainMeters + Math.max(0, ((target.z || 0) - (destinationPoint?.z || 0)) * verticalUnitMeters),
    coveredShare: path.coveredShare,
    stairShare: path.stairShare,
    rampShare: path.rampShare,
    mechanicalShare: path.mechanicalShare,
    activeTravelShare: path.activeTravelShare,
    planarActiveTravelShare: 1,
    connectorMeters,
    horizontalConnectorMeters: planarConnectorMeters,
    verticalConnectorMeters,
    startHorizontalConnectorMeters,
    destinationHorizontalConnectorMeters,
    startConnectorMeters,
    destinationConnectorMeters,
    networkRouteMeters: path.pathMeters,
    routeNodeCount: path.nodeIds.length,
    routingProfile: routingContext.profile,
    routingScenarioKey: routingContext.scenarioKey,
    routingScenarioHeat: routingContext.scenarioHeat,
    routingHeatAvoidance: routingContext.heatAvoidance,
    comparisonStatus: "matched-official-route",
  };
  agent.lastNetworkRoute = agent.lastRoute;
  agent.usedNetworkRouteToday = true;
  startAgentTrip(agent, purpose, estimatedMinutes);
  world.routedTrips += 1;
  return true;
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
  const targetArea = area || (isPilotScope() ? pilotArea : null);
  const bounds =
    isPilotScope() && targetArea?.id === pilotArea?.id && pilotNetwork?.bounds
      ? pilotNetwork.bounds
      : targetArea
        ? targetArea.bounds || computeAreaBounds(targetArea)
        : activeRegionalBounds();
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const range = Math.max(width, height);
  camera.target = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: Math.max(8, (targetArea?.height || 18) * 0.24),
  };
  camera.zoom = isPilotScope()
    ? clamp(470 / range, 42, 180)
    : isRegionalScope()
      ? targetArea
        ? clamp(470 / range, 8, 42)
        : clamp(650 / range, 12, 20)
      : clamp(470 / range, 2.1, 8.8);
}

function zoomCamera(factor) {
  camera.zoom = clamp(
    camera.zoom * factor,
    isPilotScope() ? 28 : isRegionalScope() ? 4 : 1.7,
    isPilotScope() ? 240 : isRegionalScope() ? 48 : 9.4,
  );
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

function groupRegionalSchoolRecords(scopePrefix, snapField) {
  const campuses = new Map();
  Object.values(schoolsByStage).flat().forEach((school) => {
    const normalizedName = (school.name || school.nameZh || school.id)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim();
    const identity = school.registrationSchoolNumber || `${normalizedName}:${school.x.toFixed(3)}:${school.y.toFixed(3)}`;
    const key = `${school.stage || "other"}:${identity}`;
    const members = campuses.get(key) || [];
    members.push(school);
    campuses.set(key, members);
  });
  return [...campuses.entries()].map(([campusId, members]) => {
    const representative = members.reduce((best, school) =>
      (school[snapField] ?? Infinity) < (best[snapField] ?? Infinity) ? school : best,
    );
    const permittedAccommodation = members.reduce(
      (maximum, school) => Math.max(maximum, Number(school.permittedAccommodation) || 0),
      0,
    );
    return {
      ...representative,
      campusId: `${scopePrefix}:${campusId}`,
      edbRecordCount: members.length,
      capacityPrior:
        permittedAccommodation ||
        PILOT_SCHOOL_CAPACITY_PRIOR[representative.stage] ||
        PILOT_SCHOOL_CAPACITY_PRIOR.other,
      capacitySource: permittedAccommodation
        ? "EDB classroom permitted accommodation"
        : "Stage capacity prior fallback",
    };
  });
}

function setupSchoolLocations() {
  Object.values(schoolsByStage).forEach((items) => {
    items.length = 0;
  });

  realSchoolLayer.forEach((school) => {
    const islandAttachment = hkIslandRoutingGraph?.attachment("school", school.id);
    const kowloonAttachment = kowloonSchoolAttachmentById.get(school.id);
    const ntEastAttachment = ntEastSchoolAttachmentById.get(school.id);
    const ntWestAttachment = ntWestSchoolAttachmentById.get(school.id);
    const islandsAttachment = islandsSchoolAttachmentById.get(school.id);
    school.islandNodeId = islandAttachment?.nodeId;
    school.islandSnapMeters = islandAttachment?.snapMeters;
    school.islandNodeElevationHkpdM = islandAttachment?.nodeElevationHkpdM;
    school.kowloonNodeId = kowloonAttachment?.nodeId;
    school.kowloonSnapMeters = kowloonAttachment?.snapMeters;
    school.kowloonNodeElevationHkpdM = kowloonAttachment?.nodeElevationHkpdM;
    school.ntEastNodeId = ntEastAttachment?.nodeId;
    school.ntEastSnapMeters = ntEastAttachment?.snapMeters;
    school.ntEastNodeElevationHkpdM = ntEastAttachment?.nodeElevationHkpdM;
    school.ntWestNodeId = ntWestAttachment?.nodeId;
    school.ntWestSnapMeters = ntWestAttachment?.snapMeters;
    school.ntWestNodeElevationHkpdM = ntWestAttachment?.nodeElevationHkpdM;
    school.ntWestComponentId = ntWestAttachment?.componentId;
    school.islandsNodeId = islandsAttachment?.nodeId;
    school.islandsSnapMeters = islandsAttachment?.snapMeters;
    school.islandsNodeElevationHkpdM = islandsAttachment?.nodeElevationHkpdM;
    school.islandsComponentId = islandsAttachment?.componentId;
    school.districtZone = focusAreaById.get(school.zoneId) || zones.find((zone) => pointInArea(school, zone)) || null;
    school.dccaZone = focusAreaById.get(school.dccaId) || null;
    school.zone = isRegionalScope() ? school.dccaZone : school.districtZone;
    if (isIslandScope() && (!hkIslandDccaIdSet.has(school.dccaId) || !Number.isInteger(school.islandNodeId))) return;
    if (isKowloonScope() && (!kowloonDccaIdSet.has(school.dccaId) || !Number.isInteger(school.kowloonNodeId))) return;
    if (isNtEastScope() && (!ntEastDccaIdSet.has(school.dccaId) || !Number.isInteger(school.ntEastNodeId))) return;
    if (isNtWestScope() && (!ntWestDccaIdSet.has(school.dccaId) || !Number.isInteger(school.ntWestNodeId))) return;
    if (isOutlyingIslandsScope() && (!islandsDccaIdSet.has(school.dccaId) || !Number.isInteger(school.islandsNodeId))) return;
    const stage = school.stage && schoolsByStage[school.stage] ? school.stage : "other";
    schoolsByStage[stage].push(school);
  });
  hkIslandSchoolCampuses = isIslandScope() ? groupRegionalSchoolRecords("hki", "islandSnapMeters") : world.scope === WHOLE_HK_SCOPE_ID ? hkIslandSchoolCampuses : [];
  hkIslandSchoolCampusById = new Map(
    hkIslandSchoolCampuses.map((campus) => [campus.campusId, campus]),
  );
  kowloonSchoolCampuses = isKowloonScope() ? groupRegionalSchoolRecords("kowloon", "kowloonSnapMeters") : world.scope === WHOLE_HK_SCOPE_ID ? kowloonSchoolCampuses : [];
  kowloonSchoolCampusById = new Map(
    kowloonSchoolCampuses.map((campus) => [campus.campusId, campus]),
  );
  ntEastSchoolCampuses = isNtEastScope() ? groupRegionalSchoolRecords("nt-east", "ntEastSnapMeters") : world.scope === WHOLE_HK_SCOPE_ID ? ntEastSchoolCampuses : [];
  ntEastSchoolCampusById = new Map(
    ntEastSchoolCampuses.map((campus) => [campus.campusId, campus]),
  );
  ntWestSchoolCampuses = isNtWestScope() ? groupRegionalSchoolRecords("nt-west", "ntWestSnapMeters") : world.scope === WHOLE_HK_SCOPE_ID ? ntWestSchoolCampuses : [];
  ntWestSchoolCampusById = new Map(
    ntWestSchoolCampuses.map((campus) => [campus.campusId, campus]),
  );
  islandsSchoolCampuses = isOutlyingIslandsScope() ? groupRegionalSchoolRecords("islands", "islandsSnapMeters") : world.scope === WHOLE_HK_SCOPE_ID ? islandsSchoolCampuses : [];
  islandsSchoolCampusById = new Map(
    islandsSchoolCampuses.map((campus) => [campus.campusId, campus]),
  );
}

function setupPoiLocations() {
  poiByZoneId.clear();
  poiByGroup.clear();
  realPoiLayer.forEach((poi) => {
    const islandAttachment = hkIslandRoutingGraph?.attachment("poi", poi.id);
    const kowloonAttachment = kowloonPoiAttachmentById.get(poi.id);
    const ntEastAttachment = ntEastPoiAttachmentById.get(poi.id);
    const ntWestAttachment = ntWestPoiAttachmentById.get(poi.id);
    const islandsAttachment = islandsPoiAttachmentById.get(poi.id);
    poi.islandNodeId = islandAttachment?.nodeId;
    poi.islandSnapMeters = islandAttachment?.snapMeters;
    poi.islandNodeElevationHkpdM = islandAttachment?.nodeElevationHkpdM;
    poi.kowloonNodeId = kowloonAttachment?.nodeId;
    poi.kowloonSnapMeters = kowloonAttachment?.snapMeters;
    poi.kowloonNodeElevationHkpdM = kowloonAttachment?.nodeElevationHkpdM;
    poi.ntEastNodeId = ntEastAttachment?.nodeId;
    poi.ntEastSnapMeters = ntEastAttachment?.snapMeters;
    poi.ntEastNodeElevationHkpdM = ntEastAttachment?.nodeElevationHkpdM;
    poi.ntWestNodeId = ntWestAttachment?.nodeId;
    poi.ntWestSnapMeters = ntWestAttachment?.snapMeters;
    poi.ntWestNodeElevationHkpdM = ntWestAttachment?.nodeElevationHkpdM;
    poi.ntWestComponentId = ntWestAttachment?.componentId;
    poi.islandsNodeId = islandsAttachment?.nodeId;
    poi.islandsSnapMeters = islandsAttachment?.snapMeters;
    poi.islandsNodeElevationHkpdM = islandsAttachment?.nodeElevationHkpdM;
    poi.islandsComponentId = islandsAttachment?.componentId;
    poi.districtZone = focusAreaById.get(poi.zoneId) || zones.find((zone) => pointInArea(poi, zone)) || null;
    poi.dccaZone = focusAreaById.get(poi.dccaId) || null;
    poi.zone = isRegionalScope() ? poi.dccaZone : poi.districtZone;
    poi.floor = parsePoiFloor(poi.floorLabel);
    if (isIslandScope() && (!hkIslandDccaIdSet.has(poi.dccaId) || !Number.isInteger(poi.islandNodeId))) return;
    if (isKowloonScope() && (!kowloonDccaIdSet.has(poi.dccaId) || !Number.isInteger(poi.kowloonNodeId))) return;
    if (isNtEastScope() && (!ntEastDccaIdSet.has(poi.dccaId) || !Number.isInteger(poi.ntEastNodeId))) return;
    if (isNtWestScope() && (!ntWestDccaIdSet.has(poi.dccaId) || !Number.isInteger(poi.ntWestNodeId))) return;
    if (isOutlyingIslandsScope() && (!islandsDccaIdSet.has(poi.dccaId) || !Number.isInteger(poi.islandsNodeId))) return;
    if (!poi.zone || !POI_GROUP_META[poi.group]) return;
    const zoneBucket = poiByZoneId.get(poi.zone.id) || new Map();
    const groupBucket = zoneBucket.get(poi.group) || [];
    groupBucket.push(poi);
    zoneBucket.set(poi.group, groupBucket);
    poiByZoneId.set(poi.zone.id, zoneBucket);
    const globalBucket = poiByGroup.get(poi.group) || [];
    globalBucket.push(poi);
    poiByGroup.set(poi.group, globalBucket);
  });
}

function refreshPlaceZones() {
  setupSchoolLocations();
  setupPoiLocations();
}

function setupZones() {
  focusAreas.forEach((area) => {
    area.bounds = computeAreaBounds(area);
  });

  if (realGeoData) {
    zones.forEach((zone) => {
      zone.buildings = realBuildingLayer.filter((building) => areaContainsBuilding(zone, building));
      zone.homeAnchor = { x: zone.x, y: zone.y, z: floorToZ(zone, 8) };
      zone.schoolAnchor = offsetPoint(zone, 0.18, 0.05, floorToZ(zone, 2));
      zone.parkAnchor = offsetPoint(zone, -0.08, 0.18, floorToZ(zone, 0));
      zone.activityAnchor = offsetPoint(zone, 0.12, -0.12, floorToZ(zone, 1));
    });
    setupSchoolLocations();
    setupPoiLocations();
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

    zone.homeAnchor = offsetPoint(zone, -0.18, -0.08, floorToZ(zone, 8));
    zone.schoolAnchor = offsetPoint(zone, 0.2, 0.08, floorToZ(zone, 2));
    zone.parkAnchor = offsetPoint(zone, -0.05, 0.3, floorToZ(zone, 0));
    zone.activityAnchor = offsetPoint(zone, 0.28, -0.22, floorToZ(zone, 1));
  });
  setupSchoolLocations();
  setupPoiLocations();
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
    if (isRegionalScope()) {
      const regionalDccas = simulationZones();
      visibleDistricts().forEach((district) => {
        const districtGroup = document.createElement("optgroup");
        districtGroup.label = `${district.name} · ${regionalDccas.filter((area) => area.parentDistrictId === district.id).length} DCCAs`;
        regionalDccas
          .filter((area) => area.parentDistrictId === district.id)
          .sort((a, b) => a.code.localeCompare(b.code))
          .forEach((area) => addOption(districtGroup, area));
        controls.focus.append(districtGroup);
      });
    } else {
      const districtGroup = document.createElement("optgroup");
      districtGroup.label = "Official 18 Districts";
      zones.forEach((zone) => addOption(districtGroup, zone));
      controls.focus.append(districtGroup);

      const dccaGroup = document.createElement("optgroup");
      dccaGroup.label = "Official 2019 DCCA boundaries";
      dccaAreas.forEach((area) => addOption(dccaGroup, area));
      controls.focus.append(dccaGroup);
    }
  } else {
    zones.forEach((zone) => addOption(controls.focus, zone));
  }
  if (controls.scope) {
    controls.scope.value = world.scope;
    controls.scope.disabled = !pilotByScope.size && !hkIslandModel;
  }
  controls.focus.value = world.focusId;
  controls.focus.disabled = isPilotScope();
}

function populateBuildingSelect() {
  controls.building.innerHTML = "";
  const buildingLayer = activeBuildingModels();
  if (!buildingLayer.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No building data loaded";
    controls.building.append(option);
    world.buildingId = "";
    return;
  }

  buildingLayer.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = `${building.name} - ${formatNumber(building.heightMeters || 0, 0)} m`;
    controls.building.append(option);
  });

  world.buildingId = buildingLayer.some((building) => building.id === world.buildingId)
    ? world.buildingId
    : buildingLayer[0].id;
  controls.building.value = world.buildingId;
  updateBuildingPanel();
}

function selectedBuilding() {
  const buildingLayer = activeBuildingModels();
  return buildingLayer.find((building) => building.id === world.buildingId) || buildingLayer[0] || null;
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

function setBuildingMode(mode) {
  world.buildingMode = mode === "model" ? "model" : "macro";
  controls.buildingMacro.textContent = isPilotScope() ? `${activePilot.code} context` : "Hong Kong";
  controls.buildingMacro.classList.toggle("active", world.buildingMode === "macro");
  controls.buildingModel.classList.toggle("active", world.buildingMode === "model");
  controls.buildingMacro.setAttribute("aria-pressed", String(world.buildingMode === "macro"));
  controls.buildingModel.setAttribute("aria-pressed", String(world.buildingMode === "model"));
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

function modelAgeTargets(census = activePilot?.censusCalibration) {
  const minAge = MODEL_PARAMETERS.population.agentAgeMin ?? TCS2011_CHILD_MOBILITY.cohort.modelAgeMin ?? 6;
  const maxAge = MODEL_PARAMETERS.population.agentAgeMax ?? TCS2011_CHILD_MOBILITY.cohort.modelAgeMax ?? 16;
  return (census?.ageTargets || []).filter((target) => target.age >= minAge && target.age <= maxAge);
}

function modelStageTargets(census = activePilot?.censusCalibration) {
  const totals = new Map();
  modelAgeTargets(census).forEach((target) => {
    const stage = schoolStageForAge(target.age);
    totals.set(stage, (totals.get(stage) || 0) + target.populationEstimate);
  });
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals.entries()].map(([stage, populationEstimate]) => ({
    stage,
    populationEstimate,
    share: total ? populationEstimate / total : 0,
  }));
}

function modelPopulationTarget(census = isPilotScope() ? activePilot?.censusCalibration : null) {
  if (isRegionalScope() && !census) {
    return simulationZones().reduce(
      (sum, area) => sum + modelAgeTargets(area.censusCalibration).reduce(
        (areaSum, target) => areaSum + target.populationEstimate,
        0,
      ),
      0,
    );
  }
  return modelAgeTargets(census).reduce((sum, target) => sum + target.populationEstimate, 0);
}

function regionalStageTargets() {
  const totals = new Map();
  simulationZones().forEach((area) => {
    modelAgeTargets(area.censusCalibration).forEach((target) => {
      const stage = schoolStageForAge(target.age);
      totals.set(stage, (totals.get(stage) || 0) + target.populationEstimate);
    });
  });
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals.entries()].map(([stage, populationEstimate]) => ({
    stage,
    populationEstimate,
    share: total ? populationEstimate / total : 0,
  }));
}

function activeStageTargets() {
  return isRegionalScope() ? regionalStageTargets() : isPilotScope() ? modelStageTargets() : [];
}

function activeTcsMobilityCalibration() {
  if (isKowloonScope() && kowloonCalibrationBundle?.estimation?.groups) {
    return {
      ...TCS2011_CHILD_MOBILITY,
      groups: kowloonCalibrationBundle.estimation.groups,
      sourceLabel: "TCS 2011 Kowloon estimation split",
    };
  }
  return TCS2011_CHILD_MOBILITY;
}

function tcsGroupForAge(age) {
  const calibration = activeTcsMobilityCalibration();
  return (
    Object.entries(calibration.groups || {}).find(
      ([, group]) => age >= group.ageMin && age <= group.ageMax,
    ) ||
    (age < 9
      ? ["primary_1_3", calibration.groups?.primary_1_3]
      : age < 12
        ? ["primary_4_6", calibration.groups?.primary_4_6]
        : ["secondary_1_3", calibration.groups?.secondary_1_3])
  );
}

function sampleTcsDepartureMinute(group, random = agentRandom) {
  const bins = group?.outboundDeparture?.bins || [];
  const selected = weightedChoice(bins, (item) => item.share || 0, random);
  if (!selected) return MODEL_PARAMETERS.schoolSchedule.startMinute - 35;
  const mean = selected.weightedMeanMinute ?? (selected.startMinute + selected.endMinute) / 2;
  return Math.round(clamp(mean + (random() - 0.5) * 16, selected.startMinute, selected.endMinute));
}

function sampleTcsJourneyMinutes(group, random = agentRandom) {
  const profile = group?.outboundJourneyTime || {};
  const points = [
    [0, Math.max(5, (profile.p10Minutes || 15) * 0.7)],
    [0.1, profile.p10Minutes || 15],
    [0.25, profile.p25Minutes || 20],
    [0.5, profile.p50Minutes || profile.meanMinutes || 30],
    [0.75, profile.p75Minutes || 40],
    [0.9, profile.p90Minutes || 50],
    [1, Math.max(profile.p90Minutes || 50, (profile.meanMinutes || 30) * 1.7)],
  ];
  const draw = random();
  for (let index = 1; index < points.length; index += 1) {
    if (draw > points[index][0]) continue;
    const [lowerProbability, lowerValue] = points[index - 1];
    const [upperProbability, upperValue] = points[index];
    const fraction = (draw - lowerProbability) / Math.max(0.001, upperProbability - lowerProbability);
    return Math.max(5, lerp(lowerValue, upperValue, fraction));
  }
  return profile.meanMinutes || 30;
}

function tcsMobilityProfileForAge(age, random = agentRandom) {
  const [groupKey, group] = tcsGroupForAge(age);
  const mode = weightedChoice(group?.modes || [], (item) => item.share || 0, random) || {
    key: "walk",
    label: "Walk only",
    activeTravelShareConservative: 1,
  };
  return {
    groupKey,
    groupLabel: group?.label || groupKey,
    modeKey: mode.key,
    modeLabel: mode.label || TCS_MODE_LABELS[mode.key] || mode.key,
    activeTravelShare: clamp(mode.activeTravelShareConservative ?? 1, 0, 1),
    mentorActiveTravelShare: clamp(
      mode.activeTravelShareMentorProposal ?? mode.activeTravelShareConservative ?? 1,
      0,
      1,
    ),
    observedJourneyMinutes: sampleTcsJourneyMinutes(group, random),
    observedDepartureMinute: sampleTcsDepartureMinute(group, random),
  };
}

function schoolStageForAge(age) {
  if (age < 6) return "kindergarten";
  if (age < 12) return "primary";
  return "secondary";
}

function walkingSpeedForAge(age, random = agentRandom) {
  const stage = schoolStageForAge(age);
  const range = MODEL_PARAMETERS.walking.speedMetersPerMinute[stage] || { min: 66, max: 78 };
  return range.min + random() * Math.max(0, range.max - range.min);
}

function adultAccompanimentForAge(age, random = agentRandom) {
  const stage = schoolStageForAge(age);
  const probability = MODEL_PARAMETERS.walking.adultAccompanimentProbability[stage] ?? 0;
  return { accompanied: random() < probability, probability };
}

function pilotSchoolTravelProfile(school, homeNodeId, originPoint, walkingSpeedMpm) {
  const path = findPilotPath(homeNodeId, school.pilotNodeId, "school-baseline");
  if (!path) return null;
  const homeNode = pilotNodePoint(homeNodeId);
  const schoolNode = pilotNodePoint(school.pilotNodeId);
  const connectorMeters =
    distance2D(originPoint, homeNode) * appUnitMeters + distance2D(school, schoolNode) * appUnitMeters;
  const routeMeters = path.pathMeters + connectorMeters;
  const generalizedMeters = (path.generalizedMeters || path.pathMeters) + connectorMeters;
  return {
    school,
    pathMeters: path.pathMeters,
    pathGeneralizedMeters: path.generalizedMeters || path.pathMeters,
    routeMeters,
    generalizedMeters,
    travelMinutes: generalizedMeters / Math.max(35, walkingSpeedMpm),
    circuity: routeMeters / Math.max(1, distance2D(originPoint, school) * appUnitMeters),
    verticalGainMeters: path.verticalGainMeters,
  };
}

function choosePilotSchool(age, originPoint, homeNodeId, walkingSpeedMpm, assignmentContext = null) {
  const stage = schoolStageForAge(age);
  const stageCandidates = pilotSchoolCampuses.filter(
    (school) => school.stage === stage || (stage === "secondary" && school.stage === "special"),
  );
  const candidates = stageCandidates.length ? stageCandidates : pilotSchoolCampuses;
  if (!candidates.length) return null;
  const profiles = candidates
    .map((school) => pilotSchoolTravelProfile(school, homeNodeId, originPoint || pilotArea, walkingSpeedMpm))
    .filter(Boolean);
  if (!profiles.length) return null;
  const schoolChoice = MODEL_PARAMETERS.schoolChoice;
  const maxWalkMinutes = schoolChoice.maxWalkMinutes[stage] ?? Infinity;
  const walkRangeProfiles = profiles.filter((profile) => profile.travelMinutes <= maxWalkMinutes);
  const eligibleProfiles = walkRangeProfiles.length ? walkRangeProfiles : profiles;
  const walkRangeFallback = walkRangeProfiles.length === 0;
  const capacityTotal = assignmentContext?.capacityTotals.get(stage) || 1;
  const stageAgentCount = assignmentContext?.stageCounts.get(stage) || 1;
  const selected = weightedChoice(eligibleProfiles, (profile) => {
    const { school, travelMinutes } = profile;
    const decayMinutes = schoolChoice.networkTimeDecayMinutes[stage] || 10;
    const networkTimeUtility = Math.exp(-travelMinutes / decayMinutes);
    const longWalkThreshold = schoolChoice.longWalkThresholdMinutes ?? 20;
    const longWalkDecay = schoolChoice.longWalkDecayMinutes || 5;
    const longWalkPenalty = travelMinutes > longWalkThreshold
      ? Math.exp(-(travelMinutes - longWalkThreshold) / longWalkDecay)
      : 1;
    const localPull = school.dccaId === activePilot.dccaId ? schoolChoice.sameDccaPull || 1 : 1;
    const snapQuality = clamp(1.12 - (school.pilotSnapMeters || 0) / PILOT_MAX_SNAP_METERS, 0.5, 1.12);
    const targetLoad = Math.max(1, (stageAgentCount * school.capacityPrior) / capacityTotal);
    const assigned = assignmentContext?.loads.get(school.campusId) || 0;
    const loadRatio = assigned / targetLoad;
    const loadBalance = 1 / (
      1 +
      Math.pow(Math.max(0, loadRatio - (schoolChoice.loadBalanceStartRatio ?? 0.72)), 2) *
        (schoolChoice.loadBalanceStrength || 3.2)
    );
    return networkTimeUtility * longWalkPenalty * localPull * snapQuality * loadBalance;
  });
  if (selected) {
    selected.maxWalkMinutes = maxWalkMinutes;
    selected.walkRangeFallback = walkRangeFallback;
  }
  if (selected && assignmentContext) {
    assignmentContext.loads.set(
      selected.school.campusId,
      (assignmentContext.loads.get(selected.school.campusId) || 0) + 1,
    );
  }
  return selected;
}

function routeCalibrationWalkLimit(agentLike) {
  const groupKey = agentLike?.tcsGroupKey || tcsGroupForAge(agentLike?.age || 10)[0];
  return ROUTE_CALIBRATION.schoolChoice?.maxWalkMinutesByTcsGroup?.[groupKey] ??
    MODEL_PARAMETERS.schoolChoice.maxWalkMinutes[schoolStageForAge(agentLike?.age || 10)] ??
    30;
}

function islandSchoolTravelProxy(school, originPoint, walkingSpeedMpm, homeSnapMeters = 0) {
  const directMeters = planarDistanceMeters(originPoint, school);
  const connectorMeters = Math.max(0, Number(homeSnapMeters) || 0) + Math.max(0, Number(school.islandSnapMeters) || 0);
  const routeMeters = directMeters * (ROUTE_CALIBRATION.schoolChoice?.directCircuityPrior || 1.28) + connectorMeters;
  return {
    school,
    directMeters,
    connectorMeters,
    routeMeters,
    travelMinutes: routeMeters / Math.max(35, walkingSpeedMpm || 70),
  };
}

function kowloonSchoolTravelProxy(school, originPoint, walkingSpeedMpm, homeSnapMeters = 0) {
  const directMeters = planarDistanceMeters(originPoint, school);
  const connectorMeters = Math.max(0, Number(homeSnapMeters) || 0) + Math.max(0, Number(school.kowloonSnapMeters) || 0);
  const routeMeters = directMeters * (ROUTE_CALIBRATION.schoolChoice?.directCircuityPrior || 1.28) + connectorMeters;
  return {
    school,
    directMeters,
    connectorMeters,
    routeMeters,
    generalizedMeters: routeMeters,
    travelMinutes: routeMeters / Math.max(35, walkingSpeedMpm || 70),
  };
}

function ntEastSchoolTravelProxy(school, originPoint, walkingSpeedMpm, homeSnapMeters = 0) {
  const directMeters = planarDistanceMeters(originPoint, school);
  const connectorMeters = Math.max(0, Number(homeSnapMeters) || 0) + Math.max(0, Number(school.ntEastSnapMeters) || 0);
  const routeMeters = directMeters * (ROUTE_CALIBRATION.schoolChoice?.directCircuityPrior || 1.28) + connectorMeters;
  return {
    school,
    directMeters,
    connectorMeters,
    routeMeters,
    generalizedMeters: routeMeters,
    travelMinutes: routeMeters / Math.max(35, walkingSpeedMpm || 70),
  };
}

function islandSchoolNetworkProfiles(
  stage,
  homeNodeId,
  originPoint,
  walkingSpeedMpm,
  homeSnapMeters = 0,
) {
  if (!Number.isInteger(homeNodeId)) return [];
  const access = islandSchoolAccessByHomeNode.get(homeNodeId);
  if (!access) return [];
  const entries = stage === "primary" ? access.primary : access.secondary;
  return (entries || []).flatMap(([campusId, generalizedMeters, pathMeters]) => {
    const school = hkIslandSchoolCampusById.get(campusId);
    if (!school) return [];
    const connectorMeters =
      Math.max(0, Number(homeSnapMeters) || 0) +
      Math.max(0, Number(school.islandSnapMeters) || 0);
    const totalGeneralizedMeters = Math.max(0, Number(generalizedMeters) || 0) + connectorMeters;
    return [{
      school,
      directMeters: planarDistanceMeters(originPoint, school),
      connectorMeters,
      routeMeters: Math.max(0, Number(pathMeters) || 0) + connectorMeters,
      generalizedMeters: totalGeneralizedMeters,
      travelMinutes: totalGeneralizedMeters / Math.max(35, walkingSpeedMpm || 70),
      networkAccessSource: "precomputed-directed-3dpn-k-nearest",
    }];
  });
}

function kowloonSchoolNetworkProfiles(
  stage,
  homeNodeId,
  originPoint,
  walkingSpeedMpm,
  homeSnapMeters = 0,
) {
  if (!Number.isInteger(homeNodeId)) return [];
  const access = kowloonSchoolAccessByHomeNode.get(homeNodeId);
  if (!access) return [];
  const entries = stage === "primary" ? access.primary : access.secondary;
  return (entries || []).flatMap(([campusId, generalizedMeters, pathMeters]) => {
    const school = kowloonSchoolCampusById.get(campusId);
    if (!school) return [];
    const connectorMeters =
      Math.max(0, Number(homeSnapMeters) || 0) +
      Math.max(0, Number(school.kowloonSnapMeters) || 0);
    const totalGeneralizedMeters = Math.max(0, Number(generalizedMeters) || 0) + connectorMeters;
    return [{
      school,
      directMeters: planarDistanceMeters(originPoint, school),
      connectorMeters,
      routeMeters: Math.max(0, Number(pathMeters) || 0) + connectorMeters,
      generalizedMeters: totalGeneralizedMeters,
      travelMinutes: totalGeneralizedMeters / Math.max(35, walkingSpeedMpm || 70),
      networkAccessSource: "precomputed-directed-kowloon-3dpn-k-nearest",
    }];
  });
}

function ntEastSchoolNetworkProfiles(
  stage,
  homeNodeId,
  originPoint,
  walkingSpeedMpm,
  homeSnapMeters = 0,
) {
  if (!Number.isInteger(homeNodeId)) return [];
  const access = ntEastSchoolAccessByHomeNode.get(homeNodeId);
  if (!access) return [];
  const entries = stage === "primary" ? access.primary : access.secondary;
  return (entries || []).flatMap(([campusId, generalizedMeters, pathMeters]) => {
    const school = ntEastSchoolCampusById.get(campusId);
    if (!school) return [];
    const connectorMeters =
      Math.max(0, Number(homeSnapMeters) || 0) +
      Math.max(0, Number(school.ntEastSnapMeters) || 0);
    const totalGeneralizedMeters = Math.max(0, Number(generalizedMeters) || 0) + connectorMeters;
    return [{
      school,
      directMeters: planarDistanceMeters(originPoint, school),
      connectorMeters,
      routeMeters: Math.max(0, Number(pathMeters) || 0) + connectorMeters,
      generalizedMeters: totalGeneralizedMeters,
      travelMinutes: totalGeneralizedMeters / Math.max(35, walkingSpeedMpm || 70),
      networkAccessSource: "precomputed-directed-nt-east-3dpn-k-nearest",
    }];
  });
}

function chooseIslandSchool(
  age,
  originPoint,
  walkingSpeedMpm,
  travelMode,
  homeZone,
  homeSnapMeters,
  homeNodeId,
  assignmentContext = null,
) {
  const stage = schoolStageForAge(age);
  const stageCandidates = hkIslandSchoolCampuses.filter(
    (school) => school.stage === stage || (stage === "secondary" && school.stage === "special"),
  );
  const candidates = stageCandidates.length ? stageCandidates : hkIslandSchoolCampuses;
  if (!candidates.length) return null;
  const groupKey = tcsGroupForAge(age)[0];
  const walkLimitMinutes = routeCalibrationWalkLimit({ age, tcsGroupKey: groupKey });
  const exactNetworkProfiles = travelMode === "walk"
    ? islandSchoolNetworkProfiles(stage, homeNodeId, originPoint, walkingSpeedMpm, homeSnapMeters)
    : [];
  const profiles = (exactNetworkProfiles.length
    ? exactNetworkProfiles
    : candidates.map((school) =>
        islandSchoolTravelProxy(school, originPoint, walkingSpeedMpm, homeSnapMeters)))
    .sort((left, right) => left.travelMinutes - right.travelMinutes || left.school.id.localeCompare(right.school.id));
  const configuredLimit = ROUTE_CALIBRATION.schoolChoice?.candidateLimit || 24;
  const walkProfiles = profiles.filter((profile) => profile.travelMinutes <= walkLimitMinutes);
  const mechanisedProfiles = profiles.filter((profile) => profile.directMeters <= 12000);
  const eligibleProfiles = travelMode === "walk"
    ? (walkProfiles.length ? walkProfiles : profiles.slice(0, configuredLimit))
    : (mechanisedProfiles.length ? mechanisedProfiles : profiles).slice(0, configuredLimit * 3);
  const walkRangeFallback = travelMode === "walk" && walkProfiles.length === 0;
  const stageCount = assignmentContext?.stageCounts.get(stage) || 1;
  const capacityTotal = assignmentContext?.capacityTotals.get(stage) || 1;
  const decayMinutes = ROUTE_CALIBRATION.schoolChoice?.networkTimeDecayMinutesByTcsGroup?.[groupKey] || 9;
  const selected = weightedChoice(eligibleProfiles, (profile) => {
    const { school, travelMinutes, directMeters } = profile;
    const distanceUtility = travelMode === "walk"
      ? Math.exp(-travelMinutes / decayMinutes)
      : Math.exp(-directMeters / 3600);
    const sameDcca = school.dccaId === homeZone?.id
      ? ROUTE_CALIBRATION.schoolChoice?.sameDccaPull || 1.28
      : 1;
    const sameDistrict = school.zone?.parentDistrictId === homeZone?.parentDistrictId
      ? ROUTE_CALIBRATION.schoolChoice?.sameDistrictPull || 1.12
      : 1;
    const connectorQuality = Math.exp(
      -Math.max(0, Number(school.islandSnapMeters) || 0) /
        Math.max(1, ROUTE_CALIBRATION.schoolChoice?.connectorDecayMeters || 90),
    );
    const targetLoad = Math.max(1, stageCount * school.capacityPrior / capacityTotal);
    const assigned = assignmentContext?.loads.get(school.campusId) || 0;
    const loadRatio = assigned / targetLoad;
    const loadBalance = 1 / (
      1 +
      Math.pow(
        Math.max(0, loadRatio - (ROUTE_CALIBRATION.schoolChoice?.loadBalanceStartRatio || 0.78)),
        2,
      ) * (ROUTE_CALIBRATION.schoolChoice?.loadBalanceStrength || 3.2)
    );
    const capacityPull = 0.75 + Math.sqrt(Math.max(1, school.capacityPrior || 1)) / 36;
    return distanceUtility * sameDcca * sameDistrict * connectorQuality * loadBalance * capacityPull;
  });
  if (!selected) return null;
  if (assignmentContext) {
    assignmentContext.loads.set(
      selected.school.campusId,
      (assignmentContext.loads.get(selected.school.campusId) || 0) + 1,
    );
  }
  return {
    ...selected,
    selectionMode: selected.networkAccessSource || "aggregate-constrained-destination-choice",
    networkAccessMatched: Boolean(selected.networkAccessSource),
    schoolAccessK: islandSchoolAccessBundle?.kNearest || 0,
    tcsGroupKey: groupKey,
    maxWalkMinutes: walkLimitMinutes,
    walkRangeFallback,
    candidateCount: eligibleProfiles.length,
    capacitySource: selected.school.capacitySource,
  };
}

function chooseKowloonSchool(
  age,
  originPoint,
  walkingSpeedMpm,
  travelMode,
  homeZone,
  homeSnapMeters,
  homeNodeId,
  assignmentContext = null,
) {
  const stage = schoolStageForAge(age);
  const routableCampuses = v12_9KowloonRoutingGraph?.directedCoreMask
    ? kowloonSchoolCampuses.filter((school) => v12_9KowloonRoutingGraph.isDirectedCoreNode(school.kowloonNodeId))
    : kowloonSchoolCampuses;
  const stageCandidates = routableCampuses.filter(
    (school) => school.stage === stage || (stage === "secondary" && school.stage === "special"),
  );
  const candidates = stageCandidates.length ? stageCandidates : routableCampuses;
  if (!candidates.length) return null;
  const groupKey = tcsGroupForAge(age)[0];
  const walkLimitMinutes = routeCalibrationWalkLimit({ age, tcsGroupKey: groupKey });
  const exactNetworkProfiles = travelMode === "walk"
    ? kowloonSchoolNetworkProfiles(stage, homeNodeId, originPoint, walkingSpeedMpm, homeSnapMeters)
    : [];
  const profiles = (exactNetworkProfiles.length
    ? exactNetworkProfiles
    : candidates.map((school) =>
        kowloonSchoolTravelProxy(school, originPoint, walkingSpeedMpm, homeSnapMeters)))
    .sort((left, right) => left.travelMinutes - right.travelMinutes || left.school.id.localeCompare(right.school.id));
  const candidateLimit = Math.min(12, ROUTE_CALIBRATION.schoolChoice?.candidateLimit || 24);
  const walkProfiles = profiles.filter((profile) => profile.travelMinutes <= walkLimitMinutes);
  const mechanisedProfiles = profiles.filter((profile) => profile.directMeters <= 12000);
  const eligibleProfiles = travelMode === "walk"
    ? (walkProfiles.length ? walkProfiles : profiles.slice(0, candidateLimit)).slice(0, candidateLimit)
    : (mechanisedProfiles.length ? mechanisedProfiles : profiles).slice(0, candidateLimit * 2);
  const walkRangeFallback = travelMode === "walk" && walkProfiles.length === 0;
  const stageCount = assignmentContext?.stageCounts.get(stage) || 1;
  const capacityTotal = assignmentContext?.capacityTotals.get(stage) || 1;
  const decayMinutes = ROUTE_CALIBRATION.schoolChoice?.networkTimeDecayMinutesByTcsGroup?.[groupKey] || 9;
  const selected = weightedChoice(eligibleProfiles, (profile) => {
    const { school, travelMinutes, directMeters } = profile;
    const distanceUtility = travelMode === "walk"
      ? Math.exp(-travelMinutes / decayMinutes)
      : Math.exp(-directMeters / 3600);
    const sameDcca = school.dccaId === homeZone?.id
      ? ROUTE_CALIBRATION.schoolChoice?.sameDccaPull || 1.28
      : 1;
    const sameDistrict = school.zone?.parentDistrictId === homeZone?.parentDistrictId
      ? ROUTE_CALIBRATION.schoolChoice?.sameDistrictPull || 1.12
      : 1;
    const connectorQuality = Math.exp(
      -Math.max(0, Number(school.kowloonSnapMeters) || 0) /
        Math.max(1, ROUTE_CALIBRATION.schoolChoice?.connectorDecayMeters || 90),
    );
    const targetLoad = Math.max(1, stageCount * school.capacityPrior / capacityTotal);
    const assigned = assignmentContext?.loads.get(school.campusId) || 0;
    const loadRatio = assigned / targetLoad;
    const loadBalance = 1 / (
      1 +
      Math.pow(
        Math.max(0, loadRatio - (ROUTE_CALIBRATION.schoolChoice?.loadBalanceStartRatio || 0.78)),
        2,
      ) * (ROUTE_CALIBRATION.schoolChoice?.loadBalanceStrength || 3.2)
    );
    const capacityPull = 0.75 + Math.sqrt(Math.max(1, school.capacityPrior || 1)) / 36;
    return distanceUtility * sameDcca * sameDistrict * connectorQuality * loadBalance * capacityPull;
  });
  if (!selected) return null;
  if (assignmentContext) {
    assignmentContext.loads.set(
      selected.school.campusId,
      (assignmentContext.loads.get(selected.school.campusId) || 0) + 1,
    );
  }
  return {
    ...selected,
    selectionMode: selected.networkAccessSource || "census-weighted-direct-access-prior-fallback",
    networkAccessMatched: Boolean(selected.networkAccessSource),
    schoolAccessK: kowloonAccessBundle?.school?.kNearest || 0,
    tcsGroupKey: groupKey,
    maxWalkMinutes: walkLimitMinutes,
    walkRangeFallback,
    candidateCount: eligibleProfiles.length,
    capacitySource: selected.school.capacitySource,
    evidenceBoundary: selected.networkAccessSource
      ? "Walking-school candidates use directed 3DPN generalized cost; each realised OD is independently recomputed by exact runtime A*."
      : "Mechanised travel or missing access-table rows retain a direct-distance destination prior; no mechanised geometry is claimed.",
  };
}

function chooseNtEastSchool(
  age,
  originPoint,
  walkingSpeedMpm,
  travelMode,
  homeZone,
  homeSnapMeters,
  homeNodeId,
  assignmentContext = null,
) {
  const stage = schoolStageForAge(age);
  const routableCampuses = v12_10NtEastRoutingGraph?.directedCoreMask
    ? ntEastSchoolCampuses.filter((school) => v12_10NtEastRoutingGraph.isDirectedCoreNode(school.ntEastNodeId))
    : ntEastSchoolCampuses;
  const stageCandidates = routableCampuses.filter(
    (school) => school.stage === stage || (stage === "secondary" && school.stage === "special"),
  );
  const candidates = stageCandidates.length ? stageCandidates : routableCampuses;
  if (!candidates.length) return null;
  const groupKey = tcsGroupForAge(age)[0];
  const walkLimitMinutes = routeCalibrationWalkLimit({ age, tcsGroupKey: groupKey });
  const exactNetworkProfiles = travelMode === "walk"
    ? ntEastSchoolNetworkProfiles(stage, homeNodeId, originPoint, walkingSpeedMpm, homeSnapMeters)
    : [];
  const profiles = (exactNetworkProfiles.length
    ? exactNetworkProfiles
    : candidates.map((school) =>
        ntEastSchoolTravelProxy(school, originPoint, walkingSpeedMpm, homeSnapMeters)))
    .sort((left, right) => left.travelMinutes - right.travelMinutes || left.school.id.localeCompare(right.school.id));
  const candidateLimit = Math.min(12, ROUTE_CALIBRATION.schoolChoice?.candidateLimit || 24);
  const walkProfiles = profiles.filter((profile) => profile.travelMinutes <= walkLimitMinutes);
  const mechanisedProfiles = profiles.filter((profile) => profile.directMeters <= 18000);
  const eligibleProfiles = travelMode === "walk"
    ? (walkProfiles.length ? walkProfiles : profiles.slice(0, candidateLimit)).slice(0, candidateLimit)
    : (mechanisedProfiles.length ? mechanisedProfiles : profiles).slice(0, candidateLimit * 2);
  const walkRangeFallback = travelMode === "walk" && walkProfiles.length === 0;
  const stageCount = assignmentContext?.stageCounts.get(stage) || 1;
  const capacityTotal = assignmentContext?.capacityTotals.get(stage) || 1;
  const decayMinutes = ROUTE_CALIBRATION.schoolChoice?.networkTimeDecayMinutesByTcsGroup?.[groupKey] || 9;
  const selected = weightedChoice(eligibleProfiles, (profile) => {
    const { school, travelMinutes, directMeters } = profile;
    const distanceUtility = travelMode === "walk"
      ? Math.exp(-travelMinutes / decayMinutes)
      : Math.exp(-directMeters / 5200);
    const sameDcca = school.dccaId === homeZone?.id
      ? ROUTE_CALIBRATION.schoolChoice?.sameDccaPull || 1.28
      : 1;
    const sameDistrict = school.zone?.parentDistrictId === homeZone?.parentDistrictId
      ? ROUTE_CALIBRATION.schoolChoice?.sameDistrictPull || 1.12
      : 1;
    const connectorQuality = Math.exp(
      -Math.max(0, Number(school.ntEastSnapMeters) || 0) /
        Math.max(1, ROUTE_CALIBRATION.schoolChoice?.connectorDecayMeters || 90),
    );
    const targetLoad = Math.max(1, stageCount * school.capacityPrior / capacityTotal);
    const assigned = assignmentContext?.loads.get(school.campusId) || 0;
    const loadRatio = assigned / targetLoad;
    const loadBalance = 1 / (
      1 +
      Math.pow(
        Math.max(0, loadRatio - (ROUTE_CALIBRATION.schoolChoice?.loadBalanceStartRatio || 0.78)),
        2,
      ) * (ROUTE_CALIBRATION.schoolChoice?.loadBalanceStrength || 3.2)
    );
    const capacityPull = 0.75 + Math.sqrt(Math.max(1, school.capacityPrior || 1)) / 36;
    return distanceUtility * sameDcca * sameDistrict * connectorQuality * loadBalance * capacityPull;
  });
  if (!selected) return null;
  if (assignmentContext) {
    assignmentContext.loads.set(
      selected.school.campusId,
      (assignmentContext.loads.get(selected.school.campusId) || 0) + 1,
    );
  }
  return {
    ...selected,
    selectionMode: selected.networkAccessSource || "census-weighted-direct-access-prior-fallback",
    networkAccessMatched: Boolean(selected.networkAccessSource),
    schoolAccessK: ntEastAccessBundle?.school?.kNearest || 0,
    tcsGroupKey: groupKey,
    maxWalkMinutes: walkLimitMinutes,
    walkRangeFallback,
    candidateCount: eligibleProfiles.length,
    capacitySource: selected.school.capacitySource,
    evidenceBoundary: selected.networkAccessSource
      ? "Walking-school candidates use directed NT East 3DPN generalized cost; each realised OD is independently recomputed by exact runtime A*."
      : "Mechanised travel or missing access-table rows retain a direct-distance destination prior; no mechanised geometry is claimed.",
  };
}

function activeV12_11RoutingContext() {
  if (isNtWestScope()) {
    return {
      key: "nt-west",
      label: "New Territories West",
      graph: v12_11NtWestRoutingGraph,
      accessBundle: ntWestAccessBundle,
      schoolAccessByHomeNode: ntWestSchoolAccessByHomeNode,
      schoolCampuses: ntWestSchoolCampuses,
      schoolCampusById: ntWestSchoolCampusById,
      poiOutboundByNode: ntWestPoiOutboundByNode,
      poiReturnByHomeNode: ntWestPoiReturnByHomeNode,
      poiByAccessIndex: ntWestPoiByAccessIndex,
      nodeField: "ntWestNodeId",
      snapField: "ntWestSnapMeters",
      componentField: "ntWestComponentId",
      mechanisedDistanceMeters: 18000,
    };
  }
  if (isOutlyingIslandsScope()) {
    return {
      key: "islands",
      label: "Outlying Islands",
      graph: v12_11IslandsRoutingGraph,
      accessBundle: islandsAccessBundle,
      schoolAccessByHomeNode: islandsSchoolAccessByHomeNode,
      schoolCampuses: islandsSchoolCampuses,
      schoolCampusById: islandsSchoolCampusById,
      poiOutboundByNode: islandsPoiOutboundByNode,
      poiReturnByHomeNode: islandsPoiReturnByHomeNode,
      poiByAccessIndex: islandsPoiByAccessIndex,
      nodeField: "islandsNodeId",
      snapField: "islandsSnapMeters",
      componentField: "islandsComponentId",
      mechanisedDistanceMeters: 22000,
    };
  }
  return null;
}

function v12_11SchoolTravelProxy(context, school, originPoint, walkingSpeedMpm, homeSnapMeters = 0) {
  const directMeters = planarDistanceMeters(originPoint, school);
  const connectorMeters =
    Math.max(0, Number(homeSnapMeters) || 0) +
    Math.max(0, Number(school[context.snapField]) || 0);
  const routeMeters = directMeters * (ROUTE_CALIBRATION.schoolChoice?.directCircuityPrior || 1.28) + connectorMeters;
  return {
    school,
    directMeters,
    connectorMeters,
    routeMeters,
    generalizedMeters: routeMeters,
    travelMinutes: routeMeters / Math.max(35, walkingSpeedMpm || 70),
  };
}

function v12_11SchoolNetworkProfiles(context, stage, homeNodeId, originPoint, walkingSpeedMpm, homeSnapMeters = 0) {
  if (!Number.isInteger(homeNodeId)) return [];
  const access = context.schoolAccessByHomeNode.get(homeNodeId);
  if (!access) return [];
  const entries = stage === "primary" ? access.primary : access.secondary;
  return (entries || []).flatMap(([campusId, generalizedMeters, pathMeters]) => {
    const school = context.schoolCampusById.get(campusId);
    if (!school) return [];
    const connectorMeters =
      Math.max(0, Number(homeSnapMeters) || 0) +
      Math.max(0, Number(school[context.snapField]) || 0);
    const totalGeneralizedMeters = Math.max(0, Number(generalizedMeters) || 0) + connectorMeters;
    return [{
      school,
      directMeters: planarDistanceMeters(originPoint, school),
      connectorMeters,
      routeMeters: Math.max(0, Number(pathMeters) || 0) + connectorMeters,
      generalizedMeters: totalGeneralizedMeters,
      travelMinutes: totalGeneralizedMeters / Math.max(35, walkingSpeedMpm || 70),
      networkAccessSource: `precomputed-directed-${context.key}-3dpn-k-nearest`,
    }];
  });
}

function chooseV12_11School(
  age,
  originPoint,
  walkingSpeedMpm,
  travelMode,
  homeZone,
  homeSnapMeters,
  homeNodeId,
  assignmentContext = null,
) {
  const context = activeV12_11RoutingContext();
  if (!context) return null;
  const stage = schoolStageForAge(age);
  const stageCandidates = context.schoolCampuses.filter(
    (school) => school.stage === stage || (stage === "secondary" && school.stage === "special"),
  );
  const candidates = stageCandidates.length ? stageCandidates : context.schoolCampuses;
  if (!candidates.length) return null;
  const groupKey = tcsGroupForAge(age)[0];
  const walkLimitMinutes = routeCalibrationWalkLimit({ age, tcsGroupKey: groupKey });
  const exactNetworkProfiles = travelMode === "walk"
    ? v12_11SchoolNetworkProfiles(context, stage, homeNodeId, originPoint, walkingSpeedMpm, homeSnapMeters)
    : [];
  if (travelMode === "walk" && !exactNetworkProfiles.length) return null;
  const profiles = (exactNetworkProfiles.length
    ? exactNetworkProfiles
    : candidates.map((school) =>
        v12_11SchoolTravelProxy(context, school, originPoint, walkingSpeedMpm, homeSnapMeters)))
    .sort((left, right) => left.travelMinutes - right.travelMinutes || left.school.id.localeCompare(right.school.id));
  const candidateLimit = Math.min(12, ROUTE_CALIBRATION.schoolChoice?.candidateLimit || 24);
  const walkProfiles = profiles.filter((profile) => profile.travelMinutes <= walkLimitMinutes);
  const mechanisedProfiles = profiles.filter((profile) => profile.directMeters <= context.mechanisedDistanceMeters);
  const eligibleProfiles = travelMode === "walk"
    ? (walkProfiles.length ? walkProfiles : profiles.slice(0, candidateLimit)).slice(0, candidateLimit)
    : (mechanisedProfiles.length ? mechanisedProfiles : profiles).slice(0, candidateLimit * 2);
  const walkRangeFallback = travelMode === "walk" && walkProfiles.length === 0;
  const stageCount = assignmentContext?.stageCounts.get(stage) || 1;
  const capacityTotal = assignmentContext?.capacityTotals.get(stage) || 1;
  const decayMinutes = ROUTE_CALIBRATION.schoolChoice?.networkTimeDecayMinutesByTcsGroup?.[groupKey] || 9;
  const selected = weightedChoice(eligibleProfiles, (profile) => {
    const { school, travelMinutes, directMeters } = profile;
    const distanceUtility = travelMode === "walk"
      ? Math.exp(-travelMinutes / decayMinutes)
      : Math.exp(-directMeters / Math.max(1, context.mechanisedDistanceMeters * 0.3));
    const sameDcca = school.dccaId === homeZone?.id
      ? ROUTE_CALIBRATION.schoolChoice?.sameDccaPull || 1.28
      : 1;
    const sameDistrict = school.zone?.parentDistrictId === homeZone?.parentDistrictId
      ? ROUTE_CALIBRATION.schoolChoice?.sameDistrictPull || 1.12
      : 1;
    const connectorQuality = Math.exp(
      -Math.max(0, Number(school[context.snapField]) || 0) /
        Math.max(1, ROUTE_CALIBRATION.schoolChoice?.connectorDecayMeters || 90),
    );
    const targetLoad = Math.max(1, stageCount * school.capacityPrior / capacityTotal);
    const assigned = assignmentContext?.loads.get(school.campusId) || 0;
    const loadRatio = assigned / targetLoad;
    const loadBalance = 1 / (
      1 +
      Math.pow(
        Math.max(0, loadRatio - (ROUTE_CALIBRATION.schoolChoice?.loadBalanceStartRatio || 0.78)),
        2,
      ) * (ROUTE_CALIBRATION.schoolChoice?.loadBalanceStrength || 3.2)
    );
    const capacityPull = 0.75 + Math.sqrt(Math.max(1, school.capacityPrior || 1)) / 36;
    return distanceUtility * sameDcca * sameDistrict * connectorQuality * loadBalance * capacityPull;
  });
  if (!selected) return null;
  if (assignmentContext) {
    assignmentContext.loads.set(
      selected.school.campusId,
      (assignmentContext.loads.get(selected.school.campusId) || 0) + 1,
    );
  }
  return {
    ...selected,
    selectionMode: selected.networkAccessSource || "tcs-temporal-direct-distance-prior",
    networkAccessMatched: Boolean(selected.networkAccessSource),
    schoolAccessK: context.accessBundle?.school?.kNearest || 0,
    tcsGroupKey: groupKey,
    maxWalkMinutes: walkLimitMinutes,
    walkRangeFallback,
    candidateCount: eligibleProfiles.length,
    capacitySource: selected.school.capacitySource,
    evidenceBoundary: selected.networkAccessSource
      ? `Walking-school candidates share a ${context.label} 3DPN component; each realised OD is recomputed by exact directed A*.`
      : "Mechanised destination choice is a temporal/direct-distance prior; no cross-region or cross-water geometry is claimed.",
  };
}

function chooseSchool(homeZone, age, originPoint = homeZone) {
  if (isPilotScope()) return choosePilotSchool(age, originPoint, null, walkingSpeedForAge(age))?.school || null;
  if (!realSchoolLayer.length) return null;
  const stage = schoolStageForAge(age);
  const stageCandidates = [
    ...(schoolsByStage[stage] || []),
    ...(stage === "secondary" ? schoolsByStage.special : []),
  ].filter(
    (school) =>
      !isRegionalScope() ||
      (simulationZones().some((area) => area.id === school.dccaId) && Number.isInteger(regionalPlaceNodeId(school))),
  );
  const maxDistance = isRegionalScope()
    ? age < 9 ? 9 : age < 13 ? 14 : 22
    : age < 9 ? 42 : age < 13 ? 62 : 90;
  const candidates = stageCandidates.filter(
    (school) => school.zone && accessAdjustedDistance(originPoint, school, { school }) <= maxDistance,
  );
  const fallback = candidates.length ? candidates : stageCandidates.length ? stageCandidates : activeSchoolLocations();
  return weightedChoice(fallback, (school) => {
    const dist = Math.max(0.35, accessAdjustedDistance(originPoint, school, { school }));
    const zone = school.zone || homeZone;
    const districtPull = zone.id === homeZone.id
      ? 1.55
      : zone.parentDistrictId && zone.parentDistrictId === homeZone.parentDistrictId
        ? 1.18
        : 1;
    const schoolService = 0.45 + (zone.schools || 0.5) * 0.65;
    const transit = 0.5 + mobilityAccessFor(zone) * 0.34 + mobilityAccessFor(school) * 0.16;
    return districtPull * schoolService * transit * (1 / Math.pow(dist, age < 9 ? 1.42 : 1.02));
  });
}

function chooseSchoolZone(homeZone, age) {
  if (isPilotScope()) return pilotArea;
  const school = chooseSchool(homeZone, age);
  if (school?.zone) return school.zone;
  const domainZones = simulationZones();
  const maxDistance = isRegionalScope()
    ? age < 9 ? 9 : age < 13 ? 14 : 22
    : age < 9 ? 42 : age < 13 ? 62 : 90;
  const candidates = domainZones.filter((zone) => accessAdjustedDistance(homeZone, zone) <= maxDistance);
  return weightedChoice(candidates.length ? candidates : domainZones, (zone) => {
    const dist = Math.max(1, accessAdjustedDistance(homeZone, zone));
    return zone.schools * mobilityAccessFor(zone) * (1 / Math.pow(dist, age < 9 ? 1.55 : 1.05));
  });
}

function interactionCellCoordinates(point) {
  return {
    x: Math.floor(point.x / INTERACTION_CELL_SIZE),
    y: Math.floor(point.y / INTERACTION_CELL_SIZE),
    z: Math.floor(point.z / INTERACTION_HEIGHT_SIZE),
  };
}

function interactionCellKey(x, y, z, scope = null) {
  return `${world.scope === WHOLE_HK_SCOPE_ID ? `${scope}:` : ""}${x},${y},${z}`;
}

function buildInteractionField() {
  const cells = new Map();
  const zoneOccupancy = new Map();
  const poiOccupancy = new Map();

  for (const agent of world.agents) {
    const zoneId = agent.target?.zone?.id;
    if (zoneId) zoneOccupancy.set(zoneId, (zoneOccupancy.get(zoneId) || 0) + 1);
    const poiId = agent.target?.poi?.id;
    if (poiId && ["outdoor", "activity"].includes(agent.state)) {
      poiOccupancy.set(poiId, (poiOccupancy.get(poiId) || 0) + 1);
    }
    if (!["school", "outdoor", "activity"].includes(agent.state)) continue;

    const cell = interactionCellCoordinates(agent.pos);
    const key = interactionCellKey(cell.x, cell.y, cell.z, agent.scope);
    const entry = cells.get(key) || { count: 0, x: 0, y: 0, z: 0 };
    entry.count += 1;
    entry.x += agent.pos.x;
    entry.y += agent.pos.y;
    entry.z += agent.pos.z;
    cells.set(key, entry);
  }

  world.interactionField = { cells, zoneOccupancy, poiOccupancy };
}

function zoneCrowding(zone) {
  const occupancy = world.interactionField?.zoneOccupancy?.get(zone.id) || 0;
  if (isPilotScope() && zone.id === pilotArea.id) {
    return occupancy / Math.max(10, world.population * 0.32);
  }
  const domainZones = simulationZones();
  const totalWeight = domainZones.reduce((sum, item) => sum + Math.max(0.05, item.childWeight || 0.5), 0);
  const expected = Math.max(10, modelCohortPopulation() * (Math.max(0.05, zone.childWeight || 0.5) / totalWeight) * 0.32);
  return occupancy / expected;
}

function chooseActivityZone(homeZone, agent, state = "activity") {
  if (isPilotScope()) return pilotArea;
  const domainZones = simulationZones();
  const radius = isRegionalScope() ? agent.mobilityRadius * 0.24 : agent.mobilityRadius;
  const candidates = domainZones.filter((zone) => accessAdjustedDistance(homeZone, zone) <= radius);
  const scenario = SCENARIOS[world.scenario];
  return weightedChoice(candidates.length ? candidates : domainZones, (zone) => {
    const dist = Math.max(1, accessAdjustedDistance(homeZone, zone));
    const heightFactor = clamp((zone.heightMeters || zone.height * verticalUnitMeters) / 180, 0, 1);
    const poiService =
      state === "outdoor"
        ? zone.playAccess || zone.parks || 0.35
        : (zone.poiActivityAccess || 0.35) * 0.45 +
          (zone.sportsAccess || 0.35) * 0.3 +
          (zone.studyAccess || 0.3) * 0.25;
    const environment =
      poiService * (state === "outdoor" ? 0.42 * world.rules.parkAttraction : 0.42) +
      (zone.activityService || 0.4) * 0.18 +
      mobilityAccessFor(zone) * 0.23 +
      zone.density * 0.08 +
      zone.schools * 0.025 +
      heightFactor * scenario.heat * 0.045;
    const heatPenalty =
      scenario.heat * world.rules.heatAvoidance * (1 - zone.parks * 0.65) * 0.22;
    const crowdPenalty = zoneCrowding(zone) * world.rules.destinationCrowdPenalty * 0.38;
    return Math.max(0.015, (environment - heatPenalty - crowdPenalty + 0.12) / Math.sqrt(dist));
  });
}

function poiCrowding(poi) {
  if (!poi) return 0;
  const occupancy = world.interactionField?.poiOccupancy?.get(poi.id) || 0;
  return occupancy / Math.max(12, poi.capacity || 60);
}

function poiGroupPreferences(agent, state) {
  const preferences = MODEL_PARAMETERS.poiChoice.preferenceWeights || {};
  if (state === "outdoor") {
    return agent.age < 10
      ? preferences.outdoorYoung || { play: 1.45, sport: 0.5, study: 0, community: 0.08, health: 0 }
      : preferences.outdoorOlder || { play: 0.95, sport: 1.2, study: 0, community: 0.08, health: 0 };
  }
  return agent.age > 10
    ? preferences.activityOlder || { play: 0.18, sport: 1.12, study: 1.32, community: 1, health: 0 }
    : preferences.activityYoung || { play: 0.18, sport: 0.55, study: 0.72, community: 1, health: 0 };
}

function islandPoiNetworkProfiles(agent, state, preferences, excludedId = null) {
  const initialAfterSchoolChoice = state === "activity" && agent.state !== "activity";
  const outboundNodeId = initialAfterSchoolChoice
    ? agent.schoolPoint?.islandNodeId
    : agent.currentNetworkNodeId ?? agent.homeNodeId;
  const homeNodeId = agent.homeNodeId;
  if (!Number.isInteger(outboundNodeId) || !Number.isInteger(homeNodeId)) return [];
  const outboundGroups = islandPoiOutboundByNode.get(outboundNodeId);
  const returnGroups = islandPoiReturnByHomeNode.get(homeNodeId);
  if (!outboundGroups || !returnGroups) return [];
  const originSnapMeters = initialAfterSchoolChoice
    ? Math.max(0, Number(agent.schoolPoint?.islandSnapMeters) || 0)
    : 0;
  const homeSnapMeters = Math.max(0, Number(agent.homeSnapMeters) || 0);
  const profiles = [];
  (islandPoiAccessBundle?.groups || []).forEach((group, groupIndex) => {
    if ((preferences[group] || 0) <= 0) return;
    const returning = new Map(
      (returnGroups[groupIndex] || []).map((entry) => [entry[0], entry]),
    );
    (outboundGroups[groupIndex] || []).forEach((outbound) => {
      const poiIndex = outbound[0];
      const returningEntry = returning.get(poiIndex);
      const poi = islandPoiByAccessIndex[poiIndex];
      if (!poi || poi.id === excludedId) return;
      const poiSnapMeters = Math.max(0, Number(poi.islandSnapMeters) || 0);
      const outboundGeneralizedMeters = outbound[1] + originSnapMeters + poiSnapMeters;
      const bidirectionalNetworkMatched = Boolean(returningEntry);
      const returnGeneralizedMeters = bidirectionalNetworkMatched
        ? returningEntry[1] + poiSnapMeters + homeSnapMeters
        : planarDistanceMeters(agent.homePoint || agent.homeZone, poi) *
            (ROUTE_CALIBRATION.schoolChoice?.directCircuityPrior || 1.28) +
          poiSnapMeters + homeSnapMeters;
      profiles.push({
        poi,
        outboundGeneralizedMeters,
        returnGeneralizedMeters,
        outboundPathMeters: outbound[2] + originSnapMeters + poiSnapMeters,
        returnPathMeters: bidirectionalNetworkMatched
          ? returningEntry[2] + poiSnapMeters + homeSnapMeters
          : returnGeneralizedMeters,
        chainDistanceMeters: outboundGeneralizedMeters * 0.6 + returnGeneralizedMeters * 0.4,
        networkAccessSource: bidirectionalNetworkMatched
          ? "directed-3dpn-school-poi-home-chain"
          : "directed-3dpn-outbound-return-proxy",
        bidirectionalNetworkMatched,
      });
    });
  });
  const bidirectional = profiles.filter((profile) => profile.bidirectionalNetworkMatched);
  return (bidirectional.length ? bidirectional : profiles).sort(
    (left, right) =>
      left.chainDistanceMeters - right.chainDistanceMeters || left.poi.id.localeCompare(right.poi.id),
  );
}

function kowloonPoiNetworkProfiles(agent, state, preferences, excludedId = null) {
  const initialAfterSchoolChoice = state === "activity" && agent.state !== "activity";
  const outboundNodeId = initialAfterSchoolChoice
    ? agent.schoolPoint?.kowloonNodeId
    : agent.currentNetworkNodeId ?? agent.homeNodeId;
  const homeNodeId = agent.homeNodeId;
  if (!Number.isInteger(outboundNodeId) || !Number.isInteger(homeNodeId)) return [];
  const outboundGroups = kowloonPoiOutboundByNode.get(outboundNodeId);
  const returnGroups = kowloonPoiReturnByHomeNode.get(homeNodeId);
  if (!outboundGroups || !returnGroups) return [];
  const originSnapMeters = initialAfterSchoolChoice
    ? Math.max(0, Number(agent.schoolPoint?.kowloonSnapMeters) || 0)
    : 0;
  const homeSnapMeters = Math.max(0, Number(agent.homeSnapMeters) || 0);
  const profiles = [];
  (kowloonAccessBundle?.poi?.groups || []).forEach((group, groupIndex) => {
    if ((preferences[group] || 0) <= 0) return;
    const returning = new Map(
      (returnGroups[groupIndex] || []).map((entry) => [entry[0], entry]),
    );
    (outboundGroups[groupIndex] || []).forEach((outbound) => {
      const poiIndex = outbound[0];
      const returningEntry = returning.get(poiIndex);
      const poi = kowloonPoiByAccessIndex[poiIndex];
      if (!poi || poi.id === excludedId) return;
      const poiSnapMeters = Math.max(0, Number(poi.kowloonSnapMeters) || 0);
      const outboundGeneralizedMeters = outbound[1] + originSnapMeters + poiSnapMeters;
      const bidirectionalNetworkMatched = Boolean(returningEntry);
      const returnGeneralizedMeters = bidirectionalNetworkMatched
        ? returningEntry[1] + poiSnapMeters + homeSnapMeters
        : planarDistanceMeters(agent.homePoint || agent.homeZone, poi) *
            (ROUTE_CALIBRATION.schoolChoice?.directCircuityPrior || 1.28) +
          poiSnapMeters + homeSnapMeters;
      profiles.push({
        poi,
        outboundGeneralizedMeters,
        returnGeneralizedMeters,
        outboundPathMeters: outbound[2] + originSnapMeters + poiSnapMeters,
        returnPathMeters: bidirectionalNetworkMatched
          ? returningEntry[2] + poiSnapMeters + homeSnapMeters
          : returnGeneralizedMeters,
        chainDistanceMeters: outboundGeneralizedMeters * 0.6 + returnGeneralizedMeters * 0.4,
        networkAccessSource: bidirectionalNetworkMatched
          ? "directed-kowloon-3dpn-school-poi-home-chain"
          : "directed-kowloon-3dpn-outbound-return-proxy",
        bidirectionalNetworkMatched,
      });
    });
  });
  const bidirectional = profiles.filter((profile) => profile.bidirectionalNetworkMatched);
  return (bidirectional.length ? bidirectional : profiles).sort(
    (left, right) =>
      left.chainDistanceMeters - right.chainDistanceMeters || left.poi.id.localeCompare(right.poi.id),
  );
}

function ntEastPoiNetworkProfiles(agent, state, preferences, excludedId = null) {
  const initialAfterSchoolChoice = state === "activity" && agent.state !== "activity";
  const outboundNodeId = initialAfterSchoolChoice
    ? agent.schoolPoint?.ntEastNodeId
    : agent.currentNetworkNodeId ?? agent.homeNodeId;
  const homeNodeId = agent.homeNodeId;
  if (!Number.isInteger(outboundNodeId) || !Number.isInteger(homeNodeId)) return [];
  const outboundGroups = ntEastPoiOutboundByNode.get(outboundNodeId);
  const returnGroups = ntEastPoiReturnByHomeNode.get(homeNodeId);
  if (!outboundGroups || !returnGroups) return [];
  const originSnapMeters = initialAfterSchoolChoice
    ? Math.max(0, Number(agent.schoolPoint?.ntEastSnapMeters) || 0)
    : 0;
  const homeSnapMeters = Math.max(0, Number(agent.homeSnapMeters) || 0);
  const profiles = [];
  (ntEastAccessBundle?.poi?.groups || []).forEach((group, groupIndex) => {
    if ((preferences[group] || 0) <= 0) return;
    const returning = new Map(
      (returnGroups[groupIndex] || []).map((entry) => [entry[0], entry]),
    );
    (outboundGroups[groupIndex] || []).forEach((outbound) => {
      const poiIndex = outbound[0];
      const returningEntry = returning.get(poiIndex);
      const poi = ntEastPoiByAccessIndex[poiIndex];
      if (!poi || poi.id === excludedId) return;
      const poiSnapMeters = Math.max(0, Number(poi.ntEastSnapMeters) || 0);
      const outboundGeneralizedMeters = outbound[1] + originSnapMeters + poiSnapMeters;
      const bidirectionalNetworkMatched = Boolean(returningEntry);
      const returnGeneralizedMeters = bidirectionalNetworkMatched
        ? returningEntry[1] + poiSnapMeters + homeSnapMeters
        : planarDistanceMeters(agent.homePoint || agent.homeZone, poi) *
            (ROUTE_CALIBRATION.schoolChoice?.directCircuityPrior || 1.28) +
          poiSnapMeters + homeSnapMeters;
      profiles.push({
        poi,
        outboundGeneralizedMeters,
        returnGeneralizedMeters,
        outboundPathMeters: outbound[2] + originSnapMeters + poiSnapMeters,
        returnPathMeters: bidirectionalNetworkMatched
          ? returningEntry[2] + poiSnapMeters + homeSnapMeters
          : returnGeneralizedMeters,
        chainDistanceMeters: outboundGeneralizedMeters * 0.6 + returnGeneralizedMeters * 0.4,
        networkAccessSource: bidirectionalNetworkMatched
          ? "directed-nt-east-3dpn-school-poi-home-chain"
          : "directed-nt-east-3dpn-outbound-return-proxy",
        bidirectionalNetworkMatched,
      });
    });
  });
  const bidirectional = profiles.filter((profile) => profile.bidirectionalNetworkMatched);
  return (bidirectional.length ? bidirectional : profiles).sort(
    (left, right) =>
      left.chainDistanceMeters - right.chainDistanceMeters || left.poi.id.localeCompare(right.poi.id),
  );
}

function v12_11PoiNetworkProfiles(context, agent, state, preferences, excludedId = null) {
  const initialAfterSchoolChoice = state === "activity" && agent.state !== "activity";
  const outboundNodeId = initialAfterSchoolChoice
    ? agent.schoolPoint?.[context.nodeField]
    : agent.currentNetworkNodeId ?? agent.homeNodeId;
  const homeNodeId = agent.homeNodeId;
  if (!Number.isInteger(outboundNodeId) || !Number.isInteger(homeNodeId)) return [];
  const outboundGroups = context.poiOutboundByNode.get(outboundNodeId);
  const returnGroups = context.poiReturnByHomeNode.get(homeNodeId);
  if (!outboundGroups || !returnGroups) return [];
  const originSnapMeters = initialAfterSchoolChoice
    ? Math.max(0, Number(agent.schoolPoint?.[context.snapField]) || 0)
    : 0;
  const homeSnapMeters = Math.max(0, Number(agent.homeSnapMeters) || 0);
  const profiles = [];
  (context.accessBundle?.poi?.groups || []).forEach((group, groupIndex) => {
    if ((preferences[group] || 0) <= 0) return;
    const returning = new Map((returnGroups[groupIndex] || []).map((entry) => [entry[0], entry]));
    (outboundGroups[groupIndex] || []).forEach((outbound) => {
      const poiIndex = outbound[0];
      const returningEntry = returning.get(poiIndex);
      const poi = context.poiByAccessIndex[poiIndex];
      if (!poi || poi.id === excludedId) return;
      const poiSnapMeters = Math.max(0, Number(poi[context.snapField]) || 0);
      const outboundGeneralizedMeters = outbound[1] + originSnapMeters + poiSnapMeters;
      const bidirectionalNetworkMatched = Boolean(returningEntry);
      const returnGeneralizedMeters = bidirectionalNetworkMatched
        ? returningEntry[1] + poiSnapMeters + homeSnapMeters
        : planarDistanceMeters(agent.homePoint || agent.homeZone, poi) *
            (ROUTE_CALIBRATION.schoolChoice?.directCircuityPrior || 1.28) +
          poiSnapMeters + homeSnapMeters;
      profiles.push({
        poi,
        outboundGeneralizedMeters,
        returnGeneralizedMeters,
        outboundPathMeters: outbound[2] + originSnapMeters + poiSnapMeters,
        returnPathMeters: bidirectionalNetworkMatched
          ? returningEntry[2] + poiSnapMeters + homeSnapMeters
          : returnGeneralizedMeters,
        chainDistanceMeters: outboundGeneralizedMeters * 0.6 + returnGeneralizedMeters * 0.4,
        networkAccessSource: bidirectionalNetworkMatched
          ? `directed-${context.key}-3dpn-school-poi-home-chain`
          : `directed-${context.key}-3dpn-outbound-return-proxy`,
        bidirectionalNetworkMatched,
      });
    });
  });
  const bidirectional = profiles.filter((profile) => profile.bidirectionalNetworkMatched);
  return (bidirectional.length ? bidirectional : profiles).sort(
    (left, right) =>
      left.chainDistanceMeters - right.chainDistanceMeters || left.poi.id.localeCompare(right.poi.id),
  );
}

function chooseActivityPoi(agent, state = "activity", zone = agent.activityZone, excludedId = null) {
  if (isPilotScope()) {
    const preferences = poiGroupPreferences(agent, state);
    let candidates = pilotPoiLayer.filter(
      (poi) => (preferences[poi.group] || 0) > 0 && poi.id !== excludedId,
    );
    if (!candidates.length) candidates = pilotPoiLayer.filter((poi) => poi.group !== "health");
    return weightedChoice(candidates, (poi) => {
      const distanceMeters = Math.max(30, distance2D(agent.homePoint || agent.homeZone, poi) * appUnitMeters);
      const localPull = poi.dccaId === activePilot.dccaId ? 1.38 : 0.92;
      const capacityPull = 0.7 + Math.sqrt(Math.max(12, poi.capacity || 60)) / 18;
      const crowdPenalty = 1 + poiCrowding(poi) * world.rules.destinationCrowdPenalty * 5;
      return (
        (poi.weight || 1) *
        (preferences[poi.group] || 0.2) *
        localPull *
        capacityPull *
        (1 / Math.sqrt(distanceMeters)) *
        (1 / crowdPenalty)
      );
    });
  }
  if (isKowloonScope() || isNtEastScope() || isNtWestScope() || isOutlyingIslandsScope()) {
    const v12_11Context = activeV12_11RoutingContext();
    const ntEastMode = isNtEastScope();
    const nodeField = v12_11Context?.nodeField || (ntEastMode ? "ntEastNodeId" : "kowloonNodeId");
    const snapField = v12_11Context?.snapField || (ntEastMode ? "ntEastSnapMeters" : "kowloonSnapMeters");
    const regionalGraph = v12_11Context?.graph || (ntEastMode ? v12_10NtEastRoutingGraph : v12_9KowloonRoutingGraph);
    const regionalAccessBundle = v12_11Context?.accessBundle || (ntEastMode ? ntEastAccessBundle : kowloonAccessBundle);
    const preferences = poiGroupPreferences(agent, state);
    const outboundOrigin = state === "activity" && agent.schoolPoint
      ? agent.schoolPoint
      : agent.pos || agent.homePoint || agent.homeZone;
    const returnOrigin = agent.homePoint || agent.homeZone;
    const profileKey = `${state === "outdoor" ? "outdoor" : "activity"}${agent.age < 10 ? "Young" : "Older"}`;
    const maxDirectMeters = ROUTE_CALIBRATION.poiChoice?.maxDirectMeters?.[profileKey] || 2200;
    const decayMeters = ROUTE_CALIBRATION.poiChoice?.distanceDecayMeters?.[profileKey] || 900;
    const networkProfiles = v12_11Context
      ? v12_11PoiNetworkProfiles(v12_11Context, agent, state, preferences, excludedId)
      : ntEastMode
        ? ntEastPoiNetworkProfiles(agent, state, preferences, excludedId)
        : kowloonPoiNetworkProfiles(agent, state, preferences, excludedId);
    if (networkProfiles.length) {
      const maxNetworkMeters =
        maxDirectMeters * (ROUTE_CALIBRATION.poiChoice?.networkDetourFactor || 1.6);
      const withinNetworkRange = networkProfiles.filter(
        (profile) =>
          profile.outboundGeneralizedMeters <= maxNetworkMeters &&
          profile.returnGeneralizedMeters <= maxNetworkMeters,
      );
      const eligibleNetwork = withinNetworkRange.length ? withinNetworkRange : networkProfiles;
      const selectedNetwork = weightedChoice(eligibleNetwork, ({ poi, chainDistanceMeters }) => {
        const capacityPull = 0.65 + Math.sqrt(Math.max(12, poi.capacity || 60)) / 16;
        const crowdPenalty = 1 + poiCrowding(poi) * world.rules.destinationCrowdPenalty * 5;
        const localPull = poi.zone?.id === zone?.id ? 1.22 : 0.9;
        const connectorQuality = Math.exp(
          -Math.max(0, Number(poi[snapField]) || 0) /
            Math.max(1, ROUTE_CALIBRATION.poiChoice?.connectorDecayMeters || 100),
        );
        return (
          (poi.weight || 1) *
          (preferences[poi.group] || 0) *
          capacityPull *
          localPull *
          connectorQuality *
          Math.exp(-chainDistanceMeters / Math.max(1, decayMeters)) /
          crowdPenalty
        );
      });
      if (selectedNetwork) {
        agent.poiAssignmentCalibration = {
          selectionMode: selectedNetwork.networkAccessSource,
          networkAccessMatched: true,
          bidirectionalNetworkMatched: selectedNetwork.bidirectionalNetworkMatched,
          profileKey,
          maxNetworkMeters,
          outboundGeneralizedMeters: selectedNetwork.outboundGeneralizedMeters,
          returnGeneralizedMeters: selectedNetwork.returnGeneralizedMeters,
          chainDistanceMeters: selectedNetwork.chainDistanceMeters,
          rangeFallback: withinNetworkRange.length === 0,
          candidateCount: eligibleNetwork.length,
          accessK: regionalAccessBundle?.poi?.kNearest || 0,
        };
        return selectedNetwork.poi;
      }
    }
    let candidates = [];
    Object.entries(preferences).forEach(([group, preference]) => {
      if (preference > 0) candidates.push(...(poiByGroup.get(group) || []));
    });
    candidates = candidates.filter(
      (poi) =>
        Number.isInteger(poi[nodeField]) &&
        poi.id !== excludedId &&
        (!v12_11Context || (
          Number.isInteger(agent.homeNodeId) &&
          regionalGraph?.nodeComponent?.[poi[nodeField]] === regionalGraph?.nodeComponent?.[agent.homeNodeId] &&
          (!Number.isInteger(agent.currentNetworkNodeId) ||
            regionalGraph?.nodeComponent?.[poi[nodeField]] === regionalGraph?.nodeComponent?.[agent.currentNetworkNodeId])
        )) &&
        (!regionalGraph?.directedCoreMask ||
          regionalGraph.isDirectedCoreNode(poi[nodeField])),
    );
    if (v12_11Context && !candidates.length) return null;
    const profiles = candidates
      .map((poi) => {
        const outboundDirectMeters = planarDistanceMeters(outboundOrigin, poi);
        const homeDirectMeters = planarDistanceMeters(returnOrigin, poi);
        return {
          poi,
          outboundDirectMeters,
          homeDirectMeters,
          chainDistanceMeters: outboundDirectMeters * 0.6 + homeDirectMeters * 0.4,
        };
      })
      .sort(
        (left, right) =>
          left.chainDistanceMeters - right.chainDistanceMeters || left.poi.id.localeCompare(right.poi.id),
      );
    const withinRange = profiles.filter(
      (profile) =>
        profile.outboundDirectMeters <= maxDirectMeters * 1.25 &&
        profile.homeDirectMeters <= maxDirectMeters,
    );
    const candidateLimit = Math.min(64, ROUTE_CALIBRATION.poiChoice?.candidateLimit || 80);
    const eligible = (withinRange.length ? withinRange : profiles).slice(0, candidateLimit);
    const selected = weightedChoice(eligible, ({ poi, chainDistanceMeters }) => {
      const capacityPull = 0.65 + Math.sqrt(Math.max(12, poi.capacity || 60)) / 16;
      const crowdPenalty = 1 + poiCrowding(poi) * world.rules.destinationCrowdPenalty * 5;
      const localPull = poi.zone?.id === zone?.id ? 1.22 : 0.9;
      const connectorQuality = Math.exp(
        -Math.max(0, Number(poi[snapField]) || 0) /
          Math.max(1, ROUTE_CALIBRATION.poiChoice?.connectorDecayMeters || 100),
      );
      return (
        (poi.weight || 1) *
        (preferences[poi.group] || 0) *
        capacityPull *
        localPull *
        connectorQuality *
        Math.exp(-chainDistanceMeters / Math.max(1, decayMeters)) /
        crowdPenalty
      );
    });
    if (selected) {
      agent.poiAssignmentCalibration = {
        selectionMode: "school-poi-home-direct-access-prior-fallback",
        networkAccessMatched: false,
        profileKey,
        maxDirectMeters,
        outboundDirectMeters: selected.outboundDirectMeters,
        homeDirectMeters: selected.homeDirectMeters,
        chainDistanceMeters: selected.chainDistanceMeters,
        rangeFallback: withinRange.length === 0,
        candidateCount: eligible.length,
        evidenceBoundary: "Destination choice is internal diagnostic; realised walking OD is routed exactly on the official 3DPN.",
      };
      return selected.poi;
    }
    return null;
  }
  if (isIslandScope() && ROUTE_CALIBRATION_ENABLED) {
    const preferences = poiGroupPreferences(agent, state);
    const outboundOrigin = state === "activity" && agent.schoolPoint
      ? agent.schoolPoint
      : agent.pos || agent.homePoint || agent.homeZone;
    const returnOrigin = agent.homePoint || agent.homeZone;
    const profileKey = `${state === "outdoor" ? "outdoor" : "activity"}${agent.age < 10 ? "Young" : "Older"}`;
    const maxDirectMeters = ROUTE_CALIBRATION.poiChoice?.maxDirectMeters?.[profileKey] || 2200;
    const decayMeters = ROUTE_CALIBRATION.poiChoice?.distanceDecayMeters?.[profileKey] || 900;
    const networkProfiles = islandPoiNetworkProfiles(agent, state, preferences, excludedId);
    if (networkProfiles.length) {
      const maxNetworkMeters =
        maxDirectMeters * (ROUTE_CALIBRATION.poiChoice?.networkDetourFactor || 1.6);
      const withinNetworkRange = networkProfiles.filter(
        (profile) =>
          profile.outboundGeneralizedMeters <= maxNetworkMeters &&
          profile.returnGeneralizedMeters <= maxNetworkMeters,
      );
      const eligibleNetwork = withinNetworkRange.length ? withinNetworkRange : networkProfiles;
      const selectedNetwork = weightedChoice(eligibleNetwork, ({ poi, chainDistanceMeters }) => {
        const capacityPull = 0.65 + Math.sqrt(Math.max(12, poi.capacity || 60)) / 16;
        const crowdPenalty = 1 + poiCrowding(poi) * world.rules.destinationCrowdPenalty * 5;
        const localPull = poi.zone?.id === zone?.id ? 1.22 : 0.9;
        const connectorQuality = Math.exp(
          -Math.max(0, Number(poi.islandSnapMeters) || 0) /
            Math.max(1, ROUTE_CALIBRATION.poiChoice?.connectorDecayMeters || 100),
        );
        return (
          (poi.weight || 1) *
          (preferences[poi.group] || 0) *
          capacityPull *
          localPull *
          connectorQuality *
          Math.exp(-chainDistanceMeters / Math.max(1, decayMeters)) /
          crowdPenalty
        );
      });
      if (selectedNetwork) {
        agent.poiAssignmentCalibration = {
          selectionMode: selectedNetwork.networkAccessSource,
          networkAccessMatched: true,
          bidirectionalNetworkMatched: selectedNetwork.bidirectionalNetworkMatched,
          profileKey,
          maxNetworkMeters,
          outboundGeneralizedMeters: selectedNetwork.outboundGeneralizedMeters,
          returnGeneralizedMeters: selectedNetwork.returnGeneralizedMeters,
          chainDistanceMeters: selectedNetwork.chainDistanceMeters,
          rangeFallback: withinNetworkRange.length === 0,
          candidateCount: eligibleNetwork.length,
          accessK: islandPoiAccessBundle?.kNearest || 0,
        };
        return selectedNetwork.poi;
      }
    }
    let candidates = [];
    Object.entries(preferences).forEach(([group, preference]) => {
      if (preference > 0) candidates.push(...(poiByGroup.get(group) || []));
    });
    candidates = candidates.filter(
      (poi) => Number.isInteger(poi.islandNodeId) && poi.id !== excludedId,
    );
    const profiles = candidates
      .map((poi) => {
        const outboundDirectMeters = planarDistanceMeters(outboundOrigin, poi);
        const homeDirectMeters = planarDistanceMeters(returnOrigin, poi);
        return {
          poi,
          outboundDirectMeters,
          homeDirectMeters,
          chainDistanceMeters: outboundDirectMeters * 0.6 + homeDirectMeters * 0.4,
        };
      })
      .sort(
        (left, right) =>
          left.chainDistanceMeters - right.chainDistanceMeters || left.poi.id.localeCompare(right.poi.id),
      );
    const withinRange = profiles.filter(
      (profile) =>
        profile.outboundDirectMeters <= maxDirectMeters * 1.25 &&
        profile.homeDirectMeters <= maxDirectMeters,
    );
    const candidateLimit = ROUTE_CALIBRATION.poiChoice?.candidateLimit || 80;
    const eligible = (withinRange.length ? withinRange : profiles).slice(0, candidateLimit);
    const selected = weightedChoice(eligible, ({ poi, chainDistanceMeters }) => {
      const capacityPull = 0.65 + Math.sqrt(Math.max(12, poi.capacity || 60)) / 16;
      const crowdPenalty = 1 + poiCrowding(poi) * world.rules.destinationCrowdPenalty * 5;
      const localPull = poi.zone?.id === zone?.id ? 1.22 : 0.9;
      const connectorQuality = Math.exp(
        -Math.max(0, Number(poi.islandSnapMeters) || 0) /
          Math.max(1, ROUTE_CALIBRATION.poiChoice?.connectorDecayMeters || 100),
      );
      return (
        (poi.weight || 1) *
        (preferences[poi.group] || 0) *
        capacityPull *
        localPull *
        connectorQuality *
        Math.exp(-chainDistanceMeters / Math.max(1, decayMeters)) /
        crowdPenalty
      );
    });
    if (selected) {
      agent.poiAssignmentCalibration = {
        selectionMode: "school-poi-home-chain-constrained-choice",
        networkAccessMatched: false,
        profileKey,
        maxDirectMeters,
        outboundDirectMeters: selected.outboundDirectMeters,
        homeDirectMeters: selected.homeDirectMeters,
        chainDistanceMeters: selected.chainDistanceMeters,
        rangeFallback: withinRange.length === 0,
        candidateCount: eligible.length,
      };
      return selected.poi;
    }
    return null;
  }
  if (!realPoiLayer.length || !zone) return null;
  const preferences = poiGroupPreferences(agent, state);
  const zoneBucket = poiByZoneId.get(zone.id);
  let candidates = [];
  if (zoneBucket) {
    Object.entries(preferences).forEach(([group, preference]) => {
      if (preference > 0) candidates.push(...(zoneBucket.get(group) || []));
    });
  }
  if (!candidates.length) {
    Object.entries(preferences).forEach(([group, preference]) => {
      if (preference > 0) candidates.push(...(poiByGroup.get(group) || []));
    });
    candidates = candidates.filter(
      (poi) => poi.zone && accessAdjustedDistance(agent.homePoint || agent.homeZone, poi) <= agent.mobilityRadius * 1.15,
    );
  }
  if (excludedId && candidates.length > 1) {
    candidates = candidates.filter((poi) => poi.id !== excludedId);
  }
  return weightedChoice(candidates, (poi) => {
    const dist = Math.max(0.22, accessAdjustedDistance(agent.homePoint || agent.homeZone, poi));
    const capacityPull = 0.65 + Math.sqrt(Math.max(12, poi.capacity || 60)) / 16;
    const crowdPenalty = 1 + poiCrowding(poi) * world.rules.destinationCrowdPenalty * 5;
    const localPull = poi.zone?.id === zone.id ? 1.25 : 0.82;
    return (
      (poi.weight || 1) *
      (preferences[poi.group] || 0) *
      capacityPull *
      localPull *
      mobilityAccessFor(poi.zone) *
      (1 / Math.sqrt(dist)) *
      (1 / crowdPenalty)
    );
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
        interactionCellKey(origin.x + ix, origin.y + iy, origin.z, agent.scope),
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

function shuffleInPlace(items, random = agentRandom) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function proportionalIntegerCounts(total, items, weightFn) {
  const weights = items.map((item) => Math.max(0, Number(weightFn(item)) || 0));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  if (!weightTotal) return items.map(() => 0);
  const rawCounts = weights.map((weight) => (total * weight) / weightTotal);
  const counts = rawCounts.map(Math.floor);
  let remaining = total - counts.reduce((sum, value) => sum + value, 0);
  const order = rawCounts
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) counts[order[index % order.length].index] += 1;
  return counts;
}

function createRegionalAgentProfiles(population) {
  const strata = simulationZones().flatMap((homeZone) =>
    modelAgeTargets(homeZone.censusCalibration)
      .filter((target) => target.populationEstimate > 0)
      .map((target) => ({
        homeZone,
        age: target.age,
        populationEstimate: target.populationEstimate,
      })),
  );
  if (!strata.length) return [];

  // At the default 2,000 Agents every DCCA-age stratum is represented. Lower
  // exploratory sample sizes remain proportional but may omit the smallest strata.
  const basePerStratum = population >= strata.length ? 1 : 0;
  const counts = proportionalIntegerCounts(
    population - basePerStratum * strata.length,
    strata,
    (stratum) => stratum.populationEstimate,
  ).map((count) => count + basePerStratum);
  const profiles = [];
  strata.forEach((stratum, stratumIndex) => {
    const count = counts[stratumIndex];
    if (!count) return;
    const censusWeight = stratum.populationEstimate / count;
    for (let index = 0; index < count; index += 1) {
      profiles.push({
        age: stratum.age,
        homeZone: stratum.homeZone,
        stratumId: `${stratum.homeZone.id}:age-${stratum.age}`,
        targetAgePopulation: stratum.populationEstimate,
        censusWeight,
      });
    }
  });
  return shuffleInPlace(profiles);
}

function createAgentProfiles(population, suppliedProfiles = null) {
  const regionalProfiles = suppliedProfiles || (isRegionalScope() ? createRegionalAgentProfiles(population) : []);
  const census = isPilotScope() ? activePilot?.censusCalibration : null;
  const ageTargets = modelAgeTargets(census).filter((target) => target.populationEstimate > 0);
  const profiles = regionalProfiles;
  if (!profiles.length && ageTargets.length) {
    const stageTargets = modelStageTargets(census).filter((target) => target.populationEstimate > 0);
    const stageCounts = proportionalIntegerCounts(population, stageTargets, (target) => target.populationEstimate);
    const ageCountByAge = new Map();
    stageTargets.forEach((stageTarget, stageIndex) => {
      const stageAges = ageTargets.filter((target) => target.stage === stageTarget.stage);
      const ageCounts = proportionalIntegerCounts(
        stageCounts[stageIndex],
        stageAges,
        (target) => target.populationEstimate,
      );
      stageAges.forEach((target, ageIndex) => ageCountByAge.set(target.age, ageCounts[ageIndex]));
    });
    ageTargets.forEach((target) => {
      const count = ageCountByAge.get(target.age) || 0;
      const censusWeight = count
        ? target.populationEstimate / count
        : 0;
      for (let index = 0; index < count; index += 1) {
        profiles.push({
          age: target.age,
          targetAgePopulation: target.populationEstimate,
          censusWeight,
        });
      }
    });
    shuffleInPlace(profiles);
  } else if (!profiles.length) {
    const minAge = MODEL_PARAMETERS.population.agentAgeMin ?? 6;
    const maxAge = MODEL_PARAMETERS.population.agentAgeMax ?? 16;
    for (let index = 0; index < population; index += 1) {
      profiles.push({
        age: minAge + Math.floor(agentRandom() * (maxAge - minAge + 1)),
        targetAgePopulation: null,
        censusWeight: 1,
      });
    }
  }

  const schedule = MODEL_PARAMETERS.schoolSchedule;
  profiles.forEach((profile) => {
    const accompaniment = adultAccompanimentForAge(profile.age);
    const mobility = tcsMobilityProfileForAge(profile.age);
    profile.walkingSpeedMpm = walkingSpeedForAge(profile.age);
    profile.adultAccompanied = accompaniment.accompanied;
    profile.adultAccompanimentProbability = accompaniment.probability;
    profile.tcsGroupKey = mobility.groupKey;
    profile.tcsGroupLabel = mobility.groupLabel;
    profile.travelMode = mobility.modeKey;
    profile.travelModeLabel = mobility.modeLabel;
    profile.activeTravelShare = mobility.activeTravelShare;
    profile.mentorActiveTravelShare = mobility.mentorActiveTravelShare;
    profile.tcsJourneyMinutes = mobility.observedJourneyMinutes;
    profile.tcsDepartureMinute = mobility.observedDepartureMinute;
    profile.schoolShift = Math.round((agentRandom() - 0.5) * 2 * schedule.startHalfRangeMinutes);
    profile.scheduleNoise = Math.round((agentRandom() - 0.5) * 18);
  });
  return profiles;
}

function householdSizeValue(item) {
  if (!item) return 3;
  return item.key === "6+" ? 6 : Math.max(1, Number(item.key) || 3);
}

function availableHomeFloors(homeBuilding, homeZone, pilotMode) {
  return clamp(
    Math.round(
      homeBuilding?.levels ||
        homeBuilding?.heightMeters / FLOOR_HEIGHT_METERS ||
        (homeZone.typicalBuildingMeters || homeZone.heightMeters || 24) / FLOOR_HEIGHT_METERS,
    ),
    pilotMode ? 1 : 3,
    45,
  );
}

function createPilotHouseholds(profiles) {
  const censusHouseholds = activePilot?.censusCalibration?.households;
  if (!isPilotScope() || !censusHouseholds || !pilotHomeBuildings.length) return [];
  const compositions = censusHouseholds.childHouseholdCompositions.filter((item) => item.count > 0);
  const householdSizes = censusHouseholds.householdSizes.filter((item) => item.count > 0);
  const incomeBands = censusHouseholds.incomeBands.filter((item) => item.count > 0);
  const housingTypes = censusHouseholds.housingTypes.filter((item) => item.count > 0);
  const maxChildren = MODEL_PARAMETERS.householdSynthesis.maxModelChildrenPerHousehold || 3;
  const households = [];
  let profileIndex = 0;

  while (profileIndex < profiles.length) {
    const composition = weightedChoice(compositions, (item) => item.count) || {
      key: "coupleChildren",
      adultCount: 2,
    };
    const validSizes = householdSizes.filter((item) => householdSizeValue(item) >= composition.adultCount + 1);
    const sizeItem = weightedChoice(validSizes.length ? validSizes : householdSizes, (item) => item.count);
    const householdSize = Math.max(composition.adultCount + 1, householdSizeValue(sizeItem));
    const childSlots = clamp(householdSize - composition.adultCount, 1, maxChildren);
    const memberCount = Math.min(childSlots, profiles.length - profileIndex);
    const homeBuilding = weightedChoice(
      pilotHomeBuildings,
      (building) => building.homeWeight || building.areaSqm || 1,
    );
    const floorCount = availableHomeFloors(homeBuilding, pilotArea, true);
    const homeFloor = clamp(
      Math.round(1 + Math.pow(agentRandom(), 1.18) * (floorCount - 1)),
      1,
      floorCount,
    );
    const household = {
      id: `${activePilot.code}-hh-${households.length + 1}`,
      composition: composition.key,
      adultCount: composition.adultCount,
      householdSize,
      modelChildCount: memberCount,
      incomeBand: weightedChoice(incomeBands, (item) => item.count)?.key || "unknown",
      housingType: weightedChoice(housingTypes, (item) => item.count)?.key || "unknown",
      homeBuilding,
      homeFloor,
    };
    households.push(household);
    for (let member = 0; member < memberCount; member += 1) {
      profiles[profileIndex + member].household = household;
    }
    profileIndex += memberCount;
  }
  return households;
}

function createPilotSchoolAssignmentContext(profiles) {
  const stageCounts = new Map();
  profiles.forEach(({ age }) => {
    const stage = schoolStageForAge(age);
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
  });
  const capacityTotals = new Map();
  for (const stage of stageCounts.keys()) {
    const total = pilotSchoolCampuses
      .filter((school) => school.stage === stage || (stage === "secondary" && school.stage === "special"))
      .reduce((sum, school) => sum + school.capacityPrior, 0);
    capacityTotals.set(stage, Math.max(1, total));
  }
  return { stageCounts, capacityTotals, loads: new Map() };
}

function activeRegionalSchoolCampuses() {
  if (isWholeHkScope()) return wholeHkLayer("campuses");
  if (isIslandScope()) return hkIslandSchoolCampuses;
  if (isKowloonScope()) {
    return v12_9KowloonRoutingGraph?.directedCoreMask
      ? kowloonSchoolCampuses.filter((school) => v12_9KowloonRoutingGraph.isDirectedCoreNode(school.kowloonNodeId))
      : kowloonSchoolCampuses;
  }
  if (isNtEastScope()) {
    return v12_10NtEastRoutingGraph?.directedCoreMask
      ? ntEastSchoolCampuses.filter((school) => v12_10NtEastRoutingGraph.isDirectedCoreNode(school.ntEastNodeId))
      : ntEastSchoolCampuses;
  }
  if (isNtWestScope()) return ntWestSchoolCampuses;
  if (isOutlyingIslandsScope()) return islandsSchoolCampuses;
  return [];
}

function createRegionalSchoolAssignmentContext(profiles) {
  if (!isRegionalScope() || !ROUTE_CALIBRATION_ENABLED) return null;
  const stageCounts = new Map();
  profiles.forEach(({ age }) => {
    const stage = schoolStageForAge(age);
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
  });
  const capacityTotals = new Map();
  for (const stage of stageCounts.keys()) {
    const total = activeRegionalSchoolCampuses()
      .filter((school) => school.stage === stage || (stage === "secondary" && school.stage === "special"))
      .reduce((sum, school) => sum + Math.max(1, Number(school.capacityPrior) || 1), 0);
    capacityTotals.set(stage, Math.max(1, total));
  }
  return { stageCounts, capacityTotals, loads: new Map() };
}

function routedRegionalHomeAnchors(dccaId, age = null, travelMode = null) {
  const sourceAnchors = activeResidentialAnchorsByDcca().get(dccaId) || [];
  const all = world.scope === WHOLE_HK_SCOPE_ID ? wholeHkVerifiedHomeAnchors(dccaId, sourceAnchors) : sourceAnchors;
  if (!ROUTE_CALIBRATION_ENABLED || !all.length) return { anchors: all, tier: "unfiltered" };
  const v12_11Context = activeV12_11RoutingContext();
  const stage = Number.isFinite(age) ? schoolStageForAge(age) : null;
  const componentRoutable = v12_11Context && travelMode === "walk"
    ? all.filter((building) => {
        const access = v12_11Context.schoolAccessByHomeNode.get(building.networkNodeId);
        if (!access) return false;
        const stageEntries = stage === "primary" ? access.primary : access.secondary;
        return Boolean(stageEntries?.length);
      })
    : all;
  if (v12_11Context && travelMode === "walk" && !componentRoutable.length) {
    return { anchors: [], tier: `no-${stage || "school"}-reachable-component` };
  }
  const directedCoreGraph = isKowloonScope()
    ? v12_9KowloonRoutingGraph
    : isNtEastScope()
      ? v12_10NtEastRoutingGraph
      : null;
  const directedCore = directedCoreGraph?.directedCoreMask
    ? componentRoutable.filter((building) => directedCoreGraph.isDirectedCoreNode(building.networkNodeId))
    : componentRoutable;
  const routable = directedCore.length ? directedCore : componentRoutable;
  const preferredLimit = ROUTE_CALIBRATION.homeAttachment?.preferredSnapMeters || 100;
  const fallbackLimit = ROUTE_CALIBRATION.homeAttachment?.fallbackSnapMeters || 180;
  const preferred = routable.filter((building) => (building.networkSnapMeters ?? Infinity) <= preferredLimit);
  const boundRuntimePool = (anchors) => isKowloonScope() || isNtEastScope() || isNtWestScope() || isOutlyingIslandsScope()
    ? [...anchors]
        .sort(
          (left, right) =>
            (right.homeWeight || right.areaSqm || 0) - (left.homeWeight || left.areaSqm || 0) ||
            left.networkSnapMeters - right.networkSnapMeters,
        )
        .slice(0, 8)
    : anchors;
  if (preferred.length) return { anchors: boundRuntimePool(preferred), tier: `within-${preferredLimit}m` };
  const fallback = routable.filter((building) => (building.networkSnapMeters ?? Infinity) <= fallbackLimit);
  if (fallback.length) return { anchors: boundRuntimePool(fallback), tier: `within-${fallbackLimit}m` };
  return { anchors: boundRuntimePool(routable), tier: "all-anchors-fallback" };
}

function v12_11DccaWalkAccessAvailable(dccaId, age) {
  const context = activeV12_11RoutingContext();
  if (!context) return true;
  const stage = schoolStageForAge(age);
  const sourceAnchors = activeResidentialAnchorsByDcca().get(dccaId) || [];
  const anchors = world.scope === WHOLE_HK_SCOPE_ID ? wholeHkVerifiedHomeAnchors(dccaId, sourceAnchors) : sourceAnchors;
  return anchors.some((building) => {
    const access = context.schoolAccessByHomeNode.get(building.networkNodeId);
    return Boolean((stage === "primary" ? access?.primary : access?.secondary)?.length);
  });
}

function resetSimulation() {
  if (controls.scope?.value === WHOLE_HK_SCOPE_ID) {
    if (wholeHkState.status === "ready") resetWholeHkSimulation();
    else activateWholeHk();
    return;
  }
  clearSpatialSelection();
  world.population = Number(controls.population.value);
  world.seed = clamp(Math.trunc(Number(controls.seed?.value) || DEFAULT_AGENT_RANDOM_SEED), 1, 0xffffffff);
  if (controls.seed) controls.seed.value = String(world.seed);
  const requestedPilot = pilotByScope.get(controls.scope?.value);
  if (requestedPilot && requestedPilot !== activePilot) activatePilot(requestedPilot);
  world.scope = requestedPilot?.id || (
    controls.scope?.value === hkIslandModel?.scope?.id
      ? hkIslandModel.scope.id
      : controls.scope?.value === KOWLOON_SCOPE_ID
        ? KOWLOON_SCOPE_ID
        : controls.scope?.value === NT_EAST_SCOPE_ID
          ? NT_EAST_SCOPE_ID
        : controls.scope?.value === NT_WEST_SCOPE_ID
          ? NT_WEST_SCOPE_ID
        : controls.scope?.value === ISLANDS_SCOPE_ID
          ? ISLANDS_SCOPE_ID
        : "hong-kong"
  );
  if (isKowloonScope()) {
    ensureKowloonDirectedCore();
    if (v12_9KowloonRoutingGraph?.ready) kowloonMultimodalGraph?.load();
  }
  if (isNtEastScope()) ensureNtEastDirectedCore();
  refreshPlaceZones();
  world.scenario = controls.scenario.value;
  const requestedFocus = focusAreaById.get(controls.focus.value);
  world.focusId = isPilotScope()
    ? pilotArea.id
    : isRegionalScope() && !simulationZones().some((area) => area.id === requestedFocus?.id)
      ? simulationZones()[0].id
      : requestedFocus?.id || simulationZones()[0]?.id;
  controls.focus.value = world.focusId;
  world.speed = Number(controls.speed.value);
  world.time = Number(controls.time.value);
  resetWorldSimulationState();
  createSimulationCohort(world.population);
  finishSimulationReset();
}

function resetWorldSimulationState() {
  window.CrossPackLive?.reset();
  world.agents = [];
  world.households = [];
  world.history = [];
  world.lastHistoryHour = -1;
  world.elapsedMinutes = 0;
  world.comparisonWindowMinutes = 0;
  world.dayIndex = 0;
  world.lastCompletedDay = null;
  world.avoidedDestinations = 0;
  world.routedTrips = 0;
  world.routeFallbacks = 0;
  world.temporallyCalibratedTrips = 0;
  world.multimodalRoutedTrips = 0;
  world.multimodalRouteFallbacks = 0;
  world.multimodalTripsByMode = {};
  world.tripSequence = 0;
  clearPilotRouteCache();
  world.interactionField = { cells: new Map(), zoneOccupancy: new Map(), poiOccupancy: new Map() };
  agentRandom = mulberry32(world.seed);

}

function createSimulationCohort(population, suppliedProfiles = null) {
  const agentProfiles = createAgentProfiles(population, suppliedProfiles);
  world.households = createPilotHouseholds(agentProfiles);
  const pilotSchoolAssignments = isPilotScope() ? createPilotSchoolAssignmentContext(agentProfiles) : null;
  const regionalSchoolAssignments = createRegionalSchoolAssignmentContext(agentProfiles);

  for (let i = 0; i < population; i += 1) {
    const agentId = world.agents.length + 1;
    const profile = agentProfiles[i];
    const {
      age,
      walkingSpeedMpm,
      schoolShift,
      scheduleNoise,
      censusWeight,
      adultAccompanied,
      adultAccompanimentProbability,
      tcsGroupKey,
      tcsGroupLabel,
      travelMode: sampledTravelMode,
      travelModeLabel: sampledTravelModeLabel,
      activeTravelShare: sampledActiveTravelShare,
      mentorActiveTravelShare: sampledMentorActiveTravelShare,
      tcsJourneyMinutes,
      tcsDepartureMinute,
      household,
    } = profile;
    const pilotMode = isPilotScope();
    const regionalMode = isRegionalScope();
    const homeZone = pilotMode
      ? pilotArea
      : profile.homeZone || weightedChoice(
          simulationZones(),
          (zone) => (zone.childWeight || 0.5) * (0.45 + (zone.density || 0.5) * 0.45),
        );
    const forcedNetworkTransfer =
      sampledTravelMode === "walk" &&
      (isNtWestScope() || isOutlyingIslandsScope()) &&
      !v12_11DccaWalkAccessAvailable(homeZone.id, age);
    const travelMode = forcedNetworkTransfer ? "other" : sampledTravelMode;
    const travelModeLabel = forcedNetworkTransfer ? "No connected school walk (held at home)" : sampledTravelModeLabel;
    const activeTravelShare = forcedNetworkTransfer ? 0 : sampledActiveTravelShare;
    const mentorActiveTravelShare = forcedNetworkTransfer ? 0 : sampledMentorActiveTravelShare;
    const regionalHomePool = regionalMode
      ? routedRegionalHomeAnchors(homeZone.id, age, travelMode)
      : { anchors: [], tier: "not-regional" };
    const homeBuilding = pilotMode
      ? household?.homeBuilding || weightedChoice(
          pilotHomeBuildings,
          (building) => building.homeWeight || building.areaSqm || 1,
        )
      : regionalMode
        ? weightedChoice(
            regionalHomePool.anchors,
            (building) =>
              (building.homeWeight || building.areaSqm || 1) /
              (1 + Math.pow(
                (building.networkSnapMeters || 0) /
                  Math.max(1, ROUTE_CALIBRATION.homeAttachment?.weightDecayMeters || 85),
                2,
              )),
          )
        : null;
    const homePoint = homeBuilding
      ? { x: homeBuilding.x, y: homeBuilding.y }
      : randomPointInZone(homeZone, agentRandom, 0.5);
    const homeNetworkSnap = regionalMode
      ? Number.isInteger(homeBuilding?.networkNodeId)
        ? {
            nodeId: homeBuilding.networkNodeId,
            snapMeters: homeBuilding.networkSnapMeters,
            point: activeRegionalNodePoint(homeBuilding.networkNodeId),
          }
        : activeRegionalRoutingGraph()?.snapPoint(homePoint)
      : null;
    const homeNodeId = homeBuilding?.networkNodeId ?? homeNetworkSnap?.nodeId;
    const schoolAssignment = pilotMode
      ? choosePilotSchool(
          age,
          homePoint,
          homeBuilding?.networkNodeId,
          walkingSpeedMpm,
          pilotSchoolAssignments,
        )
      : isIslandScope() && ROUTE_CALIBRATION_ENABLED
        ? chooseIslandSchool(
            age,
            homePoint,
            walkingSpeedMpm,
            travelMode,
            homeZone,
            homeNetworkSnap?.snapMeters ?? homeBuilding?.networkSnapMeters ?? 0,
            homeNodeId,
            regionalSchoolAssignments,
          )
        : isKowloonScope() && ROUTE_CALIBRATION_ENABLED
          ? chooseKowloonSchool(
              age,
              homePoint,
              walkingSpeedMpm,
              travelMode,
              homeZone,
              homeNetworkSnap?.snapMeters ?? homeBuilding?.networkSnapMeters ?? 0,
              homeNodeId,
              regionalSchoolAssignments,
            )
        : isNtEastScope() && ROUTE_CALIBRATION_ENABLED
          ? chooseNtEastSchool(
              age,
              homePoint,
              walkingSpeedMpm,
              travelMode,
              homeZone,
              homeNetworkSnap?.snapMeters ?? homeBuilding?.networkSnapMeters ?? 0,
              homeNodeId,
              regionalSchoolAssignments,
            )
        : (isNtWestScope() || isOutlyingIslandsScope()) && ROUTE_CALIBRATION_ENABLED
          ? chooseV12_11School(
              age,
              homePoint,
              walkingSpeedMpm,
              travelMode,
              homeZone,
              homeNetworkSnap?.snapMeters ?? homeBuilding?.networkSnapMeters ?? 0,
              homeNodeId,
              regionalSchoolAssignments,
            )
        : null;
    const schoolPoint = pilotMode || (regionalMode && ROUTE_CALIBRATION_ENABLED)
      ? schoolAssignment?.school || null
      : chooseSchool(homeZone, age, homePoint);
    const schoolZone = pilotMode ? pilotArea : schoolPoint?.zone || chooseSchoolZone(homeZone, age);
    const mobilityRadius = regionalMode
      ? age < 9 ? 12 + agentRandom() * 6 : age < 13 ? 17 + agentRandom() * 8 : 23 + agentRandom() * 11
      : age < 9 ? 44 : age < 13 ? 62 : 82;
    const activityZone = chooseActivityZone(homeZone, { mobilityRadius });
    const floorCount = availableHomeFloors(homeBuilding, homeZone, pilotMode);
    const homeFloor = household?.homeFloor || clamp(
      Math.round(1 + Math.pow(agentRandom(), 1.18) * (floorCount - 1)),
      1,
      floorCount,
    );
    const schoolFloor = Math.floor(agentRandom() * (age < 6 ? 3 : 5));
    const homeGroundZ = regionalMode
      ? activeRegionalNodePoint(homeNodeId)?.z ?? homeZone.terrain ?? 0
      : homeBuilding?.base || homeZone.terrain || 0;
    const homeZ = homeBuilding
      ? (homeBuilding.base || 0) + PERSON_HEIGHT_UNITS + homeFloor * FLOOR_HEIGHT_UNITS
      : regionalMode
        ? homeGroundZ + PERSON_HEIGHT_UNITS + homeFloor * FLOOR_HEIGHT_UNITS
        : floorToZ(homeZone, homeFloor);
    const schoolStartMinute = MODEL_PARAMETERS.schoolSchedule.startMinute + schoolShift;
    let schoolRouteMeters = schoolAssignment?.routeMeters || 0;
    let schoolGeneralizedMeters = schoolAssignment?.generalizedMeters || 0;
    let schoolTravelMinutes = tcsJourneyMinutes || schoolAssignment?.travelMinutes || 12;
    if (pilotMode && schoolAssignment && schoolPoint) {
      const homeNode = pilotNodePoint(homeBuilding?.networkNodeId);
      const schoolNode = pilotNodePoint(schoolPoint.pilotNodeId);
      if (homeNode && schoolNode) {
        const schoolZ =
          schoolNode.z + PERSON_HEIGHT_UNITS + schoolFloor * FLOOR_HEIGHT_UNITS;
        const connectorMeters =
          physicalDistanceMeters({ x: homePoint.x, y: homePoint.y, z: homeZ }, homeNode) +
          physicalDistanceMeters(schoolNode, { x: schoolPoint.x, y: schoolPoint.y, z: schoolZ });
        schoolRouteMeters = schoolAssignment.pathMeters + connectorMeters;
        schoolGeneralizedMeters = schoolAssignment.pathGeneralizedMeters + connectorMeters;
        if (travelMode === "walk") {
          schoolTravelMinutes = schoolGeneralizedMeters / Math.max(35, walkingSpeedMpm);
        }
      }
    } else if (regionalMode && travelMode === "walk" && schoolPoint) {
      // The TCS journey-time draw schedules departure. The measured route is
      // populated only when this Agent starts its actual home-school OD trip.
      schoolRouteMeters = 0;
      schoolGeneralizedMeters = 0;
      schoolTravelMinutes = tcsJourneyMinutes || 12;
    }
  const schoolArrivalBufferMinutes = isPopulationWeightedScope()
      ? MODEL_PARAMETERS.schoolSchedule.arrivalBufferMinMinutes +
        agentRandom() * (
          MODEL_PARAMETERS.schoolSchedule.arrivalBufferMaxMinutes -
          MODEL_PARAMETERS.schoolSchedule.arrivalBufferMinMinutes
        )
      : 0;
    const latestOnTimeDeparture =
      schoolStartMinute - schoolTravelMinutes - schoolArrivalBufferMinutes;
    const schoolDepartureMinute = Math.min(
      Number.isFinite(tcsDepartureMinute) ? tcsDepartureMinute : latestOnTimeDeparture,
      latestOnTimeDeparture,
    );
    const propensityLimits = PHYSICAL_ACTIVITY_PARAMETERS.personalPropensity || { min: 0.7, max: 1.3 };
    const propensityHashA = (Math.imul(agentId ^ world.seed, 1597334677) >>> 0) / 0xffffffff;
    const propensityHashB = (Math.imul(agentId + world.seed, 3812015801) >>> 0) / 0xffffffff;
    const physicalActivityPropensity = lerp(
      propensityLimits.min,
      propensityLimits.max,
      (propensityHashA + propensityHashB) / 2,
    );
    const agent = {
      id: agentId,
      age,
      censusWeight,
      targetAgePopulation: profile.targetAgePopulation,
      populationStratumId: profile.stratumId || null,
      schoolStage: schoolStageForAge(age),
      adultAccompanied,
      adultAccompanimentProbability,
      tcsGroupKey,
      tcsGroupLabel,
      travelMode,
      travelModeLabel,
      sampledTravelMode,
      networkModeOverride: forcedNetworkTransfer ? "no-same-component-stage-school" : null,
      activeTravelShare,
      mentorActiveTravelShare,
      tcsJourneyMinutes,
      tcsDepartureMinute,
      householdId: household?.id || null,
      householdComposition: household?.composition || null,
      householdSize: household?.householdSize || null,
      householdIncomeBand: household?.incomeBand || null,
      housingType: household?.housingType || null,
      scope: modelScopeId(),
      homeZone,
      homePoint,
      homeBuilding,
      homeAttachmentTier: regionalHomePool.tier,
      homeNodeId,
      homeSnapMeters: homeNetworkSnap?.snapMeters ?? homeBuilding?.networkSnapMeters ?? null,
      homeZ,
      schoolZone,
      schoolPoint,
      schoolCampusId: schoolPoint?.campusId || schoolPoint?.id || null,
      schoolAssignment,
      schoolWalkRangeFallback: Boolean(schoolAssignment?.walkRangeFallback),
      activityZone,
      activityPoi: null,
      homeFloor,
      schoolFloor,
      pos: {
        x: homePoint.x,
        y: homePoint.y,
        z: homeZ,
      },
      target: null,
      route: null,
      routeIndex: 0,
      routePurpose: null,
      currentNetworkNodeId: homeNodeId,
      lastRoute: null,
      lastNetworkRoute: null,
      usedNetworkRouteToday: false,
      activeTrip: null,
      tripHistory: [],
      stateHistory: [{ time: world.time, state: "home", destination: "home" }],
      state: "home",
      taskKey: "",
      walkingSpeedMpm,
      speed: walkingSpeedMpm / appUnitMeters,
      outdoorPreference: clamp(0.25 + agentRandom() * 0.7 + (age < 9 ? 0.12 : -0.04), 0.05, 0.95),
      activityPreference: clamp(0.25 + agentRandom() * 0.65 + (age > 11 ? 0.14 : 0), 0.05, 0.95),
      mobilityRadius,
      physicalActivityPropensity,
      schoolShift,
      scheduleNoise,
      schoolStartMinute,
      schoolDepartureMinute,
      schoolTravelMinutes,
      schoolRouteMeters,
      schoolGeneralizedMeters,
      schoolArrivalMinute: null,
      schoolActualTravelMinutes: null,
      schoolRouteExpectedMinutes: null,
      schoolRouteStartNodeId: null,
      schoolRouteDestinationNodeId: null,
      schoolLatenessMinutes: null,
      schoolOnTime: null,
      heatDose: 0,
      contactDose: 0,
      distanceTravelled: 0,
      distanceTravelledMeters: 0,
      verticalMinutes: 0,
      contacts: 0,
      localCrowding: 0,
      crowdTolerance: 2 + Math.floor(agentRandom() * 6),
      lastCrowdReroute: -1000,
      reroutesToday: 0,
      activityChoiceStale: false,
      avoidedDestinationToday: false,
    };
    resetAgentPhysicalActivity(agent);
    agent.activityPoi = chooseActivityPoi(agent, "activity", activityZone);
    agent.target = locationForTask(agent, { state: "home", dest: "home" });
    world.agents.push(agent);
  }

}

function finishSimulationReset() {
  buildInteractionField();
  world.metrics = computeMetrics();
  agentObserver.selectedTripId = null;
  invalidateAgentObserverGeometry();
  populateAgentObserverControls();
  updatePanels();
}

function getTask(agent, minuteAbsolute) {
  const minute = ((minuteAbsolute + agent.scheduleNoise) % 1440 + 1440) % 1440;
  if (agent.travelMode !== "walk" || !agent.schoolPoint) return {state:minute<375||minute>=1305?"sleep":"home",dest:"home"};
  const start = agent.schoolStartMinute ?? 480 + agent.schoolShift;
  const departure = agent.schoolDepartureMinute ?? start - 48;
  const end = 15 * 60 + 25 + Math.round(agent.age > 11 ? 24 : -12);
  if (minute < 375) return {state:"sleep",dest:"home"};
  if (minute < departure) return {state:"home",dest:"home"};
  if (minute < start) return {state:"commute",dest:"school"};
  if (minute < end) return {state:"school",dest:"school"};
  if (minute < end + 60) return {state:"commute",dest:"home"};
  if (minute < 1305) return {state:"home",dest:"home"};
  return {state:"sleep",dest:"home"};
}

function locationForTask(agent, task) {
  const scenario = SCENARIOS[world.scenario];
  const pilotMode = agent.scope === activePilot?.id && isPilotScope();
  const islandMode = agent.scope === "hong-kong-island" && isIslandScope();
  const kowloonMode = agent.scope === KOWLOON_SCOPE_ID && isKowloonScope();
  const ntEastMode = agent.scope === NT_EAST_SCOPE_ID && isNtEastScope();
  const ntWestMode = agent.scope === NT_WEST_SCOPE_ID && isNtWestScope();
  const islandsMode = agent.scope === ISLANDS_SCOPE_ID && isOutlyingIslandsScope();
  const regionalMode = islandMode || kowloonMode || ntEastMode || ntWestMode || islandsMode;
  const networkNodePoint = islandMode
    ? islandNodePoint
    : kowloonMode
      ? kowloonNodePoint
      : ntEastMode
        ? ntEastNodePoint
      : ntWestMode
        ? ntWestNodePoint
      : islandsMode
        ? islandsNodePoint
        : pilotNodePoint;
  let zone = agent.homeZone;
  let anchor = agent.homeZone.homeAnchor;
  let radiusMultiplier = 0.32;
  let z = agent.homeZ ?? floorToZ(agent.homeZone, agent.homeFloor);
  let fixedPoint = null;
  let poi = null;
  let networkNodeId = agent.homeNodeId;
  let groundZ = networkNodePoint(networkNodeId)?.z ?? zone.terrain ?? 0;

  if (task.dest === "school" || task.state === "school") {
    zone = pilotMode ? pilotArea : agent.schoolZone;
    if (agent.schoolPoint) {
      fixedPoint = agent.schoolPoint;
      networkNodeId = pilotMode ? agent.schoolPoint.pilotNodeId : regionalPlaceNodeId(agent.schoolPoint);
      groundZ = networkNodePoint(networkNodeId)?.z ?? zone.terrain ?? 0;
      z = pilotMode || regionalMode
        ? groundZ + PERSON_HEIGHT_UNITS + agent.schoolFloor * FLOOR_HEIGHT_UNITS
        : floorToZ(zone, agent.schoolFloor);
      anchor = { x: agent.schoolPoint.x, y: agent.schoolPoint.y, z };
      radiusMultiplier = 0.04;
    } else {
      anchor = zone.schoolAnchor;
      radiusMultiplier = 0.26;
      z = floorToZ(zone, agent.schoolFloor);
    }
  } else if (task.dest === "activity" || task.dest === "postschool") {
    zone = pilotMode ? pilotArea : agent.activityZone;
    poi = agent.activityPoi;
    if (world.scope === WHOLE_HK_SCOPE_ID && poi?.dccaZone) zone = poi.dccaZone;
    if (poi) {
      fixedPoint = poi;
      networkNodeId = pilotMode ? poi.pilotNodeId : regionalPlaceNodeId(poi);
      groundZ = networkNodePoint(networkNodeId)?.z ?? zone.terrain ?? 0;
      const destinationFloor = task.state === "outdoor" ? 0 : poi.floor || 0;
      z = pilotMode || regionalMode
        ? groundZ + PERSON_HEIGHT_UNITS + destinationFloor * FLOOR_HEIGHT_UNITS
        : floorToZ(zone, destinationFloor);
      anchor = { x: poi.x, y: poi.y, z };
      radiusMultiplier = 0.025;
    }
    if (task.state === "outdoor") {
      if (!poi) anchor = zone.parkAnchor;
      radiusMultiplier = poi ? 0.025 : 0.48 + zone.parks * 0.18;
      if ((!pilotMode && !regionalMode) || !poi) z = floorToZ(zone, 0);
    } else {
      if (!poi) anchor = zone.activityAnchor;
      radiusMultiplier = poi ? 0.025 : 0.28;
      if ((!pilotMode && !regionalMode) || !poi) z = floorToZ(zone, poi?.floor || 0);
    }
  }

  if (task.dest === "home" || task.state === "sleep" || (world.scenario === "typhoon" && task.dest !== "school")) {
    zone = agent.homeZone;
    fixedPoint = agent.homePoint || null;
    networkNodeId = agent.homeNodeId;
    groundZ = networkNodePoint(networkNodeId)?.z ?? zone.terrain ?? 0;
    anchor = fixedPoint ? { x: fixedPoint.x, y: fixedPoint.y, z: agent.homeZ } : zone.homeAnchor;
    radiusMultiplier = task.state === "sleep" ? 0.18 : 0.28;
    z = agent.homeZ ?? floorToZ(zone, agent.homeFloor);
  }

  const fixedJitter = pilotMode || regionalMode ? 0.004 : poi ? 0.028 : 0.045;
  const point = fixedPoint
    ? {
        x: fixedPoint.x + (agentRandom() - 0.5) * fixedJitter,
        y: fixedPoint.y + (agentRandom() - 0.5) * fixedJitter,
      }
    : randomPointInZone(zone, agentRandom, radiusMultiplier);
  if (fixedPoint && !pointInArea(point, zone)) {
    point.x = fixedPoint.x;
    point.y = fixedPoint.y;
  }
  return {
    x: (pilotMode || regionalMode) && fixedPoint ? point.x : lerp(anchor.x, point.x, 0.55),
    y: (pilotMode || regionalMode) && fixedPoint ? point.y : lerp(anchor.y, point.y, 0.55),
    z: z + (agentRandom() - 0.5) * PERSON_HEIGHT_UNITS * 0.35,
    zone,
    poi,
    networkNodeId,
    ...(world.scope === WHOLE_HK_SCOPE_ID ? { routingScope: agent.scope, actualDccaId: fixedPoint?.dccaId || zone.id } : {}),
    groundZ,
    scenarioMobility: scenario.mobility,
  };
}

function physicalActivityAgeBand(age) {
  const bands = PHYSICAL_ACTIVITY_PARAMETERS.metyAgeBands || [];
  return (
    bands.find((band) => age >= band.ageMin && age <= band.ageMax) ||
    (age < (bands[0]?.ageMin ?? 6) ? bands[0] : bands[bands.length - 1]) ||
    { key: "6-9" }
  );
}

function ageBandMety(values, age, fallback = 1.5) {
  const band = physicalActivityAgeBand(age);
  const value = Number(values?.[band.key]);
  return Number.isFinite(value) ? value : fallback;
}

function interpolateWalkingMety(age, speedMetersPerMinute) {
  const band = physicalActivityAgeBand(age);
  const table = PHYSICAL_ACTIVITY_PARAMETERS.walkingMetyByMph?.[band.key] || [];
  if (!table.length) return 3.5;
  const speedMph = Math.max(0, speedMetersPerMinute) * 60 / 1609.344;
  if (speedMph <= table[0].mph) return table[0].mety;
  for (let index = 1; index < table.length; index += 1) {
    const lower = table[index - 1];
    const upper = table[index];
    if (speedMph <= upper.mph) {
      const fraction = (speedMph - lower.mph) / Math.max(0.001, upper.mph - lower.mph);
      return lerp(lower.mety, upper.mety, fraction);
    }
  }
  return table[table.length - 1].mety;
}

function resetAgentPhysicalActivity(agent) {
  agent.mvpaMinutes = 0;
  agent.vigorousMinutes = 0;
  agent.lightActivityMinutes = 0;
  agent.metyMinutes = 0;
  agent.physicalActivityTrackedMinutes = 0;
  agent.mvpaByDomain = {
    activeTravel: 0,
    school: 0,
    outdoor: 0,
    activity: 0,
  };
  resetAgentGeometryComparison(agent);
}

function emptyGeometryOutcome() {
  return HKActivityAccounting.empty();
}

function networkAccountingPoints(path, pointForNode, edgeData) {
  return path.nodeIds.map((nodeId, index) => ({
    ...pointForNode(nodeId),
    ...(index > 0 ? { accounting: edgeData(path.edgeIds[index - 1]) } : {}),
  }));
}

function prepareRouteAccounting(agent) {
  const route = agent.lastRoute;
  if (!route || route.nodeNamespace === "merged-mainland" || route.accountingVersion) return;
  if (!agent.route?.length && (route.mode === "local" || route.mode?.endsWith("local-connector"))) {
    agent.route = [{ ...agent.target, terminal: true }];
    agent.routeIndex = 0;
    agent.routePurpose = agent.activeTrip?.purpose || null;
  }
  if (!agent.route?.length) return;
  const speed = Math.max(35, agent.walkingSpeedMpm || 70) * Math.max(0.1, SCENARIOS[world.scenario].mobility);
  let previous = agent.pos;
  const segments = [];
  for (const point of agent.route) {
    const physicalMeters = physicalDistanceMeters(previous, point);
    const horizontal = planarDistanceMeters(previous, point);
    const source = point.accounting;
    const proxy = route.mode === "tcs-temporal-schematic";
    const kind = proxy ? "proxy" : point.travelKind === "line-haul" ? "mechanical" : source?.kind || "connector";
    const meters = source?.meters ?? physicalMeters;
    const cost = source?.generalizedMeters ?? meters;
    const planarCost = source?.planarGeneralizedMeters ?? horizontal;
    const timed = Number.isFinite(point.segmentMetersPerMinute) && point.segmentMetersPerMinute > 0;
    const minutes = proxy ? route.estimatedMinutes : timed ? physicalMeters / point.segmentMetersPerMinute : cost / speed;
    const planarMinutes = proxy || point.travelKind === "line-haul" ? minutes
      : timed ? minutes * (cost > 0 ? planarCost / cost : 1) : planarCost / speed;
    point.accounting = {
      kind, activeShare: proxy ? route.activeTravelShare : 0,
      meters: proxy ? route.routeMeters : meters,
      horizontalMeters: proxy ? route.planarRouteMeters : source?.horizontalMeters ?? horizontal,
      generalizedMeters: cost, planarGeneralizedMeters: planarCost, minutes, planarMinutes,
      ascentMeters: proxy || point.travelKind === "line-haul" ? 0 : Math.max(0, ((point.z || 0) - (previous.z || 0)) * verticalUnitMeters),
    };
    point.accountingElapsed = 0;
    if (point.waitMinutesRemaining > 0) segments.push({ kind: "wait", minutes: point.waitMinutesRemaining, planarMinutes: point.waitMinutesRemaining, meters: 0, horizontalMeters: 0 });
    segments.push(point.accounting);
    previous = point;
  }
  route.accountingVersion = HKActivityAccounting.VERSION;
  const base = interpolateWalkingMety(agent.age, agent.walkingSpeedMpm);
  const three = HKActivityAccounting.sum(segments, base, PHYSICAL_ACTIVITY_PARAMETERS);
  const two = HKActivityAccounting.sum(segments, base, PHYSICAL_ACTIVITY_PARAMETERS, "twoD");
  route.activeTravelShare = three.journeyMinutes ? three.activeTravelMinutes / three.journeyMinutes : 0;
  route.planarActiveTravelShare = two.journeyMinutes ? two.activeTravelMinutes / two.journeyMinutes : 0;
  route.activeWalkingMinutes = three.activeTravelMinutes - three.proxyActiveMinutes;
  route.unverifiedAccessMinutes = three.connectorMinutes;
  route.mechanicalMinutes = three.mechanicalMinutes;
  route.activeAscentMeters = three.activeAscentMeters;
}

function emptyGeometryLedger() {
  return {
    tripCount: 0,
    twoD: emptyGeometryOutcome(),
    threeD: emptyGeometryOutcome(),
  };
}

function resetAgentGeometryComparison(agent) {
  agent.geometryComparison = {
    all: emptyGeometryLedger(),
    matched: emptyGeometryLedger(),
    excludedTripCount: 0,
  };
}

function movementGeometryOutcome(agent, route, movement, condition) {
  const segments = movement?.accountingSegments;
  if (segments) return HKActivityAccounting.sum(segments, interpolateWalkingMety(agent.age, agent.walkingSpeedMpm), PHYSICAL_ACTIVITY_PARAMETERS, condition);
  // Only an explicitly classified single segment may use this adapter.
  if (!route.segmentExact || !(route.estimatedMinutes > 0)) return null;
  const kind = route.activeTravelShare === 1 ? "walk" : route.mechanicalShare === 1 ? "mechanical" : "connector";
  const segment = { kind, meters: route.routeMeters, horizontalMeters: route.planarRouteMeters,
    generalizedMeters: route.generalizedMeters, planarGeneralizedMeters: route.planarGeneralizedMeters,
    minutes: route.estimatedMinutes, planarMinutes: route.planarEstimatedMinutes, ascentMeters: route.verticalGainMeters };
  return HKActivityAccounting.measure(HKActivityAccounting.fraction(segment, clamp((movement?.movingMinutes || 0) / route.estimatedMinutes, 0, 1)),
    interpolateWalkingMety(agent.age, agent.walkingSpeedMpm), PHYSICAL_ACTIVITY_PARAMETERS, condition);
}

function addGeometryOutcome(target, outcome) {
  Object.keys(target).forEach((key) => {
    target[key] += outcome[key] || 0;
  });
}

function isMatchedWalkingRoute(agent, route) {
  const mode = route.nodeNamespace === "merged-mainland" ? route.transportMode : agent.travelMode;
  return route.comparisonStatus?.startsWith("matched-") && mode === "walk";
}

function recordPairedRouteComparison(agent, route) {
  if (!agent.geometryComparison || !route || route.comparisonRecorded) return;
  route.comparisonRecorded = true;
  if (![route.routeMeters, route.estimatedMinutes].every(Number.isFinite)) {
    agent.geometryComparison.excludedTripCount += 1;
    return;
  }
  agent.geometryComparison.all.tripCount += 1;
  const matched = isMatchedWalkingRoute(agent, route);
  if (!matched) return;
  agent.geometryComparison.matched.tripCount += 1;
}

function accumulatePairedGeometryMovement(agent, movement) {
  if (agent.state !== "commute" || !agent.geometryComparison || !agent.lastRoute) return;
  if ((movement?.movingMinutes || 0) <= 0) return;
  const twoD = movementGeometryOutcome(agent, agent.lastRoute, movement, "twoD");
  const threeD = movementGeometryOutcome(agent, agent.lastRoute, movement, "threeD");
  if (!twoD || !threeD) return;
  addGeometryOutcome(agent.geometryComparison.all.twoD, twoD);
  addGeometryOutcome(agent.geometryComparison.all.threeD, threeD);
  const matched = isMatchedWalkingRoute(agent, agent.lastRoute);
  if (!matched) return;
  addGeometryOutcome(agent.geometryComparison.matched.twoD, twoD);
  addGeometryOutcome(agent.geometryComparison.matched.threeD, threeD);
}

function destinationPhysicalActivityProfile(agent) {
  const profiles = PHYSICAL_ACTIVITY_PARAMETERS.destinationProfiles || {};
  const group = agent.target?.poi?.group || agent.activityPoi?.group || (agent.state === "outdoor" ? "play" : "community");
  const profile = profiles[group] || profiles.community || profiles.play;
  const fractionKey = agent.state === "outdoor" ? "outdoorActiveFraction" : "activityActiveFraction";
  const activeFraction = clamp(
    (profile?.[fractionKey] || 0) * (agent.physicalActivityPropensity || 1),
    0,
    1,
  );
  return {
    domain: agent.state,
    activeFraction,
    activeMety: ageBandMety(profile?.activeMetyByAgeBand, agent.age, 4.5),
    restMety: profile?.restMety || 1.5,
  };
}

function accumulatePhysicalActivity(agent, simMinutes, movement) {
  if (wholeHkWalkHeld(agent)) {
    agent.physicalActivityTrackedMinutes += simMinutes;
    agent.metyMinutes += simMinutes * (PHYSICAL_ACTIVITY_PARAMETERS.inactiveMety?.commuteWaiting || 1.5);
    return;
  }
  const mvpaThreshold = PHYSICAL_ACTIVITY_PARAMETERS.mvpaThresholdMety || 4;
  const vigorousThreshold = PHYSICAL_ACTIVITY_PARAMETERS.vigorousThresholdMety || 6;
  const inactive = PHYSICAL_ACTIVITY_PARAMETERS.inactiveMety || {};
  accumulatePairedGeometryMovement(agent, movement);
  let domain = null;
  let activeMinutes = 0;
  let activeMety = inactive[agent.state] || 1.5;
  let restMety = activeMety;

  if (agent.state === "commute") {
    const outcome = agent.lastRoute && movementGeometryOutcome(agent, agent.lastRoute, movement, "threeD");
    agent.physicalActivityTrackedMinutes += simMinutes;
    agent.metyMinutes += (outcome?.metyMinutes || 0) + Math.max(0, simMinutes - (outcome?.journeyMinutes || 0)) * (inactive.commuteWaiting || 1.5);
    agent.mvpaMinutes += outcome?.mvpaMinutes || 0;
    agent.mvpaByDomain.activeTravel += outcome?.mvpaMinutes || 0;
    agent.vigorousMinutes += outcome?.vigorousMinutes || 0;
    agent.lightActivityMinutes += outcome?.lightActivityMinutes || 0;
    return;
  } else if (agent.state === "school") {
    domain = "school";
    const school = PHYSICAL_ACTIVITY_PARAMETERS.school || {};
    const baseFraction = school.activeFractionByStage?.[agent.schoolStage] ??
      school.activeFractionByStage?.other ??
      0.045;
    activeMinutes = simMinutes * clamp(baseFraction * (agent.physicalActivityPropensity || 1), 0, 1);
    activeMety = ageBandMety(school.activeMetyByAgeBand, agent.age, 5.8);
    restMety = ageBandMety(school.restMetyByAgeBand, agent.age, 1.5);
  } else if (agent.state === "outdoor" || agent.state === "activity") {
    const profile = destinationPhysicalActivityProfile(agent);
    domain = profile.domain;
    activeMinutes = simMinutes * profile.activeFraction;
    activeMety = profile.activeMety;
    restMety = profile.restMety;
  }

  activeMinutes = clamp(activeMinutes, 0, simMinutes);
  const inactiveMinutes = simMinutes - activeMinutes;
  agent.physicalActivityTrackedMinutes += simMinutes;
  agent.metyMinutes += activeMinutes * activeMety + inactiveMinutes * restMety;
  if (activeMinutes <= 0) return;
  if (activeMety >= mvpaThreshold) {
    agent.mvpaMinutes += activeMinutes;
    if (domain) agent.mvpaByDomain[domain] += activeMinutes;
  } else {
    agent.lightActivityMinutes += activeMinutes;
  }
  if (activeMety >= vigorousThreshold) agent.vigorousMinutes += activeMinutes;
}

function advanceAgentMovement(agent, simMinutes, interaction) {
  if (wholeHkWalkHeld(agent)) return { movingMinutes: 0, activeMovingMinutes: 0, inactiveCommuteMinutes: simMinutes, horizontalMeters: 0, verticalGainMeters: 0 };
  const scenario = SCENARIOS[world.scenario];
  const stateSpeed = agent.state === "commute" ? 1 : agent.state === "outdoor" ? 0.58 : 0.42;

  if (agent.route?.length && agent.routeIndex < agent.route.length) {
    prepareRouteAccounting(agent);
    const accountingSegments = [];
    let horizontalTravelMeters = 0;
    let verticalGainMeters = 0;
    let consumedMinutes = 0;
    while (consumedMinutes < simMinutes - 1e-10 && agent.routeIndex < agent.route.length) {
      const waypoint = agent.route[agent.routeIndex];
      if ((waypoint.waitMinutesRemaining || 0) > 0) {
        const waitMinutes = Math.min(waypoint.waitMinutesRemaining, simMinutes - consumedMinutes);
        waypoint.waitMinutesRemaining -= waitMinutes;
        consumedMinutes += waitMinutes;
        accountingSegments.push({ kind: "wait", minutes: waitMinutes, planarMinutes: waitMinutes, meters: 0, horizontalMeters: 0 });
        if (consumedMinutes >= simMinutes - 1e-10) break;
      }
      const segment = waypoint.accounting;
      const remaining = Math.max(0, segment.minutes - waypoint.accountingElapsed);
      const used = Math.min(remaining, simMinutes - consumedMinutes);
      const progress = remaining > 1e-10 ? used / remaining : 1;
      for (const axis of ["x", "y", "z"]) agent.pos[axis] += (waypoint[axis] - agent.pos[axis]) * progress;
      if (segment.minutes > 0 && used > 0) {
        const part = HKActivityAccounting.fraction(segment, used / segment.minutes);
        accountingSegments.push(part);
        horizontalTravelMeters += part.horizontalMeters;
        verticalGainMeters += part.ascentMeters;
        agent.distanceTravelled += part.horizontalMeters / appUnitMeters;
        agent.distanceTravelledMeters += part.horizontalMeters;
      }
      consumedMinutes += used;
      waypoint.accountingElapsed += used;
      if (remaining - used <= 1e-10) {
        agent.pos = { x: waypoint.x, y: waypoint.y, z: waypoint.z };
        if (Number.isInteger(waypoint.nodeId)) agent.currentNetworkNodeId = waypoint.nodeId;
        agent.routeIndex += 1;
      }
    }
    if (agent.activeTrip) agent.activeTrip.elapsedMinutes += consumedMinutes;
    if (agent.routeIndex >= agent.route.length) {
      const completedPurpose = agent.routePurpose;
      agent.route = null;
      agent.routeIndex = 0;
      agent.routePurpose = null;
      if (Number.isInteger(agent.target?.networkNodeId)) {
        agent.currentNetworkNodeId = agent.target.networkNodeId;
      }
      completeAgentTrip(agent, completedPurpose);
    }
    return {
      movingMinutes: consumedMinutes,
      accountingSegments,
      horizontalMeters: horizontalTravelMeters,
      verticalGainMeters,
    };
  }

  const dx = agent.target.x - agent.pos.x;
  const dy = agent.target.y - agent.pos.y;
  const dz = agent.target.z - agent.pos.z;
  const dist = Math.hypot(dx, dy, dz * 0.45);
  const move = agent.speed * simMinutes * scenario.mobility * stateSpeed;
  if (dist <= 0.05) {
    if (Number.isInteger(agent.target?.networkNodeId)) {
      agent.currentNetworkNodeId = agent.target.networkNodeId;
    }
    completeAgentTrip(agent);
    return { movingMinutes: 0, horizontalMeters: 0, verticalGainMeters: 0 };
  }
  const t = Math.min(1, move / dist);
  if (agent.activeTrip) agent.activeTrip.elapsedMinutes += simMinutes * t;
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
  const oldZ = agent.pos.z;
  agent.pos.x = nextPoint.x;
  agent.pos.y = nextPoint.y;
  agent.pos.z += dz * t;
  agent.distanceTravelled += travelled;
  agent.distanceTravelledMeters += travelled * appUnitMeters;
  return {
    movingMinutes: simMinutes * t,
    accountingSegments: [{ kind: "connector", minutes: simMinutes * t, planarMinutes: simMinutes * t,
      meters: Math.hypot(travelled * appUnitMeters, (agent.pos.z - oldZ) * verticalUnitMeters),
      horizontalMeters: travelled * appUnitMeters, ascentMeters: Math.max(0, (agent.pos.z - oldZ) * verticalUnitMeters) }],
    horizontalMeters: travelled * appUnitMeters,
    verticalGainMeters: Math.max(0, (agent.pos.z - oldZ) * verticalUnitMeters),
  };
}

function updateAgent(agent, simMinutes) {
  if (window.CrossPackLive?.advance(agent, simMinutes)) return;
  if (isWholeHkScope()) return withWholeHkRegion(agent.scope, () => updateAgent(agent, simMinutes));
  const scheduledTask = getTask(agent, world.time);
  const task =
    agent.route?.length && agent.routePurpose && scheduledTask.state !== "commute"
      ? { state: "commute", dest: agent.routePurpose }
      : scheduledTask;
  const nextKey = `${task.state}:${task.dest}`;
  if (nextKey !== agent.taskKey) {
    const stateChanged = task.state !== agent.state;
    if (
      ["outdoor", "activity"].includes(task.state) &&
      (!agent.activityPoi || agent.activityChoiceStale)
    ) {
      const previousZone = agent.activityZone;
      const previousPoi = agent.activityPoi;
      const nextZone = chooseActivityZone(agent.homeZone, agent, task.state);
      const nextPoi = chooseActivityPoi(agent, task.state, nextZone, previousPoi?.id);
      if (
        (nextZone.id !== previousZone.id || nextPoi?.id !== previousPoi?.id) &&
        (zoneCrowding(previousZone) > zoneCrowding(nextZone) + 0.05 ||
          poiCrowding(previousPoi) > poiCrowding(nextPoi) + 0.02)
      ) {
        recordAvoidedDestination(agent);
      }
      agent.activityZone = nextZone;
      agent.activityPoi = nextPoi;
      agent.activityChoiceStale = false;
    }
    agent.taskKey = nextKey;
    if (stateChanged) recordAgentStateEvent(agent, task.state, task.dest);
    agent.state = task.state;
    agent.target = locationForTask(agent, task);
    if (!(wholeHkWalkHeld(agent) && agent.routeAttempt.purpose === task.dest) && (task.state === "commute" || (world.scope === WHOLE_HK_SCOPE_ID && physicalDistanceMeters(agent.pos, agent.target) >= 3))) {
      if (world.scope === WHOLE_HK_SCOPE_ID) agent.state = "commute";
      assignAgentRoute(agent, agent.target, task.dest);
    }
  }

  if (wholeHkWalkHeld(agent)) agent.state = "commute";
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
    const previousPoi = agent.activityPoi;
    const nextZone = chooseActivityZone(agent.homeZone, agent, task.state);
    const nextPoi = chooseActivityPoi(agent, task.state, nextZone, previousPoi?.id);
    agent.lastCrowdReroute = world.elapsedMinutes;
    if (nextZone.id !== previousZone.id || (nextPoi && nextPoi.id !== previousPoi?.id)) {
      agent.activityZone = nextZone;
      agent.activityPoi = nextPoi;
      agent.target = locationForTask(agent, task);
      assignAgentRoute(agent, agent.target, task.dest);
      // A crowd-triggered destination change is travel, not on-site activity.
      // Keep its task key aligned so the next step retains the same route.
      if (physicalDistanceMeters(agent.pos, agent.target) >= 3 || wholeHkWalkHeld(agent)) {
        recordAgentStateEvent(agent, "commute", task.dest);
        agent.state = "commute";
        agent.taskKey = `commute:${task.dest}`;
      }
      recordAvoidedDestination(agent);
      agent.reroutesToday += 1;
    }
  }

  const scenario = SCENARIOS[world.scenario];
  const movement = advanceAgentMovement(agent, simMinutes, interaction);
  accumulatePhysicalActivity(agent, simMinutes, movement);

  if (agent.state === "outdoor") {
    const heatMultiplier = scenario.heat * (1.1 - agent.target.zone.parks * 0.45);
    agent.heatDose += simMinutes * heatMultiplier * 0.015;
  }

  const zoneFloor = occupiedFloor(agent);
  agent.verticalMinutes += Math.max(0, zoneFloor) * simMinutes;
}

function stepSimulation(realDeltaMs) {
  let remaining = Math.max(0, Math.min(8, (realDeltaMs / 1000) * world.speed));
  while (remaining > 1e-10) {
    const untilMidnight = 1440 - world.time;
    const minutes = Math.min(remaining, untilMidnight);
    const midnight = minutes >= untilMidnight - 1e-10;
    world.time = midnight ? 1440 - 1e-8 : world.time + minutes;
    world.elapsedMinutes += minutes;
    world.comparisonWindowMinutes += minutes;
    buildInteractionField();
    world.agents.forEach((agent) => updateAgent(agent, minutes));
    remaining -= minutes;
    if (!midnight) continue;
    world.lastCompletedDay = {
      dayIndex: world.dayIndex, windowMinutes: world.comparisonWindowMinutes,
      trackedMinutesMean: world.agents.reduce((sum, agent) => sum + agent.physicalActivityTrackedMinutes, 0) / Math.max(1, world.agents.length),
      mvpaRawAgentMean: world.agents.reduce((sum, agent) => sum + agent.mvpaMinutes, 0) / Math.max(1, world.agents.length),
    };
    world.time = 0;
    world.dayIndex += 1;
    window.CrossPackLive?.onDayReset();
    world.comparisonWindowMinutes = 0;
    world.avoidedDestinations = 0;
    world.routedTrips = 0;
    world.routeFallbacks = 0;
    world.temporallyCalibratedTrips = 0;
    world.multimodalRoutedTrips = 0;
    world.multimodalRouteFallbacks = 0;
    world.multimodalTripsByMode = {};
    world.agents.forEach((agent) => {
      const carriedTrip = agent.activeTrip && agent.tripHistory.find((trip) => trip.id === agent.activeTrip.historyId);
      agent.heatDose = 0;
      agent.contactDose = 0;
      agent.distanceTravelled = 0;
      agent.distanceTravelledMeters = 0;
      agent.reroutesToday = 0;
      agent.avoidedDestinationToday = false;
      agent.lastNetworkRoute = null;
      agent.usedNetworkRouteToday = false;
      agent.schoolArrivalMinute = null;
      agent.schoolActualTravelMinutes = null;
      agent.schoolRouteExpectedMinutes = null;
      agent.schoolRouteStartNodeId = null;
      agent.schoolRouteDestinationNodeId = null;
      agent.schoolLatenessMinutes = null;
      agent.schoolOnTime = null;
      resetAgentPhysicalActivity(agent);
      resetAgentObserverHistory(agent);
      if (carriedTrip) {
        agent.tripHistory.push({ ...carriedTrip, carriedFromPreviousDay: true });
        agent.lastRoute.comparisonRecorded = false;
        recordPairedRouteComparison(agent, agent.lastRoute);
      }
    });
  }
  controls.time.value = String(Math.floor(world.time));
}

function restartAtTime(minute) {
  world.running = false;
  controls.time.value = String(clamp(Math.trunc(Number(minute) || 0), 0, 1439));
  resetSimulation();
  updatePanels();
}

function weightedPercentile(entries, probability) {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  const threshold = totalWeight * probability;
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= threshold) return entry.value;
  }
  return sorted[sorted.length - 1].value;
}

function computeGeometryComparison() {
  const schoolAgeGuideline = PHYSICAL_ACTIVITY_PARAMETERS.guidelines?.schoolAge || {
    dailyAverageMvpaMinutes: 60,
  };
  const entries = world.agents.map((agent) => {
    const censusWeight = Number(agent.censusWeight);
    return { agent, weight: Number.isFinite(censusWeight) && censusWeight > 0 ? censusWeight : 1 };
  });
  const allWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const matchedEntries = entries.filter(
    ({ agent }) => (agent.geometryComparison?.matched?.tripCount || 0) > 0,
  );
  const matchedWeight = matchedEntries.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedMean = (valueFn, source = entries) => {
    const denominator = source === matchedEntries ? matchedWeight : allWeight;
    if (!denominator) return 0;
    return source.reduce((sum, entry) => sum + valueFn(entry.agent) * entry.weight, 0) / denominator;
  };
  const nonTravelMvpa = (agent) =>
    Math.max(0, (agent.mvpaMinutes || 0) - (agent.mvpaByDomain?.activeTravel || 0));
  const outcome = (agent, ledger, condition, key) =>
    agent.geometryComparison?.[ledger]?.[condition]?.[key] || 0;
  const conditionSummary = (condition) => {
    const totalMvpa = (agent) => nonTravelMvpa(agent) + outcome(agent, "all", condition, "mvpaMinutes");
    return {
      walkingDistanceKm: weightedMean(
        (agent) => outcome(agent, "matched", condition, "distanceMeters") / 1000,
        matchedEntries,
      ),
      walkingTimeMinutes: weightedMean(
        (agent) => outcome(agent, "matched", condition, "journeyMinutes"),
        matchedEntries,
      ),
      activeTravelMinutes: weightedMean(
        (agent) => outcome(agent, "all", condition, "activeTravelMinutes"),
      ),
      activeTravelMvpaMinutes: weightedMean(
        (agent) => outcome(agent, "all", condition, "mvpaMinutes"),
      ),
      activeTravelVigorousMinutes: weightedMean(
        (agent) => outcome(agent, "all", condition, "vigorousMinutes"),
      ),
      totalMvpaMinutes: weightedMean(totalMvpa),
      guidelineShare: weightedMean(
        (agent) => (totalMvpa(agent) >= schoolAgeGuideline.dailyAverageMvpaMinutes ? 1 : 0),
      ),
      movementMetyMinutes: weightedMean(
        (agent) => outcome(agent, "all", condition, "metyMinutes"),
      ),
      movementNetMetyMinutes: weightedMean(
        (agent) => outcome(agent, "all", condition, "metyMinutes") - outcome(agent, "all", condition, "journeyMinutes"),
      ),
      verticalGainMeters: weightedMean(
        (agent) => outcome(agent, "matched", condition, "verticalGainMeters"),
        matchedEntries,
      ),
      mechanicalMeters: weightedMean(
        (agent) => outcome(agent, "matched", condition, "mechanicalMeters"),
        matchedEntries,
      ),
    };
  };
  const twoD = conditionSummary("twoD");
  const threeD = conditionSummary("threeD");
  const deltas = Object.fromEntries(
    Object.keys(twoD).map((key) => [key, (threeD[key] || 0) - (twoD[key] || 0)]),
  );
  const walkTimeDifferences = matchedEntries.map(({ agent, weight }) => ({
    value:
      outcome(agent, "matched", "threeD", "journeyMinutes") -
      outcome(agent, "matched", "twoD", "journeyMinutes"),
    weight,
  }));
  const allTripCount = world.agents.reduce(
    (sum, agent) => sum + (agent.geometryComparison?.all?.tripCount || 0),
    0,
  );
  const matchedTripCount = world.agents.reduce(
    (sum, agent) => sum + (agent.geometryComparison?.matched?.tripCount || 0),
    0,
  );
  return {
    schemaVersion: "v12.2-live-geometry-comparison-1",
    scope: world.scope,
    pilot: isRegionalScope() ? regionalScopeLabel() : activePilot?.code || "Hong Kong",
    population: world.population,
    seed: world.seed,
    elapsedMinutes: world.elapsedMinutes,
    windowElapsedMinutes: world.comparisonWindowMinutes,
    agentsCompared: matchedEntries.length,
    allTripCount,
    matchedTripCount,
    matchedTripShare: allTripCount ? matchedTripCount / allTripCount : 0,
    twoD,
    threeD,
    deltas,
    common: {
      nonTravelMvpaMinutes: weightedMean(nonTravelMvpa),
      schoolMvpaMinutes: weightedMean((agent) => agent.mvpaByDomain?.school || 0),
      outdoorMvpaMinutes: weightedMean((agent) => agent.mvpaByDomain?.outdoor || 0),
      activityMvpaMinutes: weightedMean((agent) => agent.mvpaByDomain?.activity || 0),
    },
    walkTimeDeltaQuantiles: {
      p10: weightedPercentile(walkTimeDifferences, 0.1),
      p25: weightedPercentile(walkTimeDifferences, 0.25),
      p50: weightedPercentile(walkTimeDifferences, 0.5),
      p75: weightedPercentile(walkTimeDifferences, 0.75),
      p90: weightedPercentile(walkTimeDifferences, 0.9),
    },
  };
}

function computeMetrics() {
  const counts = Object.fromEntries(STATE_ORDER.map((state) => [state, 0]));
  const weightedCounts = Object.fromEntries(STATE_ORDER.map((state) => [state, 0]));
  const metricAgentWeight = (agent) => {
    const censusWeight = Number(agent.censusWeight);
    return isPopulationWeightedScope() && Number.isFinite(censusWeight) && censusWeight > 0
      ? censusWeight
      : 1;
  };
  let heatTotal = 0;
  let contacts = 0;
  let crowdedChildren = 0;
  let contactExposure = 0;
  let contactClusters = 0;
  let activePoiWeight = 0;
  const activePoiIds = new Set();
  const focus = focusAreaById.get(world.focusId) || zones[0];
  const focusAgents = [];
  const routedAgents = [];

  world.agents.forEach((agent) => {
    counts[agent.state] += 1;
    weightedCounts[agent.state] += metricAgentWeight(agent);
    heatTotal += agent.heatDose;
    contactExposure += agent.contactDose;
    if (agent.usedNetworkRouteToday && agent.lastNetworkRoute) routedAgents.push(agent);
    if (agent.localCrowding > agent.crowdTolerance) crowdedChildren += 1;
    if (["outdoor", "activity"].includes(agent.state) && agent.target?.poi) {
      activePoiWeight += metricAgentWeight(agent);
      activePoiIds.add(agent.target.poi.id);
    }
    if (pointInArea(agent.pos, focus)) focusAgents.push(agent);
  });

  world.interactionField.cells.forEach((entry) => {
    if (entry.count > 1) contacts += entry.count * Math.min(8, Math.log2(entry.count + 1));
    if (entry.count >= 4) contactClusters += 1;
  });

  const odFlows = new Map();
  world.agents.forEach((agent) => {
    const key = `${agent.homeZone.code} -> ${agent.schoolZone.code}`;
    odFlows.set(key, (odFlows.get(key) || 0) + metricAgentWeight(agent));
  });
  const topOdFlow = [...odFlows.entries()].sort((a, b) => b[1] - a[1])[0] || ["n/a", 0];

  const focusArea = focus.areaKm2 || Math.PI * Math.pow(focus.radius * 0.12, 2);
  const focusHeightKm = focus.heightMeters ? focus.heightMeters / 1000 : (focus.height * verticalUnitMeters) / 1000;
  const focusVolume = focusArea * Math.max(0.03, focusHeightKm);
  const focusWeightedChildren = focusAgents.reduce(
    (sum, agent) => sum + metricAgentWeight(agent),
    0,
  );
  const focusDensity = focusWeightedChildren / Math.max(0.001, focusVolume);
  const focusFloor = focusWeightedChildren
    ? focusAgents.reduce(
        (sum, agent) => sum + occupiedFloor(agent, focus) * metricAgentWeight(agent),
        0,
      ) / focusWeightedChildren
    : 0;
  const focusOutdoor = focusWeightedChildren
    ? focusAgents.reduce(
        (sum, agent) => sum + (agent.state === "outdoor" ? metricAgentWeight(agent) : 0),
        0,
      ) / focusWeightedChildren
    : 0;
  const heatLoad = focusOutdoor * SCENARIOS[world.scenario].heat * (1.12 - focus.parks * 0.48);
  const residentChildrenProxy =
    isPilotScope() && focus.id === pilotArea.id
      ? modelPopulationTarget()
      : isRegionalScope() && simulationZones().some((area) => area.id === focus.id)
        ? modelPopulationTarget(focus.censusCalibration)
      : focus.schoolAgePopulationProxy || focus.childUnder15 || 0;
  const focusSchoolCount = focus.schoolCount || 0;
  const focusParkCount = focus.parkVenueCount || 0;
  const focusActivityVenueCount = focus.activityVenueCount || 0;
  const focusChildPoiCount = focus.childPoiCount || 0;
  const focusPlayPoiCount = focus.playPoiCount || 0;
  const focusSportPoiCount = focus.sportPoiCount || 0;
  const focusStudyPoiCount = (focus.studyPoiCount || 0) + (focus.communityPoiCount || 0);
  const focusTransportNodeCount = focus.transportNodeCount || 0;
  const focusMobilityAccess = mobilityAccessFor(focus);
  const meanRouteCircuity = routedAgents.length
    ? routedAgents.reduce((sum, agent) => sum + (agent.lastNetworkRoute.circuity || 1), 0) / routedAgents.length
    : 0;
  const meanRouteVerticalGain = routedAgents.length
    ? routedAgents.reduce((sum, agent) => sum + (agent.lastNetworkRoute.verticalGainMeters || 0), 0) / routedAgents.length
    : 0;
  const assignedSchoolAgents = isRegionalScope()
    ? world.agents.filter((agent) => (isWholeHkScope() || agent.scope === world.scope) && agent.schoolPoint)
    : world.agents.filter(
        (agent) => agent.scope === activePilot?.id && agent.schoolAssignment?.school,
      );
  const assignmentWeight = metricAgentWeight;
  const assignedWeight = assignedSchoolAgents.reduce(
    (sum, agent) => sum + assignmentWeight(agent),
    0,
  );
  const weightedAssignedMean = (agents, valueFn) => {
    const denominator = agents.reduce((sum, agent) => sum + assignmentWeight(agent), 0);
    return denominator
      ? agents.reduce(
          (sum, agent) => sum + valueFn(agent) * assignmentWeight(agent),
          0,
        ) / denominator
      : 0;
  };
  const weightedAssignedShare = (predicate) => assignedWeight
    ? assignedSchoolAgents.reduce(
        (sum, agent) => sum + (predicate(agent) ? assignmentWeight(agent) : 0),
        0,
      ) / assignedWeight
    : 0;
  const schoolTravelValues = assignedSchoolAgents
    .filter((agent) => agent.travelMode === "walk");
  const meanSchoolTravelMinutes = weightedAssignedMean(
    schoolTravelValues,
    (agent) => agent.schoolTravelMinutes,
  );
  const meanPlannedSchoolJourneyMinutes = weightedAssignedMean(
    assignedSchoolAgents,
    (agent) => agent.schoolTravelMinutes,
  );
  const walkAssignmentWeight = schoolTravelValues.reduce(
    (sum, agent) => sum + assignmentWeight(agent),
    0,
  );
  const shortSchoolWalkShare = walkAssignmentWeight
    ? schoolTravelValues.reduce(
        (sum, agent) => sum + (agent.schoolTravelMinutes <= 10 ? assignmentWeight(agent) : 0),
        0,
      ) / walkAssignmentWeight
    : 0;
  const longSchoolWalkShare = walkAssignmentWeight
    ? schoolTravelValues.reduce(
        (sum, agent) => sum + (agent.schoolTravelMinutes > 15 ? assignmentWeight(agent) : 0),
        0,
      ) / walkAssignmentWeight
    : 0;
  const assignedSchoolCampusCount = new Set(assignedSchoolAgents.map((agent) => agent.schoolCampusId)).size;
  const localSchoolAssignmentShare = weightedAssignedShare((agent) =>
    agent.schoolPoint?.dccaId === (isRegionalScope() ? agent.homeZone?.id : activePilot?.dccaId),
  );
  const homeDistrictSchoolAssignmentShare = weightedAssignedShare((agent) =>
    agent.schoolPoint?.zoneId === (
      isRegionalScope() ? agent.homeZone?.parentDistrictId : activePilot?.districtId
    ),
  );
  const graphHomeDistrictCandidateShare = pilotSchoolCampuses.length
    ? pilotSchoolCampuses.filter((school) => school.zoneId === activePilot?.districtId).length /
      pilotSchoolCampuses.length
    : 0;
  const censusSameDistrictStudyShare = activePilot?.censusCalibration?.placeOfStudy?.sameDistrictShare || 0;
  const schoolCapacityEvidenceShare = weightedAssignedShare(
    (agent) => agent.schoolPoint?.capacitySource === "EDB classroom permitted accommodation",
  );
  const schoolWalkRangeFallbackShare = weightedAssignedShare(
    (agent) => agent.schoolWalkRangeFallback,
  );
  const morningPeakDepartureShare = weightedAssignedShare(
    (agent) => agent.schoolDepartureMinute >= 7 * 60 && agent.schoolDepartureMinute < 8 * 60,
  );
  const completedSchoolTrips = world.agents.filter((agent) => agent.schoolOnTime !== null);
  const onTimeSchoolShare = completedSchoolTrips.length
    ? completedSchoolTrips.filter((agent) => agent.schoolOnTime).length / completedSchoolTrips.length
    : null;
  const meanActualSchoolTravelMinutes = completedSchoolTrips.length
    ? completedSchoolTrips.reduce((sum, agent) => sum + (agent.schoolActualTravelMinutes || 0), 0) /
      completedSchoolTrips.length
    : null;
  const weightedPopulation = world.agents.reduce((sum, agent) => sum + (agent.censusWeight || 0), 0);
  const weightedPopulationTarget = isPopulationWeightedScope() ? modelPopulationTarget() : world.population;
  const adultAccompaniedShare = world.agents.filter((agent) => agent.adultAccompanied).length /
    Math.max(1, world.population);
  const poiAssignedShare = world.agents.filter((agent) => agent.activityPoi).length / Math.max(1, world.population);
  const stageTargets = activeStageTargets();
  const stageCalibrationMaxError = stageTargets.length
    ? Math.max(
        ...stageTargets.map((target) => {
          const stageWeight = world.agents
            .filter((agent) => agent.schoolStage === target.stage)
            .reduce((sum, agent) => sum + (agent.censusWeight || 0), 0);
          const sampleShare = stageWeight / Math.max(1, weightedPopulation);
          return Math.abs(sampleShare - target.share);
        }),
      )
    : 0;
  const householdTargets = activePilot?.censusCalibration?.households?.childHouseholdCompositions || [];
  const householdCompositionMaxError = householdTargets.length && world.households.length
    ? Math.max(
        ...householdTargets.map((target) => {
          const sampleShare = world.households.filter((household) => household.composition === target.key).length /
            world.households.length;
          return Math.abs(sampleShare - target.share);
        }),
      )
    : 0;
  const activityWeights = world.agents.map(metricAgentWeight);
  const activityWeightTotal = activityWeights.reduce((sum, weight) => sum + weight, 0);
  const weightedActivityMean = (valueFn, filterFn = () => true) => {
    let numerator = 0;
    let denominator = 0;
    world.agents.forEach((agent, index) => {
      if (!filterFn(agent)) return;
      numerator += valueFn(agent) * activityWeights[index];
      denominator += activityWeights[index];
    });
    return denominator ? numerator / denominator : 0;
  };
  const travelModeWeights = new Map();
  world.agents.forEach((agent, index) => {
    travelModeWeights.set(
      agent.travelMode || "walk",
      (travelModeWeights.get(agent.travelMode || "walk") || 0) + activityWeights[index],
    );
  });
  const travelModeShares = Object.fromEntries(
    [...travelModeWeights.entries()].map(([mode, weight]) => [
      mode,
      activityWeightTotal ? weight / activityWeightTotal : 0,
    ]),
  );
  const walkModeShare = travelModeShares.walk || 0;
  const bicycleModeShare = travelModeShares.bicycle || 0;
  const mechanisedModeShare = clamp(1 - walkModeShare - bicycleModeShare, 0, 1);
  const meanConservativeActiveTravelShare = weightedActivityMean(
    (agent) => agent.activeTravelShare ?? 1,
  );
  const meanMentorActiveTravelShare = weightedActivityMean(
    (agent) => agent.mentorActiveTravelShare ?? agent.activeTravelShare ?? 1,
  );
  const meanTcsJourneyMinutes = weightedActivityMean((agent) => agent.tcsJourneyMinutes || 0);
  const schoolAgeGuideline = PHYSICAL_ACTIVITY_PARAMETERS.guidelines?.schoolAge || {
    ageMin: 6,
    ageMax: 17,
    dailyAverageMvpaMinutes: 60,
  };
  const earlyYearsGuideline = PHYSICAL_ACTIVITY_PARAMETERS.guidelines?.earlyYears || {
    ageMin: 3,
    ageMax: 5,
    dailyMvpaMinutes: 60,
  };
  const schoolAgeEligible = (agent) =>
    agent.age >= schoolAgeGuideline.ageMin && agent.age <= schoolAgeGuideline.ageMax;
  const earlyYearsEligible = (agent) =>
    agent.age >= earlyYearsGuideline.ageMin && agent.age <= earlyYearsGuideline.ageMax;
  const meanMvpaMinutes = weightedActivityMean((agent) => agent.mvpaMinutes || 0);
  const meanVigorousMinutes = weightedActivityMean((agent) => agent.vigorousMinutes || 0);
  const meanMetyMinutes = weightedActivityMean((agent) => agent.metyMinutes || 0);
  const meanPhysicalActivityTrackedMinutes = weightedActivityMean(
    (agent) => agent.physicalActivityTrackedMinutes || 0,
  );
  const mvpaGuidelineShare = weightedActivityMean(
    (agent) => ((agent.mvpaMinutes || 0) >= schoolAgeGuideline.dailyAverageMvpaMinutes ? 1 : 0),
    schoolAgeEligible,
  );
  const earlyYearsMvpaGuidelineShare = weightedActivityMean(
    (agent) => ((agent.mvpaMinutes || 0) >= earlyYearsGuideline.dailyMvpaMinutes ? 1 : 0),
    earlyYearsEligible,
  );
  const mvpaPrimaryGuidelineShare = weightedActivityMean(
    (agent) => ((agent.mvpaMinutes || 0) >= schoolAgeGuideline.dailyAverageMvpaMinutes ? 1 : 0),
    (agent) => agent.schoolStage === "primary",
  );
  const mvpaSecondaryGuidelineShare = weightedActivityMean(
    (agent) => ((agent.mvpaMinutes || 0) >= schoolAgeGuideline.dailyAverageMvpaMinutes ? 1 : 0),
    (agent) => agent.schoolStage === "secondary",
  );
  const mvpaByDomain = Object.fromEntries(
    ["activeTravel", "school", "outdoor", "activity"].map((domain) => [
      domain,
      weightedActivityMean((agent) => agent.mvpaByDomain?.[domain] || 0),
    ]),
  );
  const youthMetyEvidenceShare = activityWeightTotal
    ? world.agents.reduce(
        (sum, agent, index) => sum + (agent.age >= 6 ? activityWeights[index] : 0),
        0,
      ) / activityWeightTotal
    : 0;

  const currentHour = Math.floor(world.time / 60);
  if (currentHour !== world.lastHistoryHour) {
    world.lastHistoryHour = currentHour;
    world.history[currentHour] = {
      hour: currentHour,
      outdoor: weightedCounts.outdoor / Math.max(1, activityWeightTotal),
      commute: weightedCounts.commute / Math.max(1, activityWeightTotal),
      school: weightedCounts.school / Math.max(1, activityWeightTotal),
      heat: heatLoad,
    };
  }

  return {
    counts,
    weightedCounts,
    stateWeightTotal: activityWeightTotal,
    focus,
    focusAgents,
    focusWeightedChildren,
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
    focusChildPoiCount,
    focusPlayPoiCount,
    focusSportPoiCount,
    focusStudyPoiCount,
    focusTransportNodeCount,
    focusMobilityAccess,
    heatLoad,
    heatTotal,
    verticalMean: weightedActivityMean((agent) => occupiedFloor(agent)),
    contactIndex: (contacts / Math.max(1, world.population)) * SCENARIOS[world.scenario].contact * 100,
    contactExposure: contactExposure / Math.max(1, world.population),
    crowdedShare: crowdedChildren / Math.max(1, world.population),
    contactClusters,
    avoidedDestinations: world.avoidedDestinations,
    meanTravelKm: weightedActivityMean(
      (agent) => (agent.distanceTravelledMeters || agent.distanceTravelled * appUnitMeters) / 1000,
    ),
    pilotRoutedAgents: routedAgents.length,
    pilotRoutedTrips: world.routedTrips,
    pilotRouteFallbacks: world.routeFallbacks,
    temporallyCalibratedTrips: world.temporallyCalibratedTrips,
    multimodalRoutedTrips: world.multimodalRoutedTrips,
    multimodalRouteFallbacks: world.multimodalRouteFallbacks,
    multimodalTripsByMode: { ...world.multimodalTripsByMode },
    meanRouteCircuity,
    meanRouteVerticalGain,
    assignedSchoolCampusCount,
    meanSchoolTravelMinutes,
    meanPlannedSchoolJourneyMinutes,
    shortSchoolWalkShare,
    longSchoolWalkShare,
    localSchoolAssignmentShare,
    homeDistrictSchoolAssignmentShare,
    graphHomeDistrictCandidateShare,
    censusSameDistrictStudyShare,
    schoolCapacityEvidenceShare,
    schoolWalkRangeFallbackShare,
    morningPeakDepartureShare,
    completedSchoolTripCount: completedSchoolTrips.length,
    onTimeSchoolShare,
    meanActualSchoolTravelMinutes,
    weightedPopulation,
    weightedPopulationTarget,
    travelModeShares,
    walkModeShare,
    bicycleModeShare,
    mechanisedModeShare,
    meanConservativeActiveTravelShare,
    meanMentorActiveTravelShare,
    meanTcsJourneyMinutes,
    adultAccompaniedShare,
    poiAssignedShare,
    syntheticHouseholdCount: world.households.length,
    meanModelChildrenPerHousehold: world.households.length
      ? world.population / world.households.length
      : 0,
    stageCalibrationMaxError,
    householdCompositionMaxError,
    meanMvpaMinutes,
    meanVigorousMinutes,
    meanMetyMinutes,
    meanPhysicalActivityTrackedMinutes,
    mvpaGuidelineShare,
    earlyYearsMvpaGuidelineShare,
    mvpaPrimaryGuidelineShare,
    mvpaSecondaryGuidelineShare,
    mvpaByDomain,
    youthMetyEvidenceShare,
    mvpaExternalBenchmarkShare:
      PHYSICAL_ACTIVITY_PARAMETERS.externalValidation?.daily60MinuteShare || 0,
    topOdFlow,
    schoolShare: weightedCounts.school / Math.max(1, activityWeightTotal),
    commuteShare: weightedCounts.commute / Math.max(1, activityWeightTotal),
    outdoorShare: weightedCounts.outdoor / Math.max(1, activityWeightTotal),
    activePoiShare: activePoiWeight / Math.max(
      1,
      weightedCounts.outdoor + weightedCounts.activity,
    ),
    activePoiDestinations: activePoiIds.size,
    geometryComparison: computeGeometryComparison(),
  };
}

function updatePanels() {
  const metrics = world.metrics || computeMetrics();
  const regionalManifest = activeRegionalRoutingManifest();
  const regionalGraph = activeRegionalRoutingGraph();
  const regionalAnchors = activeResidentialAnchors();
  controls.populationOutput.value = world.population.toLocaleString();
  controls.speedOutput.value = `${world.speed}x`;
  controls.timeOutput.value = formatTime(world.time);
  controls.clock.textContent = formatTime(world.time);
  controls.phase.textContent = dayPhase(world.time);
  controls.toggle.textContent = world.running ? "Pause" : "Play";
  controls.releaseBadge.textContent = APP_RELEASE.version;
  const releaseScope = isWholeHkScope()
    ? "Whole HK · shared clock / within-pack ODs"
    : isIslandScope()
    ? "HK Island · inherited Agent runtime"
    : isKowloonScope()
      ? "Kowloon · internal Agent diagnostic"
    : isNtEastScope()
      ? "NT East · internal Agent diagnostic"
    : isNtWestScope()
      ? "NT West · internal Agent diagnostic"
    : isOutlyingIslandsScope()
      ? "Islands · component-aware Agent diagnostic"
    : isPilotScope()
      ? `${activePilot.code} · official 3DPN pilot`
      : "Hong Kong macro · schematic";
  controls.releaseScopeStatus.textContent = releaseScope;
  metricEls.statsStatusLine.textContent =
    `${APP_RELEASE.version} · ${releaseScope} · seed ${world.seed.toLocaleString()} · ${formatTime(world.time)}`;
  if (controls.scopeSummary) {
    const title = controls.scopeSummary.querySelector("strong");
    const detail = controls.scopeSummary.querySelector("span");
    if (isRegionalScope()) {
      title.textContent = `${simulationZones().length} official DCCAs · ${regionalScopeLabel().split(" · ")[0]}`;
      detail.textContent = `${world.population.toLocaleString()} weighted Agents · age 6-16 · official 3DPN OD routing`;
    } else if (isPilotScope()) {
      title.textContent = `${activePilot.code} official 3DPN pilot`;
      detail.textContent = `${world.population.toLocaleString()} weighted Agents · OD shortest-path routing`;
    } else {
      title.textContent = "18-District Hong Kong macro model";
      detail.textContent = `${world.population.toLocaleString()} illustrative Agents · schematic movement`;
    }
  }

  const scenario = SCENARIOS[world.scenario];
  metricEls.focusName.textContent = metrics.focus.name;
  metricEls.focusType.textContent = metrics.focus.type;
  metricEls.focusArea.textContent = `${formatNumber(metrics.focusArea, 2)} km2`;
  metricEls.focusHeight.textContent = `${formatNumber(metrics.focusHeightMeters, 0)} m`;
  metricEls.focusMaxBuilding.textContent = metrics.focusMaxBuildingMeters
    ? `${formatNumber(metrics.focusMaxBuildingMeters, 0)} m`
    : "n/a";
  metricEls.focusVolume.textContent = `${formatNumber(metrics.focusVolume, 3)} km3`;
  metricEls.focusChildren.textContent = formatNumber(metrics.focusWeightedChildren, 1);
  metricEls.focusDensity.textContent = `${metrics.focusDensity.toFixed(1)} / km3`;
  metricEls.focusFloor.textContent = metrics.focusFloor.toFixed(1);
  metricEls.focusHeat.textContent = metrics.heatLoad.toFixed(2);
  if (metricEls.focusResidentChildrenLabel) {
    metricEls.focusResidentChildrenLabel.textContent = isPopulationWeightedScope()
      ? "Resident children (age 6-16)"
      : "Resident children proxy (age 3-17)";
  }
  metricEls.focusResidentChildren.textContent = metrics.residentChildrenProxy
    ? metrics.residentChildrenProxy.toLocaleString()
    : "n/a";
  metricEls.focusSchools.textContent = metrics.focusSchoolCount ? metrics.focusSchoolCount.toLocaleString() : "n/a";
  metricEls.focusParks.textContent = metrics.focusParkCount ? metrics.focusParkCount.toLocaleString() : "n/a";
  metricEls.focusActivities.textContent = metrics.focusActivityVenueCount
    ? metrics.focusActivityVenueCount.toLocaleString()
    : "n/a";
  metricEls.focusChildPois.textContent = metrics.focusChildPoiCount.toLocaleString();
  metricEls.focusPlayPois.textContent = metrics.focusPlayPoiCount.toLocaleString();
  metricEls.focusSportPois.textContent = metrics.focusSportPoiCount.toLocaleString();
  metricEls.focusStudyPois.textContent = metrics.focusStudyPoiCount.toLocaleString();
  metricEls.focusTransportNodes.textContent = metrics.focusTransportNodeCount
    ? metrics.focusTransportNodeCount.toLocaleString()
    : "n/a";
  metricEls.focusMobilityAccess.textContent = metrics.focusMobilityAccess.toFixed(2);
  metricEls.school.textContent = `${Math.round(metrics.schoolShare * 100)}%`;
  metricEls.commute.textContent = `${Math.round(metrics.commuteShare * 100)}%`;
  metricEls.outdoor.textContent = `${Math.round(metrics.outdoorShare * 100)}%`;
  metricEls.poiUsage.textContent = `${Math.round(metrics.activePoiShare * 100)}% · ${metrics.activePoiDestinations} sites`;
  metricEls.contact.textContent = metrics.contactIndex.toFixed(0);
  metricEls.crowded.textContent = `${Math.round(metrics.crowdedShare * 100)}%`;
  metricEls.exposure.textContent = metrics.contactExposure.toFixed(1);
  metricEls.avoidance.textContent = metrics.avoidedDestinations.toLocaleString();
  metricEls.mvpaMean.textContent = `${formatNumber(metrics.meanMvpaMinutes, 1)} min`;
  metricEls.mvpaGuideline.textContent =
    `${formatNumber(metrics.mvpaGuidelineShare * 100, 1)}% / ` +
    `${formatNumber(metrics.mvpaExternalBenchmarkShare * 100, 1)}%`;
  metricEls.mvpaEarlyYears.textContent =
    `Age ${TCS2011_CHILD_MOBILITY.cohort.modelAgeMin}-${TCS2011_CHILD_MOBILITY.cohort.modelAgeMax}`;
  metricEls.mvpaTravel.textContent = `${formatNumber(metrics.mvpaByDomain.activeTravel, 1)} min`;
  metricEls.mvpaSchool.textContent = `${formatNumber(metrics.mvpaByDomain.school, 1)} min`;
  metricEls.mvpaOutdoor.textContent = `${formatNumber(metrics.mvpaByDomain.outdoor, 1)} min`;
  metricEls.mvpaActivity.textContent = `${formatNumber(metrics.mvpaByDomain.activity, 1)} min`;
  metricEls.mvpaVigorous.textContent = `${formatNumber(metrics.meanVigorousMinutes, 1)} min`;
  metricEls.mvpaMety.textContent = `${formatNumber(metrics.meanMetyMinutes, 0)} METy-min`;
  metricEls.mvpaTracked.textContent = `${formatNumber(metrics.meanPhysicalActivityTrackedMinutes, 0)} min`;
  metricEls.pilotSection.hidden = !isPilotScope();
  metricEls.pilotCalibrationSection.hidden = !isPopulationWeightedScope();
  if (metricEls.pilotTitle) metricEls.pilotTitle.textContent = `${activePilot?.code || "DCCA"} Network Pilot`;
  if (metricEls.pilotSchoolLocalLabel) {
    metricEls.pilotSchoolLocalLabel.textContent = `Inside ${activePilot?.code || "DCCA"} (descriptive)`;
  }
  metricEls.pilotNetwork.textContent = pilotNetwork ? `${formatNumber(pilotNetwork.totalLengthKm, 1)} km` : "n/a";
  metricEls.pilotGraph.textContent = pilotNetwork
    ? `${pilotNetwork.nodeCount.toLocaleString()} nodes / ${pilotNetwork.edgeCount.toLocaleString()} edges`
    : "n/a";
  metricEls.pilotRouted.textContent = isPilotScope()
    ? `${metrics.pilotRoutedAgents.toLocaleString()} / ${world.population.toLocaleString()}`
    : "n/a";
  metricEls.pilotCircuity.textContent = metrics.meanRouteCircuity
    ? `${metrics.meanRouteCircuity.toFixed(2)}x`
    : "n/a";
  metricEls.pilotVertical.textContent = `${formatNumber(metrics.meanRouteVerticalGain, 1)} m`;
  metricEls.pilotFallback.textContent = metrics.pilotRouteFallbacks.toLocaleString();
  metricEls.pilotAgentWeight.textContent = isPilotScope()
    ? `${formatNumber(metrics.weightedPopulationTarget / Math.max(1, world.population), 3)} child / agent`
    : "n/a";
  metricEls.pilotHomes.textContent = isPilotScope()
    ? `${activePilot.homeAnchorCount} / ${activePilot.insideDccaBuildingCount} buildings`
    : "n/a";
  metricEls.pilotSchoolCampuses.textContent = isPilotScope()
    ? `${metrics.assignedSchoolCampusCount} / ${pilotSchoolCampuses.length} campuses`
    : "n/a";
  metricEls.pilotSchoolWalk.textContent = isPilotScope()
    ? `${formatNumber(metrics.meanSchoolTravelMinutes, 1)} / ${TCS_WALK_TARGETS.meanJourneyMinutes} min`
    : "n/a";
  metricEls.pilotSchoolShort.textContent = isPilotScope()
    ? `${Math.round(metrics.shortSchoolWalkShare * 100)}% / ${Math.round(TCS_WALK_TARGETS.atMost10MinuteShare * 100)}%`
    : "n/a";
  metricEls.pilotSchoolLong.textContent = isPilotScope()
    ? `${Math.round(metrics.longSchoolWalkShare * 100)}% / ${Math.round(TCS_WALK_TARGETS.over15MinuteShare * 100)}%`
    : "n/a";
  metricEls.pilotSchoolLocal.textContent = isPilotScope()
    ? `${Math.round(metrics.localSchoolAssignmentShare * 100)}%`
    : "n/a";
  metricEls.pilotSchoolPeak.textContent = isPilotScope()
    ? `${Math.round(metrics.morningPeakDepartureShare * 100)}%`
    : "n/a";
  metricEls.pilotSchoolOnTime.textContent = isPilotScope() && metrics.onTimeSchoolShare !== null
    ? `${Math.round(metrics.onTimeSchoolShare * 100)}% · ${metrics.completedSchoolTripCount.toLocaleString()}`
    : "pending";
  metricEls.weightedPopulation.textContent = isPopulationWeightedScope()
    ? `${formatNumber(metrics.weightedPopulation, 0)} / ${formatNumber(metrics.weightedPopulationTarget, 0)}`
    : "n/a";
  metricEls.parameterVersion.textContent = MODEL_PARAMETERS.version || "unversioned";
  metricEls.tcsCohort.textContent =
    `${TCS2011_CHILD_MOBILITY.cohort.eligibleRespondents.toLocaleString()} / ` +
    `${TCS2011_CHILD_MOBILITY.cohort.mentorProposalRespondents.toLocaleString()}`;
  metricEls.tcsModeMix.textContent =
    `${formatNumber(metrics.walkModeShare * 100, 1)}% / ` +
    `${formatNumber(metrics.mechanisedModeShare * 100, 1)}%`;
  metricEls.tcsTransitMix.textContent =
    `${formatNumber((metrics.travelModeShares.rail || 0) * 100, 1)}% / ` +
    `${formatNumber((metrics.travelModeShares.school_bus || 0) * 100, 1)}%`;
  metricEls.tcsActiveShare.textContent =
    `${formatNumber(metrics.meanConservativeActiveTravelShare * 100, 1)}% / ` +
    `${formatNumber(metrics.meanMentorActiveTravelShare * 100, 1)}%`;
  metricEls.tcsJourney.textContent =
    `${formatNumber(metrics.meanPlannedSchoolJourneyMinutes, 1)} / ` +
    `${formatNumber(metrics.meanTcsJourneyMinutes, 1)} min`;
  metricEls.tcsSpatial.textContent = isKowloonScope()
    ? `Walk: official 3DPN; mechanised: ${metrics.multimodalRoutedTrips.toLocaleString()} spatial / ${metrics.multimodalRouteFallbacks.toLocaleString()} timing fallback`
    : isRegionalScope()
    ? "Walk: official 3DPN OD A*; mechanised: TCS temporal"
    : metrics.mechanisedModeShare > 0
      ? "Temporal; TPUSB pending"
      : "3D walk network";
  metricEls.syntheticHouseholds.textContent = isPilotScope()
    ? `${metrics.syntheticHouseholdCount.toLocaleString()} · ${formatNumber(metrics.meanModelChildrenPerHousehold, 2)} child/hh`
    : isRegionalScope()
      ? `${regionalAnchors.length.toLocaleString()} CSDI residential anchors`
      : "n/a";
  metricEls.stageResidual.textContent = isPopulationWeightedScope()
    ? `${formatNumber(metrics.stageCalibrationMaxError * 100, 2)} pp`
    : "n/a";
  metricEls.householdResidual.textContent = isPilotScope()
    ? `${formatNumber(metrics.householdCompositionMaxError * 100, 2)} pp`
    : "n/a";
  metricEls.adultAccompanied.textContent = isPopulationWeightedScope()
    ? `${Math.round(metrics.adultAccompaniedShare * 100)}%`
    : "n/a";
  metricEls.schoolCapacity.textContent = isPilotScope()
    ? `${Math.round(metrics.schoolCapacityEvidenceShare * 100)}%`
    : "n/a";
  metricEls.walkLimitFallback.textContent = isPilotScope()
    ? `${Math.round(metrics.schoolWalkRangeFallbackShare * 100)}%`
    : "n/a";
  metricEls.homeDistrictSchool.textContent = isPilotScope()
    ? `${Math.round(metrics.homeDistrictSchoolAssignmentShare * 100)}% / ${Math.round(metrics.censusSameDistrictStudyShare * 100)}%`
    : "n/a";
  metricEls.graphDistrictCoverage.textContent = isPilotScope()
    ? `${Math.round(metrics.graphHomeDistrictCandidateShare * 100)}%`
    : "n/a";
  metricEls.poiAssignment.textContent = isPopulationWeightedScope()
    ? `${Math.round(metrics.poiAssignedShare * 100)}%`
    : "n/a";
  metricEls.regionalSection.hidden = !isRegionalScope();
  if (isRegionalScope()) {
    metricEls.regionalDcca.textContent = `${simulationZones().length} / ${visibleDistricts().length} Districts`;
    metricEls.regionalPopulation.textContent =
      `${formatNumber(metrics.weightedPopulation, 0)} / ${formatNumber(metrics.weightedPopulationTarget, 0)}`;
    metricEls.regionalBuildings.textContent = isIslandScope()
      ? hkIslandModel.scope.officialBuildingCount.toLocaleString()
      : (regionalManifest?.attachments?.residentialBuildingAudit?.insideTargetDccaBuildingRecords || 0).toLocaleString();
    metricEls.regionalPlaces.textContent =
      `${regionalAnchors.length.toLocaleString()} / ` +
      `${(regionalManifest?.attachments?.schoolAudit?.count || 0).toLocaleString()} / ` +
      `${(regionalManifest?.attachments?.childPoiAudit?.count || 0).toLocaleString()}`;
    metricEls.regionalNetwork.textContent =
      `${(regionalManifest?.graph?.nodeCount || 0).toLocaleString()} nodes / ` +
      `${(regionalManifest?.graph?.edgeCount || 0).toLocaleString()} edges`;
    metricEls.regionalImpedance.textContent =
      `${formatNumber((regionalManifest?.graph?.primaryComponentShare || 0) * 100, 1)}% / ` +
      `${formatNumber((regionalManifest?.graph?.gzipBytes || 0) / 1024 / 1024, 2)} MiB`;
    const routingDiagnostics = regionalGraph?.diagnostics();
    const routingStatus = activeRegionalRoutingStatus();
    const routingProgress = activeRegionalRoutingProgress();
    metricEls.regionalRouting.textContent = routingStatus === "ready"
      ? isKowloonScope()
        ? `3DPN + OSM multimodal · ${(world.routedTrips + world.multimodalRoutedTrips).toLocaleString()} trips · ${(world.routeFallbacks + world.multimodalRouteFallbacks).toLocaleString()} fallback`
        : `OD A* · ${world.routedTrips.toLocaleString()} trips · ${world.routeFallbacks.toLocaleString()} fallback`
      : routingStatus === "loading"
        ? `Loading ${Math.round(routingProgress * 100)}%`
        : routingStatus === "error"
          ? "Graph load failed · simulation paused"
          : routingDiagnostics?.ready
            ? "OD A* ready"
            : "Graph unavailable";
  }
  metricEls.scenarioSchool.textContent = scenario.schoolOpen ? "Yes" : "No";
  metricEls.scenarioOutdoor.textContent = scenario.outdoorFactor.toFixed(2);
  metricEls.scenarioActivity.textContent = scenario.activityFactor.toFixed(2);
  metricEls.scenarioHeat.textContent = scenario.heat.toFixed(2);
  metricEls.scenarioMobility.textContent = scenario.mobility.toFixed(2);
  metricEls.scenarioContact.textContent = scenario.contact.toFixed(2);
  metricEls.boundarySource.textContent = realGeoData ? "HAD District + EAC DCCA" : "Synthetic";
  metricEls.buildingSource.textContent =
    isPilotScope()
      ? `${pilotBuildingLayer.length.toLocaleString()} ${activePilot.code}-buffer CSDI buildings`
      : isIslandScope()
        ? `${hkIslandModel.scope.officialBuildingCount.toLocaleString()} CSDI buildings / ${hkIslandBuildingLayer.length} detailed samples`
      : isKowloonScope()
        ? `${(regionalManifest?.attachments?.residentialBuildingAudit?.insideTargetDccaBuildingRecords || 0).toLocaleString()} CSDI records / ${kowloonBuildingLayer.length} detailed samples`
      : isNtEastScope()
        ? `${(regionalManifest?.attachments?.residentialBuildingAudit?.insideTargetDccaBuildingRecords || 0).toLocaleString()} CSDI records / ${ntEastBuildingLayer.length} detailed samples`
      : isNtWestScope()
        ? `${(regionalManifest?.attachments?.residentialBuildingAudit?.insideTargetDccaBuildingRecords || 0).toLocaleString()} CSDI records / ${ntWestBuildingLayer.length} detailed samples`
      : isOutlyingIslandsScope()
        ? `${(regionalManifest?.attachments?.residentialBuildingAudit?.insideTargetDccaBuildingRecords || 0).toLocaleString()} CSDI records / ${islandsBuildingLayer.length} detailed samples`
      : realGeoData && officialBuildingSource
      ? `${(officialBuildingSource.recordCount || 0).toLocaleString()} CSDI / ${realBuildingLayer.length} shown`
      : realGeoData
        ? `${realBuildingLayer.length} real building models`
        : "Synthetic";
  metricEls.behaviourSource.textContent = "Census + EDB + uncalibrated priors";
  metricEls.tcsMobilitySource.textContent = "Synthetic walking-only school journeys";
  metricEls.pedestrianNetworkSource.textContent = "LandsD 3DPN / five regional directed graphs";
  metricEls.physicalActivitySource.textContent = "Youth METy + model priors; live estimates";
  updateBuildingPanel();

  Array.from(metricEls.activityList.children).forEach((item, index) => {
    const state = STATE_ORDER[index];
    const share = metrics.weightedCounts[state] / Math.max(1, metrics.stateWeightTotal);
    item.querySelector(".activity-meter span").style.width = `${Math.round(share * 100)}%`;
    item.querySelector("strong").textContent = `${Math.round(share * 100)}%`;
  });

  Array.from(metricEls.activityStack.children).forEach((item) => {
    const state = item.dataset.state;
    const share = metrics.weightedCounts[state] / Math.max(1, metrics.stateWeightTotal);
    item.querySelector(".stack-fill").style.height = `${Math.max(2, share * 160)}px`;
  });

  if (activeView === "stats" || metricEls.statsGrid.children.length === 0) {
    updateStatsView(metrics);
  }
  if (activeView === "comparison") updateComparisonView();
  if (activeView === "routeqa") updateRouteQaView();
  if (activeView === "validation") updateValidationView();
  if (activeView === "kowloonlab") updateKowloonLabView();
  if (activeView === "agents") updateAgentObserverPanel();
  if (!spatialSelectionEls.inspector.hidden) updateSpatialSelectionInspector();
}

function updateStatsView(metrics) {
  const officialBuildingCount = isRegionalScope()
    ? (isIslandScope()
        ? hkIslandModel.scope.officialBuildingCount
        : activeRegionalRoutingManifest()?.attachments?.residentialBuildingAudit?.insideTargetDccaBuildingRecords || 0
      ).toLocaleString()
    : officialBuildingSource?.recordCount
      ? officialBuildingSource.recordCount.toLocaleString()
      : "n/a";
  const statGroups = [
    {
      title: "Population and scope",
      items: [
        ["Children", world.population.toLocaleString(), true],
        ["Census-weighted", isPopulationWeightedScope() ? formatNumber(metrics.weightedPopulation, 0) : "n/a", true],
        [
          "Age cohort",
          `${TCS2011_CHILD_MOBILITY.cohort.modelAgeMin}-${TCS2011_CHILD_MOBILITY.cohort.modelAgeMax}`,
          true,
        ],
        ["Random seed", world.seed.toLocaleString()],
        ["Focus area", metrics.focus.name],
        ["Synthetic households", isPilotScope() ? metrics.syntheticHouseholdCount.toLocaleString() : "n/a"],
      ],
    },
    {
      title: "Mobility and network",
      items: [
        ["Mean travel", `${metrics.meanTravelKm.toFixed(1)} km`, true],
        ["School walk", metrics.meanSchoolTravelMinutes ? `${metrics.meanSchoolTravelMinutes.toFixed(1)} min` : "n/a", true],
        ["Route / direct", metrics.meanRouteCircuity ? `${metrics.meanRouteCircuity.toFixed(2)}x` : "n/a"],
        ["Spatial routing", isRegionalScope() ? "Official regional 3DPN OD A*" : isPilotScope() ? "Official OD A*" : isWholeHkScope() ? "Five regional 3DPN graphs" : "Schematic"],
        ["Synthetic walking mode", `${formatNumber(metrics.walkModeShare * 100, 1)}%`],
        ["School walk unavailable", `${formatNumber(metrics.mechanisedModeShare * 100, 1)}%`],
        ["Schedule duration prior", `${formatNumber(metrics.meanTcsJourneyMinutes, 1)} min`],
        ["On-time school", metrics.onTimeSchoolShare !== null ? `${Math.round(metrics.onTimeSchoolShare * 100)}%` : "pending"],
      ],
    },
    {
      title: "Physical activity",
      items: [
        ["Modelled MVPA", `${formatNumber(metrics.meanMvpaMinutes, 1)} min`, true],
        [
          "Reached 60 min",
          `${formatNumber(metrics.mvpaGuidelineShare * 100, 1)}% / ${formatNumber(metrics.mvpaExternalBenchmarkShare * 100, 1)}% SHS`,
          true,
        ],
        ["Active-travel MVPA", `${formatNumber(metrics.mvpaByDomain.activeTravel, 1)} min`],
        ["School MVPA", `${formatNumber(metrics.mvpaByDomain.school, 1)} min`],
        ["Vigorous activity", `${formatNumber(metrics.meanVigorousMinutes, 1)} min`],
        ["School share", `${Math.round(metrics.schoolShare * 100)}%`],
        ["Outdoor share", `${Math.round(metrics.outdoorShare * 100)}%`],
      ],
    },
    {
      title: "Environment and evidence",
      items: [
        ["Mean occupied floor", metrics.verticalMean.toFixed(1)],
        ["Contact index", metrics.contactIndex.toFixed(0)],
        ["Crowded children", `${Math.round(metrics.crowdedShare * 100)}%`],
        ["Child POIs", "Excluded from public edition"],
        ["Transport nodes", metrics.focusTransportNodeCount ? metrics.focusTransportNodeCount.toLocaleString() : "n/a"],
        ["Official buildings", officialBuildingCount],
        ["Scenario", SCENARIOS[world.scenario].name],
      ],
    },
  ];
  metricEls.statsGrid.innerHTML = statGroups.map(({ title, items }) => `
    <section class="stats-group" aria-label="${title}">
      <h3>${title}</h3>
      <div class="stats-card-grid">
        ${items.map(([label, value, priority = false]) => {
          const valueText = String(value);
          const textValue = valueText.length > 16 || /[A-Za-z]{5,}\s+[A-Za-z]{4,}/.test(valueText);
          return `
            <article class="stat-card${priority ? " priority" : ""}${textValue ? " text-value" : ""}">
              <span>${label}</span>
              <strong>${valueText}</strong>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `).join("");

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

function currentComparisonDataset() {
  const reference = comparisonReference?.webSummary?.[world.scope];
  if (comparisonMode === "reference" && reference) return reference;
  return world.metrics?.geometryComparison || computeGeometryComparison();
}

function signedValue(value, digits = 1, suffix = "") {
  const rounded = Math.abs(value) < Math.pow(10, -digits) / 2 ? 0 : value;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(rounded).toFixed(digits)}${suffix}`;
}

function drawComparisonMetrics(data) {
  resizeCanvas(comparisonMetricsCanvas);
  const ctx = comparisonMetricsCtx;
  const ratio = window.devicePixelRatio || 1;
  const width = comparisonMetricsCanvas.width;
  const height = comparisonMetricsCanvas.height;
  ctx.clearRect(0, 0, width, height);
  const rows = [
    { label: "Walking distance", key: "walkingDistanceKm", unit: " km", digits: 2 },
    { label: "Walking time", key: "walkingTimeMinutes", unit: " min", digits: 1 },
    { label: "Travel MVPA", key: "activeTravelMvpaMinutes", unit: " min", digits: 1 },
    { label: "Total MVPA", key: "totalMvpaMinutes", unit: " min", digits: 1 },
    { label: ">=60 min", key: "guidelineShare", unit: "%", digits: 1, scale: 100 },
  ];
  const left = 132 * ratio;
  const right = 72 * ratio;
  const top = 18 * ratio;
  const rowHeight = Math.max(46 * ratio, (height - top * 2) / rows.length);
  const barWidth = Math.max(40 * ratio, width - left - right);
  ctx.textBaseline = "middle";
  rows.forEach((row, index) => {
    const scale = row.scale || 1;
    const twoD = (data.twoD?.[row.key] || 0) * scale;
    const threeD = (data.threeD?.[row.key] || 0) * scale;
    const maxValue = Math.max(twoD, threeD, 0.001);
    const y = top + index * rowHeight;
    ctx.font = `700 ${11 * ratio}px Inter, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(32, 35, 42, 0.78)";
    ctx.fillText(row.label, 10 * ratio, y + rowHeight * 0.5);
    [[twoD, "#3d78a7", 0.29], [threeD, "#d99434", 0.67]].forEach(([value, color, offset]) => {
      const barY = y + rowHeight * offset;
      const measuredWidth = Math.max(2 * ratio, (value / maxValue) * barWidth);
      ctx.fillStyle = "rgba(32, 35, 42, 0.08)";
      ctx.fillRect(left, barY - 5 * ratio, barWidth, 10 * ratio);
      ctx.fillStyle = color;
      ctx.fillRect(left, barY - 5 * ratio, measuredWidth, 10 * ratio);
      ctx.font = `800 ${10 * ratio}px Inter, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(32, 35, 42, 0.82)";
      ctx.fillText(`${value.toFixed(row.digits)}${row.unit}`, width - 8 * ratio, barY);
    });
    if (index < rows.length - 1) {
      ctx.strokeStyle = "rgba(32, 35, 42, 0.09)";
      ctx.lineWidth = ratio;
      ctx.beginPath();
      ctx.moveTo(8 * ratio, y + rowHeight);
      ctx.lineTo(width - 8 * ratio, y + rowHeight);
      ctx.stroke();
    }
  });
}

function drawComparisonDistribution(data) {
  resizeCanvas(comparisonDistributionCanvas);
  const ctx = comparisonDistributionCtx;
  const ratio = window.devicePixelRatio || 1;
  const width = comparisonDistributionCanvas.width;
  const height = comparisonDistributionCanvas.height;
  ctx.clearRect(0, 0, width, height);
  const quantiles = data.walkTimeDeltaQuantiles || {};
  const points = [
    ["P10", quantiles.p10 || 0],
    ["P25", quantiles.p25 || 0],
    ["Median", quantiles.p50 || 0],
    ["P75", quantiles.p75 || 0],
    ["P90", quantiles.p90 || 0],
  ];
  if (!(data.agentsCompared || 0)) {
    ctx.fillStyle = "rgba(32, 35, 42, 0.58)";
    ctx.font = `700 ${12 * ratio}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("No matched walking trips yet", width / 2, height / 2);
    return;
  }
  const minValue = Math.min(0, ...points.map((point) => point[1]));
  const maxValue = Math.max(0.1, ...points.map((point) => point[1]));
  const padding = Math.max(0.4, (maxValue - minValue) * 0.12);
  const domainMin = minValue - padding;
  const domainMax = maxValue + padding;
  const left = 34 * ratio;
  const right = 22 * ratio;
  const axisY = height * 0.54;
  const xFor = (value) => left + ((value - domainMin) / (domainMax - domainMin)) * (width - left - right);
  ctx.strokeStyle = "rgba(32, 35, 42, 0.24)";
  ctx.lineWidth = 1.2 * ratio;
  ctx.beginPath();
  ctx.moveTo(left, axisY);
  ctx.lineTo(width - right, axisY);
  ctx.stroke();
  const zeroX = xFor(0);
  ctx.strokeStyle = "rgba(32, 35, 42, 0.18)";
  ctx.beginPath();
  ctx.moveTo(zeroX, 26 * ratio);
  ctx.lineTo(zeroX, height - 28 * ratio);
  ctx.stroke();
  ctx.strokeStyle = "#d99434";
  ctx.lineWidth = 3 * ratio;
  ctx.beginPath();
  points.forEach(([, value], index) => {
    const x = xFor(value);
    const y = axisY + (index % 2 === 0 ? -14 : 14) * ratio;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  points.forEach(([label, value], index) => {
    const x = xFor(value);
    const y = axisY + (index % 2 === 0 ? -14 : 14) * ratio;
    ctx.beginPath();
    ctx.arc(x, y, (label === "Median" ? 6 : 4.5) * ratio, 0, Math.PI * 2);
    ctx.fillStyle = label === "Median" ? "#20232a" : "#d99434";
    ctx.fill();
    ctx.font = `800 ${9.5 * ratio}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(32, 35, 42, 0.78)";
    const labelY = index % 2 === 0 ? y - 20 * ratio : y + 20 * ratio;
    ctx.fillText(label, x, labelY);
    ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
    ctx.fillText(signedValue(value, 1, " min"), x, labelY + (index % 2 === 0 ? -12 : 12) * ratio);
  });
}

function updateComparisonDomains(data) {
  const domains = [
    ["Active travel", data.twoD?.activeTravelMvpaMinutes || 0, data.threeD?.activeTravelMvpaMinutes || 0],
    ["School", data.common?.schoolMvpaMinutes || 0, data.common?.schoolMvpaMinutes || 0],
    ["Outdoor / play", data.common?.outdoorMvpaMinutes || 0, data.common?.outdoorMvpaMinutes || 0],
    ["After-school", data.common?.activityMvpaMinutes || 0, data.common?.activityMvpaMinutes || 0],
  ];
  const maxValue = Math.max(1, ...domains.flatMap((domain) => domain.slice(1)));
  comparisonEls.domainRows.innerHTML = domains.map(([label, twoD, threeD]) => `
    <div class="comparison-domain-row">
      <strong>${label}</strong>
      <div class="comparison-domain-pair">
        <span class="comparison-domain-track"><i class="two-d" style="width:${(twoD / maxValue) * 100}%"></i></span>
        <b>${twoD.toFixed(1)} min</b>
        <span class="comparison-domain-track"><i class="three-d" style="width:${(threeD / maxValue) * 100}%"></i></span>
        <b>${threeD.toFixed(1)} min</b>
      </div>
    </div>
  `).join("");
}

function updateComparisonView() {}

function markOsmStaticDirty() {
  osmStaticDirty = true;
}

function activeExpansionPack() {
  return expansionRoutingPacks[expansionState.regionKey] || expansionRoutingPacks.ntWest || expansionRoutingPacks.ntEast || expansionRoutingPacks.kowloon || expansionRoutingPacks.wts;
}

function expansionEndpointLabel(endpoint) {
  if (!endpoint) return "Unknown";
  const type = endpoint.type === "home" ? "Home" : endpoint.type === "school" ? "School" : "Child POI";
  if (endpoint.district) return `${type} · ${endpoint.district}`;
  if (endpoint.dccaId) return `${type} · ${endpoint.dccaId.replace("dcca-2019-", "").toUpperCase()}`;
  const identifier = String(endpoint.id);
  return `${type} · ${identifier.slice(-6)}`;
}

function setExpansionClaim(element, label, text) {
  element.replaceChildren();
  const lead = document.createElement("b");
  lead.textContent = `${label}:`;
  element.append(lead, ` ${text}`);
}

function populateExpansionRoutes() {
  const pack = activeExpansionPack();
  const routes = pack?.evidence?.routeSample || [];
  expansionEls.regionSelect.value = expansionState.regionKey;
  expansionEls.regionSelect.querySelectorAll("option").forEach((option) => {
    option.disabled = !expansionRoutingPacks[option.value]?.manifest;
  });
  expansionEls.routeSelect.innerHTML = "";
  routes.forEach((route, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    const routeLabel = route.label || `${route.start.type} to ${route.destination.type}`;
    option.textContent = `${index + 1} · ${routeLabel} · ${route.traversedChunks.length} chunks`;
    expansionEls.routeSelect.appendChild(option);
  });
  expansionEls.routeSelect.disabled = routes.length === 0;
  expansionEls.previousRoute.disabled = routes.length < 2;
  expansionEls.nextRoute.disabled = routes.length < 2;
}

function selectedExpansionRoute() {
  const routes = activeExpansionPack()?.evidence?.routeSample || [];
  if (!routes.length) return null;
  expansionState.selectedRouteIndex = ((expansionState.selectedRouteIndex % routes.length) + routes.length) % routes.length;
  return routes[expansionState.selectedRouteIndex];
}

function updateExpansionRuntimeStatus(pack) {
  const state = expansionState.statusByRegion[pack.key];
  const isError = state === "error" || state === "unavailable";
  expansionEls.regionalStatus.classList.toggle("pass", !isError);
  expansionEls.regionalStatus.classList.toggle("pending", isError);
  if (state === "loading") {
    expansionEls.regionalStatus.textContent = `${pack.statusLabel} · loading`;
  } else if (state === "ready") {
    expansionEls.regionalStatus.textContent = `${pack.statusLabel} · runtime pass`;
  } else if (isError) {
    expansionEls.regionalStatus.textContent = `${pack.statusLabel} · unavailable`;
  } else {
    expansionEls.regionalStatus.textContent = `${pack.statusLabel} · verified`;
  }
}

function updateKowloonLabView() {}

function kowloonLabProjector() {
  const ratio = window.devicePixelRatio || 1;
  const bounds = computeCombinedBounds(kowloonDccas);
  const pad = 18 * ratio;
  const width = Math.max(1, kowloonLabCanvas.width - pad * 2);
  const height = Math.max(1, kowloonLabCanvas.height - pad * 2);
  const rangeX = Math.max(0.01, bounds.maxX - bounds.minX);
  const rangeY = Math.max(0.01, bounds.maxY - bounds.minY);
  const scale = Math.min(width / rangeX, height / rangeY);
  const usedWidth = rangeX * scale;
  const usedHeight = rangeY * scale;
  const offsetX = pad + (width - usedWidth) / 2;
  const offsetY = pad + (height - usedHeight) / 2;
  return {
    ratio,
    project: (point) => ({
      x: offsetX + (point.x - bounds.minX) * scale,
      y: offsetY + usedHeight - (point.y - bounds.minY) * scale,
    }),
  };
}

function drawKowloonLabGraph(graph, project, options) {
  if (!graph?.edgeFrom?.length) return;
  const step = Math.max(1, Math.ceil(graph.edgeFrom.length / options.maxEdges));
  kowloonLabCtx.save();
  kowloonLabCtx.beginPath();
  for (let edgeId = 0; edgeId < graph.edgeFrom.length; edgeId += step) {
    const start = project(graph.nodePoint(graph.edgeFrom[edgeId]));
    const end = project(graph.nodePoint(graph.edgeTo[edgeId]));
    kowloonLabCtx.moveTo(start.x, start.y);
    kowloonLabCtx.lineTo(end.x, end.y);
  }
  kowloonLabCtx.strokeStyle = options.color;
  kowloonLabCtx.lineWidth = options.width;
  kowloonLabCtx.setLineDash(options.dash || []);
  kowloonLabCtx.stroke();
  kowloonLabCtx.restore();
}

function drawKowloonLabView() {}

function updateExpansionView() {}

function expansionProjector(manifest) {
  const ratio = window.devicePixelRatio || 1;
  const [originE, originN] = manifest.coordinates.appOriginHk1980;
  const appUnit = manifest.coordinates.appUnitMeters;
  const [minE, minN, maxE, maxN] = manifest.scope.boundsHk1980;
  const bounds = {
    minX: (minE - originE) / appUnit,
    minY: (minN - originN) / appUnit,
    maxX: (maxE - originE) / appUnit,
    maxY: (maxN - originN) / appUnit,
  };
  const pad = 22 * ratio;
  const bottomReserve = 78 * ratio;
  const drawWidth = Math.max(1, expansionCanvas.width - pad * 2);
  const drawHeight = Math.max(1, expansionCanvas.height - pad * 2 - bottomReserve);
  const scale = Math.min(drawWidth / (bounds.maxX - bounds.minX), drawHeight / (bounds.maxY - bounds.minY));
  const offsetX = pad + (drawWidth - (bounds.maxX - bounds.minX) * scale) / 2;
  const offsetY = pad + (drawHeight - (bounds.maxY - bounds.minY) * scale) / 2;
  return {
    ratio,
    bounds,
    project: (point) => ({
      x: offsetX + (point.x - bounds.minX) * scale,
      y: offsetY + (bounds.maxY - point.y) * scale,
    }),
  };
}

function drawExpansionPath(ctx, points, project, close = false) {
  if (!points.length) return;
  const first = project(points[0]);
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = project(points[index]);
    ctx.lineTo(point.x, point.y);
  }
  if (close) ctx.closePath();
}

function drawExpansionMarker(ctx, point, type, project, ratio, emphasized = false, variant = "default") {
  const screen = project(point);
  const size = (emphasized ? 5.2 : type === "school" ? 2.5 : 1.8) * ratio;
  const color = type === "home" ? "#657b91" : type === "school" ? "#c4872e" : "#7b5a94";
  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.fillStyle = variant === "fallback" ? "#fbfbf8" : color;
  ctx.strokeStyle = variant === "fallback" ? "#a66b21" : emphasized ? "#ffffff" : "rgba(255,255,255,0.66)";
  ctx.lineWidth = variant === "fallback" ? 1.4 * ratio : emphasized ? 2 * ratio : 0.7 * ratio;
  ctx.beginPath();
  if (type === "home") {
    ctx.arc(0, 0, size, 0, Math.PI * 2);
  } else if (type === "school") {
    ctx.rect(-size, -size, size * 2, size * 2);
  } else {
    ctx.rotate(Math.PI / 4);
    ctx.rect(-size, -size, size * 2, size * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawExpansionLabels(ctx, dccas, route, project, ratio) {
  const routeDccas = new Set([route?.start?.dccaId, route?.destination?.dccaId].filter(Boolean));
  const occupied = [];
  const candidates = [...dccas].sort((a, b) => {
    const routePriority = Number(routeDccas.has(b.id)) - Number(routeDccas.has(a.id));
    return routePriority || (b.areaKm2 || 0) - (a.areaKm2 || 0);
  });
  ctx.save();
  ctx.textAlign = "center";
  candidates.forEach((dcca) => {
    const screen = project({ x: dcca.x, y: dcca.y });
    const emphasized = routeDccas.has(dcca.id);
    const text = dcca.code.replace("DCCA ", "");
    const fontSize = (emphasized ? 9 : 7.2) * ratio;
    ctx.font = `800 ${fontSize}px system-ui, sans-serif`;
    const width = ctx.measureText(text).width + 7 * ratio;
    const height = (emphasized ? 14 : 11) * ratio;
    const box = { x: screen.x - width / 2, y: screen.y - height / 2, width, height };
    const collides = occupied.some((other) =>
      box.x < other.x + other.width + 2 * ratio &&
      box.x + box.width + 2 * ratio > other.x &&
      box.y < other.y + other.height + 2 * ratio &&
      box.y + box.height + 2 * ratio > other.y
    );
    ctx.fillStyle = "rgba(43,51,47,0.42)";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 1.05 * ratio, 0, Math.PI * 2);
    ctx.fill();
    if (collides && !emphasized) return;
    if (emphasized) {
      ctx.fillStyle = "rgba(251,251,248,0.9)";
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }
    ctx.fillStyle = emphasized ? "#8f3d35" : "rgba(32,35,42,0.74)";
    ctx.fillText(text, screen.x, screen.y + fontSize * 0.34);
    occupied.push(box);
  });
  ctx.restore();
}

function drawExpansionElevationProfile(ctx, route, graph, ratio) {
  if (!route?.nodeIds?.length) return;
  const width = Math.min(210 * ratio, expansionCanvas.width * 0.36);
  const height = 78 * ratio;
  const left = expansionCanvas.width - width - 16 * ratio;
  const top = 16 * ratio;
  const elevations = route.nodeIds.map((nodeId) => graph.nodeZ[nodeId] * graph.verticalUnitMeters);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  ctx.save();
  ctx.fillStyle = "rgba(251,251,248,0.92)";
  ctx.strokeStyle = "rgba(32,35,42,0.18)";
  ctx.lineWidth = ratio;
  ctx.fillRect(left, top, width, height);
  ctx.strokeRect(left, top, width, height);
  ctx.beginPath();
  elevations.forEach((elevation, index) => {
    const x = left + 10 * ratio + (index / Math.max(1, elevations.length - 1)) * (width - 20 * ratio);
    const y = top + height - 12 * ratio - ((elevation - min) / Math.max(1, max - min)) * (height - 30 * ratio);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#b64f45";
  ctx.lineWidth = 1.8 * ratio;
  ctx.stroke();
  ctx.fillStyle = "#20232a";
  ctx.font = `${9 * ratio}px system-ui, sans-serif`;
  ctx.fillText(`HKPD ${min.toFixed(0)}-${max.toFixed(0)} m`, left + 9 * ratio, top + 13 * ratio);
  ctx.fillStyle = "#657068";
  ctx.font = `${8 * ratio}px system-ui, sans-serif`;
  ctx.fillText("Selected route elevation", left + 9 * ratio, top + height - 4 * ratio);
  ctx.restore();
}

function drawExpansionView() {}

function terrainQaRows() {
  const rows = terrainReliabilityReference?.byDcca || [];
  return terrainQaState.regionKey === "all"
    ? rows
    : rows.filter((row) => row.regionKey === terrainQaState.regionKey);
}

function terrainQaAreas(rows = terrainQaRows()) {
  const ids = new Set(rows.map((row) => row.dccaId));
  return dccaAreas.filter((area) => ids.has(area.id));
}

function terrainQaFill(value) {
  const metric = TERRAIN_QA_METRICS[terrainQaState.metric] || TERRAIN_QA_METRICS.topologyChangedShare;
  return metric.bins.find((bin) => value <= bin.max)?.color || metric.bins.at(-1).color;
}

function terrainQaProjector(areas) {
  const ratio = window.devicePixelRatio || 1;
  const fallbackBounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  const bounds = areas.length ? computeCombinedBounds(areas) : fallbackBounds;
  const pad = 24 * ratio;
  const bottomReserve = 96 * ratio;
  const drawWidth = Math.max(1, terrainQaCanvas.width - pad * 2);
  const drawHeight = Math.max(1, terrainQaCanvas.height - pad * 2 - bottomReserve);
  const spanX = Math.max(0.001, bounds.maxX - bounds.minX);
  const spanY = Math.max(0.001, bounds.maxY - bounds.minY);
  const scale = Math.min(drawWidth / spanX, drawHeight / spanY);
  const offsetX = pad + (drawWidth - spanX * scale) / 2;
  const offsetY = pad + (drawHeight - spanY * scale) / 2;
  return {
    ratio,
    project: ([x, y]) => ({
      x: offsetX + (x - bounds.minX) * scale,
      y: offsetY + (bounds.maxY - y) * scale,
    }),
  };
}

function drawTerrainQaView() {}

function terrainQaPercent(value, digits = 1) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function terrainQaSigned(value, digits = 3, suffix = "") {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(digits)}${suffix}`;
}

function selectTerrainQaDcca(dccaId) {
  if (!terrainReliabilityReference?.byDcca?.some((row) => row.dccaId === dccaId)) return;
  const row = terrainReliabilityReference.byDcca.find((item) => item.dccaId === dccaId);
  if (terrainQaState.regionKey !== "all" && row.regionKey !== terrainQaState.regionKey) {
    terrainQaState.regionKey = row.regionKey;
    terrainQaEls.regionSelect.value = row.regionKey;
  }
  terrainQaState.selectedDccaId = dccaId;
  updateTerrainQaView();
}

function updateTerrainQaView() {}

function handleTerrainQaClick(event) {
  const rect = terrainQaCanvas.getBoundingClientRect();
  const ratioX = terrainQaCanvas.width / Math.max(1, rect.width);
  const ratioY = terrainQaCanvas.height / Math.max(1, rect.height);
  const point = {
    x: (event.clientX - rect.left) * ratioX,
    y: (event.clientY - rect.top) * ratioY,
  };
  const hit = [...terrainQaState.hitAreas].reverse().find((area) =>
    area.rings.some((ring) => pointInRing(point, ring)),
  );
  if (hit) selectTerrainQaDcca(hit.dccaId);
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
  const resized = [
    sceneCanvas,
    mapCanvas,
    osmCanvas,
    agentCanvas,
    agentProfileCanvas,
    routeQaCanvas,
    terrainQaCanvas,
    buildingCanvas,
    comparisonMetricsCanvas,
    comparisonDistributionCanvas,
    expansionCanvas,
    kowloonLabCanvas,
  ].map((canvas) => resizeCanvas(canvas)).some(Boolean);
  if (resized) markOsmStaticDirty();
}

function project(point) {
  const dx = point.x - camera.target.x;
  const dy = point.y - camera.target.y;
  const verticalDisplayScale = isPilotScope()
    ? (verticalUnitMeters / appUnitMeters) * 2.4
    : isRegionalScope()
      ? (verticalUnitMeters / appUnitMeters) * 10
      : 1;
  const dz = (point.z - camera.target.z) * verticalDisplayScale;
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
  const terrain = isRegionalScope()
    ? simulationZones().find((area) => pointInArea(cell, area))?.terrain || 0
    : 0;
  const p = {
    b0: { x: x0, y: y0, z: terrain },
    b1: { x: x1, y: y0, z: terrain },
    b2: { x: x1, y: y1, z: terrain },
    b3: { x: x0, y: y1, z: terrain },
    t0: { x: x0, y: y0, z: terrain + height },
    t1: { x: x1, y: y0, z: terrain + height },
    t2: { x: x1, y: y1, z: terrain + height },
    t3: { x: x0, y: y1, z: terrain + height },
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
  if (!isPilotScope() && world.layers.flows) drawTravelLines(ctx);

  const faces = [];
  const footprintAreas = isPilotScope() ? [pilotArea] : simulationZones();
  footprintAreas.forEach((zone) => {
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
    if (isPilotScope()) {
      if (world.layers.buildings) {
        pilotBuildingLayer.forEach((building) => {
          faces.push(...buildingFaces(building, building.insideDcca ? "#3f8178" : "#7a8680"));
        });
      }
    } else if (world.layers.buildings) {
      activeSceneBuildingCells().forEach((cell) => {
        faces.push(...distributionColumnFaces(cell));
      });
    }
  }

  faces.sort((a, b) => b.depth - a.depth);
  faces.forEach((face) => {
    if (face.type === "footprint") drawZoneFootprint(ctx, face.zone);
    else drawFace(ctx, face);
  });

  if (isPilotScope()) {
    drawPilotNetwork2D(ctx, (point) => project(point), 0.6);
    if (world.layers.flows) drawPilotActiveRoutes(ctx, (point) => project(point));
  } else if (isRegionalScope()) {
    drawRegionalNetwork2D(ctx, (point) => project(point), 0.42);
  }
  drawFocusVolume(ctx);
  if (world.layers.agents) drawAgents(ctx);
  drawSpatialSelection(ctx, "scene");
  drawLegendStrip(ctx);
  drawHeightScale(ctx);
}

function drawGroundGrid(ctx) {
  ctx.save();
  ctx.lineWidth = 1 * (window.devicePixelRatio || 1);
  if (isPilotScope() && pilotNetwork?.bounds) {
    const bounds = pilotNetwork.bounds;
    const spacing = 0.25;
    for (let x = Math.floor(bounds.minX / spacing) * spacing; x <= bounds.maxX; x += spacing) {
      const a = project({ x, y: bounds.minY, z: 0 });
      const b = project({ x, y: bounds.maxY, z: 0 });
      ctx.strokeStyle = "rgba(60, 81, 69, 0.1)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let y = Math.floor(bounds.minY / spacing) * spacing; y <= bounds.maxY; y += spacing) {
      const a = project({ x: bounds.minX, y, z: 0 });
      const b = project({ x: bounds.maxX, y, z: 0 });
      ctx.strokeStyle = "rgba(60, 81, 69, 0.1)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const regionalBounds = activeRegionalBounds();
  const step = isRegionalScope() ? 4 : 10;
  const minX = Math.floor(regionalBounds.minX / step) * step;
  const maxX = Math.ceil(regionalBounds.maxX / step) * step;
  const minY = Math.floor(regionalBounds.minY / step) * step;
  const maxY = Math.ceil(regionalBounds.maxY / step) * step;
  for (let x = minX; x <= maxX; x += step) {
    const a = project({ x, y: minY, z: 0 });
    const b = project({ x, y: maxY, z: 0 });
    ctx.strokeStyle = x % 30 === 0 ? "rgba(60, 81, 69, 0.18)" : "rgba(60, 81, 69, 0.09)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let y = minY; y <= maxY; y += step) {
    const a = project({ x: minX, y, z: 0 });
    const b = project({ x: maxX, y, z: 0 });
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
    const fillAlpha = isPilotScope() ? 0.08 : zone.id === world.focusId ? 0.46 : 0.25;
    ctx.fillStyle = rgba(zone.color, fillAlpha);
    ctx.fill();
    ctx.strokeStyle = rgba(zone.color, zone.id === world.focusId ? 0.92 : 0.54);
    ctx.lineWidth = zone.id === world.focusId ? 2.2 * (window.devicePixelRatio || 1) : 1 * (window.devicePixelRatio || 1);
    ctx.stroke();
  });

  if (!isRegionalScope() || zone.id === world.focusId) {
    const label = project({ x: zone.x, y: zone.y, z: zone.terrain + 1 });
    ctx.fillStyle = "rgba(32, 35, 42, 0.72)";
    ctx.font = `${11 * (window.devicePixelRatio || 1)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(zone.code, label.x, label.y - 4);
  }
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
  if (isPilotScope()) {
    drawPilotActiveRoutes(ctx, (point) => project(point));
    return;
  }
  const pairs = new Map();
  world.agents.forEach((agent) => {
    if (agent.state !== "commute") return;
    const key = `${agent.homeZone.id}:${agent.schoolZone.id}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  });

  ctx.save();
  pairs.forEach((count, key) => {
    const [homeId, schoolId] = key.split(":");
    const home = focusAreaById.get(homeId);
    const school = focusAreaById.get(schoolId);
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
  if (isPilotScope()) return;
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
  const clusterZoomThreshold = isPilotScope() ? 190 : isRegionalScope() ? 16 : 6.5;
  if (world.population > 900 && camera.zoom < clusterZoomThreshold) {
    drawAgentClusters(ctx, (point) => project(point), sceneCanvas, isPilotScope() ? 26 : 30);
    return;
  }
  const agents = world.agents
    .map((agent) => ({ agent, projected: project(agent.pos) }))
    .sort((a, b) => b.projected.depth - a.projected.depth);

  ctx.save();
  agents.forEach(({ agent, projected }) => {
    const groundZ = agent.target?.groundZ ?? agent.target?.zone?.terrain ?? agent.homeZone.terrain;
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
  const cssWidth = sceneCanvas.width / ratio;
  const panelWidthCss = Math.min(460, Math.max(220, cssWidth - 150));
  const compact = panelWidthCss < 360;
  const columns = compact ? 2 : 3;
  const panelHeightCss = compact ? 168 : 132;
  const x = 18 * ratio;
  const y = sceneCanvas.height - (panelHeightCss + 18) * ratio;
  const width = panelWidthCss * ratio;
  const height = panelHeightCss * ratio;
  ctx.save();
  ctx.fillStyle = "rgba(251, 251, 248, 0.9)";
  ctx.strokeStyle = "rgba(32, 35, 42, 0.16)";
  ctx.lineWidth = ratio;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8 * ratio);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(32, 35, 42, 0.84)";
  ctx.font = `800 ${12 * ratio}px Inter, sans-serif`;
  ctx.fillText("3D activity legend", x + 13 * ratio, y + 18 * ratio);
  ctx.fillStyle = "rgba(32, 35, 42, 0.58)";
  ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
  ctx.fillText(
    compact ? "Colour = state · use height ruler at right" : "Sphere colour = Agent state · height uses the ruler at right",
    x + 13 * ratio,
    y + 34 * ratio,
  );

  const stateColumnWidth = (panelWidthCss - 26) / columns;
  STATE_ORDER.forEach((state, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const sx = x + (14 + column * stateColumnWidth) * ratio;
    const sy = y + (54 + row * 20) * ratio;
    ctx.fillStyle = STATE_META[state].color;
    ctx.beginPath();
    ctx.arc(sx + 4 * ratio, sy, 4.2 * ratio, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(32, 35, 42, 0.74)";
    ctx.font = `700 ${9.5 * ratio}px Inter, sans-serif`;
    ctx.fillText(STATE_META[state].label, sx + 12 * ratio, sy + 1 * ratio);
  });

  const geometryY = y + (compact ? 116 : 108) * ratio;
  const geometryColumnWidth = (panelWidthCss - 26) / (compact ? 1 : 3);
  const geometryItems = [
    ["stem", "Stem = floor / terrain height"],
    ["crowd", "Amber ring = crowding"],
    ["mass", "Extrusion = CSDI building"],
  ];
  geometryItems.forEach(([kind, label], index) => {
    const column = compact ? 0 : index;
    const row = compact ? index : 0;
    const sx = x + (14 + column * geometryColumnWidth) * ratio;
    const sy = geometryY + row * 20 * ratio;
    if (kind === "stem") {
      ctx.strokeStyle = "rgba(61,120,167,0.78)";
      ctx.lineWidth = 1.5 * ratio;
      ctx.beginPath();
      ctx.moveTo(sx + 4 * ratio, sy + 5 * ratio);
      ctx.lineTo(sx + 4 * ratio, sy - 5 * ratio);
      ctx.stroke();
      ctx.fillStyle = STATE_META.home.color;
      ctx.beginPath();
      ctx.arc(sx + 4 * ratio, sy - 5 * ratio, 3 * ratio, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "crowd") {
      ctx.fillStyle = STATE_META.outdoor.color;
      ctx.strokeStyle = "rgba(217,148,52,0.96)";
      ctx.lineWidth = 2 * ratio;
      ctx.beginPath();
      ctx.arc(sx + 4 * ratio, sy, 4.5 * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(36,123,114,0.34)";
      ctx.strokeStyle = "rgba(36,123,114,0.78)";
      ctx.fillRect(sx - 1 * ratio, sy - 5 * ratio, 10 * ratio, 10 * ratio);
      ctx.strokeRect(sx - 1 * ratio, sy - 5 * ratio, 10 * ratio, 10 * ratio);
    }
    ctx.fillStyle = "rgba(32, 35, 42, 0.68)";
    ctx.font = `700 ${(compact ? 8 : 8.5) * ratio}px Inter, sans-serif`;
    ctx.fillText(label, sx + 14 * ratio, sy + 1 * ratio);
  });
  ctx.restore();
}

function drawHeightScale(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const focus = focusAreaById.get(world.focusId) || zones[0];
  const buildingMax = activeBuildingModels().reduce(
    (max, building) => Math.max(max, building.heightMeters || 0),
    0,
  );
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
  ctx.fillText(
    isPilotScope() ? "2.4x vertical" : isRegionalScope() ? "10x terrain display" : `${verticalUnitMeters}m/unit`,
    x - 6 * ratio,
    y + 16 * ratio,
  );
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
  const scale = (Math.min(buildingCanvas.width, buildingCanvas.height) * 0.44 * buildingCamera.zoom) / model.bounds.size;
  return {
    x: buildingCanvas.width * 0.6 + x1 * scale,
    y: buildingCanvas.height * 0.6 - z2 * scale,
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
  const rulerX = clamp(base.x, 34 * ratio, buildingCanvas.width - 58 * ratio);
  const labelOnLeft = rulerX > buildingCanvas.width - 92 * ratio;
  ctx.save();
  ctx.strokeStyle = "rgba(32, 35, 42, 0.72)";
  ctx.fillStyle = "rgba(32, 35, 42, 0.76)";
  ctx.lineWidth = 2 * ratio;
  ctx.beginPath();
  ctx.moveTo(rulerX, base.y);
  ctx.lineTo(rulerX, top.y);
  ctx.stroke();

  ctx.font = `${11 * ratio}px Inter, sans-serif`;
  ctx.textAlign = labelOnLeft ? "right" : "left";
  ctx.textBaseline = "middle";
  [0, 0.5, 1].forEach((tick) => {
    const p = projectBuilding(
      { x: model.bounds.maxX + offset, y: model.bounds.maxY, z: model.bounds.height * tick },
      model,
    );
    ctx.beginPath();
    ctx.moveTo(rulerX - 7 * ratio, p.y);
    ctx.lineTo(rulerX + 7 * ratio, p.y);
    ctx.stroke();
    ctx.fillText(
      `${Math.round(model.bounds.height * tick)}m`,
      rulerX + (labelOnLeft ? -12 : 12) * ratio,
      p.y,
    );
  });
  ctx.restore();
}

function buildingMapProject(point) {
  const bounds = activeRegionalBounds();
  const ratio = window.devicePixelRatio || 1;
  const width = buildingCanvas.width / ratio;
  const height = buildingCanvas.height / ratio;
  const range = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const pad = range * (isPilotScope() ? 0.055 : isRegionalScope() ? 0.06 : 0.08);
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
  activeBuildingCells().forEach((cell) => {
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
  drawAgentClusters(ctx, (point) => buildingMapProject(point), buildingCanvas, 32);
}

function drawBuildingMapPois(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const poiLayer = activePoiLocations();
  poiLayer.forEach((poi) => {
    const p = buildingMapProject(poi);
    const baseSize = isPilotScope() ? 4.2 : 3;
    const size = (poi.group === "play" || poi.group === "sport" ? baseSize + 0.45 : baseSize) * ratio;
    drawPoiSymbol(ctx, p.x, p.y, poi.group, size, poi.group === "health" ? 0.62 : 0.9);
  });
}

function drawBuildingMapSchools(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const schoolLayer = activeSchoolLocations();
  schoolLayer.forEach((school) => {
    const p = buildingMapProject(school);
    const baseSize = isPilotScope() ? 4.7 : 3.35;
    const size = (school.stage === "kindergarten" ? baseSize - 0.45 : baseSize) * ratio;
    drawSchoolMarker(ctx, p.x, p.y, school.stage, size, 0.92);
  });
}

function drawBuildingDistributionLegend(ctx) {
  const ratio = window.devicePixelRatio || 1;
  if (document.body.classList.contains("workbench") && buildingCanvas.clientWidth < 620 && document.getElementById("buildingsView").dataset.legendOpen !== "true") return;
  const rows = [
    {
      label: isPilotScope() ? "CSDI building footprints" : "CSDI density · size = built form signal",
      color: "rgba(217,148,52,0.52)",
      kind: "density",
      show: world.layers.buildings,
    },
    {
      label: "LandsD 3D walk network",
      color: "rgba(28,112,99,0.82)",
      kind: "network",
      show: (isPilotScope() || isRegionalScope()) && world.layers.routes,
    },
    { label: "iGeoCom child POIs · shape key below", color: POI_GROUP_META.play.color, kind: "poi", show: world.layers.poi },
    { label: "EDB school · diamond, colour = stage", color: "#247b72", kind: "school", show: world.layers.schools },
    { label: "Selected building", color: "#20232a", kind: "selected", show: true },
    { label: "Agent cluster · colour = dominant state", color: STATE_META.commute.color, kind: "agent", show: world.layers.agents },
  ].filter((row) => row.show);
  const poiKeyHeight = world.layers.poi ? 54 : 0;
  const cssWidth = buildingCanvas.width / ratio;
  const compact = cssWidth < 620;
  const width = Math.min(318, cssWidth - 32) * ratio;
  const height = (66 + rows.length * 22 + poiKeyHeight) * ratio;
  const x = compact ? 16 * ratio : buildingCanvas.width - width - 20 * ratio;
  const y = compact ? 118 * ratio : buildingCanvas.height - height - 20 * ratio;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(251, 251, 248, 0.9)";
  ctx.strokeStyle = "rgba(32, 35, 42, 0.16)";
  ctx.lineWidth = ratio;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8 * ratio);
  ctx.fill();
  ctx.stroke();
  ctx.font = `800 ${12 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.82)";
  ctx.fillText("Building macro-map key", x + 14 * ratio, y + 20 * ratio);
  ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.56)";
  ctx.fillText("Official built form with active ABM context overlays", x + 14 * ratio, y + 38 * ratio);
  ctx.font = `700 ${11 * ratio}px Inter, sans-serif`;
  rows.forEach(({ label, color, kind }, index) => {
    const yy = y + (62 + index * 22) * ratio;
    const symbolX = x + 24 * ratio;
    if (kind === "poi") {
      drawPoiSymbol(ctx, symbolX, yy, "play", 7 * ratio, 0.96);
    } else if (kind === "school") {
      drawSchoolMarker(ctx, symbolX, yy, "primary", 7.2 * ratio, 0.98);
    } else if (kind === "network") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2 * ratio;
      ctx.beginPath();
      ctx.moveTo(symbolX - 9 * ratio, yy);
      ctx.lineTo(symbolX + 9 * ratio, yy);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(symbolX, yy, kind === "agent" ? 4.2 * ratio : 5.5 * ratio, 0, Math.PI * 2);
      ctx.fill();
      if (kind === "agent") {
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.lineWidth = 1.2 * ratio;
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(32, 35, 42, 0.72)";
    ctx.fillText(label, x + 44 * ratio, yy + 1 * ratio);
  });
  if (world.layers.poi) {
    drawPoiGroupKey(ctx, x + 14 * ratio, y + (70 + rows.length * 22) * ratio, width / ratio - 28, ratio);
  }
  ctx.restore();
}

function drawBuildingModelLegend(ctx, model) {
  const ratio = window.devicePixelRatio || 1;
  if (document.body.classList.contains("workbench") && buildingCanvas.clientWidth < 620 && document.getElementById("buildingsView").dataset.legendOpen !== "true") return;
  const cssWidth = buildingCanvas.width / ratio;
  const compact = cssWidth < 620;
  const width = Math.min(292, cssWidth - 32) * ratio;
  const height = 118 * ratio;
  const x = (compact ? 16 : cssWidth - width / ratio - 20) * ratio;
  const y = (compact ? 118 : buildingCanvas.height / ratio - height / ratio - 20) * ratio;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(251, 251, 248, 0.92)";
  ctx.strokeStyle = "rgba(32, 35, 42, 0.16)";
  ctx.lineWidth = ratio;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8 * ratio);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(32, 35, 42, 0.84)";
  ctx.font = `800 ${12 * ratio}px Inter, sans-serif`;
  ctx.fillText("3D building model key", x + 14 * ratio, y + 18 * ratio);
  ctx.fillStyle = "rgba(32, 35, 42, 0.56)";
  ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
  ctx.fillText("Geometry is extruded from the selected official footprint", x + 14 * ratio, y + 35 * ratio);

  const rows = [
    ["mass", "Teal solid = CSDI building volume"],
    ["ruler", `Ruler = ${formatNumber(model.bounds.height, 1)} m TopHeight - BaseHeight`],
    ["grid", "Ground grid = footprint scale · camera changes view only"],
  ];
  rows.forEach(([kind, label], index) => {
    const sy = y + (58 + index * 19) * ratio;
    const sx = x + 20 * ratio;
    if (kind === "mass") {
      ctx.fillStyle = "rgba(36,123,114,0.78)";
      ctx.fillRect(sx - 5 * ratio, sy - 5 * ratio, 10 * ratio, 10 * ratio);
    } else if (kind === "ruler") {
      ctx.strokeStyle = "rgba(32,35,42,0.72)";
      ctx.lineWidth = 1.5 * ratio;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6 * ratio);
      ctx.lineTo(sx, sy + 6 * ratio);
      ctx.moveTo(sx - 4 * ratio, sy - 6 * ratio);
      ctx.lineTo(sx + 4 * ratio, sy - 6 * ratio);
      ctx.moveTo(sx - 4 * ratio, sy + 6 * ratio);
      ctx.lineTo(sx + 4 * ratio, sy + 6 * ratio);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(36,123,114,0.42)";
      ctx.lineWidth = ratio;
      ctx.strokeRect(sx - 6 * ratio, sy - 5 * ratio, 12 * ratio, 10 * ratio);
    }
    ctx.fillStyle = "rgba(32, 35, 42, 0.7)";
    ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
    ctx.fillText(label, x + 36 * ratio, sy + 1 * ratio);
  });
  ctx.restore();
}

function selectNearestBuildingOnMap(xCss, yCss) {
  const ratio = window.devicePixelRatio || 1;
  let best = null;
  const buildingLayer = activeBuildingModels();
  buildingLayer.forEach((building) => {
    const p = buildingMapProject(building);
    const dist = Math.hypot(p.x / ratio - xCss, p.y / ratio - yCss);
    if (dist < 28 && (!best || dist < best.dist)) best = { building, dist };
  });
  if (!best) return;
  world.buildingId = best.building.id;
  controls.building.value = world.buildingId;
  updateBuildingPanel();
}

function drawSelectedBuildingModel(ctx) {
  const building = selectedBuilding();
  if (!building) return;
  const model = buildingModel(building);
  drawBuildingGrid(ctx, model);
  const faces = buildingViewerFaces(model).sort((a, b) => b.depth - a.depth);
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  faces.forEach((face) => {
    ctx.beginPath();
    drawBuildingPath(ctx, face.points, model);
    ctx.closePath();
    ctx.fillStyle = face.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(32, 35, 42, 0.2)";
    ctx.lineWidth = 0.8 * ratio;
    ctx.stroke();
  });
  ctx.restore();
  drawBuildingRuler(ctx, model);
  drawBuildingModelLegend(ctx, model);
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

  if (world.buildingMode === "model") {
    drawSelectedBuildingModel(ctx);
    return;
  }

  if (isPilotScope()) {
    drawBuildingMapArea(ctx, pilotArea, { fill: true, alpha: 0.1, strokeAlpha: 0.92, width: 2.1 });
    if (world.layers.buildings) {
      drawPilotBuildingFootprints(ctx, (point) => buildingMapProject(point));
    }
    drawPilotNetwork2D(ctx, (point) => buildingMapProject(point), 0.65);
    if (world.layers.agents) drawBuildingMapAgents(ctx);
    if (world.layers.poi) drawBuildingMapPois(ctx);
    if (world.layers.schools) drawBuildingMapSchools(ctx);
    drawSelectedBuildingOnMap(ctx, selectedBuilding());
    drawBuildingDistributionLegend(ctx);
    return;
  }

  if (world.layers.buildings) drawBuildingDistributionMap(ctx);

  if (realGeoData) {
    visibleDccas().forEach((area) => {
      drawBuildingMapArea(ctx, area, {
        fill: isRegionalScope(),
        alpha: area.id === world.focusId ? 0.34 : 0.1,
        stroke: area.id === world.focusId ? "rgba(32, 35, 42, 0.65)" : "rgba(32, 35, 42, 0.08)",
        width: area.id === world.focusId ? 1.8 : isRegionalScope() ? 0.65 : 0.35,
      });
    });
  }

  visibleDistricts().forEach((zone) => {
    drawBuildingMapArea(ctx, zone, {
      fill: !isRegionalScope() && zone.id === world.focusId,
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

  if (world.layers.agents) drawBuildingMapAgents(ctx);
  if (isRegionalScope()) drawRegionalNetwork2D(ctx, (point) => buildingMapProject(point), 0.52);
  if (world.layers.poi) drawBuildingMapPois(ctx);
  if (world.layers.schools) drawBuildingMapSchools(ctx);
  drawSelectedBuildingOnMap(ctx, selectedBuilding());
  drawBuildingDistributionLegend(ctx);
}

function defaultMapViewBounds() {
  if (!hongKongMapBounds) hongKongMapBounds = computeCombinedBounds(zones);
  const bounds = isRegionalScope()
    ? activeRegionalBounds()
    : isPilotScope() && pilotNetwork?.bounds
      ? pilotNetwork.bounds
      : hongKongMapBounds;
  const range = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const pad = range * (isPilotScope() ? 0.055 : isRegionalScope() ? 0.06 : 0.08);
  const minX = bounds.minX - pad;
  const maxX = bounds.maxX + pad;
  const minY = bounds.minY - pad;
  const maxY = bounds.maxY + pad;
  return { minX, maxX, minY, maxY };
}

function currentMapViewBounds() {
  return mapViewport.bounds || defaultMapViewBounds();
}

function fitMapView() {
  mapViewport.bounds = null;
}

function focusMapArea(area) {
  if (!area) {
    fitMapView();
    return;
  }
  const bounds = area.bounds || computeAreaBounds(area);
  const range = Math.max(0.01, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const pad = range * 0.22;
  mapViewport.bounds = {
    minX: bounds.minX - pad,
    maxX: bounds.maxX + pad,
    minY: bounds.minY - pad,
    maxY: bounds.maxY + pad,
  };
}

function zoomMapView(factor) {
  const bounds = currentMapViewBounds();
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const currentWidth = bounds.maxX - bounds.minX;
  const currentHeight = bounds.maxY - bounds.minY;
  const base = defaultMapViewBounds();
  const minRange = Math.max(0.006, Math.max(base.maxX - base.minX, base.maxY - base.minY) / 90);
  const maxRange = Math.max(base.maxX - base.minX, base.maxY - base.minY) * 1.8;
  const nextWidth = clamp(currentWidth / factor, minRange, maxRange);
  const nextHeight = clamp(currentHeight / factor, minRange, maxRange);
  mapViewport.bounds = {
    minX: centerX - nextWidth / 2,
    maxX: centerX + nextWidth / 2,
    minY: centerY - nextHeight / 2,
    maxY: centerY + nextHeight / 2,
  };
}

function mapProject(point, canvas) {
  const { minX, maxX, minY, maxY } = currentMapViewBounds();
  const scale = Math.min(canvas.width / (maxX - minX), canvas.height / (maxY - minY));
  const usedWidth = (maxX - minX) * scale;
  const usedHeight = (maxY - minY) * scale;
  return {
    x: (canvas.width - usedWidth) / 2 + (point.x - minX) * scale,
    y: (canvas.height + usedHeight) / 2 - (point.y - minY) * scale,
  };
}

function drawPilotBuildingFootprints(ctx, projectPoint) {
  if (!pilotBuildingLayer.length) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  pilotBuildingLayer.forEach((building) => {
    if (!building.footprint?.length) return;
    ctx.beginPath();
    building.footprint.forEach(([x, y], index) => {
      const point = projectPoint({ x, y });
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = building.insideDcca ? "rgba(48, 101, 96, 0.36)" : "rgba(74, 84, 81, 0.2)";
    ctx.fill();
    ctx.strokeStyle = building.insideDcca ? "rgba(32, 76, 72, 0.52)" : "rgba(44, 52, 50, 0.28)";
    ctx.lineWidth = 0.55 * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawPilotNetwork2D(ctx, projectPoint, alpha = 0.62) {
  if (!pilotNetworkEdges.length || !world.layers.routes) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  const groups = [
    { edges: pilotNetworkEdgeGroups.vertical, color: `rgba(205, 126, 42, ${alpha})`, width: 1.35 },
    { edges: pilotNetworkEdgeGroups.crossing, color: `rgba(190, 82, 91, ${alpha})`, width: 1.05 },
    { edges: pilotNetworkEdgeGroups.covered, color: `rgba(50, 104, 154, ${alpha})`, width: 0.9 },
    { edges: pilotNetworkEdgeGroups.open, color: `rgba(28, 112, 99, ${alpha})`, width: 0.72 },
  ];
  groups.forEach((group) => {
    ctx.beginPath();
    group.edges.forEach((edge) => {
      const from = pilotNetworkNodes[edge[0]];
      const to = pilotNetworkNodes[edge[1]];
      if (!from || !to) return;
      const a = projectPoint({ x: from[0], y: from[1], z: from[2] });
      const b = projectPoint({ x: to[0], y: to[1], z: to[2] });
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    });
    ctx.strokeStyle = group.color;
    ctx.lineWidth = group.width * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function islandNetworkSegmentStyle(featureType, alpha) {
  if (PILOT_VERTICAL_FEATURES.has(featureType)) {
    return { color: `rgba(205, 126, 42, ${alpha})`, width: 1.35 };
  }
  if (PILOT_CROSSING_FEATURES.has(featureType)) {
    return { color: `rgba(190, 82, 91, ${alpha})`, width: 1.05 };
  }
  return { color: `rgba(28, 112, 99, ${alpha})`, width: 0.72 };
}

function drawIslandNetwork2D(ctx, projectPoint, alpha = 0.5) {
  const segments = hkIslandModel?.displaySegments || [];
  if (!isIslandScope() || !world.layers.routes || !segments.length) return;
  const ratio = window.devicePixelRatio || 1;
  const groups = new Map();
  segments.forEach((segment) => {
    const style = islandNetworkSegmentStyle(segment[6], alpha);
    const key = `${style.color}:${style.width}`;
    const group = groups.get(key) || { ...style, segments: [] };
    group.segments.push(segment);
    groups.set(key, group);
  });
  ctx.save();
  groups.forEach((group) => {
    ctx.beginPath();
    group.segments.forEach((segment) => {
      const start = projectPoint({ x: segment[0], y: segment[1], z: segment[2] });
      const end = projectPoint({ x: segment[3], y: segment[4], z: segment[5] });
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    });
    ctx.strokeStyle = group.color;
    ctx.lineWidth = group.width * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawKowloonNetwork2D(ctx, projectPoint, alpha = 0.5) {
  const graph = v12_9KowloonRoutingGraph;
  if (!isKowloonScope() || !world.layers.routes || !graph?.ready || !kowloonDisplayEdgeIds.length) return;
  const ratio = window.devicePixelRatio || 1;
  const groups = new Map();
  kowloonDisplayEdgeIds.forEach((edgeId) => {
    const style = islandNetworkSegmentStyle(graph.edgeFeatureType[edgeId], alpha);
    const key = `${style.color}:${style.width}`;
    const group = groups.get(key) || { ...style, edgeIds: [] };
    group.edgeIds.push(edgeId);
    groups.set(key, group);
  });
  ctx.save();
  groups.forEach((group) => {
    ctx.beginPath();
    group.edgeIds.forEach((edgeId) => {
      const start = projectPoint(graph.nodePoint(graph.edgeFrom[edgeId]));
      const end = projectPoint(graph.nodePoint(graph.edgeTo[edgeId]));
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    });
    ctx.strokeStyle = group.color;
    ctx.lineWidth = group.width * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawNtEastNetwork2D(ctx, projectPoint, alpha = 0.5) {
  const graph = v12_10NtEastRoutingGraph;
  if (!isNtEastScope() || !world.layers.routes || !graph?.ready || !ntEastDisplayEdgeIds.length) return;
  const ratio = window.devicePixelRatio || 1;
  const groups = new Map();
  ntEastDisplayEdgeIds.forEach((edgeId) => {
    const style = islandNetworkSegmentStyle(graph.edgeFeatureType[edgeId], alpha);
    const key = `${style.color}:${style.width}`;
    const group = groups.get(key) || { ...style, edgeIds: [] };
    group.edgeIds.push(edgeId);
    groups.set(key, group);
  });
  ctx.save();
  groups.forEach((group) => {
    ctx.beginPath();
    group.edgeIds.forEach((edgeId) => {
      const start = projectPoint(graph.nodePoint(graph.edgeFrom[edgeId]));
      const end = projectPoint(graph.nodePoint(graph.edgeTo[edgeId]));
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    });
    ctx.strokeStyle = group.color;
    ctx.lineWidth = group.width * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawV12_11Network2D(ctx, projectPoint, graph, edgeIds, alpha = 0.5) {
  if (!world.layers.routes || !graph?.ready || !edgeIds.length) return;
  const ratio = window.devicePixelRatio || 1;
  const groups = new Map();
  edgeIds.forEach((edgeId) => {
    const style = islandNetworkSegmentStyle(graph.edgeFeatureType[edgeId], alpha);
    const key = `${style.color}:${style.width}`;
    const group = groups.get(key) || { ...style, edgeIds: [] };
    group.edgeIds.push(edgeId);
    groups.set(key, group);
  });
  ctx.save();
  groups.forEach((group) => {
    ctx.beginPath();
    group.edgeIds.forEach((edgeId) => {
      const start = projectPoint(graph.nodePoint(graph.edgeFrom[edgeId]));
      const end = projectPoint(graph.nodePoint(graph.edgeTo[edgeId]));
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    });
    ctx.strokeStyle = group.color;
    ctx.lineWidth = group.width * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawRegionalNetwork2D(ctx, projectPoint, alpha = 0.5) {
  if (isWholeHkScope()) {
    for (const region of wholeHkRegions()) {
      if (wholeHkState.cohorts.has(region.id)) withWholeHkRegion(region.id, () => drawRegionalNetwork2D(ctx, projectPoint, alpha));
    }
    return;
  }
  if (isIslandScope()) drawIslandNetwork2D(ctx, projectPoint, alpha);
  else if (isKowloonScope()) drawKowloonNetwork2D(ctx, projectPoint, alpha);
  else if (isNtEastScope()) drawNtEastNetwork2D(ctx, projectPoint, alpha);
  else if (isNtWestScope()) {
    drawV12_11Network2D(ctx, projectPoint, v12_11NtWestRoutingGraph, ntWestDisplayEdgeIds, alpha);
  } else if (isOutlyingIslandsScope()) {
    drawV12_11Network2D(ctx, projectPoint, v12_11IslandsRoutingGraph, islandsDisplayEdgeIds, alpha);
  }
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
  activeBuildingCells().forEach((cell) => {
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

function schoolMarkerColor(stage, alpha = 0.58) {
  if (stage === "kindergarten") return `rgba(74, 128, 184, ${alpha * 0.72})`;
  if (stage === "primary") return `rgba(36, 123, 114, ${alpha})`;
  if (stage === "secondary") return `rgba(58, 93, 142, ${alpha})`;
  return `rgba(42, 92, 132, ${alpha * 0.8})`;
}

function drawSchoolMarker(ctx, x, y, stage, size, alpha = 0.92) {
  const traceDiamond = (scale) => {
    ctx.beginPath();
    ctx.moveTo(x, y - size * scale);
    ctx.lineTo(x + size * scale, y);
    ctx.lineTo(x, y + size * scale);
    ctx.lineTo(x - size * scale, y);
    ctx.closePath();
  };

  ctx.save();
  ctx.lineJoin = "round";
  traceDiamond(1.18);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fill();
  ctx.strokeStyle = "rgba(32,35,42,0.56)";
  ctx.lineWidth = Math.max(0.9, size * 0.2);
  ctx.stroke();

  traceDiamond(0.76);
  ctx.fillStyle = schoolMarkerColor(stage, alpha);
  ctx.fill();
  ctx.restore();
}

function drawMapSchools(ctx) {
  const schoolLayer = activeSchoolLocations();
  if (!schoolLayer.length) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  schoolLayer.forEach((school) => {
    const p = mapProject(school, mapCanvas);
    const baseSize = isPilotScope() ? 4.7 : 3.35;
    const size = (school.stage === "kindergarten" ? baseSize - 0.45 : baseSize) * ratio;
    drawSchoolMarker(ctx, p.x, p.y, school.stage, size, 0.9);
  });
  ctx.restore();
}

function mobilityNodeColor(type, alpha = 0.62) {
  if (type === "rail_station") return `rgba(32, 91, 148, ${alpha})`;
  if (type === "subway_entrance") return `rgba(37, 113, 104, ${alpha})`;
  if (type === "ferry_terminal") return `rgba(46, 132, 170, ${alpha})`;
  if (type === "tram_stop") return `rgba(139, 104, 178, ${alpha})`;
  return `rgba(38, 132, 122, ${alpha * 0.72})`;
}

function drawMapMobilityNodes(ctx) {
  const nodes = activeMobilityNodes();
  if (!nodes.length) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  nodes.forEach((node) => {
    const p = mapProject(node, mapCanvas);
    const radius = (node.type === "rail_station" || node.type === "ferry_terminal" ? 2.2 : 1.35) * ratio;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = mobilityNodeColor(node.type, 0.5);
    ctx.fill();
  });
  ctx.restore();
}

function drawPoiSymbol(ctx, x, y, group, size, alpha = 0.72) {
  const meta = POI_GROUP_META[group] || POI_GROUP_META.community;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = meta.color;
  ctx.strokeStyle = meta.color;
  ctx.lineWidth = Math.max(1.25, size * 0.38);
  ctx.beginPath();
  if (meta.shape === "square") {
    ctx.rect(x - size, y - size, size * 2, size * 2);
  } else if (meta.shape === "diamond") {
    ctx.moveTo(x, y - size * 1.25);
    ctx.lineTo(x + size * 1.25, y);
    ctx.lineTo(x, y + size * 1.25);
    ctx.lineTo(x - size * 1.25, y);
    ctx.closePath();
  } else if (meta.shape === "triangle") {
    ctx.moveTo(x, y - size * 1.25);
    ctx.lineTo(x + size * 1.15, y + size);
    ctx.lineTo(x - size * 1.15, y + size);
    ctx.closePath();
  } else if (meta.shape === "cross") {
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.globalAlpha = 0.94;
    ctx.strokeStyle = "rgba(255,255,255,0.96)";
    ctx.lineWidth = Math.max(2.5, size * 0.92);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = Math.max(1.25, size * 0.42);
    ctx.stroke();
    ctx.restore();
    return;
  } else {
    ctx.arc(x, y, size, 0, Math.PI * 2);
  }
  ctx.globalAlpha = 0.94;
  ctx.strokeStyle = "rgba(255,255,255,0.96)";
  ctx.lineWidth = Math.max(2, size * 0.62);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = meta.color;
  ctx.fill();
  ctx.restore();
}

function drawPoiGroupKey(ctx, x, y, widthCss, ratio) {
  const entries = Object.entries(POI_GROUP_META);
  const columns = 3;
  const columnWidth = widthCss / columns;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(32, 35, 42, 0.6)";
  ctx.font = `800 ${8.5 * ratio}px Inter, sans-serif`;
  ctx.fillText("CHILD POI SHAPE / COLOUR", x, y);
  entries.forEach(([group, meta], index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const sx = x + (column * columnWidth + 5) * ratio;
    const sy = y + (17 + row * 18) * ratio;
    drawPoiSymbol(ctx, sx, sy, group, 4.2 * ratio, group === "health" ? 0.72 : 0.92);
    ctx.fillStyle = "rgba(32, 35, 42, 0.67)";
    ctx.font = `700 ${8 * ratio}px Inter, sans-serif`;
    ctx.fillText(meta.label, sx + 9 * ratio, sy + 1 * ratio);
  });
  ctx.restore();
}

function drawMapPois(ctx) {
  const poiLayer = activePoiLocations();
  if (!poiLayer.length) return;
  const ratio = window.devicePixelRatio || 1;
  poiLayer.forEach((poi) => {
    const p = mapProject(poi, mapCanvas);
    const baseSize = isPilotScope() ? 4.2 : 3;
    const size = (poi.group === "play" || poi.group === "sport" ? baseSize + 0.45 : baseSize) * ratio;
    drawPoiSymbol(ctx, p.x, p.y, poi.group, size, poi.group === "health" ? 0.62 : 0.9);
  });
}

function collectAgentClusters(projectPoint, canvas, cellCss = 34) {
  const ratio = window.devicePixelRatio || 1;
  const cell = cellCss * ratio;
  const clusters = new Map();
  world.agents.forEach((agent) => {
    const p = projectPoint(agent.pos);
    if (p.x < 0 || p.y < 0 || p.x > canvas.width || p.y > canvas.height) return;
    const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    const cluster = clusters.get(key) || {
      count: 0,
      x: 0,
      y: 0,
      states: Object.fromEntries(STATE_ORDER.map((state) => [state, 0])),
    };
    cluster.count += 1;
    cluster.x += p.x;
    cluster.y += p.y;
    cluster.states[agent.state] += 1;
    clusters.set(key, cluster);
  });
  return [...clusters.values()];
}

function drawAgentClusters(ctx, projectPoint, canvas, cellCss = 34) {
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  collectAgentClusters(projectPoint, canvas, cellCss).forEach((cluster) => {
    const x = cluster.x / cluster.count;
    const y = cluster.y / cluster.count;
    const dominantState = STATE_ORDER.reduce(
      (best, state) => (cluster.states[state] > cluster.states[best] ? state : best),
      STATE_ORDER[0],
    );
    const radius = clamp(3.2 + Math.sqrt(cluster.count) * 1.35, 4, 15) * ratio;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = rgba(STATE_META[dominantState].color, 0.82);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.35 * ratio;
    ctx.stroke();
    if (cluster.count >= 8) {
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.font = `800 ${Math.max(9, Math.min(12, 8 + Math.log10(cluster.count) * 2)) * ratio}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(cluster.count), x, y + 0.5 * ratio);
    }
  });
  ctx.restore();
}

function drawMapTravelLines(ctx) {
  if (isPilotScope()) {
    drawPilotActiveRoutes(ctx, (point) => mapProject(point, mapCanvas));
    return;
  }
  const pairs = new Map();
  world.agents.forEach((agent) => {
    if (agent.state !== "commute") return;
    const key = `${agent.homeZone.id}:${agent.schoolZone.id}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  });
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setLineDash([7 * ratio, 5 * ratio]);
  pairs.forEach((count, key) => {
    if (count < 2) return;
    const [homeId, schoolId] = key.split(":");
    const home = focusAreaById.get(homeId);
    const school = focusAreaById.get(schoolId);
    if (!home || !school) return;
    const start = mapProject(home, mapCanvas);
    const end = mapProject(school, mapCanvas);
    const lift = Math.min(42 * ratio, count * 0.42 * ratio);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo((start.x + end.x) / 2, (start.y + end.y) / 2 - lift, end.x, end.y);
    ctx.strokeStyle = `rgba(217, 148, 52, ${clamp(count / 75, 0.16, 0.64)})`;
    ctx.lineWidth = clamp(count / 18, 0.8, 5.5) * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawPilotActiveRoutes(ctx, projectPoint) {
  const commuters = world.agents.filter((agent) => agent.state === "commute" && agent.route?.length);
  if (!commuters.length) return;
  const ratio = window.devicePixelRatio || 1;
  const stride = Math.max(1, Math.ceil(commuters.length / 70));
  ctx.save();
  commuters.forEach((agent, index) => {
    if (index % stride !== 0) return;
    ctx.beginPath();
    const start = projectPoint(agent.pos);
    ctx.moveTo(start.x, start.y);
    for (let routeIndex = agent.routeIndex; routeIndex < agent.route.length; routeIndex += 1) {
      const point = projectPoint(agent.route[routeIndex]);
      ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = "rgba(217, 148, 52, 0.24)";
    ctx.lineWidth = 1.25 * ratio;
    ctx.stroke();
  });
  ctx.restore();
}

function drawMap() {
  const ctx = mapCtx;
  const w = mapCanvas.width;
  const h = mapCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#c8e2df";
  ctx.fillRect(0, 0, w, h);

  if (isPilotScope()) {
    drawMapArea(ctx, pilotArea, { alpha: 0.2, strokeAlpha: 0.96, width: 2.4 });
    if (world.layers.buildings) {
      drawPilotBuildingFootprints(ctx, (point) => mapProject(point, mapCanvas));
    }
    drawPilotNetwork2D(ctx, (point) => mapProject(point, mapCanvas), 0.68);
    if (world.layers.flows) drawMapTravelLines(ctx);
    if (world.layers.agents) {
      drawAgentClusters(ctx, (point) => mapProject(point, mapCanvas), mapCanvas, 26);
    }
    if (world.layers.poi) drawMapPois(ctx);
    if (world.layers.schools) drawMapSchools(ctx);
    drawSpatialSelection(ctx, "map");
    drawMapLegend(ctx);
    return;
  }

  if (realGeoData) {
    visibleDccas().forEach((area) => {
      drawMapArea(ctx, area, {
        fill: isRegionalScope(),
        alpha: area.id === world.focusId ? 0.5 : 0.18,
        strokeAlpha: area.id === world.focusId ? 0.95 : isRegionalScope() ? 0.36 : 0.12,
        width: area.id === world.focusId ? 2.2 : isRegionalScope() ? 0.75 : 0.45,
      });
    });
  }

  visibleDistricts().forEach((zone) => {
    drawMapArea(ctx, zone, {
      fill: !isRegionalScope(),
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

  if (world.layers.buildings) drawMapBuildingDistribution(ctx);
  if (isRegionalScope()) drawRegionalNetwork2D(ctx, (point) => mapProject(point, mapCanvas), 0.48);
  if (world.layers.transport) drawMapMobilityNodes(ctx);
  if (world.layers.flows) drawMapTravelLines(ctx);
  if (world.layers.agents) {
    drawAgentClusters(ctx, (point) => mapProject(point, mapCanvas), mapCanvas, 32);
  }
  if (world.layers.poi) drawMapPois(ctx);
  if (world.layers.schools) drawMapSchools(ctx);

  drawSpatialSelection(ctx, "map");
  drawMapLegend(ctx);
}

function drawMapLegend(ctx) {
  const ratio = window.devicePixelRatio || 1;
  const rows = [
    { label: isPilotScope() ? `${activePilot.code} ${activePilot.name} boundary` : isRegionalScope() ? `${visibleDistricts().length} regional Districts` : "18 District boundary", color: "#53a39b", kind: "fill", show: true },
    { label: isRegionalScope() ? `${simulationZones().length} official DCCA 2019 zones` : "DCCA 2019 linework", color: "#20232a", kind: "line", show: !isPilotScope() },
    { label: isPilotScope() ? "CSDI building footprints" : "Building density · larger = more built form", color: "#d99434", kind: "density", show: world.layers.buildings },
    { label: isRegionalScope() ? regionalNetworkLegendLabel() : "LandsD 3D pedestrian network", color: "#1c7063", kind: "network", show: (isPilotScope() || isRegionalScope()) && world.layers.routes },
    { label: "iGeoCom child POIs · shape key below", color: POI_GROUP_META.play.color, kind: "poi", show: world.layers.poi },
    { label: "Mobility nodes · colour = transport type", color: "#25847a", kind: "mobility", show: world.layers.transport },
    { label: "EDB school · diamond, colour = stage", color: "#247b72", kind: "school", show: world.layers.schools },
    { label: "Selected focus area", color: "#20232a", kind: "focus", show: !isPilotScope() },
    { label: "Agent cluster · colour = state, number = Agents", color: STATE_META.commute.color, kind: "dot", show: world.layers.agents },
    {
      label: isPilotScope()
        ? "Sampled active routes"
        : isRegionalScope()
          ? "Aggregated DCCA OD · not routes"
          : "Aggregated District OD · not routes",
      color: STATE_META.commute.color,
      kind: "flow",
      show: world.layers.flows,
    },
  ].filter((item) => item.show);
  const showStateKey = world.layers.agents && !isPilotScope();
  const poiKeyHeight = world.layers.poi ? 54 : 0;
  const width = 282 * ratio;
  const height = (76 + rows.length * 26 + poiKeyHeight + (showStateKey ? 50 : 0)) * ratio;
  const x = 24 * ratio;
  const y = mapCanvas.height - height - 24 * ratio;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
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
  ctx.fillText("2D model map key", x + 14 * ratio, y + 20 * ratio);
  ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.56)";
  ctx.fillText("Active overlays only · model coordinates, not an OSM basemap", x + 14 * ratio, y + 39 * ratio);

  ctx.font = `700 ${12 * ratio}px Inter, sans-serif`;
  rows.forEach((item, index) => {
    const yy = y + (66 + index * 26) * ratio;
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
    } else if (item.kind === "network") {
      ctx.strokeStyle = "rgba(28, 112, 99, 0.9)";
      ctx.lineWidth = 2.2 * ratio;
      ctx.beginPath();
      ctx.moveTo(symbolX - 10 * ratio, yy);
      ctx.lineTo(symbolX + 14 * ratio, yy);
      ctx.stroke();
    } else if (item.kind === "mobility") {
      ctx.fillStyle = mobilityNodeColor("subway_entrance", 0.72);
      ctx.beginPath();
      ctx.arc(symbolX + 2 * ratio, yy, 5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === "school") {
      drawSchoolMarker(ctx, symbolX + 2 * ratio, yy, "primary", 7.2 * ratio, 0.98);
    } else if (item.kind === "poi") {
      drawPoiSymbol(ctx, symbolX + 2 * ratio, yy, "play", 7 * ratio, 0.96);
    } else if (item.kind === "focus") {
      ctx.strokeStyle = "rgba(32, 35, 42, 0.9)";
      ctx.lineWidth = 3 * ratio;
      ctx.strokeRect(symbolX - 8 * ratio, yy - 7 * ratio, 20 * ratio, 14 * ratio);
    } else if (item.kind === "flow") {
      ctx.strokeStyle = rgba(item.color, 0.8);
      ctx.lineWidth = 2.2 * ratio;
      ctx.setLineDash(isPilotScope() ? [] : [6 * ratio, 4 * ratio]);
      ctx.beginPath();
      ctx.moveTo(symbolX - 9 * ratio, yy + 4 * ratio);
      ctx.quadraticCurveTo(symbolX + 2 * ratio, yy - 8 * ratio, symbolX + 13 * ratio, yy + 4 * ratio);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(symbolX + 2 * ratio, yy, 5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(32, 35, 42, 0.72)";
    ctx.fillText(item.label, x + 52 * ratio, yy);
  });

  if (world.layers.poi) {
    drawPoiGroupKey(ctx, x + 14 * ratio, y + (78 + rows.length * 26) * ratio, 254, ratio);
  }

  if (showStateKey) {
    const startY = y + (74 + rows.length * 26 + poiKeyHeight) * ratio;
    ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
    STATE_ORDER.forEach((state, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const sx = x + (18 + column * 80) * ratio;
      const sy = startY + row * 20 * ratio;
      ctx.fillStyle = STATE_META[state].color;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5 * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(32, 35, 42, 0.68)";
      ctx.fillText(STATE_META[state].label, sx + 8 * ratio, sy);
    });
  }

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
  // Covers the first animation frame before the file-launch map adapter loads.
  if (location.protocol === "file:") return null;
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
  const cells = activeBuildingCells();
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

function drawOsmSchools(ctx) {
  const schoolLayer = activeSchoolLocations();
  if (!schoolLayer.length) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  schoolLayer.forEach((school) => {
    const p = osmProjectLonLat(school.lon, school.lat);
    if (p.x < -8 * ratio || p.y < -8 * ratio || p.x > osmCanvas.width + 8 * ratio || p.y > osmCanvas.height + 8 * ratio) {
      return;
    }
    const baseSize = osmMap.zoom >= 13 ? 5.6 : osmMap.zoom >= 11 ? 4.25 : 3.4;
    const size = (school.stage === "kindergarten" ? baseSize - 0.45 : baseSize) * ratio;
    drawSchoolMarker(ctx, p.x, p.y, school.stage, size, 0.94);
  });
  ctx.restore();
}

function drawOsmMobilityNodes(ctx) {
  const nodes = activeMobilityNodes();
  if (!nodes.length) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  nodes.forEach((node) => {
    const p = osmProjectLonLat(node.lon, node.lat);
    if (p.x < -8 * ratio || p.y < -8 * ratio || p.x > osmCanvas.width + 8 * ratio || p.y > osmCanvas.height + 8 * ratio) {
      return;
    }
    const radius = (node.type === "rail_station" || node.type === "ferry_terminal" ? 2.5 : 1.45) * ratio;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = mobilityNodeColor(node.type, 0.58);
    ctx.fill();
  });
  ctx.restore();
}

function drawOsmPois(ctx) {
  const poiLayer = activePoiLocations();
  if (!poiLayer.length) return;
  const ratio = window.devicePixelRatio || 1;
  const stride = osmMap.zoom <= 10 ? 2 : 1;
  for (let index = 0; index < poiLayer.length; index += stride) {
    const poi = poiLayer[index];
    const p = osmProjectLonLat(poi.lon, poi.lat);
    if (p.x < -8 * ratio || p.y < -8 * ratio || p.x > osmCanvas.width + 8 * ratio || p.y > osmCanvas.height + 8 * ratio) {
      continue;
    }
    const baseSize = osmMap.zoom >= 13 ? 5.1 : osmMap.zoom >= 11 ? 4 : 3.05;
    const size = (poi.group === "play" || poi.group === "sport" ? baseSize + 0.45 : baseSize) * ratio;
    drawPoiSymbol(ctx, p.x, p.y, poi.group, size, poi.group === "health" ? 0.66 : 0.92);
  }
}

function drawOsmTravelLines(ctx) {
  if (isPilotScope()) {
    drawPilotActiveRoutes(ctx, (point) => osmProjectLocal(point));
    return;
  }
  const pairs = new Map();
  world.agents.forEach((agent) => {
    if (agent.state !== "commute") return;
    const key = `${agent.homeZone.id}:${agent.schoolZone.id}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  });
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setLineDash([7 * ratio, 5 * ratio]);
  pairs.forEach((count, key) => {
    if (count < 2) return;
    const [homeId, schoolId] = key.split(":");
    const home = focusAreaById.get(homeId);
    const school = focusAreaById.get(schoolId);
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
  if (osmMap.zoom <= 12 || world.population > 1200) {
    drawAgentClusters(ctx, (point) => osmProjectLocal(point), osmCanvas, 34);
    return;
  }
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
  const rows = [
    { label: isPilotScope() ? `${activePilot.code} ${activePilot.name} boundary` : isRegionalScope() ? regionalScopeLabel() : "District / DCCA boundaries", kind: "boundary", show: true },
    { label: isPilotScope() ? "CSDI building footprints" : "Building density · larger = more built form", kind: "density", show: world.layers.buildings },
    { label: isRegionalScope() ? regionalNetworkLegendLabel() : "LandsD 3D pedestrian network", kind: "network", show: (isPilotScope() || isRegionalScope()) && world.layers.routes },
    { label: "iGeoCom child POIs · shape key below", kind: "poi", show: world.layers.poi },
    { label: "Mobility nodes · colour = transport type", kind: "mobility", show: world.layers.transport },
    { label: "EDB school · diamond, colour = stage", kind: "school", show: world.layers.schools },
    {
      label: osmMap.zoom <= 12 || world.population > 1200
        ? "Agent cluster · colour = state, number = Agents"
        : "Individual child Agent · colour = state",
      kind: "agent",
      show: world.layers.agents,
    },
    {
      label: isPilotScope()
        ? "Sampled active routes"
        : isRegionalScope()
          ? "Aggregated DCCA OD · not routes"
          : "Aggregated District OD · not routes",
      kind: "flow",
      show: world.layers.flows,
    },
  ].filter((row) => row.show);
  const showStateKey = world.layers.agents && !isPilotScope();
  const poiKeyHeight = world.layers.poi ? 54 : 0;
  const width = 304 * ratio;
  const height = (78 + rows.length * 26 + poiKeyHeight + (showStateKey ? 50 : 0)) * ratio;
  const x = 18 * ratio;
  const y = osmCanvas.height - height - 18 * ratio;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(251, 251, 248, 0.91)";
  ctx.strokeStyle = "rgba(32, 35, 42, 0.16)";
  ctx.lineWidth = ratio;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8 * ratio);
  ctx.fill();
  ctx.stroke();

  ctx.font = `800 ${12 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.82)";
  ctx.fillText(location.protocol === "file:" ? "Local map · bundled geographic data" : isPilotScope() ? `OSM ${activePilot.code} network pilot` : isRegionalScope() ? `OSM ${regionalScopeLabel()} ABM` : "OSM macro map", x + 14 * ratio, y + 22 * ratio);
  ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.56)";
  ctx.fillText(location.protocol === "file:" ? "LandsD / CSDI / EDB · boundaries include sea" : "OpenStreetMap basemap · active ABM overlays only", x + 14 * ratio, y + 41 * ratio);
  ctx.font = `700 ${11 * ratio}px Inter, sans-serif`;
  rows.forEach((row, index) => {
    const yy = y + (68 + index * 26) * ratio;
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
    } else if (row.kind === "network") {
      ctx.strokeStyle = "rgba(28,112,99,0.9)";
      ctx.lineWidth = 2.2 * ratio;
      ctx.beginPath();
      ctx.moveTo(sx - 10 * ratio, yy);
      ctx.lineTo(sx + 10 * ratio, yy);
      ctx.stroke();
    } else if (row.kind === "mobility") {
      ctx.fillStyle = mobilityNodeColor("subway_entrance", 0.74);
      ctx.beginPath();
      ctx.arc(sx, yy, 5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    } else if (row.kind === "school") {
      drawSchoolMarker(ctx, sx, yy, "primary", 7.2 * ratio, 0.98);
    } else if (row.kind === "poi") {
      drawPoiSymbol(ctx, sx, yy, "play", 7 * ratio, 0.96);
    } else if (row.kind === "flow") {
      ctx.strokeStyle = rgba(STATE_META.commute.color, 0.82);
      ctx.lineWidth = 2.2 * ratio;
      ctx.setLineDash(isPilotScope() ? [] : [6 * ratio, 4 * ratio]);
      ctx.beginPath();
      ctx.moveTo(sx - 10 * ratio, yy + 4 * ratio);
      ctx.quadraticCurveTo(sx, yy - 8 * ratio, sx + 10 * ratio, yy + 4 * ratio);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = STATE_META.commute.color;
      ctx.beginPath();
      ctx.arc(sx, yy, 5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(32, 35, 42, 0.72)";
    ctx.fillText(row.label, x + 48 * ratio, yy + 1 * ratio);
  });

  if (world.layers.poi) {
    drawPoiGroupKey(ctx, x + 14 * ratio, y + (80 + rows.length * 26) * ratio, 276, ratio);
  }

  if (showStateKey) {
    const startY = y + (76 + rows.length * 26 + poiKeyHeight) * ratio;
    ctx.font = `700 ${9 * ratio}px Inter, sans-serif`;
    STATE_ORDER.forEach((state, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const sx = x + (18 + column * 94) * ratio;
      const sy = startY + row * 20 * ratio;
      ctx.fillStyle = STATE_META[state].color;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5 * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(32, 35, 42, 0.68)";
      ctx.fillText(STATE_META[state].label, sx + 8 * ratio, sy);
    });
  }

  ctx.textAlign = "right";
  ctx.font = `700 ${10 * ratio}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(32, 35, 42, 0.58)";
  ctx.fillText("© OpenStreetMap contributors", osmCanvas.width - 14 * ratio, osmCanvas.height - 12 * ratio);
  ctx.restore();
}

function drawOsmStaticLayer(ctx) {
  drawOsmTiles(ctx);
  if (isPilotScope()) {
    if (world.layers.buildings) drawPilotBuildingFootprints(ctx, (point) => osmProjectLocal(point));
    drawPilotNetwork2D(ctx, (point) => osmProjectLocal(point), 0.72);
    if (world.layers.poi) drawOsmPois(ctx);
    if (world.layers.schools) drawOsmSchools(ctx);
    drawOsmArea(ctx, pilotArea, { fill: true, alpha: 0.08, stroke: "rgba(32, 35, 42, 0.88)", width: 2.2 });
    return;
  }
  if (world.layers.buildings) drawOsmBuildingDistribution(ctx);
  if (isRegionalScope()) drawRegionalNetwork2D(ctx, (point) => osmProjectLocal(point), 0.58);
  if (world.layers.poi) drawOsmPois(ctx);
  if (world.layers.transport) drawOsmMobilityNodes(ctx);
  if (world.layers.schools) drawOsmSchools(ctx);

  if (realGeoData) {
    visibleDccas().forEach((area) => {
      drawOsmArea(ctx, area, {
        fill: isRegionalScope(),
        alpha: area.id === world.focusId ? 0.22 : 0.055,
        stroke: area.id === world.focusId ? "rgba(32, 35, 42, 0.78)" : "rgba(32, 35, 42, 0.12)",
        width: area.id === world.focusId ? 2.1 : isRegionalScope() ? 0.72 : 0.45,
      });
    });
  }

  visibleDistricts().forEach((zone) => {
    drawOsmArea(ctx, zone, {
      fill: !isRegionalScope() && zone.id === world.focusId,
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
  if (world.layers.flows) drawOsmTravelLines(ctx);
  if (world.layers.agents) drawOsmAgents(ctx);
  drawSpatialSelection(ctx, "osm");
  drawOsmLegend(ctx);
}

function fitOsmMap() {
  if (isPilotScope() && activePilot?.center) {
    osmMap.centerLon = activePilot.center.lon;
    osmMap.centerLat = activePilot.center.lat;
    osmMap.zoom = 15;
    markOsmStaticDirty();
    return;
  }
  const areas = isRegionalScope() ? simulationZones() : zones;
  if (!areas.length) return;
  const lonValues = areas.map((zone) => zone.lon).filter(Number.isFinite);
  const latValues = areas.map((zone) => zone.lat).filter(Number.isFinite);
  osmMap.centerLon = (Math.min(...lonValues) + Math.max(...lonValues)) / 2;
  osmMap.centerLat = (Math.min(...latValues) + Math.max(...latValues)) / 2;
  osmMap.zoom = isKowloonScope()
    ? 13
    : isIslandScope()
      ? 12
      : isNtWestScope()
        ? 11
        : isOutlyingIslandsScope()
          ? 10
          : 10;
  markOsmStaticDirty();
}

function focusOsmEntity(entity, type) {
  if (!entity) return;
  if (type === "dcca" && entity.polygon?.length) {
    const coordinates = entity.polygon.flat().map(([x, y]) => localToLonLat({ x, y }));
    const lonValues = coordinates.map((point) => point.lon).filter(Number.isFinite);
    const latValues = coordinates.map((point) => point.lat).filter(Number.isFinite);
    if (lonValues.length && latValues.length) {
      const minLon = Math.min(...lonValues);
      const maxLon = Math.max(...lonValues);
      const minLat = Math.min(...latValues);
      const maxLat = Math.max(...latValues);
      osmMap.centerLon = (minLon + maxLon) / 2;
      osmMap.centerLat = (minLat + maxLat) / 2;
      const northWest = lonLatToWorldPixel(minLon, maxLat, 0);
      const southEast = lonLatToWorldPixel(maxLon, minLat, 0);
      const spanX = Math.max(1e-6, Math.abs(southEast.x - northWest.x));
      const spanY = Math.max(1e-6, Math.abs(southEast.y - northWest.y));
      const availableWidth = Math.max(320, osmCanvas.clientWidth) / 1.45;
      const availableHeight = Math.max(260, osmCanvas.clientHeight) / 1.45;
      osmMap.zoom = clamp(
        Math.floor(Math.log2(Math.min(availableWidth / spanX, availableHeight / spanY))),
        11,
        16,
      );
      markOsmStaticDirty();
      return;
    }
  }
  const center = Number.isFinite(entity.lon) && Number.isFinite(entity.lat)
    ? { lon: entity.lon, lat: entity.lat }
    : localToLonLat(entity);
  osmMap.centerLon = center.lon;
  osmMap.centerLat = center.lat;
  osmMap.zoom = 16;
  markOsmStaticDirty();
}

function zoomOsmMap(delta) {
  osmMap.zoom = clamp(
    osmMap.zoom + delta,
    isPilotScope() ? 13 : isRegionalScope() ? 9 : 9,
    isPilotScope() ? 17 : 15,
  );
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
  if (isPilotScope()) return;
  const ratio = window.devicePixelRatio || 1;
  let best = null;
  simulationZones().forEach((zone) => {
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

function selectedObservedAgent() {
  return world.agents.find((agent) => agent.id === agentObserver.selectedAgentId) || world.agents[0] || null;
}

function agentUsesMechanisedTravel(agent) {
  return Boolean(agent?.travelMode && agent.travelMode !== "walk");
}

function filteredObservedAgents() {
  return world.agents.filter((agent) => {
    if (agentObserver.travelFilter === "walk" && agent.travelMode !== "walk") return false;
    if (agentObserver.travelFilter === "mechanised" && !agentUsesMechanisedTravel(agent)) return false;
    if (agentObserver.stateFilter !== "all" && agent.state !== agentObserver.stateFilter) return false;
    if (agentObserver.ageFilter !== "all" && agent.age !== Number(agentObserver.ageFilter)) return false;
    if (agentObserver.areaFilter !== "all" && agent.homeZone?.id !== agentObserver.areaFilter) return false;
    return true;
  });
}

function populateAgentObserverControls() {
  if (agentObserverEls.ageFilter.options.length === 1) {
    for (let age = 6; age <= 16; age += 1) {
      const option = document.createElement("option");
      option.value = String(age);
      option.textContent = String(age);
      agentObserverEls.ageFilter.append(option);
    }
  }

  const areaSignature = `${world.scope}:${simulationZones().map((zone) => zone.id).join(",")}`;
  if (agentObserver.lastAreaScope !== areaSignature) {
    const previous = agentObserver.areaFilter;
    agentObserverEls.areaFilter.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = isRegionalScope() ? `All ${simulationZones().length} DCCAs` : isPilotScope() ? activePilot.code : "All areas";
    agentObserverEls.areaFilter.append(allOption);
    if (!isPilotScope()) {
      [...simulationZones()]
        .sort((left, right) => String(left.code).localeCompare(String(right.code)))
        .forEach((zone) => {
          const option = document.createElement("option");
          option.value = zone.id;
          option.textContent = `${zone.code} ${zone.name}`;
          agentObserverEls.areaFilter.append(option);
        });
    }
    agentObserver.areaFilter = [...agentObserverEls.areaFilter.options].some((option) => option.value === previous)
      ? previous
      : "all";
    agentObserverEls.areaFilter.value = agentObserver.areaFilter;
    agentObserver.lastAreaScope = areaSignature;
  }

  const population = Math.max(1, world.agents.length);
  agentObserver.selectedAgentId = clamp(agentObserver.selectedAgentId || 1, 1, population);
  agentObserverEls.idInput.max = String(population);
  if (document.activeElement !== agentObserverEls.idInput) {
    agentObserverEls.idInput.value = String(agentObserver.selectedAgentId);
  }
  agentObserver.lastControlPopulation = population;
}

function setSelectedAgent(agentId, openFollow = false) {
  const nextId = clamp(Math.trunc(Number(agentId) || 1), 1, Math.max(1, world.agents.length));
  agentObserver.selectedAgentId = nextId;
  agentObserver.selectedTripId = null;
  invalidateAgentObserverGeometry();
  agentObserverEls.idInput.value = String(nextId);
  if (openFollow) setAgentObserverMode("follow");
  updateAgentObserverPanel();
}

function cycleSelectedAgent(direction) {
  const candidates = filteredObservedAgents();
  if (!candidates.length) return;
  const currentIndex = candidates.findIndex((agent) => agent.id === agentObserver.selectedAgentId);
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + direction + candidates.length) % candidates.length;
  setSelectedAgent(candidates[nextIndex].id);
}

function setAgentObserverMode(mode) {
  if (!["cohort", "follow", "audit"].includes(mode)) return;
  agentObserver.mode = mode;
  agentsView.dataset.mode = mode;
  agentObserverEls.cohortButton.classList.toggle("active", mode === "cohort");
  agentObserverEls.followButton.classList.toggle("active", mode === "follow");
  agentObserverEls.auditButton.classList.toggle("active", mode === "audit");
  agentObserverEls.routeAudit.hidden = mode !== "audit";
  updateAgentObserverPanel();
  resizeAllCanvases();
}

function invalidateAgentObserverGeometry() {
  agentObserver.geometryCacheKey = null;
  agentObserver.geometryCache = null;
}

function decodeAgentTrace(trace) {
  if (!trace?.length) return [];
  const points = [];
  for (let offset = 0; offset < trace.length; offset += 3) {
    points.push({ x: trace[offset], y: trace[offset + 1], z: trace[offset + 2] });
  }
  return points;
}

function tripRouteTruthKind(trip) {
  const route = trip?.route || {};
  const routeMode = String(route.mode || "");
  const spatialStatus = String(route.spatialStatus || "");
  if (
    route.spatialStatus === "complete-spatial-multimodal-proxy" ||
    routeMode.startsWith("kowloon-osm-")
  ) return "multimodal";
  if (
    /^complete-.+-directed-3dpn$/.test(spatialStatus) ||
    routeMode.endsWith("-3dpn-od-a-star") ||
    routeMode === "network"
  ) return "network";
  if (
    route.spatialStatus === "same-3dpn-node" ||
    route.spatialStatus === "same-pilot-3dpn-node" ||
    routeMode.endsWith("-local-connector") ||
    routeMode === "local"
  ) return "connector";
  if (route.spatialStatus === "schematic-until-tpusb-crosswalk" || route.mode === "tcs-temporal-schematic") {
    return "schematic";
  }
  if (route.mode === "straight" || String(route.spatialStatus || "").includes("unreachable")) return "fallback";
  return "unknown";
}

function mergeObserverPolylines(...polylines) {
  const merged = [];
  polylines.flat().forEach((point) => {
    if (!point) return;
    const normalized = observerPoint(point);
    if (!merged.length || physicalDistanceMeters(merged.at(-1), normalized) > 0.01) merged.push(normalized);
  });
  return merged;
}

function resolveAgentTripGeometry(agent, trip) {
  const mergedGeometry = window.CrossPackLive?.geometry(trip);
  if (mergedGeometry) return mergedGeometry;
  if (!trip) {
    return {
      kind: "none",
      label: "No recorded trip",
      exact: false,
      networkPoints: [],
      startConnector: [],
      destinationConnector: [],
      schematicPoints: [],
      fullPoints: [],
      nodeCount: 0,
    };
  }
  const route = trip.route || {};
  const kind = tripRouteTruthKind(trip);
  const cacheKey = [
    world.scope,
    trip.scope || agent?.scope || "unknown",
    trip.id,
    route.startNodeId,
    route.destinationNodeId,
    route.routingProfile,
    route.routingScenarioKey,
    route.routingScenarioHeat,
    route.routingHeatAvoidance,
  ].join(":");
  if (agentObserver.geometryCacheKey === cacheKey && agentObserver.geometryCache) {
    return agentObserver.geometryCache;
  }

  const origin = observerPoint(trip.origin);
  const destination = observerPoint(trip.destination);
  let geometry = null;
  if (kind === "network") {
    let path = null;
    let pointForNode = null;
    if ((trip.scope || agent?.scope) === "hong-kong-island" && hkIslandRoutingGraph?.ready) {
      path = hkIslandRoutingGraph.findPath(
        route.startNodeId,
        route.destinationNodeId,
        islandRoutingOptions(route.routingProfile || "scenario", route),
      );
      pointForNode = islandNodePoint;
    } else if ((trip.scope || agent?.scope) === KOWLOON_SCOPE_ID && v12_9KowloonRoutingGraph?.ready) {
      path = v12_9KowloonRoutingGraph.findPath(
        route.startNodeId,
        route.destinationNodeId,
        islandRoutingOptions(route.routingProfile || "scenario", route),
      );
      pointForNode = kowloonNodePoint;
    } else if ((trip.scope || agent?.scope) === NT_EAST_SCOPE_ID && v12_10NtEastRoutingGraph?.ready) {
      path = v12_10NtEastRoutingGraph.findPath(
        route.startNodeId,
        route.destinationNodeId,
        islandRoutingOptions(route.routingProfile || "scenario", route),
      );
      pointForNode = ntEastNodePoint;
    } else if ((trip.scope || agent?.scope) === NT_WEST_SCOPE_ID && v12_11NtWestRoutingGraph?.ready) {
      path = v12_11NtWestRoutingGraph.findPath(
        route.startNodeId,
        route.destinationNodeId,
        islandRoutingOptions(route.routingProfile || "scenario", route),
      );
      pointForNode = ntWestNodePoint;
    } else if ((trip.scope || agent?.scope) === ISLANDS_SCOPE_ID && v12_11IslandsRoutingGraph?.ready) {
      path = v12_11IslandsRoutingGraph.findPath(
        route.startNodeId,
        route.destinationNodeId,
        islandRoutingOptions(route.routingProfile || "scenario", route),
      );
      pointForNode = islandsNodePoint;
    } else if (isPilotScope() && (trip.scope || agent?.scope) === activePilot?.id) {
      const routingContext = routeCostContext(route.routingProfile || "scenario", route);
      path = findPilotPath(
        route.startNodeId,
        route.destinationNodeId,
        route.routingProfile || "scenario",
        routingContext,
      );
      pointForNode = pilotNodePoint;
    }
    if (path?.nodeIds?.length && pointForNode) {
      const networkPoints = path.nodeIds.map((nodeId) => pointForNode(nodeId)).filter(Boolean);
      const startConnector = route.startConnectorMeters > 0.1
        ? mergeObserverPolylines(origin, networkPoints[0])
        : [];
      const destinationConnector = route.destinationConnectorMeters > 0.1
        ? mergeObserverPolylines(networkPoints.at(-1), destination)
        : [];
      geometry = {
        kind,
        label: "Exact official 3DPN",
        exact: true,
        networkPoints,
        startConnector,
        destinationConnector,
        schematicPoints: [],
        fullPoints: mergeObserverPolylines(origin, networkPoints, destination),
        nodeCount: networkPoints.length,
        networkMeters: path.pathMeters,
      };
    }
  }

  if (!geometry && kind === "connector") {
    const connector = mergeObserverPolylines(origin, destination);
    geometry = {
      kind,
      label: "Endpoint connector only",
      exact: true,
      networkPoints: [],
      startConnector: connector,
      destinationConnector: [],
      schematicPoints: [],
      fullPoints: connector,
      nodeCount: route.routeNodeCount || 1,
      networkMeters: 0,
    };
  }

  if (!geometry && kind === "multimodal") {
    const compactPoints = decodeAgentTrace(trip.trace);
    geometry = {
      kind,
      label: "Spatial OSM line-haul + exact 3DPN access/egress",
      exact: false,
      networkPoints: compactPoints,
      startConnector: [],
      destinationConnector: [],
      schematicPoints: [],
      fullPoints: compactPoints,
      nodeCount: route.routeNodeCount || compactPoints.length,
      networkMeters: route.networkRouteMeters || 0,
    };
  }

  if (!geometry && (kind === "schematic" || kind === "fallback")) {
    const schematicPoints = mergeObserverPolylines(origin, destination);
    geometry = {
      kind,
      label: kind === "schematic" ? "Timing only · no network geometry" : "Straight fallback · off network",
      exact: false,
      networkPoints: [],
      startConnector: [],
      destinationConnector: [],
      schematicPoints,
      fullPoints: schematicPoints,
      nodeCount: 0,
      networkMeters: 0,
    };
  }

  if (!geometry) {
    const compactPoints = decodeAgentTrace(trip.trace);
    geometry = {
      kind: kind === "network" ? "network-approximate" : "unknown",
      label: kind === "network" ? "Compact route fallback" : "Unclassified geometry",
      exact: false,
      networkPoints: compactPoints,
      startConnector: [],
      destinationConnector: [],
      schematicPoints: [],
      fullPoints: compactPoints,
      nodeCount: route.routeNodeCount || compactPoints.length,
      networkMeters: route.networkRouteMeters || 0,
    };
  }

  agentObserver.geometryCacheKey = cacheKey;
  agentObserver.geometryCache = geometry;
  return geometry;
}

function latestAgentTrip(agent) {
  return agent?.tripHistory?.at(-1) || null;
}

function selectedAgentTrip(agent) {
  if (!agent?.tripHistory?.length) return null;
  return agent.tripHistory.find((trip) => trip.id === agentObserver.selectedTripId) || latestAgentTrip(agent);
}

function selectableDccas(view = activeView) {
  if (isPilotScope()) return pilotArea ? [pilotArea] : [];
  if (view === "kowloonlab") return kowloonDccas;
  return visibleDccas();
}

function selectionContextForView(view) {
  if (view === "scene") {
    return {
      canvas: sceneCanvas,
      projectPoint: (point) => project({ ...point, z: Number.isFinite(point.z) ? point.z : 0 }),
    };
  }
  if (view === "map") {
    return { canvas: mapCanvas, projectPoint: (point) => mapProject(point, mapCanvas) };
  }
  if (view === "osm") {
    return { canvas: osmCanvas, projectPoint: (point) => osmProjectLocal(point) };
  }
  if (view === "kowloonlab") {
    return { canvas: kowloonLabCanvas, projectPoint: kowloonLabProjector().project };
  }
  return null;
}

function selectionDisplayPoint(entity, type, view) {
  if (type === "agent") return entity.pos;
  const zone = entity.zone || entity.dccaZone || focusAreaById.get(entity.dccaId);
  const z = view === "scene"
    ? Number.isFinite(entity.z)
      ? entity.z
      : (zone?.terrain || 0) + 1.8
    : 0;
  return { x: entity.x, y: entity.y, z };
}

function projectedAreaContains(area, x, y, projectPoint, view) {
  const rings = area?.polygon?.length
    ? area.polygon.map((ring) => ring.map(([px, py]) => ({ x: px, y: py, z: view === "scene" ? area.terrain || 0 : 0 })))
    : areaRings(area, view === "scene" ? area?.terrain || 0 : 0);
  return rings.some((ring) => pointInRing(
    { x, y },
    ring.map((point) => {
      const projected = projectPoint(point);
      return [projected.x, projected.y];
    }),
  ));
}

function agentSelectionCandidates(view, x, y, context, thresholdCss = 15) {
  if (!world.layers.agents || (view === "kowloonlab" && !isKowloonScope())) return [];
  const ratio = window.devicePixelRatio || 1;
  const threshold = thresholdCss * ratio;
  return world.agents
    .map((agent) => {
      const projected = context.projectPoint(selectionDisplayPoint(agent, "agent", view));
      return { type: "agent", entity: agent, distance: Math.hypot(projected.x - x, projected.y - y) };
    })
    .filter((candidate) => candidate.distance <= threshold)
    .sort((left, right) => left.distance - right.distance || left.entity.id - right.entity.id);
}

function nearestPlaceSelection(view, x, y, context) {
  const ratio = window.devicePixelRatio || 1;
  const candidates = [];
  if (world.layers.schools) {
    const schools = view === "kowloonlab" ? kowloonSchoolLayer : activeSchoolLocations();
    schools.forEach((school) => {
      const projected = context.projectPoint(selectionDisplayPoint(school, "school", view));
      const distance = Math.hypot(projected.x - x, projected.y - y);
      if (distance <= 14 * ratio) candidates.push({ type: "school", entity: school, distance });
    });
  }
  if (world.layers.poi) {
    const pois = view === "kowloonlab" ? kowloonPoiLayer : activePoiLocations();
    pois.forEach((poi) => {
      const projected = context.projectPoint(selectionDisplayPoint(poi, "poi", view));
      const distance = Math.hypot(projected.x - x, projected.y - y);
      if (distance <= 13 * ratio) candidates.push({ type: "poi", entity: poi, distance });
    });
  }
  return candidates.sort((left, right) => left.distance - right.distance)[0] || null;
}

function hitTestSpatialEntity(view, xCss, yCss, options = {}) {
  const context = selectionContextForView(view);
  if (!context) return null;
  const ratio = window.devicePixelRatio || 1;
  const x = xCss * ratio;
  const y = yCss * ratio;
  const agents = agentSelectionCandidates(view, x, y, context);
  if (agents.length) {
    if (!options.cycleAgents || agents.length === 1) return agents[0];
    const clickKey = `${view}:${Math.round(xCss / 8)}:${Math.round(yCss / 8)}:${agents.map((item) => item.entity.id).join(",")}`;
    if (spatialSelection.clickKey === clickKey) spatialSelection.clickIndex += 1;
    else {
      spatialSelection.clickKey = clickKey;
      spatialSelection.clickIndex = 0;
    }
    return agents[spatialSelection.clickIndex % agents.length];
  }
  const place = nearestPlaceSelection(view, x, y, context);
  if (place) return place;
  const areas = selectableDccas(view)
    .filter((area) => projectedAreaContains(area, x, y, context.projectPoint, view))
    .sort((left, right) => (left.areaKm2 || Infinity) - (right.areaKm2 || Infinity));
  return areas.length ? { type: "dcca", entity: areas[0], distance: 0 } : null;
}

function selectedSpatialEntity() {
  if (!spatialSelection.type) return null;
  if (spatialSelection.type === "agent") {
    return world.agents.find((agent) => agent.id === Number(spatialSelection.id)) || null;
  }
  if (spatialSelection.type === "dcca") return focusAreaById.get(spatialSelection.id) || null;
  if (spatialSelection.type === "school") {
    return realSchoolLayer.find((school) => school.id === spatialSelection.id) ||
      activeSchoolLocations().find((school) => school.id === spatialSelection.id) || null;
  }
  if (spatialSelection.type === "poi") {
    return realPoiLayer.find((poi) => poi.id === spatialSelection.id) ||
      activePoiLocations().find((poi) => poi.id === spatialSelection.id) || null;
  }
  return null;
}

function focusSelectedArea(area) {
  if (!area) return;
  world.focusId = area.id;
  if ([...controls.focus.options].some((option) => option.value === area.id)) controls.focus.value = area.id;
  world.metrics = computeMetrics();
  markOsmStaticDirty();
  updatePanels();
}

function setSpatialSelection(type, entity, sourceView = activeView) {
  if (!entity) return clearSpatialSelection();
  const id = type === "agent" ? entity.id : entity.id;
  const changed = spatialSelection.type !== type || spatialSelection.id !== id;
  spatialSelection.type = type;
  spatialSelection.id = id;
  spatialSelection.sourceView = sourceView;
  if (changed) {
    spatialSelection.playbackFraction = 0;
    spatialSelection.playbackPlaying = false;
    spatialSelection.playbackLastAt = 0;
  }
  if (type === "agent") setSelectedAgent(entity.id, false);
  if (type === "dcca") focusSelectedArea(entity);
  updateSpatialSelectionInspector();
}

function clearSpatialSelection() {
  spatialSelection.type = null;
  spatialSelection.id = null;
  spatialSelection.sourceView = null;
  spatialSelection.playbackFraction = 0;
  spatialSelection.playbackPlaying = false;
  spatialSelection.playbackLastAt = 0;
  spatialSelection.clickKey = "";
  spatialSelection.clickIndex = 0;
  if (spatialSelectionEls.inspector) spatialSelectionEls.inspector.hidden = true;
  tooltip.hidden = true;
}

function appendSelectionMetric(label, value) {
  const item = document.createElement("div");
  const key = document.createElement("span");
  const result = document.createElement("strong");
  key.textContent = label;
  result.textContent = value;
  item.append(key, result);
  spatialSelectionEls.metrics.append(item);
}

function selectionAreaForEntity(entity) {
  if (!entity) return null;
  if (spatialSelection.type === "dcca") return entity;
  return entity.homeZone || entity.dccaZone || entity.zone || focusAreaById.get(entity.dccaId) || null;
}

function selectedAgentRouteGeometry(agent) {
  if (!agent) return { trip: null, geometry: null, points: [] };
  const trip = selectedAgentTrip(agent) || latestAgentTrip(agent);
  const geometry = resolveAgentTripGeometry(agent, trip);
  const points = geometry?.fullPoints?.length > 1
    ? geometry.fullPoints
    : agent.route?.length > 1
      ? [agent.pos, ...agent.route.slice(agent.routeIndex || 0)]
      : [];
  return { trip, geometry, points };
}

function setSelectionAction(button, label, action, hidden = false) {
  button.textContent = label;
  button.dataset.action = action;
  button.hidden = hidden;
}

function updateSpatialReplayControls() {
  const percent = Math.round(spatialSelection.playbackFraction * 100);
  spatialSelectionEls.replayRange.value = String(percent);
  spatialSelectionEls.replayOutput.value = `${percent}%`;
  spatialSelectionEls.replayOutput.textContent = `${percent}%`;
  spatialSelectionEls.replayToggle.textContent = spatialSelection.playbackPlaying ? "||" : "▶";
  spatialSelectionEls.replayToggle.setAttribute(
    "aria-label",
    spatialSelection.playbackPlaying ? "Pause route" : "Play route",
  );
  spatialSelectionEls.replayToggle.title = spatialSelection.playbackPlaying ? "Pause route" : "Play route";
}

function updateSpatialSelectionInspector() {
  if (!spatialSelectionEls.inspector) return;
  const entity = selectedSpatialEntity();
  const inspectableView = ["scene", "map", "osm", "kowloonlab"].includes(activeView);
  if (!entity || !inspectableView) {
    spatialSelectionEls.inspector.hidden = true;
    return;
  }
  spatialSelectionEls.inspector.hidden = false;
  spatialSelectionEls.metrics.replaceChildren();
  spatialSelectionEls.replay.hidden = true;
  spatialSelectionEls.primary.hidden = false;
  spatialSelectionEls.secondary.hidden = false;

  if (spatialSelection.type === "agent") {
    const { trip, geometry, points } = selectedAgentRouteGeometry(entity);
    spatialSelectionEls.type.textContent = "Child Agent";
    spatialSelectionEls.title.textContent = `Agent ${entity.id}`;
    spatialSelectionEls.subtitle.textContent =
      trip?.controlledPilot ? `Controlled pilot → ${trip.destinationLabel}` :
        `${entity.homeZone?.code || "Home"} → ${entity.schoolPoint?.name || entity.schoolZone?.name || "School"}`;
    appendSelectionMetric("State", STATE_META[entity.state]?.label || entity.state);
    appendSelectionMetric("Age", String(entity.age));
    appendSelectionMetric("School mode", entity.travelModeLabel || entity.travelMode || "n/a");
    appendSelectionMetric("MVPA", `${formatNumber(entity.mvpaMinutes || 0, 1)} min`);
    appendSelectionMetric("Trips", String(entity.tripHistory?.length || 0));
    appendSelectionMetric("Route", trip ? geometry?.label || "Recorded" : "No completed trip yet");
    spatialSelectionEls.replay.hidden = points.length < 2;
    setSelectionAction(spatialSelectionEls.primary, "Open audit", "agent-audit");
    setSelectionAction(spatialSelectionEls.secondary, "Follow", "agent-follow");
  } else if (spatialSelection.type === "dcca") {
    const homeAgents = world.agents.filter((agent) => agent.homeZone?.id === entity.id);
    const currentAgents = world.agents.filter((agent) => pointInArea(agent.pos, entity));
    const weightedChildren = homeAgents.reduce(
      (sum, agent) => sum + (isPopulationWeightedScope() ? Number(agent.censusWeight || 0) : 1),
      0,
    );
    spatialSelectionEls.type.textContent = "Official DCCA 2019";
    spatialSelectionEls.title.textContent = `${entity.code || "DCCA"} · ${entity.name}`;
    spatialSelectionEls.subtitle.textContent = entity.parentDistrictName || entity.type || "District Council Constituency Area";
    appendSelectionMetric("Area", `${formatNumber(entity.areaKm2 || 0, 2)} km²`);
    appendSelectionMetric("Resident Agents", `${homeAgents.length.toLocaleString()} · ${formatNumber(weightedChildren, 0)} weighted`);
    appendSelectionMetric("Agents now", currentAgents.length.toLocaleString());
    appendSelectionMetric("Schools", activeSchoolLocations().filter((school) => school.dccaId === entity.id).length.toLocaleString());
    appendSelectionMetric("Child POIs", activePoiLocations().filter((poi) => poi.dccaId === entity.id).length.toLocaleString());
    appendSelectionMetric("Terrain", `${formatNumber((entity.terrain || 0) * verticalUnitMeters, 0)} m display base`);
    setSelectionAction(spatialSelectionEls.primary, "Zoom to DCCA", "area-zoom");
    setSelectionAction(spatialSelectionEls.secondary, "View Agents", "area-agents");
  } else if (spatialSelection.type === "school") {
    const assigned = world.agents.filter((agent) =>
      agent.schoolPoint?.id === entity.id || agent.schoolCampusId === entity.campusId,
    );
    const area = selectionAreaForEntity(entity);
    spatialSelectionEls.type.textContent = "EDB school location";
    spatialSelectionEls.title.textContent = entity.name || entity.nameEn || `School ${entity.id}`;
    spatialSelectionEls.subtitle.textContent = `${entity.stage || "School"} · ${area?.code || "DCCA unavailable"}`;
    appendSelectionMetric("Assigned Agents", assigned.length.toLocaleString());
    appendSelectionMetric("Capacity prior", formatNumber(entity.capacityPrior || entity.permittedAccommodation || 0, 0));
    appendSelectionMetric("Network snap", Number.isFinite(entity.ntEastSnapMeters ?? entity.kowloonSnapMeters ?? entity.islandSnapMeters ?? entity.pilotSnapMeters)
      ? `${formatNumber(entity.ntEastSnapMeters ?? entity.kowloonSnapMeters ?? entity.islandSnapMeters ?? entity.pilotSnapMeters, 0)} m`
      : "not available");
    appendSelectionMetric("Source", entity.source || "Education Bureau school location data");
    setSelectionAction(spatialSelectionEls.primary, "Assigned Agents", "place-agents");
    setSelectionAction(spatialSelectionEls.secondary, "Focus DCCA", "place-area", !area);
  } else if (spatialSelection.type === "poi") {
    const area = selectionAreaForEntity(entity);
    const occupancy = world.interactionField?.poiOccupancy?.get(entity.id) || 0;
    spatialSelectionEls.type.textContent = "iGeoCom child POI";
    spatialSelectionEls.title.textContent = entity.name || entity.nameEn || `POI ${entity.id}`;
    spatialSelectionEls.subtitle.textContent = `${POI_GROUP_META[entity.group]?.label || entity.group || "POI"} · ${area?.code || "DCCA unavailable"}`;
    appendSelectionMetric("Agents now", occupancy.toLocaleString());
    appendSelectionMetric("Capacity proxy", formatNumber(entity.capacity || 0, 0));
    appendSelectionMetric("Floor", entity.floorLabel || (Number.isFinite(entity.floor) ? String(entity.floor) : "ground / unknown"));
    appendSelectionMetric("Source", entity.source || "iGeoCom");
    setSelectionAction(spatialSelectionEls.primary, "Focus DCCA", "place-area", !area);
    setSelectionAction(spatialSelectionEls.secondary, "View DCCA Agents", "place-agents", !area);
  }
  updateSpatialReplayControls();
}

function focusSpatialEntityInView(view, type, entity) {
  if (!entity) return;
  if (type === "agent") {
    setAgentObserverMode("follow");
    setView("agents");
    return;
  }
  const area = type === "dcca" ? entity : selectionAreaForEntity(entity);
  if (area) focusSelectedArea(area);
  if (view === "scene") fitCameraToArea(area);
  else if (view === "map") focusMapArea(area);
  else if (view === "osm") focusOsmEntity(entity, type);
  else if (view === "kowloonlab") {
    setView("osm");
    focusOsmEntity(entity, type);
  }
}

function runSpatialSelectionAction(action) {
  const entity = selectedSpatialEntity();
  if (!entity) return;
  if (action === "agent-audit" || action === "agent-follow") {
    setAgentObserverMode(action === "agent-audit" ? "audit" : "follow");
    setView("agents");
    return;
  }
  const area = spatialSelection.type === "dcca" ? entity : selectionAreaForEntity(entity);
  if (action === "area-zoom") {
    focusSpatialEntityInView(activeView, "dcca", area);
    updateSpatialSelectionInspector();
    return;
  }
  if (action === "place-area" && area) {
    setSpatialSelection("dcca", area, activeView);
    focusSpatialEntityInView(activeView, "dcca", area);
    return;
  }
  if ((action === "area-agents" || action === "place-agents") && area) {
    populateAgentObserverControls();
    agentObserver.areaFilter = area.id;
    agentObserverEls.areaFilter.value = area.id;
    if (spatialSelection.type === "school") {
      const assigned = world.agents.find((agent) => agent.schoolPoint?.id === entity.id);
      if (assigned) setSelectedAgent(assigned.id, false);
    }
    setAgentObserverMode("cohort");
    setView("agents");
  }
}

function handleSpatialClick(view, event, canvas) {
  if (event.detail > 1) return;
  const rect = canvas.getBoundingClientRect();
  const hit = hitTestSpatialEntity(view, event.clientX - rect.left, event.clientY - rect.top, { cycleAgents: true });
  if (!hit) {
    clearSpatialSelection();
    return;
  }
  tooltip.hidden = true;
  setSpatialSelection(hit.type, hit.entity, view);
}

function handleSpatialDoubleClick(view, event, canvas) {
  event.preventDefault();
  tooltip.hidden = true;
  const rect = canvas.getBoundingClientRect();
  const hit = hitTestSpatialEntity(view, event.clientX - rect.left, event.clientY - rect.top);
  if (!hit) return;
  setSpatialSelection(hit.type, hit.entity, view);
  focusSpatialEntityInView(view, hit.type, hit.entity);
}

function pointAlongSelectionRoute(points, fraction) {
  if (!points.length) return null;
  if (points.length === 1 || fraction <= 0) return points[0];
  if (fraction >= 1) return points.at(-1);
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances.push(distances.at(-1) + Math.max(0.001, physicalDistanceMeters(points[index - 1], points[index])));
  }
  const target = distances.at(-1) * fraction;
  let index = 1;
  while (index < distances.length && distances[index] < target) index += 1;
  const start = points[index - 1];
  const end = points[index] || start;
  const segment = Math.max(0.001, distances[index] - distances[index - 1]);
  const t = clamp((target - distances[index - 1]) / segment, 0, 1);
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    z: lerp(start.z || 0, end.z || 0, t),
  };
}

function advanceSpatialSelectionReplay(now) {
  if (!spatialSelection.playbackPlaying || spatialSelection.type !== "agent") return;
  if (!spatialSelection.playbackLastAt) spatialSelection.playbackLastAt = now;
  const elapsed = Math.min(160, now - spatialSelection.playbackLastAt);
  spatialSelection.playbackLastAt = now;
  spatialSelection.playbackFraction += elapsed / 7000;
  if (spatialSelection.playbackFraction >= 1) {
    spatialSelection.playbackFraction = 1;
    spatialSelection.playbackPlaying = false;
  }
  updateSpatialReplayControls();
}

function drawSpatialSelection(ctx, view) {
  const entity = selectedSpatialEntity();
  const context = selectionContextForView(view);
  if (!entity || !context) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  if (spatialSelection.type === "dcca") {
    const rings = entity.polygon?.length
      ? entity.polygon.map((ring) => ring.map(([x, y]) => ({ x, y, z: view === "scene" ? (entity.terrain || 0) + 0.35 : 0 })))
      : areaRings(entity, view === "scene" ? (entity.terrain || 0) + 0.35 : 0);
    rings.forEach((ring) => {
      ctx.beginPath();
      ring.forEach((point, index) => {
        const projected = context.projectPoint(point);
        if (index === 0) ctx.moveTo(projected.x, projected.y);
        else ctx.lineTo(projected.x, projected.y);
      });
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.96)";
      ctx.lineWidth = 5 * ratio;
      ctx.stroke();
      ctx.strokeStyle = "rgba(21,84,77,0.98)";
      ctx.lineWidth = 2.4 * ratio;
      ctx.stroke();
    });
  } else {
    if (spatialSelection.type === "agent") {
      const { points } = selectedAgentRouteGeometry(entity);
      if (points.length > 1) {
        drawObserverTrace(ctx, points, context.projectPoint, {
          color: "rgba(28,112,99,0.98)",
          outline: "rgba(255,255,255,0.94)",
          width: 2.8,
        });
        const replayPoint = pointAlongSelectionRoute(points, spatialSelection.playbackFraction);
        if (replayPoint) {
          const projected = context.projectPoint(replayPoint);
          ctx.beginPath();
          ctx.arc(projected.x, projected.y, 6.2 * ratio, 0, Math.PI * 2);
          ctx.fillStyle = "#d99434";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.98)";
          ctx.lineWidth = 2.2 * ratio;
          ctx.stroke();
        }
      }
    }
    const point = context.projectPoint(selectionDisplayPoint(entity, spatialSelection.type, view));
    const color = spatialSelection.type === "agent"
      ? STATE_META[entity.state]?.color || STATE_META.home.color
      : spatialSelection.type === "school"
        ? "#247b72"
        : POI_GROUP_META[entity.group]?.color || "#d18432";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 11 * ratio, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.98)";
    ctx.lineWidth = 4 * ratio;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 11 * ratio, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * ratio;
    ctx.stroke();
    if (spatialSelection.type === "agent") {
      ctx.fillStyle = "rgba(32,35,42,0.9)";
      ctx.font = `800 ${10 * ratio}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`#${entity.id}`, point.x, point.y - 16 * ratio);
    }
  }
  ctx.restore();
}

function spatialTooltipLabel(hit) {
  if (hit.type === "agent") {
    return {
      title: `Agent ${hit.entity.id}`,
      detail: `${STATE_META[hit.entity.state]?.label || hit.entity.state} · age ${hit.entity.age} · ${hit.entity.homeZone?.code || "home DCCA"}`,
    };
  }
  if (hit.type === "dcca") {
    return { title: `${hit.entity.code || "DCCA"} · ${hit.entity.name}`, detail: "Official DCCA 2019 boundary" };
  }
  if (hit.type === "school") {
    return { title: hit.entity.name || "School", detail: `EDB school · ${hit.entity.stage || "stage unavailable"}` };
  }
  return {
    title: hit.entity.name || "Child POI",
    detail: `iGeoCom · ${POI_GROUP_META[hit.entity.group]?.label || hit.entity.group || "POI"}`,
  };
}

function updateSpatialTooltip(view, xCss, yCss) {
  const hit = hitTestSpatialEntity(view, xCss, yCss);
  if (!hit) {
    tooltip.hidden = true;
    return;
  }
  const label = spatialTooltipLabel(hit);
  const title = document.createElement("strong");
  title.textContent = label.title;
  tooltip.replaceChildren(title, document.createTextNode(label.detail));
  const maxLeft = Math.max(8, simulationArea.clientWidth - 280);
  tooltip.style.left = `${clamp(xCss + 14, 8, maxLeft)}px`;
  tooltip.style.top = `${Math.max(8, yCss + 14)}px`;
  tooltip.hidden = false;
}

function populateAgentTripSelect(agent) {
  const trips = [...(agent?.tripHistory || [])].reverse();
  const signature = `${agent?.id || 0}:${trips.map((trip) => `${trip.id}:${trip.status}`).join(",")}`;
  if (agentObserverEls.tripSelect.dataset.signature !== signature) {
    agentObserverEls.tripSelect.replaceChildren();
    if (!trips.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No trips yet";
      agentObserverEls.tripSelect.append(option);
    } else {
      trips.forEach((trip) => {
        const option = document.createElement("option");
        option.value = String(trip.id);
        const truthLabel = {
          network: "3DPN",
          multimodal: "multimodal",
          connector: "connector",
          schematic: "timing",
          fallback: "fallback",
          unknown: "unclassified",
        }[tripRouteTruthKind(trip)];
        option.textContent =
          `${formatTime(trip.startedAt)} ${trip.purpose} · ${trip.route.transportMode} · ${truthLabel}`;
        agentObserverEls.tripSelect.append(option);
      });
    }
    agentObserverEls.tripSelect.dataset.signature = signature;
  }
  if (!trips.some((trip) => trip.id === agentObserver.selectedTripId)) {
    agentObserver.selectedTripId = trips[0]?.id || null;
  }
  agentObserverEls.tripSelect.value = agentObserver.selectedTripId ? String(agentObserver.selectedTripId) : "";
}

function renderAgentTimeline(agent) {
  const history = agent?.stateHistory || [];
  agentObserverEls.timeline.replaceChildren();
  history.forEach((event, index) => {
    const next = history[index + 1];
    const start = clamp(event.time, 0, 1440);
    const end = clamp(next?.time ?? world.time, start, 1440);
    const segment = document.createElement("i");
    segment.style.left = `${(start / 1440) * 100}%`;
    segment.style.width = `${Math.max(0.2, ((end - start) / 1440) * 100)}%`;
    segment.style.background = STATE_META[event.state]?.color || "#8a8f88";
    segment.title = `${formatTime(start)} ${event.label || STATE_META[event.state]?.label || event.state}`;
    agentObserverEls.timeline.append(segment);
  });
  const nowMarker = document.createElement("i");
  nowMarker.style.left = `${(world.time / 1440) * 100}%`;
  nowMarker.style.width = "2px";
  nowMarker.style.background = "#20232a";
  nowMarker.title = formatTime(world.time);
  agentObserverEls.timeline.append(nowMarker);
}

function updateAgentRouteReadout(agent) {
  populateAgentTripSelect(agent);
  const trip = selectedAgentTrip(agent);
  const legSplitLabel = agentObserverEls.routeLegSplit.previousElementSibling;
  if (legSplitLabel) legSplitLabel.textContent = trip?.controlledPilot
    ? "Walking / unverified access / mechanical" : "Access / line-haul / egress";
  if (!trip) {
    agentObserverEls.routeTitle.textContent = "No completed route";
    [
      agentObserverEls.routeGeometry,
      agentObserverEls.routeNetwork,
      agentObserverEls.routeDistance,
      agentObserverEls.routeTime,
      agentObserverEls.routeAscent,
      agentObserverEls.routeGrade,
      agentObserverEls.routeQuality,
      agentObserverEls.routeVertical,
      agentObserverEls.routeFeatures,
      agentObserverEls.routeEndpoints,
      agentObserverEls.routeAccessTime,
      agentObserverEls.routeLegSplit,
      agentObserverEls.routeStops,
    ].forEach((element) => { element.textContent = "n/a"; });
    return;
  }
  const route = trip.route;
  const geometry = resolveAgentTripGeometry(agent, trip);
  const connectorMeters = Math.max(0, Number(route.horizontalConnectorMeters ?? route.connectorMeters ?? 0));
  const networkMeters = Math.max(0, Number(geometry.networkMeters || route.networkRouteMeters || 0));
  const networkShare = networkMeters / Math.max(1, networkMeters + connectorMeters);
  const time3d = route.estimatedMinutes || trip.actualMinutes || 0;
  const time2d = route.planarEstimatedMinutes;
  const routeLabel = {
    network: "Official 3DPN walk",
    multimodal: "Spatial multimodal route",
    connector: "Endpoint connector",
    schematic: "Mechanised timing record",
    fallback: "Off-network fallback",
    "network-approximate": "3DPN compact fallback",
    unknown: "Unclassified route",
  }[geometry.kind] || "Unclassified route";
  agentObserverEls.routeTitle.textContent =
    `Agent ${agent?.id || "n/a"} · ${formatTime(trip.startedAt)} ${trip.purpose} · ${routeLabel}`;
  agentObserverEls.routeGeometry.textContent = geometry.exact
    ? `${geometry.label} · ${geometry.nodeCount.toLocaleString()} nodes`
    : geometry.label;
  const qualityFlags = Array.isArray(route.qualityFlags) ? route.qualityFlags : [];
  agentObserverEls.routeQuality.textContent = geometry.kind === "multimodal"
    ? "Spatial proxy · walking QA not applied"
    : route.qualityStatus === "pass"
      ? "Pass"
      : route.qualityStatus === "review" || route.qualityStatus === "critical"
        ? `${route.qualityStatus} · ${qualityFlags.slice(0, 2).map((flag) => flag.label).join(", ")}`
        : "Not spatial";

  if (["network", "network-approximate", "multimodal"].includes(geometry.kind)) {
    agentObserverEls.routeNetwork.textContent =
      `${formatNumber(networkShare * 100, 1)}% / H ${formatNumber(connectorMeters, 1)} m / V ${formatNumber(route.verticalConnectorMeters || 0, 1)} m`;
    agentObserverEls.routeDistance.textContent =
      `${formatNumber(route.routeMeters / 1000, 2)} / ${formatNumber(route.planarRouteMeters / 1000, 2)} km`;
    agentObserverEls.routeTime.textContent =
      `${formatNumber(time3d, 1)} / ${formatNumber(time2d, 1)} min`;
    agentObserverEls.routeAscent.textContent = `${formatNumber(route.verticalGainMeters, 1)} m`;
    agentObserverEls.routeGrade.textContent =
      `${formatNumber(route.maxAbsoluteGrade * 100, 1)}% · ` +
      (route.maxUnclassifiedGrade + 1e-6 < route.maxAbsoluteGrade
        ? "classified vertical"
        : "unclassified geometry");
    agentObserverEls.routeVertical.textContent =
      `${formatNumber(route.stairShare * 100, 1)}% / ${formatNumber(route.rampShare * 100, 1)}%`;
    agentObserverEls.routeFeatures.textContent =
      `${formatNumber(route.coveredShare * 100, 1)}% / ${formatNumber(route.mechanicalShare * 100, 1)}%`;
    agentObserverEls.routeEndpoints.textContent =
      `${formatNumber(route.startHorizontalConnectorMeters || 0, 1)} / ${formatNumber(route.destinationHorizontalConnectorMeters || 0, 1)} m`;
    agentObserverEls.routeAccessTime.textContent = route.accessTimeEdgeCount
      ? `${route.accessTimeEdgeCount.toLocaleString()} tagged edges · schedule not evaluated`
      : "No tagged edge on route";
    agentObserverEls.routeLegSplit.textContent = geometry.kind === "multimodal"
      ? `${formatNumber(route.accessWalkMinutes || 0, 1)} / ${formatNumber(route.lineHaulMinutes || 0, 1)} / ${formatNumber(route.egressWalkMinutes || 0, 1)} min`
      : trip.controlledPilot
        ? `${formatNumber(route.activeWalkingMinutes, 1)} min walking / ${formatNumber(route.unverifiedAccessMinutes, 1)} min unverified access / ${formatNumber(route.mechanicalMinutes, 1)} min mechanical`
      : "All active walking";
    agentObserverEls.routeStops.textContent = geometry.kind === "multimodal"
      ? `${route.boardingStop || "Direct access"} / ${route.alightingStop || "Direct access"}`
      : "Not applicable";
    return;
  }

  if (geometry.kind === "connector") {
    agentObserverEls.routeNetwork.textContent = `0% / ${formatNumber(connectorMeters || route.routeMeters, 1)} m`;
    agentObserverEls.routeDistance.textContent = `${formatNumber(route.routeMeters / 1000, 2)} km connector`;
    agentObserverEls.routeTime.textContent = `${formatNumber(time3d, 1)} min connector`;
    agentObserverEls.routeAscent.textContent = `${formatNumber(route.verticalGainMeters, 1)} m`;
    agentObserverEls.routeGrade.textContent = "n/a";
    agentObserverEls.routeVertical.textContent = "0% / 0%";
    agentObserverEls.routeFeatures.textContent = "0% / 0%";
    agentObserverEls.routeEndpoints.textContent = `${formatNumber(connectorMeters || route.routeMeters, 1)} / 0 m`;
    agentObserverEls.routeAccessTime.textContent = "Not applicable";
    agentObserverEls.routeLegSplit.textContent = "All active connector";
    agentObserverEls.routeStops.textContent = "Not applicable";
    return;
  }

  agentObserverEls.routeNetwork.textContent = geometry.kind === "schematic" ? "0% / not routed" : "0% / off network";
  agentObserverEls.routeDistance.textContent = `${formatNumber(route.routeMeters / 1000, 2)} km schematic`;
  agentObserverEls.routeTime.textContent = geometry.kind === "schematic"
    ? `${formatNumber(time3d, 1)} min TCS timing`
    : `${formatNumber(time3d, 1)} min fallback`;
  agentObserverEls.routeAscent.textContent = "not spatial";
  agentObserverEls.routeGrade.textContent = "not spatial";
  agentObserverEls.routeQuality.textContent = "Not spatial";
  agentObserverEls.routeVertical.textContent = "not spatial";
  agentObserverEls.routeFeatures.textContent = "not spatial";
  agentObserverEls.routeEndpoints.textContent = "not spatial";
  agentObserverEls.routeAccessTime.textContent = "not spatial";
  agentObserverEls.routeLegSplit.textContent = "not spatial";
  agentObserverEls.routeStops.textContent = "not spatial";
}

function updateAgentObserverPanel() {
  if (!agentObserverEls.title) return;
  populateAgentObserverControls();
  const selected = selectedObservedAgent();
  const timelineContainer = agentObserverEls.timeline.parentElement;
  if (agentObserver.mode === "cohort") {
    const agents = filteredObservedAgents();
    const observerWeight = (agent) => isPopulationWeightedScope() ? Number(agent.censusWeight || 0) : 1;
    const totalWeight = agents.reduce((sum, agent) => sum + observerWeight(agent), 0);
    const weightedMvpa = agents.reduce(
      (sum, agent) => sum + (agent.mvpaMinutes || 0) * observerWeight(agent),
      0,
    ) / Math.max(1, totalWeight);
    const walkWeight = agents.reduce(
      (sum, agent) => sum + (agent.travelMode === "walk" ? observerWeight(agent) : 0),
      0,
    );
    const ages = agents.map((agent) => agent.age);
    const areaCount = new Set(agents.map((agent) => agent.homeZone?.id).filter(Boolean)).size;
    agentObserverEls.eyebrow.textContent = "Cohort selection";
    agentObserverEls.title.textContent = `${agents.length.toLocaleString()} Agents`;
    agentObserverEls.subtitle.textContent = `${formatNumber(totalWeight, 0)} Census-weighted children`;
    agentObserverEls.state.textContent = agentObserver.stateFilter === "all"
      ? "Mixed"
      : STATE_META[agentObserver.stateFilter].label;
    agentObserverEls.age.textContent = ages.length
      ? `${Math.min(...ages)}-${Math.max(...ages)}`
      : "n/a";
    agentObserverEls.home.textContent = `${areaCount} DCCAs`;
    agentObserverEls.mode.textContent = agentObserver.travelFilter === "walk"
      ? "Walk · 3DPN eligible"
      : agentObserver.travelFilter === "mechanised"
        ? isKowloonScope() ? "Mechanised · spatial where routable" : "Mechanised · timing only"
        : `${formatNumber((walkWeight / Math.max(1, totalWeight)) * 100, 0)}% walk`;
    agentObserverEls.mvpa.textContent = `${formatNumber(weightedMvpa, 1)} min`;
    agentObserverEls.trips.textContent = agents.reduce((sum, agent) => sum + (agent.tripHistory?.length || 0), 0).toLocaleString();
    timelineContainer.hidden = true;
  } else if (selected) {
    agentObserverEls.eyebrow.textContent = agentObserver.mode === "audit" ? "Route audit" : "Selected Agent";
    agentObserverEls.title.textContent = `Agent ${selected.id}`;
    agentObserverEls.subtitle.textContent =
      latestAgentTrip(selected)?.controlledPilot ? `Controlled pilot → ${latestAgentTrip(selected).destinationLabel}` :
        `${selected.homeZone?.code || "Home"} · ${selected.schoolPoint?.name || selected.schoolZone?.name || "School"}`;
    agentObserverEls.state.textContent = window.CrossPackLive?.state.agent === selected && window.CrossPackLive.state.status === "dwell"
      ? "Inactive POI stop" : STATE_META[selected.state]?.label || selected.state;
    agentObserverEls.age.textContent = String(selected.age);
    agentObserverEls.home.textContent = selected.homeZone?.code || selected.homeZone?.name || "n/a";
    agentObserverEls.mode.textContent = selected.travelModeLabel || selected.travelMode || "n/a";
    agentObserverEls.mvpa.textContent = `${formatNumber(selected.mvpaMinutes || 0, 1)} min`;
    agentObserverEls.trips.textContent = String(selected.tripHistory?.length || 0);
    timelineContainer.hidden = false;
    renderAgentTimeline(selected);
  }
  if (agentObserver.mode === "audit") updateAgentRouteReadout(selected);
}

function observerTripForDrawing(agent) {
  return agentObserver.mode === "audit" ? selectedAgentTrip(agent) : latestAgentTrip(agent);
}

function observerTracePoints(agent) {
  const trip = observerTripForDrawing(agent);
  return resolveAgentTripGeometry(agent, trip).fullPoints;
}

function observerProjectionBounds(agent, tracePoints) {
  if (agentObserver.mode === "follow" && agent) {
    const radius = agentObserver.followRadiusMeters / appUnitMeters;
    return {
      minX: agent.pos.x - radius,
      maxX: agent.pos.x + radius,
      minY: agent.pos.y - radius,
      maxY: agent.pos.y + radius,
    };
  }
  if (agentObserver.mode === "audit" && tracePoints.length > 1) {
    const xs = tracePoints.map((point) => point.x);
    const ys = tracePoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const range = Math.max(1.2, maxX - minX, maxY - minY);
    const pad = range * 0.14;
    return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
  }
  if (isPilotScope() && pilotNetwork?.bounds) return pilotNetwork.bounds;
  if (isRegionalScope()) return activeRegionalBounds();
  if (!hongKongMapBounds) hongKongMapBounds = computeCombinedBounds(zones);
  return hongKongMapBounds;
}

function createAgentObserverProjection(bounds) {
  const ratio = window.devicePixelRatio || 1;
  const compact = agentCanvas.clientWidth <= 520;
  let toolbarBottom = compact ? 370 : 180;
  let panelTop = agentCanvas.height / ratio - (compact ? 48 : agentObserver.mode === "audit" ? 220 : 190);
  let canvasRect = null;
  if (
    agentObserverEls.toolbar?.getBoundingClientRect &&
    agentCanvas.getBoundingClientRect
  ) {
    const toolbarRect = agentObserverEls.toolbar.getBoundingClientRect();
    canvasRect = agentCanvas.getBoundingClientRect();
    if (Number.isFinite(toolbarRect.bottom) && Number.isFinite(canvasRect.top)) {
      toolbarBottom = Math.max(toolbarBottom, toolbarRect.bottom - canvasRect.top + 18);
    }
  }
  if (canvasRect) {
    const blockers = [agentObserverEls.readout];
    if (agentObserver.mode === "audit" && !agentObserverEls.routeAudit.hidden) blockers.push(agentObserverEls.routeAudit);
    blockers.forEach((element) => {
      if (!element?.getBoundingClientRect) return;
      const rect = element.getBoundingClientRect();
      if (Number.isFinite(rect.top) && rect.top > canvasRect.top) {
        panelTop = Math.min(panelTop, rect.top - canvasRect.top - 18);
      }
    });
  }
  const safe = {
    left: 18 * ratio,
    right: agentCanvas.width - 18 * ratio,
    top: toolbarBottom * ratio,
    bottom: panelTop * ratio,
  };
  const availableWidth = Math.max(1, safe.right - safe.left);
  const availableHeight = Math.max(1, safe.bottom - safe.top);
  const rangeX = Math.max(0.01, bounds.maxX - bounds.minX);
  const rangeY = Math.max(0.01, bounds.maxY - bounds.minY);
  const scale = Math.min(availableWidth / rangeX, availableHeight / rangeY);
  const usedWidth = rangeX * scale;
  const usedHeight = rangeY * scale;
  const offsetX = safe.left + (availableWidth - usedWidth) / 2;
  const offsetY = safe.top + (availableHeight - usedHeight) / 2;
  return (point) => ({
    x: offsetX + (point.x - bounds.minX) * scale,
    y: offsetY + usedHeight - (point.y - bounds.minY) * scale,
  });
}

function drawObserverArea(ctx, area, projectPoint, options = {}) {
  if (!area?.polygon?.length) return;
  ctx.save();
  area.polygon.forEach((ring) => {
    ctx.beginPath();
    ring.forEach(([x, y], index) => {
      const point = projectPoint({ x, y });
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = options.fill || rgba(area.color || "#5c8f87", options.alpha ?? 0.12);
    ctx.fill();
    ctx.strokeStyle = options.stroke || rgba(area.color || "#355e59", options.strokeAlpha ?? 0.34);
    ctx.lineWidth = (options.width || 0.7) * (window.devicePixelRatio || 1);
    ctx.stroke();
  });
  ctx.restore();
}

function drawObserverTrace(ctx, tracePoints, projectPoint, options = {}) {
  if (tracePoints.length < 2) return;
  const ratio = window.devicePixelRatio || 1;
  ctx.save();
  ctx.beginPath();
  tracePoints.forEach((point, index) => {
    const projected = projectPoint(point);
    if (index === 0) ctx.moveTo(projected.x, projected.y);
    else ctx.lineTo(projected.x, projected.y);
  });
  const dash = (options.dash || []).map((length) => length * ratio);
  ctx.setLineDash(dash);
  if (options.outline) {
    ctx.strokeStyle = options.outline;
    ctx.lineWidth = (options.width || 2.4) * ratio + 3 * ratio;
    ctx.stroke();
  }
  ctx.strokeStyle = options.color || "rgba(217, 148, 52, 0.8)";
  ctx.lineWidth = (options.width || 2.4) * ratio;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

function drawObserverCohort(ctx, agents, projectPoint) {
  const ratio = window.devicePixelRatio || 1;
  const activeRoutes = agents.filter((agent) => agent.state === "commute" && latestAgentTrip(agent)?.trace?.length);
  const routeStride = Math.max(1, Math.ceil(activeRoutes.length / 90));
  activeRoutes.forEach((agent, index) => {
    if (index % routeStride !== 0) return;
    const trip = latestAgentTrip(agent);
    const kind = tripRouteTruthKind(trip);
    drawObserverTrace(ctx, decodeAgentTrace(trip.trace), projectPoint, {
      color: kind === "network"
        ? "rgba(28,112,99,0.18)"
        : kind === "multimodal"
          ? "rgba(61,120,167,0.2)"
          : "rgba(102,96,86,0.18)",
      width: 1,
      dash: ["network", "multimodal"].includes(kind) ? [] : [6, 5],
    });
  });

  const cellSize = 30 * ratio;
  const clusters = new Map();
  agents.forEach((agent) => {
    const point = projectPoint(agent.pos);
    if (point.x < 0 || point.y < 0 || point.x > agentCanvas.width || point.y > agentCanvas.height) return;
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const cluster = clusters.get(key) || {
      x: 0,
      y: 0,
      count: 0,
      states: Object.fromEntries(STATE_ORDER.map((state) => [state, 0])),
    };
    cluster.x += point.x;
    cluster.y += point.y;
    cluster.count += 1;
    cluster.states[agent.state] += 1;
    clusters.set(key, cluster);
  });

  ctx.save();
  clusters.forEach((cluster) => {
    const x = cluster.x / cluster.count;
    const y = cluster.y / cluster.count;
    const dominant = STATE_ORDER.reduce(
      (best, state) => cluster.states[state] > cluster.states[best] ? state : best,
      STATE_ORDER[0],
    );
    const radius = clamp(4 + Math.sqrt(cluster.count) * 1.25, 5, 16) * ratio;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = rgba(STATE_META[dominant].color, 0.84);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.94)";
    ctx.lineWidth = 1.4 * ratio;
    ctx.stroke();
    if (cluster.count >= 6) {
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.font = `800 ${10 * ratio}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(cluster.count), x, y + 0.5 * ratio);
    }
  });
  ctx.restore();
}

function drawObserverSelectedAgent(ctx, selected, geometry, projectPoint) {
  if (!selected) return;
  const ratio = window.devicePixelRatio || 1;
  const nearby = world.agents.filter((agent) => {
    if (agent.id === selected.id) return false;
    if (agentObserver.mode === "follow") {
      return physicalDistanceMeters(agent.pos, selected.pos) <= agentObserver.followRadiusMeters;
    }
    return true;
  });
  const stride = Math.max(1, Math.ceil(nearby.length / 500));
  ctx.save();
  nearby.forEach((agent, index) => {
    if (index % stride !== 0) return;
    const point = projectPoint(agent.pos);
    if (point.x < 0 || point.y < 0 || point.x > agentCanvas.width || point.y > agentCanvas.height) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.1 * ratio, 0, Math.PI * 2);
    ctx.fillStyle = rgba(STATE_META[agent.state].color, 0.32);
    ctx.fill();
  });
  ctx.restore();

  drawObserverTrace(ctx, geometry.networkPoints, projectPoint, {
    color: geometry.kind === "multimodal" ? "rgba(61,120,167,0.96)" : "rgba(28,112,99,0.96)",
    outline: "rgba(255,255,255,0.94)",
    width: 2.6,
  });
  [geometry.startConnector, geometry.destinationConnector].forEach((connector) => {
    drawObserverTrace(ctx, connector, projectPoint, {
      color: "rgba(190,72,66,0.96)",
      outline: "rgba(255,255,255,0.9)",
      width: 2.3,
      dash: [7, 5],
    });
  });
  drawObserverTrace(ctx, geometry.schematicPoints, projectPoint, {
    color: geometry.kind === "fallback" ? "rgba(190,72,66,0.92)" : "rgba(102,96,86,0.9)",
    outline: "rgba(255,255,255,0.86)",
    width: 2.3,
    dash: geometry.kind === "fallback" ? [5, 5] : [10, 7],
  });
  const tracePoints = geometry.fullPoints;
  if (tracePoints.length) {
    const start = projectPoint(tracePoints[0]);
    const end = projectPoint(tracePoints.at(-1));
    ctx.save();
    ctx.fillStyle = STATE_META.home.color;
    ctx.strokeStyle = "rgba(255,255,255,0.96)";
    ctx.lineWidth = 2 * ratio;
    ctx.fillRect(start.x - 4 * ratio, start.y - 4 * ratio, 8 * ratio, 8 * ratio);
    ctx.strokeRect(start.x - 4 * ratio, start.y - 4 * ratio, 8 * ratio, 8 * ratio);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y - 5 * ratio);
    ctx.lineTo(end.x + 5 * ratio, end.y);
    ctx.lineTo(end.x, end.y + 5 * ratio);
    ctx.lineTo(end.x - 5 * ratio, end.y);
    ctx.closePath();
    ctx.fillStyle = STATE_META.school.color;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const position = projectPoint(selected.pos);
  ctx.save();
  ctx.beginPath();
  ctx.arc(position.x, position.y, 9 * ratio, 0, Math.PI * 2);
  ctx.fillStyle = rgba(STATE_META[selected.state].color, 0.98);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.98)";
  ctx.lineWidth = 3 * ratio;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(position.x, position.y, 13 * ratio, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(32,35,42,0.62)";
  ctx.lineWidth = 1.2 * ratio;
  ctx.stroke();
  ctx.fillStyle = "#20232a";
  ctx.font = `800 ${10 * ratio}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`#${selected.id}`, position.x, position.y - 17 * ratio);
  ctx.restore();
}

function drawAgentProfile(agent, trip, geometry = resolveAgentTripGeometry(agent, trip)) {
  const ctx = agentProfileCtx;
  const width = agentProfileCanvas.width;
  const height = agentProfileCanvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#eef2ec";
  ctx.fillRect(0, 0, width, height);
  const points = geometry.fullPoints;
  const ratio = window.devicePixelRatio || 1;
  if (geometry.kind === "schematic" || geometry.kind === "fallback" || geometry.kind === "unknown") {
    ctx.fillStyle = "rgba(32,35,42,0.52)";
    ctx.font = `700 ${10 * ratio}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("No spatial network elevation profile", width / 2, height / 2);
    return;
  }
  if (points.length < 2) {
    ctx.fillStyle = "rgba(32,35,42,0.52)";
    ctx.font = `700 ${10 * ratio}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("No route profile", width / 2, height / 2);
    return;
  }
  const samples = [{ distance: 0, elevation: points[0].z * verticalUnitMeters }];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    samples.push({
      distance: samples.at(-1).distance + Math.hypot(current.x - previous.x, current.y - previous.y) * appUnitMeters,
      elevation: current.z * verticalUnitMeters,
    });
  }
  const minElevation = Math.min(...samples.map((sample) => sample.elevation));
  const maxElevation = Math.max(...samples.map((sample) => sample.elevation));
  const totalDistance = Math.max(1, samples.at(-1).distance);
  const elevationRange = Math.max(5, maxElevation - minElevation);
  const margin = {
    left: 34 * ratio,
    right: 8 * ratio,
    top: (geometry.kind === "multimodal" ? 20 : 9) * ratio,
    bottom: 18 * ratio,
  };
  const chartWidth = Math.max(1, width - margin.left - margin.right);
  const chartHeight = Math.max(1, height - margin.top - margin.bottom);
  const projectSample = (sample) => ({
    x: margin.left + (sample.distance / totalDistance) * chartWidth,
    y: margin.top + chartHeight - ((sample.elevation - minElevation) / elevationRange) * chartHeight,
  });
  ctx.strokeStyle = "rgba(32,35,42,0.12)";
  ctx.lineWidth = ratio;
  [0, 0.5, 1].forEach((fraction) => {
    const y = margin.top + chartHeight * fraction;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
  });
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const point = projectSample(sample);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  const last = projectSample(samples.at(-1));
  ctx.lineTo(last.x, margin.top + chartHeight);
  ctx.lineTo(margin.left, margin.top + chartHeight);
  ctx.closePath();
  ctx.fillStyle = "rgba(36,123,114,0.18)";
  ctx.fill();
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const point = projectSample(sample);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#247b72";
  ctx.lineWidth = 2 * ratio;
  ctx.stroke();
  ctx.fillStyle = "rgba(32,35,42,0.68)";
  ctx.font = `700 ${8 * ratio}px Inter, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(maxElevation)}m`, margin.left - 4 * ratio, margin.top + 5 * ratio);
  ctx.fillText(`${Math.round(minElevation)}m`, margin.left - 4 * ratio, margin.top + chartHeight);
  ctx.textAlign = "center";
  ctx.fillText(`${formatNumber(totalDistance / 1000, 2)} km`, margin.left + chartWidth / 2, height - 4 * ratio);
  if (geometry.kind === "multimodal") {
    ctx.fillStyle = "rgba(32,35,42,0.62)";
    ctx.font = `750 ${7 * ratio}px Inter, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("Line-haul elevation: endpoint-linear display proxy", width - 8 * ratio, 11 * ratio);
  }
}

function drawAgentObserver() {
  const ctx = agentCtx;
  ctx.clearRect(0, 0, agentCanvas.width, agentCanvas.height);
  ctx.fillStyle = "#d5e8e4";
  ctx.fillRect(0, 0, agentCanvas.width, agentCanvas.height);
  const selected = selectedObservedAgent();
  const selectedTrip = observerTripForDrawing(selected);
  const geometry = resolveAgentTripGeometry(selected, selectedTrip);
  const tracePoints = geometry.fullPoints;
  const bounds = observerProjectionBounds(selected, tracePoints);
  const projectPoint = createAgentObserverProjection(bounds);

  if (!isPilotScope()) {
    visibleDccas().forEach((area) => {
      const highlighted = agentObserver.areaFilter === area.id || selected?.homeZone?.id === area.id;
      drawObserverArea(ctx, area, projectPoint, {
        alpha: highlighted ? 0.34 : 0.1,
        strokeAlpha: highlighted ? 0.88 : 0.24,
        width: highlighted ? 1.6 : 0.55,
      });
    });
  }
  if (isPilotScope()) drawObserverArea(ctx, pilotArea, projectPoint, { alpha: 0.16, strokeAlpha: 0.9, width: 2 });
  if (isRegionalScope()) drawRegionalNetwork2D(ctx, projectPoint, agentObserver.mode === "cohort" ? 0.22 : 0.35);
  else if (isPilotScope()) drawPilotNetwork2D(ctx, projectPoint, 0.35);

  if (agentObserver.mode === "cohort") {
    drawObserverCohort(ctx, filteredObservedAgents(), projectPoint);
  } else {
    drawObserverSelectedAgent(ctx, selected, geometry, projectPoint);
  }
  if (agentObserver.mode === "audit") drawAgentProfile(selected, selectedAgentTrip(selected), geometry);
}

function selectNearestObserverAgent(xCss, yCss) {
  const ratio = window.devicePixelRatio || 1;
  const selected = selectedObservedAgent();
  const tracePoints = observerTracePoints(selected);
  const projectPoint = createAgentObserverProjection(observerProjectionBounds(selected, tracePoints));
  const candidates = agentObserver.mode === "cohort" ? filteredObservedAgents() : world.agents;
  let best = null;
  candidates.forEach((agent) => {
    const point = projectPoint(agent.pos);
    const distance = Math.hypot(point.x / ratio - xCss, point.y / ratio - yCss);
    if (distance <= 18 && (!best || distance < best.distance)) best = { agent, distance };
  });
  if (best) {
    setSpatialSelection("agent", best.agent, "agents");
    if (agentObserver.mode === "cohort") setAgentObserverMode("follow");
  }
}

const ROUTE_QA_ISSUE_META = Object.freeze({
  connector: { label: "Connector", prefix: "connector-" },
  detour: { label: "Detour / length", codes: ["circuity-review", "circuity-critical", "route-length-critical"] },
  duration: { label: "School duration", prefix: "school-time-" },
  vertical: { label: "Vertical geometry", prefix: "grade-" },
  network: { label: "Network share", code: "network-share-review" },
});

function routeQaFlagMatchesIssue(flag, issue) {
  const meta = ROUTE_QA_ISSUE_META[issue];
  if (!meta) return false;
  if (meta.code) return flag.code === meta.code;
  if (meta.prefix) return flag.code?.startsWith(meta.prefix);
  return meta.codes?.includes(flag.code) || false;
}

function routeQaRecordMatchesIssue(record, issue = routeQaState.issue) {
  if (issue === "all") return record.route.qualityStatus === "critical";
  return (record.route.qualityFlags || []).some((flag) => routeQaFlagMatchesIssue(flag, issue));
}

function routeQaIssueShare(records, issue = routeQaState.issue) {
  const totalWeight = records.reduce((sum, record) => sum + Math.max(0, record.weight || 0), 0);
  const issueWeight = records.reduce(
    (sum, record) => sum + (routeQaRecordMatchesIssue(record, issue) ? Math.max(0, record.weight || 0) : 0),
    0,
  );
  return issueWeight / Math.max(1, totalWeight);
}

function liveRouteQaRecords() {
  return world.agents.flatMap((agent) =>
    (agent.tripHistory || [])
      .filter(
        (trip) =>
          trip.route?.transportMode === "walk" &&
          (trip.route.mode?.endsWith("-3dpn-od-a-star") || trip.route.mode?.endsWith("-local-connector")),
      )
      .map((trip) => ({
        agent,
        trip,
        route: trip.route,
        purpose: trip.purpose,
        dccaId: agent.homeZone?.id,
        weight: isPopulationWeightedScope() ? Math.max(0, Number(agent.censusWeight) || 0) : 1,
      })),
  );
}

function weightedRoutePercentile(records, valueFn, quantile) {
  const ordered = records
    .map((record) => ({ value: Number(valueFn(record)) || 0, weight: Math.max(0, record.weight || 0) }))
    .sort((left, right) => left.value - right.value);
  const total = ordered.reduce((sum, item) => sum + item.weight, 0);
  if (!ordered.length || total <= 0) return 0;
  const threshold = total * quantile;
  let cumulative = 0;
  for (const item of ordered) {
    cumulative += item.weight;
    if (cumulative >= threshold) return item.value;
  }
  return ordered.at(-1).value;
}

function summarizeRouteQaRecords(records) {
  const totalWeight = records.reduce((sum, record) => sum + record.weight, 0);
  const schoolRecords = records.filter((record) => record.purpose === "school");
  const schoolWeight = schoolRecords.reduce((sum, record) => sum + record.weight, 0);
  const weightedShare = (predicate) =>
    records.reduce((sum, record) => sum + (predicate(record) ? record.weight : 0), 0) / Math.max(1, totalWeight);
  const weightedSchoolShare = (predicate) =>
    schoolRecords.reduce((sum, record) => sum + (predicate(record) ? record.weight : 0), 0) /
    Math.max(1, schoolWeight);
  return {
    walkingRouteCount: records.length,
    weightedRouteCount: totalWeight,
    schoolWalkMeanMinutes:
      schoolRecords.reduce((sum, record) => sum + record.route.estimatedMinutes * record.weight, 0) /
      Math.max(1, schoolWeight),
    connectorP95Meters: weightedRoutePercentile(
      records,
      (record) => record.route.horizontalConnectorMeters ?? record.route.connectorMeters,
      0.95,
    ),
    reviewShare: weightedShare((record) => record.route.qualityStatus === "review"),
    criticalShare: weightedShare((record) => record.route.qualityStatus === "critical"),
    networkRoutedShare: weightedShare((record) =>
      record.route.mode?.endsWith("-3dpn-od-a-star") ||
      record.route.mode?.endsWith("-local-connector")),
    failureShare: weightedShare((record) => record.route.spatialStatus?.includes("fallback")),
    schoolAtMost10MinuteShare: weightedSchoolShare((record) => record.route.estimatedMinutes <= 10),
    schoolOver15MinuteShare: weightedSchoolShare((record) => record.route.estimatedMinutes > 15),
  };
}

function liveRouteQaByDcca(records) {
  const buckets = new Map();
  records.forEach((record) => {
    if (!record.dccaId) return;
    const bucket = buckets.get(record.dccaId) || [];
    bucket.push(record);
    buckets.set(record.dccaId, bucket);
  });
  return [...buckets.entries()].map(([dccaId, items]) => ({
    dccaId,
    ...summarizeRouteQaRecords(items),
    selectedIssueShare: routeQaIssueShare(items),
  }));
}

function routeQaReferenceCondition(mode = routeQaState.mode) {
  if (isLiveRegionalRouteQaScope()) return null;
  return routeCalibrationReference?.conditions?.[mode] || null;
}

function routeQaSummary(mode = routeQaState.mode, purpose = routeQaState.purpose) {
  const condition = routeQaReferenceCondition(mode);
  if (condition) return purpose === "all" ? condition.overall : condition.purposes?.[purpose] || condition.overall;
  const records = liveRouteQaRecords().filter((record) => purpose === "all" || record.purpose === purpose);
  return summarizeRouteQaRecords(records);
}

function routeQaDccaRows(mode = routeQaState.mode, purpose = routeQaState.purpose) {
  const condition = routeQaReferenceCondition(mode);
  if (condition) {
    return condition.byDcca
      .filter((row) => purpose === "all" ? row.purpose === "all" : row.purpose === purpose)
      .map((row) => ({ ...row, selectedIssueShare: row.criticalShare || 0 }));
  }
  const records = liveRouteQaRecords().filter((record) => purpose === "all" || record.purpose === purpose);
  return liveRouteQaByDcca(records).map((row) => ({ ...row, purpose }));
}

function routeQaFillColor(issueShare) {
  if (issueShare > 0.3) return "#b94f55";
  if (issueShare > 0.15) return "#d77b48";
  if (issueShare > 0.05) return "#e3bf62";
  return "#d7e5df";
}

function routeQaDisplayBounds() {
  const bounds = computeCombinedBounds(isLiveRegionalRouteQaScope() ? simulationZones() : hkIslandDccas);
  const values = [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY];
  return values.every(Number.isFinite) ? bounds : activeRegionalBounds();
}

function drawRouteQaLabels(ctx, rows, areas, project, ratio, width, height) {
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const candidates = [...rows]
    .filter((row) => (row.walkingRouteCount || 0) > 0 && areaById.has(row.dccaId))
    .sort((left, right) => (right.selectedIssueShare || 0) - (left.selectedIssueShare || 0))
    .slice(0, 10);
  const placed = [];
  const fontSize = 9 * ratio;
  const horizontalPad = 3.5 * ratio;
  const verticalPad = 2.5 * ratio;

  ctx.save();
  ctx.font = `800 ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  candidates.forEach((row) => {
    const area = areaById.get(row.dccaId);
    const label = project([area.x, area.y]);
    const text = area.code.replace(/^DCCA\s+/i, "");
    const textWidth = ctx.measureText(text).width;
    const box = {
      left: label.x - textWidth / 2 - horizontalPad,
      right: label.x + textWidth / 2 + horizontalPad,
      top: label.y - fontSize / 2 - verticalPad,
      bottom: label.y + fontSize / 2 + verticalPad,
    };
    const inside = box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height;
    const overlaps = placed.some(
      (other) =>
        box.left < other.right + 2 * ratio &&
        box.right > other.left - 2 * ratio &&
        box.top < other.bottom + 2 * ratio &&
        box.bottom > other.top - 2 * ratio,
    );
    if (!inside || overlaps) return;

    ctx.fillStyle = "rgba(251, 251, 248, 0.82)";
    ctx.fillRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    ctx.strokeStyle = "rgba(32, 35, 42, 0.18)";
    ctx.lineWidth = 0.6 * ratio;
    ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    ctx.fillStyle = "rgba(32, 35, 42, 0.86)";
    ctx.fillText(text, label.x, label.y);
    placed.push(box);
  });
  ctx.restore();
}

function drawRouteQaMap() {
  resizeCanvas(routeQaCanvas);
  const ctx = routeQaCtx;
  const ratio = window.devicePixelRatio || 1;
  const width = routeQaCanvas.width;
  const height = routeQaCanvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#edf3ef";
  ctx.fillRect(0, 0, width, height);
  const displayAreas = isLiveRegionalRouteQaScope() ? simulationZones() : hkIslandDccas;
  const bounds = routeQaDisplayBounds();
  const padding = 22 * ratio;
  const scale = Math.min(
    (width - padding * 2) / Math.max(0.001, bounds.maxX - bounds.minX),
    (height - padding * 2) / Math.max(0.001, bounds.maxY - bounds.minY),
  );
  const offsetX = (width - (bounds.maxX - bounds.minX) * scale) / 2;
  const offsetY = (height - (bounds.maxY - bounds.minY) * scale) / 2;
  const project = ([x, y]) => ({
    x: offsetX + (x - bounds.minX) * scale,
    y: height - offsetY - (y - bounds.minY) * scale,
  });
  const rows = routeQaDccaRows();
  const byDcca = new Map(rows.map((row) => [row.dccaId, row]));
  displayAreas.forEach((area) => {
    const row = byDcca.get(area.id);
    const issueShare = row?.selectedIssueShare || 0;
    area.polygon.forEach((ring) => {
      if (ring.length < 3) return;
      ctx.beginPath();
      ring.forEach((point, index) => {
        const projected = project(point);
        if (index === 0) ctx.moveTo(projected.x, projected.y);
        else ctx.lineTo(projected.x, projected.y);
      });
      ctx.closePath();
      ctx.fillStyle = row ? routeQaFillColor(issueShare) : "#e5e9e3";
      ctx.fill();
      ctx.strokeStyle = "rgba(32, 35, 42, 0.24)";
      ctx.lineWidth = 0.7 * ratio;
      ctx.stroke();
    });
  });
  drawRouteQaLabels(ctx, rows, displayAreas, project, ratio, width, height);
}

function renderRouteQaCauseLedger() {
  routeQaEls.causeLedger.replaceChildren();
  if (!isLiveRegionalRouteQaScope()) {
    routeQaEls.causeLedger.hidden = true;
    return;
  }
  routeQaEls.causeLedger.hidden = false;
  const records = liveRouteQaRecords().filter(
    (record) => routeQaState.purpose === "all" || record.purpose === routeQaState.purpose,
  );
  Object.entries(ROUTE_QA_ISSUE_META).forEach(([issue, meta]) => {
    const count = records.filter((record) => routeQaRecordMatchesIssue(record, issue)).length;
    const item = document.createElement("span");
    item.className = routeQaState.issue === issue ? "active" : "";
    item.textContent = `${meta.label} ${count.toLocaleString()}`;
    routeQaEls.causeLedger.append(item);
  });
}

function renderRouteQaOutliers() {
  routeQaEls.outlierList.replaceChildren();
  const live = liveRouteQaRecords()
    .filter(
      (record) =>
        (routeQaState.purpose === "all" || record.purpose === routeQaState.purpose) &&
        (routeQaState.issue === "all"
          ? ["review", "critical"].includes(record.route.qualityStatus)
          : routeQaRecordMatchesIssue(record)),
    )
    .sort((left, right) => {
      const severity = { critical: 2, review: 1 };
      return (
        severity[right.route.qualityStatus] - severity[left.route.qualityStatus] ||
        right.route.routeMeters - left.route.routeMeters
      );
    })
    .slice(0, 10);
  routeQaEls.outlierSubtitle.textContent = live.length
    ? `${live.length} highest-priority completed routes · open Agent audit`
    : routeCalibrationReference && !isLiveRegionalRouteQaScope()
      ? "No live walking route requires review · showing reference hotspots below"
      : "No live walking route currently requires review";
  if (live.length) {
    live.forEach(({ agent, trip, route }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "route-qa-outlier-item";
      const matchingFlags = (route.qualityFlags || []).filter(
        (flag) => routeQaState.issue === "all" || routeQaFlagMatchesIssue(flag, routeQaState.issue),
      );
      const flags = (matchingFlags.length ? matchingFlags : route.qualityFlags || [])
        .slice(0, 2)
        .map((flag) => flag.label)
        .join(" · ");
      button.innerHTML = `
        <span><strong>Agent ${agent.id} · ${trip.purpose}</strong><span>${agent.homeZone?.code || "DCCA"} · ${flags}</span><small>${formatNumber(route.routeMeters / 1000, 2)} km · H connector ${formatNumber(route.horizontalConnectorMeters || 0, 0)} m · ${formatNumber(route.estimatedMinutes, 1)} min</small></span>
        <i class="route-qa-status ${route.qualityStatus}">${route.qualityStatus}<small>open</small></i>
      `;
      button.addEventListener("click", () => {
        setSelectedAgent(agent.id);
        agentObserver.selectedTripId = trip.id;
        setAgentObserverMode("audit");
        setView("agents");
      });
      routeQaEls.outlierList.append(button);
    });
    return;
  }
  const referenceRows = routeQaDccaRows()
    .sort(
      (left, right) =>
        (right.reviewShare + right.criticalShare) - (left.reviewShare + left.criticalShare),
    )
    .slice(0, 6);
  referenceRows.forEach((row) => {
    const area = focusAreaById.get(row.dccaId);
    const item = document.createElement("div");
    item.className = "route-qa-outlier-item";
    item.innerHTML = `
      <span><strong>${area?.code || row.dccaId} · ${area?.name || "DCCA"}</strong><span>${row.walkingRouteCount || 0} audited routes</span><small>${formatNumber((row.reviewShare + row.criticalShare) * 100, 1)}% review or critical</small></span>
      <i class="route-qa-status review">${isLiveRegionalRouteQaScope() ? "live" : "reference"}</i>
    `;
    routeQaEls.outlierList.append(item);
  });
}

function updateRouteQaView() {
  const selected = routeQaSummary();
  const selectedCondition = routeQaReferenceCondition();
  const selectedSchool = selectedCondition?.purposes?.school || selected;
  const assignment = selectedCondition?.assignment || null;
  const liveRegionalAudit = isLiveRegionalRouteQaScope();
  const comparisonMode = routeQaState.mode === "calibrated" ? "baseline" : "calibrated";
  const comparison = routeQaSummary(comparisonMode, routeQaState.purpose);
  const issueShare = (selected.reviewShare || 0) + (selected.criticalShare || 0);
  const comparisonIssueShare = (comparison.reviewShare || 0) + (comparison.criticalShare || 0);
  const signed = (value, digits = 1, suffix = "") => `${value >= 0 ? "+" : ""}${formatNumber(value, digits)}${suffix}`;
  routeQaEls.baselineButton.classList.toggle("active", routeQaState.mode === "baseline");
  routeQaEls.calibratedButton.classList.toggle("active", routeQaState.mode === "calibrated");
  routeQaEls.modeGroup.hidden = liveRegionalAudit;
  routeQaEls.purpose.value = routeQaState.purpose;
  if (!liveRegionalAudit) routeQaState.issue = "all";
  routeQaEls.issue.disabled = !liveRegionalAudit;
  routeQaEls.issue.value = routeQaState.issue;
  if (liveRegionalAudit) {
    const regionName = regionalScopeLabel().split(" · ")[0];
    const graph = activeRegionalRoutingManifest()?.graph || {};
    const directedCore = activeRegionalRoutingGraph()?.diagnostics?.() || {};
    const accessBundle = isNtWestScope()
      ? ntWestAccessBundle
      : isOutlyingIslandsScope()
        ? islandsAccessBundle
        : isNtEastScope()
          ? ntEastAccessBundle
          : kowloonAccessBundle;
    const liveRouteCount = selected.walkingRouteCount || 0;
    const issueMeta = ROUTE_QA_ISSUE_META[routeQaState.issue] || null;
    const issueLabel = issueMeta?.label || "Critical route";
    const scopedRecords = liveRouteQaRecords().filter(
      (record) => routeQaState.purpose === "all" || record.purpose === routeQaState.purpose,
    );
    const selectedIssueShare = routeQaIssueShare(scopedRecords);
    const weightedAgentShare = (predicate, source = world.agents) => {
      const total = source.reduce((sum, agent) => sum + Math.max(0, Number(agent.censusWeight) || 0), 0);
      return source.reduce(
        (sum, agent) => sum + (predicate(agent) ? Math.max(0, Number(agent.censusWeight) || 0) : 0),
        0,
      ) / Math.max(1, total);
    };
    const walkingAgents = world.agents.filter((agent) => agent.travelMode === "walk");
    const schoolNetworkShare = weightedAgentShare(
      (agent) => Boolean(agent.schoolAssignment?.networkAccessMatched),
      walkingAgents,
    );
    const poiNetworkShare = weightedAgentShare(
      (agent) => Boolean(agent.poiAssignmentCalibration?.bidirectionalNetworkMatched),
      walkingAgents,
    );
    routeQaEls.kicker.textContent = isV12_11Scope()
      ? `V12.11 · ${regionName} · component-aware live evidence`
      : isNtEastScope()
        ? "V12.10 · New Territories East · live route evidence"
        : "V12.9.5 · Continuous Kowloon · V12.9.4 evidence";
    routeQaEls.title.textContent = `${regionName} network-choice and route-validity audit`;
    routeQaEls.runLabel.textContent = `${liveRouteCount.toLocaleString()} realised walking ODs in this run · ${world.population.toLocaleString()} Agents · internal diagnostic`;
    routeQaEls.mapTitle.textContent = `DCCA ${issueLabel.toLowerCase()} rate`;
    routeQaEls.mapSubtitle.textContent = `Live · ${routeQaState.purpose === "all" ? "all realised walking trips" : routeQaState.purpose} · Census-weighted diagnostic`;
    routeQaEls.legendTitle.textContent = `DCCA ${issueLabel.toLowerCase()} share`;
    routeQaEls.legendNote.textContent = routeQaState.issue === "all"
      ? "Fill = weighted share of audited walking routes rated critical"
      : `Fill = weighted share carrying a ${issueLabel.toLowerCase()} diagnostic flag`;
    routeQaEls.schoolTime.textContent = selected.schoolWalkMeanMinutes
      ? `${formatNumber(selected.schoolWalkMeanMinutes, 1)} min`
      : "n/a";
    routeQaEls.schoolTimeDelta.textContent = "realised walk-to-school routes; no observed-route target";
    routeQaEls.connector.textContent = `${formatNumber(selected.connectorP95Meters || 0, 0)} m`;
    routeQaEls.connectorDelta.textContent = "p95 horizontal place-to-network links; indoor height is separate";
    routeQaEls.issueRate.textContent = `${formatNumber((selected.reviewShare || 0) * 100, 1)}% / ${formatNumber((selected.criticalShare || 0) * 100, 1)}%`;
    routeQaEls.issueDelta.textContent = routeQaState.issue === "all"
      ? "review / critical live diagnostic flags"
      : `${issueLabel}: ${formatNumber(selectedIssueShare * 100, 1)}% of selected routes`;
    routeQaEls.networkShare.textContent = `${formatNumber((selected.networkRoutedShare || 0) * 100, 1)}%`;
    routeQaEls.failureRate.textContent = `${formatNumber((selected.failureShare || 0) * 100, 2)}% spatial fallback`;
    routeQaEls.durationShape.textContent =
      `<=10 ${formatNumber((selectedSchool.schoolAtMost10MinuteShare || 0) * 100, 1)}% / ` +
      `>15 ${formatNumber((selectedSchool.schoolOver15MinuteShare || 0) * 100, 1)}%`;
    routeQaEls.durationTarget.textContent = `TCS shape shown as a prior, not a ${regionName} validation target`;
    routeQaEls.schoolAccess.textContent =
      `School ${formatNumber(schoolNetworkShare * 100, 1)}% · POI ${formatNumber(poiNetworkShare * 100, 1)}%`;
    routeQaEls.schoolAccessNote.textContent =
      `walking school K=${accessBundle?.school?.kNearest || 0} · directed POI chain K=${accessBundle?.poi?.kNearest || 0}`;
    const runtimeNodeEvidence = isV12_11Scope()
      ? `${(graph.eligibleEndpointComponentNodeCount || 0).toLocaleString()} in endpoint-eligible components`
      : `${(directedCore.directedCoreNodeCount || 0).toLocaleString()} in bidirectional core`;
    routeQaEls.networkMethod.textContent = `Official LandsD directed 3DPN A* · ${(graph.nodeCount || 0).toLocaleString()} nodes · ${runtimeNodeEvidence}`;
    routeQaEls.endpointMethod.textContent = "CSDI homes, EDB schools and iGeoCom child POIs retain explicit horizontal connectors; synthetic indoor height is audited separately";
    routeQaEls.calibrationMethod.textContent = "Directed 3DPN K-nearest walking schools and bidirectional school-POI-home candidates + TCS territory-wide mode/time priors; Census weights remain represented-population reporting only";
    routeQaEls.claimBoundary.textContent = `No observed child address, enrolment, route trace, surveyed entrance, AccessTime schedule or ${regionName} external calibration; disconnected components are never bridged as walking`;
    if (isWholeHkScope()) {
      const attempts = wholeHkAttemptSummary(routeQaState.purpose);
      routeQaEls.kicker.textContent = "V12.13 · whole-HK shared cohort · live evidence";
      routeQaEls.runLabel.textContent = `${attempts.total} walking attempts since reset · ${attempts.blocked} blocked · ${liveRouteCount} realised routes in retained Agent histories`;
      routeQaEls.networkShare.textContent = attempts.total ? `${formatNumber(attempts.exact / attempts.total * 100, 1)}%` : "n/a";
      routeQaEls.failureRate.textContent = `${attempts.blocked} blocked / ${attempts.total} attempts; ${attempts.localConnector} local connectors`;
      routeQaEls.schoolAccessNote.textContent = "Census-weighted precomputed candidate coverage; not actual OD success";
      routeQaEls.networkMethod.textContent = "Five independent directed 3DPN graphs; shared source overlaps are not counted as unique nodes. Cross-pack walking remains blocked.";
      routeQaEls.endpointMethod.textContent = "Actual endpoint DCCAs and scoped node/component IDs are checked before A*. Missing source homes or unreachable ODs cannot generate straight-line walking.";
      routeQaEls.calibrationMethod.textContent = "Regional school/POI choice retained. Kowloon estimation calibration is regional only; other regions retain existing priors. Whole-HK single ages are sampled within DCCA age groups.";
      routeQaEls.claimBoundary.textContent = "Internal diagnostic, not external validation. Within-pack travel only; synthetic indoor floors and unsurveyed connectors remain. Source 3D geometry unchanged; opening hours not enforced.";
      if (!liveRouteCount) {
        routeQaEls.connector.textContent = "n/a";
        routeQaEls.issueRate.textContent = "n/a";
        routeQaEls.durationShape.textContent = "n/a";
      }
    }
    drawRouteQaMap();
    renderRouteQaCauseLedger();
    renderRouteQaOutliers();
    if (isWholeHkScope()) renderWholeHkBlockedAttempts();
    return;
  }
  routeQaEls.kicker.textContent = "Hong Kong Island · 80 DCCAs";
  routeQaEls.title.textContent = "Route and destination calibration";
  routeQaEls.mapTitle.textContent = "DCCA critical-route rate";
  routeQaEls.legendTitle.textContent = "DCCA critical-route share";
  routeQaEls.legendNote.textContent = "Fill = weighted share of audited walking routes rated critical";
  routeQaEls.networkMethod.textContent = "Official LandsD directed 3DPN A*";
  routeQaEls.endpointMethod.textContent = "CSDI / EDB / iGeoCom points use an explicit unsurveyed connector to the primary graph";
  routeQaEls.calibrationMethod.textContent = "Directed 3DPN K-nearest schools + TCS duration targets + EDB capacity + connector quality";
  routeQaEls.claimBoundary.textContent = "No observed child address, enrolment, route trace or building entrance";
  routeQaEls.runLabel.textContent = routeCalibrationReference
    ? `${routeCalibrationReference.design.seedCount} paired seeds · ${routeCalibrationReference.design.populationPerSeed.toLocaleString()} Agents/seed · ${ROUTE_CALIBRATION.version}`
    : `Live ${ROUTE_CALIBRATION_MODE} simulation · reference audit pending`;
  routeQaEls.mapSubtitle.textContent = `${routeQaState.mode === "calibrated" ? "Calibrated" : "Before"} · ${routeQaState.purpose === "all" ? "all walking trips" : routeQaState.purpose} · fixed HK Island evidence scope`;
  routeQaEls.schoolTime.textContent = selected.schoolWalkMeanMinutes
    ? `${formatNumber(selected.schoolWalkMeanMinutes, 1)} min`
    : "n/a";
  routeQaEls.schoolTimeDelta.textContent = comparison.schoolWalkMeanMinutes
    ? `${signed(selected.schoolWalkMeanMinutes - comparison.schoolWalkMeanMinutes, 1, " min")} vs ${comparisonMode}`
    : "TCS walk-only target: 12 min";
  routeQaEls.connector.textContent = `${formatNumber(selected.connectorP95Meters || 0, 0)} m`;
  routeQaEls.connectorDelta.textContent = `${signed((selected.connectorP95Meters || 0) - (comparison.connectorP95Meters || 0), 0, " m")} vs ${comparisonMode}`;
  routeQaEls.issueRate.textContent = `${formatNumber((selected.reviewShare || 0) * 100, 1)}% / ${formatNumber((selected.criticalShare || 0) * 100, 1)}%`;
  routeQaEls.issueDelta.textContent = `${signed((issueShare - comparisonIssueShare) * 100, 1, " pp")} combined`;
  routeQaEls.networkShare.textContent = `${formatNumber((selected.networkRoutedShare || 0) * 100, 1)}%`;
  routeQaEls.failureRate.textContent = `${formatNumber((selected.failureShare || 0) * 100, 2)}% spatial fallback`;
  routeQaEls.durationShape.textContent =
    `<=10 ${formatNumber((selectedSchool.schoolAtMost10MinuteShare || 0) * 100, 1)}% / ` +
    `>15 ${formatNumber((selectedSchool.schoolOver15MinuteShare || 0) * 100, 1)}%`;
  routeQaEls.durationTarget.textContent =
    `target: <=10 ${formatNumber((routeCalibrationReference?.targets?.walkOnlyAtMost10MinuteShare || 0.64) * 100, 0)}% / ` +
    `>15 ${formatNumber((routeCalibrationReference?.targets?.walkOnlyOver15MinuteShare || 0.15) * 100, 0)}%`;
  routeQaEls.schoolAccess.textContent = assignment
    ? `School ${formatNumber((assignment.exactSchoolAccessShare || 0) * 100, 1)}%`
    : "live";
  routeQaEls.schoolAccessNote.textContent = assignment
    ? `POI outbound ${formatNumber((assignment.exactPoiChainAccessShare || 0) * 100, 1)}% · ` +
      `both directions ${formatNumber((assignment.bidirectionalPoiChainAccessShare || 0) * 100, 1)}%`
    : `school K=${islandSchoolAccessBundle?.kNearest || 0} · POI K=${islandPoiAccessBundle?.kNearest || 0}`;
  drawRouteQaMap();
  renderRouteQaCauseLedger();
  renderRouteQaOutliers();
}

function validationValue(value, unit, digits = 1) {
  if (!Number.isFinite(value)) return "n/a";
  if (unit === "share") return `${formatNumber(value * 100, digits)}%`;
  if (unit === "m") return `${formatNumber(value, digits)} m`;
  if (unit === "min") return `${formatNumber(value, digits)} min`;
  return formatNumber(value, digits);
}

function signedValidationValue(value, unit, digits = 1) {
  if (!Number.isFinite(value)) return "n/a";
  const sign = value > 0 ? "+" : "";
  if (unit === "share") return `${sign}${formatNumber(value * 100, digits)} pp`;
  return `${sign}${validationValue(value, unit, digits)}`;
}

function populationScaleValue(value, unit, digits = 2) {
  if (!Number.isFinite(value)) return "n/a";
  if (unit === "share") return `${formatNumber(value * 100, digits)}%`;
  if (unit === "min") return `${formatNumber(value, digits)} min`;
  if (unit === "km") return `${formatNumber(value, digits)} km`;
  if (unit === "ratio") return `${formatNumber(value, digits)}×`;
  return formatNumber(value, digits);
}

function renderPopulationScaleDiagnostic() {}

function updateValidationScopeContext() {}

function updateValidationView() {}

function updateTooltip() {
  if (activeView !== "scene" || pointer.dragging || !pointer.hasPosition) {
    tooltip.hidden = true;
    return;
  }
  updateSpatialTooltip("scene", pointer.x, pointer.y);
}

function setPanelCollapsed(panel, collapsed) {
  const isControls = panel === "controls";
  const stateKey = isControls ? "controlsCollapsed" : "metricsCollapsed";
  const className = isControls ? "controls-collapsed" : "metrics-collapsed";
  const button = isControls ? controls.collapseControls : controls.collapseMetrics;
  const icon = isControls ? controls.controlsCollapseIcon : controls.metricsCollapseIcon;
  panelState[stateKey] = Boolean(collapsed);
  appShell.classList.toggle(className, panelState[stateKey]);
  button.setAttribute("aria-expanded", String(!panelState[stateKey]));
  button.setAttribute(
    "aria-label",
    `${panelState[stateKey] ? "Expand" : "Collapse"} ${isControls ? "controls" : "metrics"}`,
  );
  button.title = `${panelState[stateKey] ? "Expand" : "Collapse"} ${isControls ? "controls" : "metrics"}`;
  icon.textContent = isControls
    ? panelState[stateKey] ? ">" : "<"
    : panelState[stateKey] ? "<" : ">";
  resizeAllCanvases();
}

function setView(view) {
  if (!["osm","scene","agents","buildings","map","stats"].includes(view)) view="osm";
  activeView = view;
  tooltip.hidden = true;
  simulationArea.dataset.view = view;
  const selfContainedWorkspace = ["agents", "routeqa", "terrainqa", "validation", "kowloonlab", "expansion", "crosspack", "policies", "indicators", "buildings", "rules", "comparison", "stats"].includes(view);
  setPanelCollapsed("metrics", selfContainedWorkspace);
  document.querySelectorAll(".tab-button").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    if (active) button.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  });
  sceneCanvas.classList.toggle("active", view === "scene");
  mapCanvas.classList.toggle("active", view === "map");
  osmCanvas.classList.toggle("active", view === "osm");
  agentsView.classList.toggle("active", view === "agents");
  routeQaView.classList.toggle("active", view === "routeqa");
  terrainQaView.classList.toggle("active", view === "terrainqa");
  validationView.classList.toggle("active", view === "validation");
  kowloonLabView.classList.toggle("active", view === "kowloonlab");
  expansionView.classList.toggle("active", view === "expansion");
  document.getElementById("crosspackView")?.classList.toggle("active", view === "crosspack");
  document.getElementById("policiesView")?.classList.toggle("active", view === "policies");
  if (view === "policies") window.PolicyLab?.show();
  if (view === "crosspack") window.CrossPackLab?.show();
  buildingsView.classList.toggle("active", view === "buildings");
  rulesView.classList.toggle("active", view === "rules");
  comparisonView.classList.toggle("active", view === "comparison");
  statsView.classList.toggle("active", view === "stats");
  controls.cameraTools.hidden = !["scene", "map", "osm"].includes(view);
  controls.cameraTools.style.display = ["scene", "map", "osm"].includes(view) ? "" : "none";
  if (view === "stats") updateStatsView(world.metrics || computeMetrics());
  if (view === "buildings") updateBuildingPanel();
  resizeAllCanvases();
  if (view === "comparison") updateComparisonView();
  if (view === "routeqa") updateRouteQaView();
  if (view === "terrainqa") updateTerrainQaView();
  if (view === "validation") updateValidationView();
  if (view === "kowloonlab") {
    updateKowloonLabView();
    drawKowloonLabView();
    ensureKowloonRoutingGraph().then(() => {
      updateKowloonLabView();
      drawKowloonLabView();
    });
  }
  if (view === "expansion") {
    updateExpansionView();
    drawExpansionView();
    ensureExpansionGraphLoaded().then(() => {
      updateExpansionView();
      drawExpansionView();
    });
  }
  if (view === "agents") {
    populateAgentObserverControls();
    updateAgentObserverPanel();
    drawAgentObserver();
  }
  updateSpatialSelectionInspector();
}

function updateRuleControls() {
  Object.keys(RULE_DEFAULTS).forEach((key) => {
    controls.ruleInputs[key].value = String(world.rules[key]);
    controls.ruleOutputs[key].value = world.rules[key].toFixed(2);
  });
}

function updateLayerControls() {
  Object.entries(controls.layerInputs).forEach(([key, input]) => {
    input.checked = Boolean(world.layers[key]);
    if (key === "routes") input.disabled = !(isPilotScope() || isRegionalScope());
  });
  controls.focus.disabled = isPilotScope();
  const minimumPopulation = isWholeHkScope() ? 1400 : isRegionalScope()
    ? Math.ceil((
        isKowloonScope()
          ? 1485
          : isNtEastScope()
            ? v12_10NtEastRoutingManifest?.regionalPopulationEvidence?.dccaAgeStratumCount || 1177
            : isNtWestScope()
              ? v12_11NtWestRoutingManifest?.regionalPopulationEvidence?.dccaAgeStratumCount || 1320
              : isOutlyingIslandsScope()
                ? v12_11IslandsRoutingManifest?.regionalPopulationEvidence?.dccaAgeStratumCount || 110
            : hkIslandModel?.scope?.dccaAgeStratumCount || 880
      ) / 50) * 50
    : 200;
  controls.population.min = String(minimumPopulation);
  if (Number(controls.population.value) < minimumPopulation) {
    controls.population.value = String(minimumPopulation);
    controls.populationOutput.value = minimumPopulation.toLocaleString();
  }
}

function bindEvents() {
  agentObserverEls.cohortButton.addEventListener("click", () => setAgentObserverMode("cohort"));
  agentObserverEls.followButton.addEventListener("click", () => setAgentObserverMode("follow"));
  agentObserverEls.auditButton.addEventListener("click", () => setAgentObserverMode("audit"));
  agentObserverEls.travelFilter.addEventListener("change", () => {
    agentObserver.travelFilter = agentObserverEls.travelFilter.value;
    const candidates = filteredObservedAgents();
    if (candidates.length && !candidates.some((agent) => agent.id === agentObserver.selectedAgentId)) {
      agentObserver.selectedAgentId = candidates[0].id;
      agentObserver.selectedTripId = null;
      invalidateAgentObserverGeometry();
    }
    updateAgentObserverPanel();
  });
  agentObserverEls.stateFilter.addEventListener("change", () => {
    agentObserver.stateFilter = agentObserverEls.stateFilter.value;
    updateAgentObserverPanel();
  });
  agentObserverEls.ageFilter.addEventListener("change", () => {
    agentObserver.ageFilter = agentObserverEls.ageFilter.value;
    updateAgentObserverPanel();
  });
  agentObserverEls.areaFilter.addEventListener("change", () => {
    agentObserver.areaFilter = agentObserverEls.areaFilter.value;
    updateAgentObserverPanel();
  });
  agentObserverEls.previousButton.addEventListener("click", () => cycleSelectedAgent(-1));
  agentObserverEls.nextButton.addEventListener("click", () => cycleSelectedAgent(1));
  agentObserverEls.idInput.addEventListener("change", () => setSelectedAgent(agentObserverEls.idInput.value));
  agentObserverEls.idInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setSelectedAgent(agentObserverEls.idInput.value);
    agentObserverEls.idInput.blur();
  });
  agentObserverEls.tripSelect.addEventListener("change", () => {
    agentObserver.selectedTripId = Number(agentObserverEls.tripSelect.value) || null;
    invalidateAgentObserverGeometry();
    updateAgentRouteReadout(selectedObservedAgent());
  });
  agentCanvas.addEventListener("click", (event) => {
    const rect = agentCanvas.getBoundingClientRect();
    selectNearestObserverAgent(event.clientX - rect.left, event.clientY - rect.top);
  });
  agentCanvas.addEventListener("dblclick", (event) => {
    event.preventDefault();
    const rect = agentCanvas.getBoundingClientRect();
    selectNearestObserverAgent(event.clientX - rect.left, event.clientY - rect.top);
    setAgentObserverMode("follow");
  });
  agentCanvas.addEventListener(
    "wheel",
    (event) => {
      if (agentObserver.mode !== "follow") return;
      event.preventDefault();
      agentObserver.followRadiusMeters = clamp(
        agentObserver.followRadiusMeters * Math.exp(clamp(event.deltaY, -240, 240) * 0.0015),
        450,
        6000,
      );
    },
    { passive: false },
  );

  routeQaEls.baselineButton.addEventListener("click", () => {
    routeQaState.mode = "baseline";
    updateRouteQaView();
  });
  routeQaEls.calibratedButton.addEventListener("click", () => {
    routeQaState.mode = "calibrated";
    updateRouteQaView();
  });
  routeQaEls.purpose.addEventListener("change", () => {
    routeQaState.purpose = routeQaEls.purpose.value;
    updateRouteQaView();
  });
  routeQaEls.issue.addEventListener("change", () => {
    routeQaState.issue = routeQaEls.issue.value;
    updateRouteQaView();
  });

  terrainQaEls.regionSelect.addEventListener("change", () => {
    terrainQaState.regionKey = terrainQaEls.regionSelect.value;
    terrainQaState.selectedDccaId = null;
    updateTerrainQaView();
  });
  terrainQaEls.metricSelect.addEventListener("change", () => {
    terrainQaState.metric = terrainQaEls.metricSelect.value;
    terrainQaState.selectedDccaId = null;
    updateTerrainQaView();
  });
  terrainQaEls.regionRows.addEventListener("click", (event) => {
    const row = event.target.closest?.("[data-region]");
    if (!row) return;
    terrainQaState.regionKey = row.dataset.region;
    terrainQaState.selectedDccaId = null;
    updateTerrainQaView();
  });
  terrainQaEls.routeRows.addEventListener("click", (event) => {
    const row = event.target.closest?.("[data-dcca]");
    if (row) selectTerrainQaDcca(row.dataset.dcca);
  });
  terrainQaCanvas.addEventListener("click", handleTerrainQaClick);
  terrainQaCanvas.addEventListener("keydown", (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    const rows = terrainQaRows();
    const currentIndex = Math.max(0, rows.findIndex((row) => row.dccaId === terrainQaState.selectedDccaId));
    const nextIndex = event.shiftKey
      ? (currentIndex - 1 + rows.length) % rows.length
      : (currentIndex + 1) % rows.length;
    selectTerrainQaDcca(rows[nextIndex]?.dccaId);
  });

  comparisonEls.referenceButton.addEventListener("click", () => {
    if (!comparisonReference?.webSummary?.[world.scope]) return;
    comparisonMode = "reference";
    updateComparisonView();
  });
  comparisonEls.liveButton.addEventListener("click", () => {
    comparisonMode = "live";
    updateComparisonView();
  });

  controls.collapseControls.addEventListener("click", () => {
    setPanelCollapsed("controls", !panelState.controlsCollapsed);
  });
  controls.collapseMetrics.addEventListener("click", () => {
    setPanelCollapsed("metrics", !panelState.metricsCollapsed);
  });

  Object.entries(controls.layerInputs).forEach(([key, input]) => {
    input.addEventListener("change", () => {
      world.layers[key] = input.checked;
      if (!input.checked && (
        (key === "agents" && spatialSelection.type === "agent") ||
        (key === "schools" && spatialSelection.type === "school") ||
        (key === "poi" && spatialSelection.type === "poi")
      )) clearSpatialSelection();
      markOsmStaticDirty();
    });
  });

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
    clearPilotRouteCache();
    invalidateAgentObserverGeometry();
  });

  Object.keys(RULE_DEFAULTS).forEach((key) => {
    controls.ruleInputs[key].addEventListener("input", () => {
      world.rules[key] = Number(controls.ruleInputs[key].value);
      controls.ruleOutputs[key].value = world.rules[key].toFixed(2);
      if (key === "parkAttraction" || key === "heatAvoidance" || key === "destinationCrowdPenalty") {
        clearPilotRouteCache();
        invalidateAgentObserverGeometry();
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

  controls.buildingMacro.addEventListener("click", () => setBuildingMode("macro"));
  controls.buildingModel.addEventListener("click", () => setBuildingMode("model"));

  controls.zoomOut.addEventListener("click", () => {
    if (activeView === "osm") zoomOsmMap(-1);
    else if (activeView === "map") zoomMapView(0.82);
    else zoomCamera(0.82);
  });

  controls.zoomFit.addEventListener("click", () => {
    if (activeView === "osm") fitOsmMap();
    else if (activeView === "map") fitMapView();
    else fitCameraToArea();
  });

  controls.zoomIn.addEventListener("click", () => {
    if (activeView === "osm") zoomOsmMap(1);
    else if (activeView === "map") zoomMapView(1.22);
    else zoomCamera(1.22);
  });

  controls.population.addEventListener("input", () => {
    controls.populationOutput.value = Number(controls.population.value).toLocaleString();
  });
  controls.population.addEventListener("change", resetSimulation);
  controls.seed?.addEventListener("change", resetSimulation);

  controls.scope.addEventListener("change", async () => {
    if (controls.scope.value === WHOLE_HK_SCOPE_ID) {
      await activateWholeHk();
      return;
    }
    clearSpatialSelection();
    const selectedPilot = pilotByScope.get(controls.scope.value);
    if (selectedPilot) activatePilot(selectedPilot);
    world.scope = selectedPilot?.id || (
      controls.scope.value === hkIslandModel?.scope?.id
        ? hkIslandModel.scope.id
        : controls.scope.value === KOWLOON_SCOPE_ID
          ? KOWLOON_SCOPE_ID
        : controls.scope.value === NT_EAST_SCOPE_ID
          ? NT_EAST_SCOPE_ID
          : controls.scope.value === NT_WEST_SCOPE_ID
            ? NT_WEST_SCOPE_ID
            : controls.scope.value === ISLANDS_SCOPE_ID
              ? ISLANDS_SCOPE_ID
          : "hong-kong"
    );
    if (isKowloonScope()) await ensureKowloonRoutingGraph();
    if (isNtEastScope()) await ensureNtEastRoutingGraph();
    if (isNtWestScope()) await ensureNtWestRoutingGraph();
    if (isOutlyingIslandsScope()) await ensureIslandsRoutingGraph();
    refreshPlaceZones();
    if (isPilotScope()) {
      world.focusId = pilotArea.id;
    } else if (isIslandScope()) {
      world.focusId = hkIslandDccas[0].id;
    } else if (isKowloonScope()) {
      world.focusId = kowloonDccas[0].id;
    } else if (isNtEastScope()) {
      world.focusId = ntEastDccas[0].id;
    } else if (isNtWestScope()) {
      world.focusId = ntWestDccas[0].id;
    } else if (isOutlyingIslandsScope()) {
      world.focusId = islandsDccas[0].id;
    } else {
      world.focusId = zones[0].id;
    }
    populateSelects();
    controls.focus.value = world.focusId;
    fitCameraToArea(isPilotScope() ? pilotArea : null);
    fitMapView();
    fitOsmMap();
    populateBuildingSelect();
    setBuildingMode(world.buildingMode);
    updateLayerControls();
    markOsmStaticDirty();
    resetSimulation();
  });

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
    clearPilotRouteCache();
    invalidateAgentObserverGeometry();
  });

  controls.focus.addEventListener("change", () => {
    const area = focusAreaById.get(controls.focus.value);
    setSpatialSelection("dcca", area, activeView);
    fitCameraToArea(area);
  });

  controls.time.addEventListener("input", () => {
    world.running = false;
    controls.time.setAttribute("aria-valuetext", `Restart at ${formatTime(Number(controls.time.value))}`);
  });
  controls.time.addEventListener("change", () => restartAtTime(controls.time.value));

  expansionEls.regionSelect.addEventListener("change", () => {
    const nextKey = expansionEls.regionSelect.value;
    if (!expansionRoutingPacks[nextKey]?.manifest) return;
    expansionState.regionKey = nextKey;
    expansionState.selectedRouteIndex = 0;
    populateExpansionRoutes();
    updateExpansionView();
    drawExpansionView();
    ensureExpansionGraphLoaded().then(() => {
      updateExpansionView();
      drawExpansionView();
    });
  });
  expansionEls.routeSelect.addEventListener("change", () => {
    expansionState.selectedRouteIndex = Number(expansionEls.routeSelect.value) || 0;
    updateExpansionView();
    drawExpansionView();
  });
  expansionEls.previousRoute.addEventListener("click", () => {
    expansionState.selectedRouteIndex -= 1;
    updateExpansionView();
    drawExpansionView();
  });
  expansionEls.nextRoute.addEventListener("click", () => {
    expansionState.selectedRouteIndex += 1;
    updateExpansionView();
    drawExpansionView();
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  sceneCanvas.addEventListener("pointerdown", (event) => {
    pointer.dragging = true;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    pointer.totalMove = 0;
    sceneCanvas.setPointerCapture(event.pointerId);
  });

  sceneCanvas.addEventListener("pointermove", (event) => {
    const rect = sceneCanvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.hasPosition = true;
    if (!pointer.dragging) return;
    const dx = event.clientX - pointer.lastX;
    const dy = event.clientY - pointer.lastY;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    pointer.totalMove += Math.hypot(dx, dy);
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

  sceneCanvas.addEventListener("click", (event) => {
    if (pointer.totalMove >= 5) return;
    handleSpatialClick("scene", event, sceneCanvas);
  });
  sceneCanvas.addEventListener("dblclick", (event) => handleSpatialDoubleClick("scene", event, sceneCanvas));
  sceneCanvas.addEventListener("pointerleave", () => {
    pointer.hasPosition = false;
    if (!pointer.dragging) tooltip.hidden = true;
  });

  mapCanvas.addEventListener("click", (event) => handleSpatialClick("map", event, mapCanvas));
  mapCanvas.addEventListener("dblclick", (event) => handleSpatialDoubleClick("map", event, mapCanvas));
  mapCanvas.addEventListener("pointermove", (event) => {
    const rect = mapCanvas.getBoundingClientRect();
    updateSpatialTooltip("map", event.clientX - rect.left, event.clientY - rect.top);
  });
  mapCanvas.addEventListener("pointerleave", () => { tooltip.hidden = true; });
  mapCanvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomMapView(event.deltaY > 0 ? 0.82 : 1.22);
    },
    { passive: false },
  );

  osmCanvas.addEventListener("pointerdown", (event) => {
    osmPointer.dragging = true;
    osmPointer.lastX = event.clientX;
    osmPointer.lastY = event.clientY;
    osmPointer.totalMove = 0;
    osmCanvas.setPointerCapture(event.pointerId);
  });

  osmCanvas.addEventListener("pointermove", (event) => {
    if (!osmPointer.dragging) {
      const rect = osmCanvas.getBoundingClientRect();
      updateSpatialTooltip("osm", event.clientX - rect.left, event.clientY - rect.top);
      return;
    }
    const dx = event.clientX - osmPointer.lastX;
    const dy = event.clientY - osmPointer.lastY;
    osmPointer.lastX = event.clientX;
    osmPointer.lastY = event.clientY;
    osmPointer.totalMove += Math.hypot(dx, dy);
    panOsmMap(dx, dy);
  });

  osmCanvas.addEventListener("pointerup", (event) => {
    osmPointer.dragging = false;
    osmCanvas.releasePointerCapture(event.pointerId);
  });

  osmCanvas.addEventListener("click", (event) => {
    if (osmPointer.totalMove >= 5) return;
    handleSpatialClick("osm", event, osmCanvas);
  });
  osmCanvas.addEventListener("dblclick", (event) => handleSpatialDoubleClick("osm", event, osmCanvas));
  osmCanvas.addEventListener("pointerleave", () => { tooltip.hidden = true; });

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
    if (world.buildingMode === "model") {
      buildingCamera.yaw += dx * 0.007;
      buildingCamera.pitch = clamp(buildingCamera.pitch + dy * 0.0045, 0.32, 1.18);
    }
  });

  buildingCanvas.addEventListener("pointerup", (event) => {
    const rect = buildingCanvas.getBoundingClientRect();
    if (world.buildingMode === "macro" && buildingPointer.totalMove < 5) {
      selectNearestBuildingOnMap(event.clientX - rect.left, event.clientY - rect.top);
    }
    buildingPointer.dragging = false;
    buildingCanvas.releasePointerCapture(event.pointerId);
  });

  buildingCanvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      if (world.buildingMode === "model") {
        buildingCamera.zoom = clamp(buildingCamera.zoom * Math.exp(-clamp(event.deltaY, -240, 240) * 0.0016), 0.62, 1.8);
      }
    },
    { passive: false },
  );

  kowloonLabCanvas.addEventListener("click", (event) => handleSpatialClick("kowloonlab", event, kowloonLabCanvas));
  kowloonLabCanvas.addEventListener("dblclick", (event) => handleSpatialDoubleClick("kowloonlab", event, kowloonLabCanvas));
  kowloonLabCanvas.addEventListener("pointermove", (event) => {
    const rect = kowloonLabCanvas.getBoundingClientRect();
    updateSpatialTooltip("kowloonlab", event.clientX - rect.left, event.clientY - rect.top);
  });
  kowloonLabCanvas.addEventListener("pointerleave", () => { tooltip.hidden = true; });

  spatialSelectionEls.close.addEventListener("click", clearSpatialSelection);
  spatialSelectionEls.primary.addEventListener("click", () => {
    runSpatialSelectionAction(spatialSelectionEls.primary.dataset.action);
  });
  spatialSelectionEls.secondary.addEventListener("click", () => {
    runSpatialSelectionAction(spatialSelectionEls.secondary.dataset.action);
  });
  spatialSelectionEls.replayToggle.addEventListener("click", () => {
    if (spatialSelection.playbackFraction >= 1) spatialSelection.playbackFraction = 0;
    spatialSelection.playbackPlaying = !spatialSelection.playbackPlaying;
    spatialSelection.playbackLastAt = performance.now();
    updateSpatialReplayControls();
  });
  spatialSelectionEls.replayRange.addEventListener("input", () => {
    spatialSelection.playbackPlaying = false;
    spatialSelection.playbackFraction = Number(spatialSelectionEls.replayRange.value) / 100;
    updateSpatialReplayControls();
  });

  if (typeof document.addEventListener === "function") {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && spatialSelection.type) clearSpatialSelection();
    });
  }

  window.addEventListener("resize", resizeAllCanvases);
}

function frame(now) {
  const minFrameMs = activeView === "scene"
    ? 1000 / 24
    : activeView === "stats" || activeView === "terrainqa" || activeView === "expansion" || activeView === "kowloonlab"
      ? 1000 / 8
      : activeView === "agents"
        ? 1000 / 15
        : 1000 / 20;
  if (now - lastRenderAt < minFrameMs) {
    requestAnimationFrame(frame);
    return;
  }
  lastRenderAt = now;

  const dt = Math.min(160, now - lastFrame);
  lastFrame = now;
  resizeAllCanvases();

  if (world.running) stepSimulation(dt);
  advanceSpatialSelectionReplay(now);

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
  } else if (activeView === "osm") {
    drawOsmMap();
  } else if (activeView === "agents") {
    drawAgentObserver();
    tooltip.hidden = true;
  } else if (activeView === "routeqa") {
    drawRouteQaMap();
    tooltip.hidden = true;
  } else if (activeView === "terrainqa") {
    drawTerrainQaView();
    tooltip.hidden = true;
  } else if (activeView === "kowloonlab") {
    drawKowloonLabView();
  } else if (activeView === "expansion") {
    drawExpansionView();
    tooltip.hidden = true;
  } else if (activeView === "buildings") {
    drawBuildingViewer();
    tooltip.hidden = true;
  } else {
    tooltip.hidden = true;
  }

  requestAnimationFrame(frame);
}

function buildKowloonDisplayEdgeSample() {
  const graph = v12_9KowloonRoutingGraph;
  if (!graph?.ready) {
    kowloonDisplayEdgeIds = [];
    return;
  }
  const priority = [];
  const regular = [];
  const stride = Math.max(1, Math.ceil(graph.edgeFrom.length / 10500));
  for (let edgeId = 0; edgeId < graph.edgeFrom.length; edgeId += 1) {
    const featureType = graph.edgeFeatureType[edgeId];
    if (PILOT_VERTICAL_FEATURES.has(featureType) || PILOT_CROSSING_FEATURES.has(featureType)) {
      priority.push(edgeId);
    } else if (edgeId % stride === 0) {
      regular.push(edgeId);
    }
  }
  kowloonDisplayEdgeIds = [...priority.slice(0, 4500), ...regular.slice(0, 10500)];
}

function buildNtEastDisplayEdgeSample() {
  const graph = v12_10NtEastRoutingGraph;
  if (!graph?.ready) {
    ntEastDisplayEdgeIds = [];
    return;
  }
  const priority = [];
  const regular = [];
  const stride = Math.max(1, Math.ceil(graph.edgeFrom.length / 14000));
  for (let edgeId = 0; edgeId < graph.edgeFrom.length; edgeId += 1) {
    const featureType = graph.edgeFeatureType[edgeId];
    if (PILOT_VERTICAL_FEATURES.has(featureType) || PILOT_CROSSING_FEATURES.has(featureType)) {
      priority.push(edgeId);
    } else if (edgeId % stride === 0) {
      regular.push(edgeId);
    }
  }
  ntEastDisplayEdgeIds = [...priority.slice(0, 5000), ...regular.slice(0, 14000)];
}

function buildV12_11DisplayEdgeSample(graph, maxRegularEdges, maxPriorityEdges) {
  if (!graph?.ready) return [];
  const priority = [];
  const regular = [];
  const stride = Math.max(1, Math.ceil(graph.edgeFrom.length / maxRegularEdges));
  for (let edgeId = 0; edgeId < graph.edgeFrom.length; edgeId += 1) {
    const featureType = graph.edgeFeatureType[edgeId];
    if (PILOT_VERTICAL_FEATURES.has(featureType) || PILOT_CROSSING_FEATURES.has(featureType)) {
      priority.push(edgeId);
    } else if (edgeId % stride === 0) {
      regular.push(edgeId);
    }
  }
  return [...priority.slice(0, maxPriorityEdges), ...regular.slice(0, maxRegularEdges)];
}

function buildNtWestDisplayEdgeSample() {
  ntWestDisplayEdgeIds = buildV12_11DisplayEdgeSample(v12_11NtWestRoutingGraph, 14000, 5000);
}

function buildIslandsDisplayEdgeSample() {
  islandsDisplayEdgeIds = buildV12_11DisplayEdgeSample(v12_11IslandsRoutingGraph, 10000, 4000);
}

async function ensureV12_11RoutingGraph(regionKey) {
  const descriptor = regionKey === "islands"
    ? {
        graph: v12_11IslandsRoutingGraph,
        manifest: v12_11IslandsRoutingManifest,
        statusKey: "islandsRoutingStatus",
        progressKey: "islandsRoutingProgress",
        label: "Islands",
        buildDisplaySample: buildIslandsDisplayEdgeSample,
      }
    : {
        graph: v12_11NtWestRoutingGraph,
        manifest: v12_11NtWestRoutingManifest,
        statusKey: "ntWestRoutingStatus",
        progressKey: "ntWestRoutingProgress",
        label: "NT West",
        buildDisplaySample: buildNtWestDisplayEdgeSample,
      };
  const { graph, manifest, statusKey, progressKey, label, buildDisplaySample } = descriptor;
  if (!graph) {
    world[statusKey] = "unavailable";
    return false;
  }
  if (graph.ready) {
    world[statusKey] = "ready";
    world[progressKey] = 1;
    buildDisplaySample();
    expansionState.statusByRegion[regionKey] = "ready";
    expansionState.progressByRegion[regionKey] = 1;
    return true;
  }
  if (graph.loading) {
    const pending = expansionState.loadPromises[regionKey];
    if (pending) await pending;
    if (graph.ready) {
      world[statusKey] = "ready";
      world[progressKey] = 1;
      buildDisplaySample();
    }
    return graph.ready;
  }
  const resumeRunning = world.running;
  world.running = false;
  world[statusKey] = "loading";
  controls.toggle.disabled = true;
  controls.scope.disabled = true;
  if (metricEls.regionalRouting) metricEls.regionalRouting.textContent = `Loading ${label} graph 0%`;
  try {
    await graph.load((progress) => {
      const total = Math.max(1, progress.total || manifest.graph.chunkCount);
      world[progressKey] = clamp((progress.completed || 0) / total, 0, 1);
      if (progress.phase === "ready") world[progressKey] = 1;
      if (metricEls.regionalRouting) {
        metricEls.regionalRouting.textContent = progress.phase === "assemble"
          ? `Assembling ${label} graph ${Math.round(world[progressKey] * 100)}%`
          : `Loading ${label} graph ${Math.round(world[progressKey] * 100)}%`;
      }
    });
    world[statusKey] = "ready";
    world[progressKey] = 1;
    buildDisplaySample();
    expansionState.statusByRegion[regionKey] = "ready";
    expansionState.progressByRegion[regionKey] = 1;
    world.running = resumeRunning;
    return true;
  } catch (error) {
    console.error(`${label} 3DPN routing graph failed to load`, error);
    world[statusKey] = "error";
    expansionState.statusByRegion[regionKey] = "error";
    world.running = false;
    return false;
  } finally {
    controls.toggle.disabled = false;
    controls.scope.disabled = false;
    markOsmStaticDirty();
  }
}

function ensureNtWestRoutingGraph() {
  return ensureV12_11RoutingGraph("ntWest");
}

function ensureIslandsRoutingGraph() {
  return ensureV12_11RoutingGraph("islands");
}

async function ensureNtEastRoutingGraph() {
  if (!v12_10NtEastRoutingGraph) {
    world.ntEastRoutingStatus = "unavailable";
    return false;
  }
  if (v12_10NtEastRoutingGraph.ready) {
    ensureNtEastDirectedCore();
    world.ntEastRoutingStatus = "ready";
    world.ntEastRoutingProgress = 1;
    if (!ntEastDisplayEdgeIds.length) buildNtEastDisplayEdgeSample();
    return true;
  }
  if (world.ntEastRoutingStatus === "loading") return false;
  const resumeRunning = world.running;
  world.running = false;
  world.ntEastRoutingStatus = "loading";
  controls.toggle.disabled = true;
  controls.scope.disabled = true;
  if (metricEls.regionalRouting) metricEls.regionalRouting.textContent = "Loading NT East graph 0%";
  try {
    await v12_10NtEastRoutingGraph.load((progress) => {
      const total = Math.max(1, progress.total || v12_10NtEastRoutingManifest.graph.chunkCount);
      world.ntEastRoutingProgress = clamp((progress.completed || 0) / total, 0, 1);
      if (progress.phase === "ready") world.ntEastRoutingProgress = 1;
      if (metricEls.regionalRouting) {
        metricEls.regionalRouting.textContent = progress.phase === "assemble"
          ? `Assembling NT East graph ${Math.round(world.ntEastRoutingProgress * 100)}%`
          : `Loading NT East graph ${Math.round(world.ntEastRoutingProgress * 100)}%`;
      }
    });
    ensureNtEastDirectedCore();
    world.ntEastRoutingStatus = "ready";
    buildNtEastDisplayEdgeSample();
    world.running = resumeRunning;
    expansionState.statusByRegion.ntEast = "ready";
    expansionState.progressByRegion.ntEast = 1;
    return true;
  } catch (error) {
    console.error("New Territories East 3DPN routing graph failed to load", error);
    world.ntEastRoutingStatus = "error";
    world.running = false;
    return false;
  } finally {
    controls.toggle.disabled = false;
    controls.scope.disabled = false;
    markOsmStaticDirty();
  }
}

async function ensureKowloonRoutingGraph() {
  if (!v12_9KowloonRoutingGraph) {
    world.kowloonRoutingStatus = "unavailable";
    return false;
  }
  if (v12_9KowloonRoutingGraph.ready) {
    kowloonMultimodalGraph?.load();
    ensureKowloonDirectedCore();
    world.kowloonRoutingStatus = "ready";
    world.kowloonRoutingProgress = 1;
    if (!kowloonDisplayEdgeIds.length) buildKowloonDisplayEdgeSample();
    return true;
  }
  if (world.kowloonRoutingStatus === "loading") return false;
  const resumeRunning = world.running;
  world.running = false;
  world.kowloonRoutingStatus = "loading";
  controls.toggle.disabled = true;
  controls.scope.disabled = true;
  if (metricEls.regionalRouting) metricEls.regionalRouting.textContent = "Loading Kowloon graph 0%";
  try {
    await v12_9KowloonRoutingGraph.load((progress) => {
      const total = Math.max(1, progress.total || v12_9KowloonRoutingManifest.graph.chunkCount);
      world.kowloonRoutingProgress = clamp((progress.completed || 0) / total, 0, 1);
      if (progress.phase === "ready") world.kowloonRoutingProgress = 1;
      if (metricEls.regionalRouting) {
        metricEls.regionalRouting.textContent = progress.phase === "assemble"
          ? `Assembling Kowloon graph ${Math.round(world.kowloonRoutingProgress * 100)}%`
          : `Loading Kowloon graph ${Math.round(world.kowloonRoutingProgress * 100)}%`;
      }
    });
    kowloonMultimodalGraph?.load();
    ensureKowloonDirectedCore();
    world.kowloonRoutingStatus = "ready";
    buildKowloonDisplayEdgeSample();
    world.running = resumeRunning;
    expansionState.statusByRegion.kowloon = "ready";
    expansionState.progressByRegion.kowloon = 1;
    return true;
  } catch (error) {
    console.error("Continuous Kowloon 3DPN routing graph failed to load", error);
    world.kowloonRoutingStatus = "error";
    world.running = false;
    return false;
  } finally {
    controls.toggle.disabled = false;
    controls.scope.disabled = false;
    markOsmStaticDirty();
  }
}

async function initializeApplication() {
  if (document.body?.dataset.defaultScope === WHOLE_HK_SCOPE_ID) world.scope = WHOLE_HK_SCOPE_ID;
  setupZones();
  localToLonLatTransform = fitLocalToLonLat();
  fitCameraToArea();
  fitOsmMap();
  populateSelects();
  populateBuildingSelect();
  makeActivityMeters();
  updateRuleControls();
  updateLayerControls();
  populateExpansionRoutes();
  updateExpansionView();
  setBuildingMode("macro");
  bindEvents();
  setView(realGeoData ? "osm" : "scene");
  requestAnimationFrame(frame);

  if (isWholeHkScope()) {
    await activateWholeHk();
    return;
  }

  if (isNtWestScope() || isOutlyingIslandsScope() || isNtEastScope()) {
    if (isNtWestScope()) await ensureNtWestRoutingGraph();
    else if (isOutlyingIslandsScope()) await ensureIslandsRoutingGraph();
    else await ensureNtEastRoutingGraph();
    refreshPlaceZones();
    resetSimulation();
    world.metrics = computeMetrics();
    updatePanels();
    return;
  }

  const resumeRunning = world.running;
  if (!hkIslandRoutingGraph) {
    resetSimulation();
    return;
  }

  if (hkIslandRoutingGraph.ready) {
    world.islandRoutingStatus = "ready";
    world.islandRoutingProgress = 1;
    refreshPlaceZones();
    resetSimulation();
    return;
  }

  world.running = false;
  world.islandRoutingStatus = "loading";
  controls.toggle.disabled = true;
  controls.scope.disabled = true;
  metricEls.regionalRouting.textContent = "Loading graph 0%";
  try {
    await hkIslandRoutingGraph.load((progress) => {
      const total = Math.max(1, progress.total || hkIslandRoutingManifest.graph.chunkCount);
      world.islandRoutingProgress = clamp((progress.completed || 0) / total, 0, 1);
      if (progress.phase === "ready") world.islandRoutingProgress = 1;
      metricEls.regionalRouting.textContent = progress.phase === "assemble"
        ? `Assembling graph ${Math.round(world.islandRoutingProgress * 100)}%`
        : `Loading graph ${Math.round(world.islandRoutingProgress * 100)}%`;
    });
    world.islandRoutingStatus = "ready";
    refreshPlaceZones();
    resetSimulation();
    world.running = resumeRunning;
  } catch (error) {
    console.error("Hong Kong Island 3DPN routing graph failed to load", error);
    world.islandRoutingStatus = "error";
    world.running = false;
    resetSimulation();
  } finally {
    controls.toggle.disabled = false;
    controls.scope.disabled = false;
    world.metrics = computeMetrics();
    updatePanels();
  }
}

initializeApplication();
