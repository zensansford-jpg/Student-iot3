import { DEVICE } from './config.js';

function avg(nums) { return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : NaN; }
function fmt(n, digits=1) { return Number.isFinite(n) ? n.toFixed(digits) : '—'; }

export function buildInsights(rows, deviceStatus) {
  const insights = [];
  const now = Date.now();
  const byType = { temperature: [], humidity: [] };
  for (const r of rows) if (byType[r.sensor_type]) byType[r.sensor_type].push(r);

  for (const type of DEVICE.sensorTypes) {
    const list = byType[type];
    const meta = DEVICE.sensors[type];
    if (!list.length) {
      insights.push({ level:'warn', title:`${meta.label} data missing`, text:`No ${meta.label.toLowerCase()} readings found for ${DEVICE.name}.`, evidence:'0 records' });
      continue;
    }
    const latest = list[0];
    const lastHour = list.filter(r => now - new Date(r.created_at).getTime() <= 3600000);
    const prevHour = list.filter(r => { const age = now - new Date(r.created_at).getTime(); return age > 3600000 && age <= 7200000; });
    const avgLast = avg(lastHour.map(r=>r.sensor_value));
    const avgPrev = avg(prevHour.map(r=>r.sensor_value));
    if (Number.isFinite(avgLast) && Number.isFinite(avgPrev)) {
      const delta = avgLast - avgPrev;
      const dir = delta > 0.3 ? 'increased' : delta < -0.3 ? 'decreased' : 'remained stable';
      insights.push({ level: Math.abs(delta) > 2 ? 'warn' : 'ok', title: `${meta.label} trend`, text: `${meta.label} has ${dir} compared with the previous hour (avg ${fmt(avgLast)}${meta.unit} vs ${fmt(avgPrev)}${meta.unit}).`, evidence: `${lastHour.length} vs ${prevHour.length} records` });
    } else {
      insights.push({ level:'info', title:`${meta.label} latest reading`, text:`Latest ${meta.label.toLowerCase()} is ${fmt(latest.sensor_value)}${meta.unit} at ${new Date(latest.created_at).toLocaleString()}.`, evidence:`${list.length} records` });
    }
    if (list.length >= 3) {
      const [a,b,c] = list.slice(0,3).map(r=>r.sensor_value);
      const change = Math.abs(a-b) + Math.abs(b-c);
      const threshold = type === 'temperature' ? 6 : 20;
      if (change > threshold) insights.push({ level:'warn', title:`${meta.label} volatility`, text:`Recent ${meta.label.toLowerCase()} readings changed rapidly (${fmt(a)}, ${fmt(b)}, ${fmt(c)} ${meta.unit}). Verify sensor placement/wiring if unexpected.`, evidence:'last 3 readings' });
    }
    const staleMins = (now - new Date(latest.created_at).getTime())/60000;
    if (staleMins > 5) insights.push({ level:'warn', title:`${meta.label} stale`, text:`No new ${meta.label.toLowerCase()} reading for ${fmt(staleMins,0)} minutes.`, evidence:new Date(latest.created_at).toLocaleString() });
  }

  if (deviceStatus.code === 'OFFLINE' || deviceStatus.code === 'WAITING') {
    insights.push({ level:'warn', title:'Device connectivity', text:`${DEVICE.name} is ${deviceStatus.code.toLowerCase()}. ${deviceStatus.detail}`, evidence:deviceStatus.code });
  } else if (deviceStatus.code === 'ONLINE') {
    insights.push({ level:'ok', title:'Device connectivity', text:`${DEVICE.name} is online and sending real readings within the configured threshold.`, evidence:deviceStatus.detail });
  } else if (deviceStatus.code === 'ERROR') {
    insights.push({ level:'error', title:'System error', text:deviceStatus.detail, evidence:'runtime' });
  }

  if (rows.length >= 2) {
    const gaps = [];
    for (let i=0; i<Math.min(rows.length-1, 50); i++) {
      const gap = new Date(rows[i].created_at).getTime() - new Date(rows[i+1].created_at).getTime();
      if (gap > 2*60*1000) gaps.push(gap);
    }
    if (gaps.length) insights.push({ level:'info', title:'Data gaps detected', text:`Detected ${gaps.length} interval gap(s) over recent records. Largest gap ${fmt(Math.max(...gaps)/60000,1)} minutes.`, evidence:'recent 50 records' });
  }

  return insights.slice(0, 8);
}
