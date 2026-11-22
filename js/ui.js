import { APP, DEVICE, RUNTIME, UPDATE } from './config.js';
import { getState, setUI, filteredRows, latestByType, deviceStatus } from './store.js';
import { buildInsights } from './analytics.js';
import { getUpdateState } from './software-center.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtTime=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});};

export function bindUI(actions){
 document.querySelectorAll('[data-range]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-range]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');setUI({range:btn.dataset.range});}));
 $('refreshBtn')?.addEventListener('click',()=>actions.refresh());$('checkUpdateBtn')?.addEventListener('click',()=>actions.checkUpdate());$('applyUpdateBtn')?.addEventListener('click',()=>actions.applyUpdate());$('repairCacheBtn')?.addEventListener('click',()=>actions.repairCache());$('exportCsvBtn')?.addEventListener('click',()=>actions.exportCsv());
 $('filterType')?.addEventListener('change',e=>setUI({filterType:e.target.value}));$('filterSearch')?.addEventListener('input',e=>setUI({search:e.target.value}));$('filterFrom')?.addEventListener('change',e=>setUI({from:e.target.value}));$('filterTo')?.addEventListener('change',e=>setUI({to:e.target.value}));$('filterMin')?.addEventListener('input',e=>setUI({minValue:e.target.value}));$('filterMax')?.addEventListener('input',e=>setUI({maxValue:e.target.value}));
 $('clearFiltersBtn')?.addEventListener('click',()=>{['filterType','filterSearch','filterFrom','filterTo','filterMin','filterMax'].forEach(id=>{const el=$(id);if(!el)return;el.value=id==='filterType'?'all':'';});setUI({filterType:'all',search:'',from:'',to:'',minValue:'',maxValue:''});});
 $('themeToggle')?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;localStorage.setItem(UPDATE.themeKey,next);});
 const savedTheme=localStorage.getItem(UPDATE.themeKey);if(savedTheme)document.documentElement.dataset.theme=savedTheme;
}
export function render(){const s=getState(),ds=deviceStatus();renderStatus(s,ds);renderMetrics(s);renderTable(s);renderChart(s);renderInsights(s,ds);renderSoftware(s);renderVizDetails(s,ds);}
function setBadge(el,text,cls){if(!el)return;el.textContent=text;el.className=`badge ${cls}`;}
function renderStatus(s,ds){
 setBadge($('supabaseBadge'),s.connection.supabase==='ok'?'Supabase connected':s.connection.supabase==='error'?'Supabase error':'Supabase connecting',s.connection.supabase==='ok'?'ok':s.connection.supabase==='error'?'err':'warn');
 setBadge($('realtimeBadge'),s.connection.realtime==='ok'?'Realtime live':s.connection.realtime==='error'?'Realtime fallback':'Realtime connecting',s.connection.realtime==='ok'?'ok':'warn');
 $('lastUpdated').textContent=s.rows[0]?fmtTime(s.rows[0].created_at):'No readings yet';$('totalReadings').textContent=String(s.rows.length);
 const map={ONLINE:['ONLINE','ok'],OFFLINE:['OFFLINE','warn'],WAITING:['WAITING','warn'],ERROR:['ERROR','err']};const [txt,cls]=map[ds.code]||['UNKNOWN','warn'];setBadge($('deviceStatusBadge'),txt,cls);
 $('deviceDetail').textContent=ds.detail;$('deviceLastSeen').textContent=s.rows[0]?fmtTime(s.rows[0].created_at):'Never';$('heroStatus').textContent=ds.code==='ONLINE'?'Live telemetry active':ds.code==='WAITING'?'Awaiting first real reading':ds.code==='OFFLINE'?'Device offline / stale':'System error';
}
function renderMetrics(s){
 const latest=latestByType(s.rows);
 for(const type of DEVICE.sensorTypes){const row=latest[type],valEl=$(type+'Value'),stEl=$(type+'Status');
  if(!row){if(valEl)valEl.textContent='—';if(stEl){stEl.textContent='Waiting';stEl.className='status-pill warn';}continue;}
  const v=Number(row.sensor_value);if(valEl)valEl.textContent=Number.isFinite(v)?v.toFixed(1).replace(/\.0$/,''):'—';
  const normal=type==='temperature'?v>=15&&v<=35:v>=20&&v<=90;if(stEl){stEl.textContent=normal?'Normal':'Check';stEl.className='status-pill '+(normal?'ok':'warn');}
  const timeEl=$(type+'Time');if(timeEl)timeEl.textContent=fmtTime(row.created_at);
 }
}
function renderTable(s){
 const rows=filteredRows(),body=$('readingsTable');if(!body)return;
 if(!rows.length){body.innerHTML='<tr><td colspan="6" class="empty">No real readings match the current filters. Waiting for ESP32-01 telemetry or adjust filters.</td></tr>';return;}
 body.innerHTML=rows.slice(0,50).map(r=>{const meta=DEVICE.sensors[r.sensor_type]||{label:r.sensor_type,unit:r.unit};const normal=r.sensor_type==='temperature'?r.sensor_value>=15&&r.sensor_value<=35:r.sensor_value>=20&&r.sensor_value<=90;return `<tr><td><span class="dot ${r.sensor_type}"></span>${esc(meta.label)}</td><td>${esc(r.sensor_name)}</td><td><strong>${esc(r.sensor_value)} ${esc(r.unit)}</strong></td><td>${esc(fmtTime(r.created_at))}</td><td><span class="status-pill ${normal?'ok':'warn'}">${normal?'Normal':'Check'}</span></td><td><span class="status-pill ok">Real</span></td></tr>`;}).join('');
}
function renderChart(s){const rangeMs=RUNTIME.chartRanges[s.ui.range]||RUNTIME.chartRanges['1H'],cutoff=Date.now()-rangeMs;for(const type of DEVICE.sensorTypes){const pts=s.rows.filter(r=>r.sensor_type===type&&new Date(r.created_at).getTime()>=cutoff).slice().reverse();drawSingleChart(type,pts);}}
function drawSingleChart(type,pts){
 const line=$(`chartLine-${type}`),area=$(`chartArea-${type}`),point=$(`chartPoint-${type}`),labels=$(`chartLabels-${type}`),current=$(`chartCurrent-${type}`);if(!line)return;
 const w=760,h=200,pad=10;if(!pts.length){line.setAttribute('d','');area.setAttribute('d','');point.setAttribute('r','0');if(labels)labels.innerHTML='<span>No real data in range</span>';if(current)current.textContent='—';return;}
 const vals=pts.map(p=>Number(p.sensor_value)).filter(Number.isFinite);let min=Math.min(...vals),max=Math.max(...vals);const margin=Math.max((max-min)*.2,1);min-=margin;max+=margin;const span=Math.max(max-min,1);
 const coords=vals.map((v,i)=>{const x=pts.length===1?w/2:(i*(w-pad*2)/(pts.length-1))+pad;const y=h-((v-min)/span)*(h-pad*2)-pad;return [x,y];});const d=coords.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
 line.setAttribute('d',d);area.setAttribute('d',`${d} L ${w-pad} ${h-pad} L ${pad} ${h-pad} Z`);const last=coords[coords.length-1];point.setAttribute('cx',last[0]);point.setAttribute('cy',last[1]);point.setAttribute('r','5');if(current)current.textContent=`${vals[vals.length-1].toFixed(1)}${DEVICE.sensors[type].unit}`;
 if(labels)labels.innerHTML=`<span>${esc(new Date(pts[0].created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))}</span><span>${esc(new Date(pts[pts.length-1].created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))}</span>`;
}
function renderInsights(s,ds){const el=$('insightsList');if(!el)return;el.innerHTML=buildInsights(s.rows,ds).map(i=>`<div class="insight ${esc(i.level)}"><div class="insight-head"><strong>${esc(i.title)}</strong><span>${esc(i.level.toUpperCase())}</span></div><p>${esc(i.text)}</p><small>Evidence: ${esc(i.evidence)}</small></div>`).join('');}
function renderSoftware(){
 $('appVersion').textContent=APP.version;const us=getUpdateState();$('latestVersion').textContent=us.latest?.version||'Not checked';$('updateNotes').textContent=(us.latest?.notes||[]).join(' ')||'No release notes loaded.';
 const st=$('updateState');if(st)st.textContent=us.lastChecked?`${us.available?'Approved update available · ':'Up to date · '}Last checked ${fmtTime(us.lastChecked)}`:'Not checked yet';
 const apply=$('applyUpdateBtn');if(apply)apply.disabled=!(us.available===true&&us.latest?.approved===true);
}
function renderVizDetails(s,ds){$('vizEsp').textContent=`ESP32-01: ${ds.code}`;$('vizDb').textContent=`Supabase: ${s.connection.supabase.toUpperCase()}`;$('vizRt').textContent=`Realtime: ${s.connection.realtime.toUpperCase()}`;}
