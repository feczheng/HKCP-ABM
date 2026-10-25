"use strict";

(function expose(scope) {
  const EPS = 1e-7;
  const defaults = Object.freeze({preset:"all", age:"all", dcca:"all", sort:"id", threshold:1, display:"only"});
  const presets = Object.freeze({
    all:"All Agents", walkers:"Walking school mode", moving:"On a walking edge now",
    matched:"Metered network walkers", delta:"Walking time difference", ascent:"Active ascent",
    proxy:"Proxy travel present", blocked:"Blocked route attempts",
  });
  const finite = x => Number.isFinite(x) ? x : null;
  const difference = (a,b) => Number.isFinite(a) && Number.isFinite(b) ? a-b : null;
  function metrics(a) {
    const g=a.geometryComparison, all=g?.all?.threeD, matched=g?.matched;
    const two=matched?.twoD, three=matched?.threeD;
    const hasWalking=Number.isFinite(three?.activeTravelMinutes) && three.activeTravelMinutes>EPS;
    const point=a.route?.[a.routeIndex || 0];
    const blocked=a.routeAttempt?.status==="blocked";
    const moving=a.state==="commute" && !blocked && point?.accounting?.kind==="walk" && !(point.waitMinutesRemaining>EPS);
    return {id:a.id, age:a.age, dcca:a.homeZone?.id, code:a.homeZone?.code || "Unknown DCCA",
      schoolMode:a.travelMode, moving, blocked, hasWalking,
      time:hasWalking?difference(three?.journeyMinutes,two?.journeyMinutes):null,
      dose:hasWalking?difference(three?.netMetyMinutes ?? (three?.metyMinutes-three?.journeyMinutes),two?.netMetyMinutes ?? (two?.metyMinutes-two?.journeyMinutes)):null,
      ascent:hasWalking?finite(three.activeAscentMeters):null,
      proxy:Number(all?.proxyActiveMinutes)>EPS, travelMinutes:finite(all?.journeyMinutes)};
  }
  function matches(m, f) {
    if(f.age!=="all" && !(f.age==="6-11"?m.age>=6&&m.age<=11:m.age>=12&&m.age<=16)) return false;
    if(f.dcca!=="all" && m.dcca!==f.dcca) return false;
    const threshold=Math.max(0,Number(f.threshold)||0);
    switch(f.preset) {
      case "walkers":return m.schoolMode==="walk";
      case "moving":return m.moving;
      case "matched":return m.hasWalking;
      case "delta":return m.hasWalking && m.time!==null && Math.abs(m.time)>=threshold;
      case "ascent":return m.hasWalking && m.ascent!==null && m.ascent>=threshold;
      case "proxy":return m.proxy;
      case "blocked":return m.blocked;
      default:return true;
    }
  }
  function select(agents, filters={}) {
    const f={...defaults,...filters};
    return agents.map(a=>({agent:a,...metrics(a)})).filter(r=>matches(r,f)).sort((a,b)=>{
      if(f.sort==="id")return a.id-b.id;
      const x=a[f.sort],y=b[f.sort];
      return (y===null?-Infinity:Math.abs(y))-(x===null?-Infinity:Math.abs(x)) || a.id-b.id;
    });
  }
  function evidence(a) {
    const m=metrics(a);
    if(m.blocked)return "Route blocked; no movement on the blocked attempt";
    if(m.hasWalking)return m.proxy?"Matched walking + proxy travel; mixed coverage":"Matched walking recorded; access connectors remain unverified";
    if(m.proxy)return "Proxy travel recorded; vertical walking effect not assessed";
    if(!(m.travelMinutes>EPS))return "No travel metered in this window";
    return "No matched walking metered; other travel or unverified access";
  }
  scope.AgentFilterMetrics=Object.freeze({defaults,presets,metrics,matches,select,evidence});
})(globalThis);
