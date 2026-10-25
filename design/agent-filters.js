"use strict";
(() => {
  const M=AgentFilterMetrics, app=document.querySelector(".app"), viewport=document.querySelector(".simulation-area");
  const state={...M.defaults}, pageSize=6;
  let page=0, cache=null, revision=0, previousAgents=null, previousScope=null, lastList="";
  const icon=(name)=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const button=(id,name,label)=>`<button type="button" class="wb-icon" id="${id}" title="${label}" aria-label="${label}">${icon(name)}</button>`;
  const trigger=document.createElement("button");trigger.id="wbAgentFilter";trigger.type="button";trigger.className="wb-icon";
  trigger.title="Filter Agents";trigger.setAttribute("aria-label","Filter Agents");trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-controls","afPanel");trigger.innerHTML=icon("list-filter");
  document.getElementById("wbSearch").before(trigger);
  const panel=document.createElement("section");panel.id="afPanel";panel.className="af-panel";panel.hidden=true;
  panel.setAttribute("aria-label","Agent filters");
  panel.innerHTML=`<header><h2>Agent filters</h2>${button("afReset","rotate-ccw","Reset Agent filters")}${button("afClose","x","Close Agent filters")}</header>
    <div class="af-fields"><label>Group<select id="afPreset"></select></label>
    <div class="af-pair"><label>Age<select id="afAge"><option value="all">All ages</option><option value="6-11">6-11 years</option><option value="12-16">12-16 years</option></select></label><label>Home DCCA<select id="afDcca"><option value="all">All home DCCAs</option></select></label></div>
    <label id="afThresholdField" hidden><span id="afThresholdLabel">Minimum absolute time difference (min)</span><input id="afThreshold" type="number" min="0" step="0.1" value="1"></label>
    <div class="af-pair"><label>Order<select id="afSort"><option value="id">Agent ID</option><option value="time">|Time delta|</option><option value="dose">|Dose delta|</option><option value="ascent">Active ascent</option></select></label><label>Map display<select id="afDisplay"><option value="only">Matches only</option><option value="highlight">Highlight</option></select></label></div></div>
    <p id="afDefinition" class="af-note"></p><div class="af-results-head"><strong id="afCount"></strong>${button("afFit","scan","Fit matching Agents")}</div>
    <p class="af-note af-ledger-key">Ranked values: matched walking ledger, 3D minus 2D. Ascent: 3D metres. Current window; not a health-effect ranking.</p>
    <div id="afResults" class="af-results"></div><footer>${button("afPrevious","chevron-left","Previous results")}<span id="afPage"></span>${button("afNext","chevron-right","Next results")}</footer>`;
  viewport.append(panel);
  const chip=document.createElement("div");chip.id="afMapStatus";chip.className="af-map-status";chip.hidden=true;
  chip.innerHTML=`<button type="button" id="afReopen" title="Open Agent filters">${icon("list-filter")}<span></span></button>${button("afClear","x","Clear Agent filters")}<small id="afMapKey"></small>`;viewport.append(chip);
  const $=id=>document.getElementById(id);
  for(const [value,label] of Object.entries(M.presets))$("afPreset").add(new Option(label,value));
  const active=()=>state.preset!=="all"||state.age!=="all"||state.dcca!=="all";
  const supported=()=>["osm","map","scene"].includes(activeView);
  const liveMap=()=>supported()&&(activeView!=="osm"||!$("sl-map-focus")||$("sl-map-focus").value==="live");
  function syncCohort() {
    if(previousAgents===world.agents)return;
    if(previousScope!==null&&previousScope!==world.scope)state.dcca="all";
    previousAgents=world.agents;previousScope=world.scope;cache=null;page=0;
    const zones=new Map(world.agents.map(a=>[a.homeZone?.id,a.homeZone?.code||a.homeZone?.id]));
    $("afDcca").replaceChildren(new Option("All home DCCAs","all"));
    [...zones].filter(([id])=>id).sort((a,b)=>a[1].localeCompare(b[1])).forEach(([id,code])=>$("afDcca").add(new Option(code,id)));
    if(state.dcca!=="all"&&!zones.has(state.dcca))state.dcca="all";
    $("afDcca").value=state.dcca;
  }
  function rows() {
    syncCohort();
    if(!cache||cache.time!==world.elapsedMinutes||cache.revision!==revision){
      const entries=M.select(world.agents,state);cache={time:world.elapsedMinutes,revision,entries,ids:new Set(entries.map(a=>a.id))};
    }
    return cache.entries;
  }
  const eligible=a=>{rows();return Boolean(a&&cache.ids.has(a.id));};
  const enabled=()=>active()&&liveMap();
  const fmt=(n,d=2)=>Number.isFinite(n)?(Number(n.toFixed(d))===0?0:n).toFixed(d):"N/A";
  const definitions={
    all:"Current live cohort. Observation only; population and simulation statistics are unchanged.",
    walkers:"Assigned school travel mode: walk. Agents may currently be at home, school or another activity.",
    moving:"Commute state on a classified walking edge, with no recorded wait or blocked route attempt.",
    matched:"Positive metered active time on matched walking trips. This is route evidence, not external validation.",
    delta:"Absolute accumulated journey-time difference on matched walking trips. The threshold is a screening choice, not statistical significance.",
    ascent:"Accumulated active ascent on matched walking trips, excluding mechanical ascent. Threshold in metres.",
    proxy:"Positive proxy active-travel time. These assumed travel components do not assess vertical walking effects.",
    blocked:"Current route attempt is blocked. This is a routing diagnostic, not observed inaccessibility.",
  };
  function controlsFromState(){for(const [id,k] of [["afPreset","preset"],["afAge","age"],["afDcca","dcca"],["afSort","sort"],["afDisplay","display"],["afThreshold","threshold"]])$(id).value=String(state[k]);}
  function render() {
    const entries=rows(), applied=enabled();
    trigger.hidden=!supported();trigger.disabled=!liveMap();trigger.setAttribute("aria-pressed",String(applied));
    if(!liveMap())close();
    chip.hidden=!applied||!panel.hidden;
    $("afReopen").querySelector("span").textContent=`${entries.length} / ${world.agents.length} Agents`;
    $("afMapKey").textContent=!world.layers.agents?"Agent layer is off":`${state.display==="only"?"Matching Agents only":"Matches coloured; others muted"} · ${activeView==="scene"?"colour = activity state":"blue ring = match; cluster number = matches"} · OD flows unchanged`;
    if(panel.hidden)return;
    $("afDefinition").textContent=definitions[state.preset];
    $("afThresholdField").hidden=!["delta","ascent"].includes(state.preset);
    $("afThresholdLabel").textContent=state.preset==="ascent"?"Minimum active ascent (m)":"Minimum absolute time difference (min)";
    $("afCount").textContent=`${entries.length} / ${world.agents.length} Agents`;
    $("afFit").disabled=!entries.length;
    page=Math.min(page,Math.max(0,Math.ceil(entries.length/pageSize)-1));
    const slice=entries.slice(page*pageSize,(page+1)*pageSize);
    const signature=JSON.stringify(slice.map(r=>[r.id,r.agent.state,fmt(r.time),fmt(r.dose),fmt(r.ascent,1),r.moving,r.hasWalking,r.proxy,r.blocked]));
    if(lastList!==signature){
      lastList=signature;$("afResults").replaceChildren();
      if(!slice.length){const empty=document.createElement("p");empty.className="af-empty";empty.textContent="No matching Agents in this window. Walking evidence accumulates as the simulation runs.";$("afResults").append(empty);}
      for(const r of slice){
        const b=document.createElement("button");b.type="button";b.className="af-result";b.dataset.agentId=r.id;b.setAttribute("aria-label",`Select Agent ${r.id}`);
        const title=document.createElement("strong");title.textContent=`Agent ${r.id} · ${r.age} years · ${r.code}`;
        const value=document.createElement("span");value.textContent=`Time ${fmt(r.time)} min · Dose ${fmt(r.dose)} METy-min · Ascent ${fmt(r.ascent,1)} m`;
        const evidence=document.createElement("small");evidence.textContent=M.evidence(r.agent);
        b.append(title,value,evidence);b.onclick=()=>select(r.id);$("afResults").append(b);
      }
    }
    $("afPage").textContent=entries.length?`${page*pageSize+1}-${Math.min(entries.length,(page+1)*pageSize)} of ${entries.length}`:"0 results";
    $("afPrevious").disabled=page===0;$("afNext").disabled=(page+1)*pageSize>=entries.length;
    for(const b of $("afResults").querySelectorAll("button"))b.setAttribute("aria-pressed",String(spatialSelection.type==="agent"&&Number(b.dataset.agentId)===spatialSelection.id));
  }
  function open(){panel.hidden=false;trigger.setAttribute("aria-expanded","true");$("wbLayerPanel").hidden=true;controlsFromState();render();}
  function close(){panel.hidden=true;trigger.setAttribute("aria-expanded","false");chip.hidden=!enabled();}
  function reset(){Object.assign(state,M.defaults);revision++;page=0;controlsFromState();render();}
  function select(id){
    const a=world.agents.find(a=>a.id===id);if(!a)return;
    setSpatialSelection("agent",a,activeView);
    if(activeView==="scene"&&window.WorkbenchScene?.ready)WorkbenchScene.focus(a);
    else if(activeView==="osm")focusOsmEntity(a.pos,"agent");
    else focusMapArea({bounds:{minX:a.pos.x-.5,maxX:a.pos.x+.5,minY:a.pos.y-.5,maxY:a.pos.y+.5}});
    close();render();
  }
  function fit(){
    const points=rows().map(r=>r.agent.pos);if(!points.length)return;
    if(activeView==="scene"&&window.WorkbenchScene?.ready){WorkbenchScene.focusPoints(points);return;}
    const b=points.reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minY:Math.min(b.minY,p.y),maxY:Math.max(b.maxY,p.y)}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
    if(activeView==="map"){focusMapArea({bounds:b});return;}
    const pixels=points.map(p=>{const ll=localToLonLat(p);return lonLatToWorldPixel(ll.lon,ll.lat,0);});
    const xs=pixels.map(p=>p.x),ys=pixels.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const center=worldPixelToLonLat((minX+maxX)/2,(minY+maxY)/2,0);
    osmMap.centerLon=center.lon;osmMap.centerLat=center.lat;
    osmMap.zoom=clamp(Math.floor(Math.log2(Math.min(osmCanvas.clientWidth/Math.max(.00001,(maxX-minX)*1.25),osmCanvas.clientHeight/Math.max(.00001,(maxY-minY)*1.25)))),9,17);markOsmStaticDirty();
  }
  for(const [id,key] of [["afPreset","preset"],["afAge","age"],["afDcca","dcca"],["afSort","sort"],["afDisplay","display"],["afThreshold","threshold"]])$(id).addEventListener("change",()=>{
    if(id==="afThreshold"&&!$(id).checkValidity()){ $(id).reportValidity();$(id).value=state.threshold;return; }
    state[key]=key==="threshold"?Number($(id).value):$(id).value;
    if(key==="preset"&&["delta","ascent"].includes(state.preset)){state.threshold=state.preset==="delta"?1:50;state.sort=state.preset==="delta"?"time":"ascent";controlsFromState();}
    revision++;page=0;
    if(active()&&spatialSelection.type==="agent"&&!eligible(selectedSpatialEntity()))clearSpatialSelection();
    render();
  });
  trigger.onclick=()=>panel.hidden?open():close();$("afReopen").onclick=open;$("afClose").onclick=close;
  $("afReset").onclick=reset;$("afClear").onclick=reset;$("afFit").onclick=()=>{fit();close();render();};
  $("afPrevious").onclick=()=>{page--;render();};$("afNext").onclick=()=>{page++;render();};
  panel.addEventListener("keydown",e=>{if(e.key==="Escape"){e.stopPropagation();close();trigger.focus();}});
  document.getElementById("wbLayers").addEventListener("click",close);

  // Presentation-only hooks: never replace the simulation's Agent array.
  function draw(ctx,project,canvas){
    const ratio=window.devicePixelRatio||1, matches=rows(), groups=new Map();ctx.save();
    if(state.display==="highlight"){
      ctx.fillStyle="#84918f";ctx.globalAlpha=.18;
      for(const a of world.agents){if(eligible(a))continue;const p=project(a.pos);ctx.beginPath();ctx.arc(p.x,p.y,2.5*ratio,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    }
    for(const r of matches){const p=project(r.agent.pos);if(p.x<0||p.y<0||p.x>canvas.width||p.y>canvas.height)continue;
      const key=`${Math.floor(p.x/(22*ratio))}:${Math.floor(p.y/(22*ratio))}`;
      const g=groups.get(key)||{x:0,y:0,count:0,states:{}};g.x+=p.x;g.y+=p.y;g.count++;g.states[r.agent.state]=(g.states[r.agent.state]||0)+1;groups.set(key,g);}
    for(const g of groups.values()){
      const x=g.x/g.count,y=g.y/g.count,r=Math.min(14,4+Math.sqrt(g.count))*ratio;
      const dominant=Object.keys(g.states).sort((a,b)=>g.states[b]-g.states[a])[0];
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=STATE_META[dominant].color;ctx.fill();ctx.lineWidth=2*ratio;ctx.strokeStyle="#087bb3";ctx.stroke();
      if(g.count>1){ctx.fillStyle="#fff";ctx.font=`700 ${10*ratio}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(g.count,x,y);}
    }ctx.restore();
  }
  const originalOsm=drawOsmAgents,originalClusters=drawAgentClusters,originalScene=drawAgents,originalCandidates=agentSelectionCandidates;
  drawOsmAgents=function(ctx){if(enabled())draw(ctx,osmProjectLocal,osmCanvas);else originalOsm(ctx);};
  drawAgentClusters=function(ctx,project,canvas,...args){if(enabled())draw(ctx,project,canvas);else originalClusters(ctx,project,canvas,...args);};
  drawAgents=function(ctx){if(enabled())draw(ctx,project,sceneCanvas);else originalScene(ctx);};
  agentSelectionCandidates=function(...args){const candidates=originalCandidates(...args);return enabled()?candidates.filter(c=>eligible(c.entity)):candidates;};
  const originalDrawSelection=drawSpatialSelection;
  drawSpatialSelection=function(...args){if(enabled()&&spatialSelection.type==="agent"&&!eligible(selectedSpatialEntity()))return;originalDrawSelection(...args);};
  const originalSnapshot=WorkbenchData.snapshot,originalSelection=WorkbenchData.selection;
  WorkbenchData.snapshot=()=>{const s=originalSnapshot();if(!enabled())return s;return {...s,agents:state.display==="only"?rows().map(r=>r.agent):s.agents,agentFilter:{matches:rows().map(r=>r.id),highlight:state.display==="highlight"}};};
  WorkbenchData.selection=()=>{const s=originalSelection();return enabled()&&s.type==="agent"&&!eligible(s.entity)?{type:null,entity:null,points:[],replayPoint:null}:s;};
  window.AgentFilters={open,close,reset,rows,enabled,eligible,select,fit,state:()=>({...state}),refresh:()=>{cache=null;render();}};
  const originalSetView=setView;
  setView=function(...args){originalSetView(...args);render();};
  $("sl-map-focus")?.addEventListener("change",render);
  window.lucide?.createIcons();render();setInterval(()=>{if(!document.hidden)render();},500);
})();
