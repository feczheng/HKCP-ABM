"use strict";

(function expose(scope) {
  const VERSION="live-indicators-v1";
  const travel=[
    ["dose","D · Net travel dose","METy-min"],["time","T · Journey time","min"],
    ["mvpa","M · Accumulated MVPA","min"],["travelMvpa","Travel MVPA","min"],
    ["active","Active travel","min"],["distance","Travel distance","m"],
    ["ascent","Active ascent","m"],["mechanical","Mechanical travel","min"],
    ["waiting","Accounted waiting","min"],["connector","Unverified access","min"],
    ["proxy","Proxy active travel","min"],
  ];
  const fields={time:"journeyMinutes",travelMvpa:"mvpaMinutes",active:"activeTravelMinutes",distance:"distanceMeters",
    ascent:"activeAscentMeters",mechanical:"mechanicalMinutes",waiting:"waitingMinutes",connector:"connectorMinutes",proxy:"proxyActiveMinutes"};
  const finite=x=>Number.isFinite(x)?x:null;
  const subtract=(a,b)=>a===null||b===null?null:a-b;
  const dose=l=>l?subtract(finite(l.metyMinutes),finite(l.journeyMinutes)):null;
  function agent(a,context={}) {
    const pair={twoD:{},threeD:{},difference:{}};
    for(const g of ["twoD","threeD"]){
      const l=a?.geometryComparison?.all?.[g];
      for(const [key,source] of Object.entries(fields))pair[g][key]=finite(l?.[source]);
      pair[g].dose=dose(l);
      const daily=finite(a?.mvpaMinutes),two=finite(a?.geometryComparison?.all?.twoD?.mvpaMinutes),three=finite(a?.geometryComparison?.all?.threeD?.mvpaMinutes);
      pair[g].mvpa=g==="threeD"?daily:daily===null||two===null||three===null?null:daily-three+two;
    }
    for(const [key] of travel)pair.difference[key]=subtract(pair.threeD[key],pair.twoD[key]);
    return {schema:VERSION,kind:"agent",id:a?.id??null,age:a?.age??null,state:a?.state??null,
      scope:context.scope??null,scenario:context.scenario??null,units:Object.fromEntries(travel.map(([key,,unit])=>[key,unit])),
      home:a?.homeZone?.code??null,school:a?.schoolPoint?.name??a?.schoolZone?.name??null,destination:a?.target?.label??null,
      day:(context.dayIndex??0)+1,time:finite(context.time),trackedMinutes:finite(a?.physicalActivityTrackedMinutes),
      running:Boolean(context.running),windowMinutes:finite(context.windowMinutes),...pair,
      domains:{travel:finite(a?.mvpaByDomain?.activeTravel),school:finite(a?.mvpaByDomain?.school),outdoor:finite(a?.mvpaByDomain?.outdoor),activity:finite(a?.mvpaByDomain?.activity)},
      vigorous:finite(a?.vigorousMinutes),light:finite(a?.lightActivityMinutes),totalMety:finite(a?.metyMinutes),
      trips:a?(a.tripHistory?.length??0):null,matchedTrips:a?.geometryComparison?.matched?.tripCount??null,
      excludedTrips:a?.geometryComparison?.excludedTripCount??null,
      routeEvidence:a&&scope.AgentFilterMetrics?scope.AgentFilterMetrics.evidence(a):null,
      opportunities:{value:null,status:"Scenario analysis only; not evaluated for this live Agent"},
      policyGain:{value:null,status:"Requires a paired policy/no-policy run"},
      evidence:"Accumulated current window, not a completed day. Same realised paths; 2D changes travel accounting only. All travel includes labelled proxies and unverified access. Dose is above basal metabolism, not kcal or fatigue."};
  }
  function population(agents,context={},weighted=false){
    const rows=agents.map(a=>({snapshot:agent(a,context),weight:weighted?Math.max(0,Number(a.censusWeight)||0):1}));
    const mean=fn=>{let sum=0,w=0;for(const r of rows){const v=fn(r.snapshot);if(Number.isFinite(v)&&r.weight>0){sum+=v*r.weight;w+=r.weight;}}return w?sum/w:null;};
    const out={...agent(null,context),kind:"population",count:agents.length,weighted};
    for(const g of ["twoD","threeD","difference"])for(const [key] of travel)out[g][key]=mean(r=>Number.isFinite(r.twoD[key])&&Number.isFinite(r.threeD[key])?r[g][key]:null);
    for(const key of ["trackedMinutes","vigorous","light","totalMety","trips","matchedTrips","excludedTrips"])out[key]=mean(r=>r[key]);
    for(const key of Object.keys(out.domains))out.domains[key]=mean(r=>r.domains[key]);
    out.opportunities.status="Scenario analysis only; not evaluated for this live cohort";
    return out;
  }
  scope.LiveIndicatorMetrics=Object.freeze({VERSION,travel,agent,population});
})(globalThis);
