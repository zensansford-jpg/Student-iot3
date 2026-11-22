import { SUPABASE, DEVICE, RUNTIME } from './config.js';
import { setRows, upsertRow, setConnection, getState } from './store.js';

let client = null;
let channel = null;
let pollTimer = null;
let reconnectTimer = null;
let reconnectAttempt = 0;

export function getClient() { return client; }

export async function initSupabase() {
  if (!window.supabase?.createClient) {
    setConnection({ supabase: 'error', lastError: 'Supabase library unavailable. Check CDN/network.' });
    return false;
  }
  client = window.supabase.createClient(SUPABASE.url, SUPABASE.publishableKey, {
    realtime: { params: { eventsPerSecond: 5 } }
  });
  setConnection({ supabase: 'pending', lastError: null });
  await loadReadings(true);
  subscribeRealtime();
  startPolling();
  return true;
}

export async function loadReadings(showPending = false) {
  if (!client) return;
  if (showPending) setConnection({ supabase: 'pending' });
  try {
    const { data, error } = await client
      .from(SUPABASE.table)
      .select('id,created_at,sensor_name,sensor_type,sensor_value,unit')
      .eq('sensor_name', DEVICE.name)
      .in('sensor_type', DEVICE.sensorTypes)
      .order('created_at', { ascending: false })
      .limit(RUNTIME.maxRows);
    if (error) throw error;
    setRows(data || []);
    setConnection({ supabase: 'ok', lastError: null, lastSync: new Date().toISOString() });
  } catch (err) {
    console.error('Supabase load error', err);
    setConnection({ supabase: 'error', lastError: err.message || 'Database read failed.' });
  }
}

function clearRealtime() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (channel && client) {
    client.removeChannel(channel).catch(() => {});
    channel = null;
  }
}

function scheduleReconnect() {
  clearRealtime();
  const delay = Math.min(RUNTIME.reconnectMaxMs, RUNTIME.reconnectBaseMs * Math.pow(2, reconnectAttempt++));
  setConnection({ realtime: 'pending' });
  reconnectTimer = setTimeout(() => { if (client) subscribeRealtime(); }, delay);
}

export function subscribeRealtime() {
  if (!client) return;
  clearRealtime();
  channel = client.channel('neural-core-readings');
  channel.on('postgres_changes', { event: 'INSERT', schema: SUPABASE.schema, table: SUPABASE.table }, payload => {
    const row = payload.new;
    if (!row) return;
    if (String(row.sensor_name) !== DEVICE.name) return;
    if (!DEVICE.sensorTypes.includes(String(row.sensor_type).toLowerCase())) return;
    upsertRow(row);
    setConnection({ realtime: 'ok', supabase: 'ok', lastError: null, lastSync: new Date().toISOString() });
  }).subscribe(status => {
    if (status === 'SUBSCRIBED') {
      reconnectAttempt = 0;
      setConnection({ realtime: 'ok' });
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      setConnection({ realtime: 'error', lastError: `Realtime ${status.toLowerCase()}. Polling fallback active.` });
      scheduleReconnect();
    }
  });
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (!document.hidden) loadReadings(false); }, RUNTIME.pollIntervalMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadReadings(false); });
}

export function teardown() {
  if (pollTimer) clearInterval(pollTimer);
  clearRealtime();
}
