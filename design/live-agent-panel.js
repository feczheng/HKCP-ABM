"use strict";
(() => {
  const inspector=document.querySelector(".wb-inspector");if(!inspector)return;
  const fmt=(x,n=2)=>Number.isFinite(x)?(Number(x.toFixed(n))===0?0:x).toFixed(n):"N/A";
  const field=key=>`<span data-lm="${key}"></span>`;
  const row=([key,label,unit])=>`<tr><th scope="row">${label}<small>${unit}</small></th>${["twoD","threeD","difference"].map(g=>`<td>${field(`${g}.${key}`)}</td>`).join("")}</tr>`;
  const table=rows=>`<div class="lm-table-scroll"><table><thead><tr><th>Current window</th><th>2D</th><th>3D</th><th>Delta</th></tr></thead><tbody>${rows.map(row).join("")}</tbody></table></div>`;
  const context=()=>({time:world.time,dayIndex:world.dayIndex,windowMinutes:world.comparisonWindowMinutes,running:world.running,scope:world.scope,scenario:world.scenario});
  function selected(){
    if(activeView==="agents"&&agentObserver.mode!=="cohort")return selectedObservedAgent();
    return spatialSelection.type==="agent"?selectedSpatialEntity():null;
  }
  function snapshot(a){return LiveIndicatorMetrics.agent(a,context());}
  function markup(){return `<header class="lm-heading"><h3>${field("title")}</h3><span class="lm-status">${field("status")}</span></header>
    <p class="lm-window">${field("clock")} · ${field("tracked")} min tracked</p><p class="lm-note">${field("profile")}</p>
    ${table(LiveIndicatorMetrics.travel.slice(0,3))}
    <p class="lm-note">Delta = 3D − 2D · same paths<br>Accumulated window, not a completed day.</p>
    <p class="lm-note lm-evidence">${field("routeEvidence")}</p>
    <details class="lm-breakdown"><summary>Travel & activity detail</summary>${table(LiveIndicatorMetrics.travel.slice(3))}
    <dl>${[["domains.travel","Travel MVPA"],["domains.school","School MVPA"],["domains.outdoor","Outdoor MVPA"],["domains.activity","Other activity MVPA"],["vigorous","Vigorous activity"],["light","Light activity"]].map(([k,label])=>`<div><dt>${label}</dt><dd>${field(k)} min</dd></div>`).join("")}
    <div><dt>Total activity dose</dt><dd>${field("totalMety")} METy-min</dd></div><div><dt>Recorded trips</dt><dd>${field("trips")}</dd></div>
    <div><dt>Matched / excluded trips</dt><dd>${field("matchedTrips")} / ${field("excludedTrips")}</dd></div><div><dt>Home</dt><dd>${field("home")}</dd></div><div><dt>School</dt><dd>${field("school")}</dd></div><div><dt>Destination</dt><dd>${field("destination")}</dd></div></dl>
    <p class="lm-note">Dose above basal metabolism, not kcal or fatigue. Travel includes proxies and unverified access. Waiting is only the time recorded in the travel ledger; no queue delay is inferred.</p></details>
    <details class="lm-scenarios"><summary>Scenario-only indicators</summary><dl><div><dt>A · Feasible opportunities</dt><dd>Not evaluated live</dd></div><div><dt>Policy net MVPA gain</dt><dd>Paired run required</dd></div></dl><p class="lm-note">Policy and opportunity experiments are not included in this public edition.</p></details>`;}
  function updatePanel(node,data){
    node.dataset.agentId=data?.kind==="agent"?String(data.id??""):"all";
    node._liveSnapshot=data;
    const values=data?{...data,title:data.kind==="population"?`${data.count} Agents · ${data.weighted?"weighted":"raw"} mean`:`Agent ${data.id??"not selected"}`,
      profile:data.kind==="population"?"Current-cohort means; not archived research cohorts":data.id===null?"Select an Agent on the map or in the selector":`Age ${data.age} · ${STATE_META[data.state]?.label||data.state||"Unknown state"}`,
      routeEvidence:data.kind==="population"?"All-travel means include proxies and unverified access":data.routeEvidence||"Route coverage unavailable in this snapshot",
      status:data.running?"Live":"Paused",clock:`Day ${data.day} · ${formatTime(data.time??0)}`,tracked:fmt(data.trackedMinutes,1)}:{title:"No Agent selected",status:"",clock:"Current simulation",tracked:"N/A"};
    for(const el of node.querySelectorAll("[data-lm]")){
      const key=el.dataset.lm,value=key.split(".").reduce((v,k)=>v?.[k],values);
      const precision=key.toLowerCase().includes("trips")||key.endsWith(".distance")?0:key.endsWith(".ascent")?1:2;
      const text=typeof value==="number"?fmt(value,Math.abs(value)>=10000?0:precision):value??"N/A";
      if(el.textContent!==text)el.textContent=text;
      if(typeof value==="number"){el.title=String(value);el.style.fontSize=text.length>8?"9px":"";}
    }
  }
  const panel=document.createElement("section");panel.id="wbLiveAgentMetrics";panel.className="live-indicator-panel";panel.hidden=true;
  panel.innerHTML=markup()+`<div class="lm-actions"><button type="button" data-lm-action="open" title="Open Agent journeys"><i data-lucide="chart-no-axes-combined"></i><span>Agent journeys</span></button><button type="button" data-lm-action="export" title="Export selected Agent snapshot" aria-label="Export selected Agent snapshot"><i data-lucide="download"></i></button></div>`;
  inspector.querySelector(".wb-selection-slot").before(panel);
  const close=document.createElement("button");close.type="button";close.className="lm-close";
  close.title="Clear selected Agent";close.setAttribute("aria-label",close.title);close.innerHTML='<i data-lucide="x"></i>';
  close.onclick=()=>{if(activeView==="agents")setAgentObserverMode("cohort");clearSpatialSelection();};
  panel.querySelector(".lm-heading").append(close);
  function exportSnapshot(data){if(!data)return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`HK-live-${data.kind==="agent"?'agent-'+data.id:'population'}-day-${data.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  panel.querySelector('[data-lm-action="open"]').onclick=()=>setView("agents");
  panel.querySelector('[data-lm-action="export"]').onclick=()=>exportSnapshot(panel._liveSnapshot);
  let lastAgent=null;
  function refresh(){
    const a=selected(),visible=Boolean(a)&&["osm","map","scene","agents","indicators"].includes(activeView);
    panel.hidden=!visible;inspector.classList.toggle("wb-has-agent",visible);
    if(!visible)return;
    updatePanel(panel,snapshot(a));
    if(a!==lastAgent){lastAgent=a;inspector.scrollTop=0;}
  }
  const originalSelected=setSelectedAgent;
  setSelectedAgent=function(id,follow=false){
    originalSelected(id,follow);
    if((spatialSelection.type==="agent"||activeView==="agents")&&spatialSelection.id!==agentObserver.selectedAgentId){
      setSpatialSelection("agent",selectedObservedAgent(),activeView);
    }
    refresh();
  };
  const originalSelection=setSpatialSelection;
  setSpatialSelection=function(...args){originalSelection(...args);refresh();};
  const originalClear=clearSpatialSelection;
  clearSpatialSelection=function(){originalClear();lastAgent=null;refresh();};
  window.LiveAgentPanel={markup,updatePanel,snapshot,selected,context,exportSnapshot,refresh};
  setInterval(()=>{if(!document.hidden)refresh();},300);
  window.lucide?.createIcons();
})();
