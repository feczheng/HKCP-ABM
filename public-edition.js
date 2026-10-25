"use strict";
(() => {
  const q=id=>document.getElementById(id);
  const notice=document.createElement('div');
  notice.className='public-notice';
  notice.innerHTML='Real HK geography · synthetic walking school journeys. Survey calibration, restricted POIs and archived research results are excluded. <a href="data-sources.html" target="_blank" rel="noopener">Data & scope</a>';
  document.querySelector('.wb-inspector-head')?.after(notice);
  const baseSetView=setView;
  setView=function(view){baseSetView(['osm','scene','agents','buildings','map','stats'].includes(view)?view:'osm');};
  for(const id of ['poiLayerToggle','transportLayerToggle']){
    const control=q(id);if(control){control.checked=false;control.disabled=true;control.closest('label').classList.add('public-excluded');}
  }
  world.layers.poi=false;world.layers.transport=false;
  document.querySelectorAll('.wb-nav-group').forEach(g=>{if(!g.querySelector('button'))g.remove();});
  document.querySelectorAll('.wb-metric-detail').forEach(d=>{if(d.querySelector('#pilotCalibrationSection,#pilotRoutingSection'))d.classList.add('public-excluded');});
  document.querySelectorAll('.wb-symbol-item').forEach(item=>{if(!/Primary|Secondary|Kindergarten|Special/.test(item.textContent))item.remove();});
  document.querySelectorAll('.wb-legend-heading').forEach(el=>{if(el.textContent.includes('POI'))el.textContent='School stages';});
  const requested=new URL(location.href).searchParams.get('view');
  if(requested&&!['osm','scene','agents','buildings','map','stats'].includes(requested))setView('osm');
  document.documentElement.dataset.edition='public-real-data';
})();
