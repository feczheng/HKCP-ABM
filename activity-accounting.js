"use strict";

// Shared by the live engine, route audits and offline policy screening.
(function exposeActivityAccounting(scope) {
  const VERSION = "segment-accounting-v1";
  const mechanicalFeatures = new Set([8, 9, 10, 13, 16, 17, 18, 21]);
  function empty() {
    return { distanceMeters: 0, generalizedMeters: 0, journeyMinutes: 0,
      activeTravelMinutes: 0, mvpaMinutes: 0, vigorousMinutes: 0, lightActivityMinutes: 0,
      metyMinutes: 0, netMetyMinutes: 0, verticalGainMeters: 0, activeAscentMeters: 0, mechanicalMeters: 0,
      mechanicalMinutes: 0, connectorMinutes: 0, waitingMinutes: 0, proxyActiveMinutes: 0 };
  }
  function number(value, fallback = 0) {
    const result = value ?? fallback;
    if (!Number.isFinite(result) || result < 0) throw new Error("Invalid activity segment quantity");
    return result;
  }
  function measure(segment, baseMety, parameters, condition = "threeD") {
    const planar = condition === "twoD";
    const minutes = number(planar ? segment.planarMinutes ?? segment.minutes : segment.minutes);
    const meters = number(planar ? segment.horizontalMeters : segment.meters);
    const ascent = planar ? 0 : number(segment.ascentMeters);
    const kind = segment.kind || "connector";
    const share = kind === "walk" ? 1 : kind === "proxy" ? Math.min(1, number(segment.activeShare)) : 0;
    const active = minutes * share;
    const grade = kind === "walk" && !planar && segment.meters > 0 ? ascent / segment.meters : 0;
    const intensity = number(baseMety) + Math.min(parameters.maxSlopeMetyGain ?? 3, grade * (parameters.slopeMetyGainPerGrade ?? 10));
    const mvpa = active > 0 && intensity >= (parameters.mvpaThresholdMety ?? 4) ? active : 0;
    const dose = active * intensity + (minutes - active) * (parameters.inactiveMety?.commuteWaiting ?? 1.5);
    return { ...empty(), distanceMeters: meters,
      generalizedMeters: number(planar ? segment.planarGeneralizedMeters ?? meters : segment.generalizedMeters ?? meters),
      journeyMinutes: minutes, activeTravelMinutes: active, mvpaMinutes: mvpa,
      vigorousMinutes: intensity >= (parameters.vigorousThresholdMety ?? 6) ? active : 0,
      lightActivityMinutes: active - mvpa,
      metyMinutes: dose, netMetyMinutes: dose - minutes,
      verticalGainMeters: ascent, activeAscentMeters: kind === "walk" ? ascent : 0,
      mechanicalMeters: kind === "mechanical" ? meters : 0,
      mechanicalMinutes: kind === "mechanical" ? minutes : 0,
      connectorMinutes: kind === "connector" ? minutes : 0,
      waitingMinutes: kind === "wait" ? minutes : 0,
      proxyActiveMinutes: kind === "proxy" ? active : 0 };
  }
  function add(target, outcome) {
    for (const key of Object.keys(target)) target[key] += outcome[key] || 0;
    return target;
  }
  function fraction(segment, share) {
    const result = { ...segment };
    for (const key of ["meters", "horizontalMeters", "generalizedMeters", "planarGeneralizedMeters", "minutes", "planarMinutes", "ascentMeters"]) {
      if (Number.isFinite(result[key])) result[key] *= share;
    }
    return result;
  }
  function sum(segments, baseMety, parameters, condition = "threeD") {
    return segments.reduce((total, segment) => add(total, measure(segment, baseMety, parameters, condition)), empty());
  }
  scope.HKActivityAccounting = Object.freeze({ VERSION, empty, measure, add, fraction, sum,
    isMechanical: feature => mechanicalFeatures.has(feature) });
})(globalThis);
