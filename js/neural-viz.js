import { getState, deviceStatus } from './store.js';

let raf = null;
let ctx = null;
let canvas = null;
let width = 0, height = 0, dpr = 1;
const pulses = [];
let lastPulse = 0;
let nextPulseEdge = 0;

const nodes = [
  { id:'esp32', label:'ESP32-01', x:.15, y:.5, color:'#35c6a1' },
  { id:'wifi', label:'Wi-Fi', x:.35, y:.28, color:'#64a9ff' },
  { id:'supabase', label:'Supabase', x:.58, y:.5, color:'#8b7bff' },
  { id:'dashboard', label:'Neural Core', x:.82, y:.5, color:'#35d0ff' },
  { id:'temperature', label:'Temp', x:.35, y:.72, color:'#ffb86b' },
  { id:'humidity', label:'Humidity', x:.58, y:.72, color:'#64d2ff' }
];
const edges = [['esp32','wifi'],['esp32','temperature'],['esp32','humidity'],['wifi','supabase'],['temperature','supabase'],['humidity','supabase'],['supabase','dashboard']];

function resize() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth; height = canvas.clientHeight;
  canvas.width = Math.floor(width*dpr); canvas.height = Math.floor(height*dpr);
  ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function nodeState(id, s, ds) {
  if (id==='esp32') return ds.code === 'ONLINE' ? 'ok' : ds.code === 'WAITING' ? 'warn' : ds.code === 'OFFLINE' ? 'warn' : 'error';
  if (id==='wifi') return s.connection.supabase === 'error' ? 'warn' : 'ok';
  if (id==='supabase') return s.connection.supabase === 'ok' ? 'ok' : s.connection.supabase === 'error' ? 'error' : 'warn';
  if (id==='dashboard') return 'ok';
  if (id==='temperature' || id==='humidity') {
    const has = s.rows.find(r=>r.sensor_type===id);
    return has ? (ds.code==='ONLINE'?'ok':'warn') : 'warn';
  }
  return 'warn';
}
function colorFor(state, base) { return state==='ok' ? base : state==='warn' ? '#f6b95c' : '#ff6b6b'; }
export function pushPulse() { pulses.push({ t:0, edge: edges[nextPulseEdge++ % edges.length] }); }

export function initNeuralViz(canvasEl) {
  canvas = canvasEl; resize();
  window.addEventListener('resize', resize);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now-last)/1000); last = now;
    draw(now/1000, dt, reduced);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}
export function destroyNeuralViz(){ if (raf) cancelAnimationFrame(raf); raf=null; }

function draw(time, dt, reduced) {
  if (!ctx) return;
  const s = getState(); const ds = deviceStatus();
  ctx.clearRect(0,0,width,height);
  ctx.strokeStyle = 'rgba(90,140,180,0.08)'; ctx.lineWidth = 1;
  for (let x=0;x<width;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke(); }
  for (let y=0;y<height;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke(); }
  const pos = Object.fromEntries(nodes.map(n=>[n.id,{x:n.x*width,y:n.y*height,n}]));
  for (const [a,b] of edges) {
    const A=pos[a], B=pos[b]; const ok=nodeState(a,s,ds)==='ok' && nodeState(b,s,ds)==='ok';
    ctx.strokeStyle = ok ? 'rgba(53,198,161,0.35)' : 'rgba(246,185,92,0.22)';
    ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
  }
  if (!reduced) {
    if (time-lastPulse > 1.8 && ds.code==='ONLINE') { pushPulse(); lastPulse=time; }
    for (let i=pulses.length-1;i>=0;i--) {
      const p=pulses[i]; p.t+=dt*0.35; if(p.t>1){pulses.splice(i,1);continue;}
      const A=pos[p.edge[0]], B=pos[p.edge[1]]; const x=A.x+(B.x-A.x)*p.t, y=A.y+(B.y-A.y)*p.t;
      ctx.fillStyle='rgba(120,240,255,0.95)'; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(120,240,255,0.18)'; ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill();
    }
  }
  for (const n of nodes) {
    const p=pos[n.id], st=nodeState(n.id,s,ds), c=colorFor(st,n.color), pulse=reduced?0:Math.sin(time*2+p.x*0.01)*2;
    ctx.fillStyle=c+'22'; ctx.beginPath(); ctx.arc(p.x,p.y,22+pulse,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=c; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(p.x,p.y,14,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=c; ctx.beginPath(); ctx.arc(p.x,p.y,4.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(230,245,255,0.92)'; ctx.font='12px Inter, system-ui, sans-serif'; ctx.textAlign='center'; ctx.fillText(n.label,p.x,p.y-28);
    ctx.fillStyle=st==='ok'?'#8ce1c8':st==='warn'?'#ffd28d':'#ff9a9a'; ctx.font='10px Inter, system-ui, sans-serif'; ctx.fillText(st.toUpperCase(),p.x,p.y+34);
  }
}
