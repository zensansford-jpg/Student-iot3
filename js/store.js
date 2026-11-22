import { DEVICE, RUNTIME } from './config.js';

const listeners = new Set();
const state = {
  rows: [],
  connection: { supabase: 'pending', realtime: 'pending', lastError: null, lastSync: null },
  ui: { range: '1H', filterType: 'all', search: '', minValue: '', maxValue: '', from: '', to: '' },
  update: { current: null, latest: null, status: 'idle', message: '' }
};

export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => fn(state)); }

export function setConnection(patch) { Object.assign(state.connection, patch); emit(); }
export function setUI(patch) { Object.assign(state.ui, patch); emit(); }
export function setUpdate(patch) { Object.assign(state.update, patch); emit(); }

export function setRows(rows) {
  const valid = [];
  const seen = new Set();
  for (const r of rows || []) {
    const id = r?.id ?? `${r?.created_at}-${r?.sensor_type}-${r?.sensor_value}`;
    if (seen.has(id)) continue;
    const type = String(r?.sensor_type || '').toLowerCase();
    if (!DEVICE.sensorTypes.includes(type)) continue;
    if (String(r?.sensor_name || '') !== DEVICE.name) continue;
    const value = Number(r?.sensor_value);
    if (!Number.isFinite(value)) continue;
    const meta = DEVICE.sensors[type];
    if (value < meta.min - 50 || value > meta.max + 150) continue; // sanity guard, not fake correction
    seen.add(id);
    valid.push({
      id: r.id,
      created_at: r.created_at,
      sensor_name: r.sensor_name,
      sensor_type: type,
      sensor_value: value,
      unit: r.unit || meta.unit
    });
  }
  valid.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.rows = valid.slice(0, RUNTIME.maxRows);
  emit();
}

export function upsertRow(row) {
  if (!row) return;
  setRows([row, ...state.rows]);
}

export function latestByType(rows = state.rows) {
  const out = {};
  for (const r of rows) if (!out[r.sensor_type]) out[r.sensor_type] = r;
  return out;
}

export function filteredRows() {
  const { filterType, search, minValue, maxValue, from, to } = state.ui;
  return state.rows.filter(r => {
    if (filterType !== 'all' && r.sensor_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = `${r.sensor_name} ${r.sensor_type} ${r.sensor_value} ${r.unit} ${r.created_at}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    if (minValue !== '' && Number(r.sensor_value) < Number(minValue)) return false;
    if (maxValue !== '' && Number(r.sensor_value) > Number(maxValue)) return false;
    if (from) { const t = new Date(r.created_at).getTime(); if (t < new Date(from).getTime()) return false; }
    if (to) { const t = new Date(r.created_at).getTime(); if (t > new Date(to).getTime() + 24*3600*1000 - 1) return false; }
    return true;
  });
}

export function deviceStatus(now = Date.now()) {
  if (state.connection.lastError && !state.rows.length) return { code: 'ERROR', detail: state.connection.lastError };
  if (!state.rows.length) return { code: 'WAITING', detail: 'No readings received yet for ESP32-01.' };
  const newest = new Date(state.rows[0].created_at).getTime();
  if (!Number.isFinite(newest)) return { code: 'ERROR', detail: 'Invalid reading timestamp.' };
  const age = now - newest;
  if (age <= RUNTIME.onlineThresholdMs) return { code: 'ONLINE', detail: `Last reading ${Math.round(age/1000)}s ago.` };
  return { code: 'OFFLINE', detail: `No reading for ${Math.round(age/1000)}s.` };
}
