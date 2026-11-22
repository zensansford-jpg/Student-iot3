import { APP, RUNTIME, DEVICE } from './config.js';
import { initSupabase, loadReadings, teardown } from './supabase-client.js';
import { subscribe, getState, setUpdate } from './store.js';
import { bindUI, render } from './ui.js';
import { initNeuralViz, pushPulse } from './neural-viz.js';
import { checkForUpdate, applyUpdate, repairAppCache, registerSW } from './software-center.js';

function downloadCsv(filename, rows) {
  const header = ['id','created_at','sensor_name','sensor_type','sensor_value','unit'];
  const escape = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
  const lines = [header.join(',')].concat(rows.map(r => header.map(h => escape(r[h])).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

async function doCheckUpdate() {
  setUpdate({ status:'checking', message:'Checking for updates...' });
  try {
    const info = await checkForUpdate();
    setUpdate({ status: info.available ? 'available' : 'current', message: info.available ? `Update ${info.latest} available.` : 'You are on the latest approved version.', latest: info.manifest });
    render();
  } catch (e) {
    setUpdate({ status:'error', message: e.message || 'Update check failed.' });
    render();
  }
}

const actions = {
  refresh: () => loadReadings(true),
  checkUpdate: () => doCheckUpdate(),
  applyUpdate: async () => {
    if (!confirm('Apply the approved update? The new version will activate and reload the dashboard.')) return;
    try { await applyUpdate(); }
    catch (error) {
      setUpdate({ status: 'error', message: error.message || 'Update could not be applied.' });
      render();
    }
  },
  repairCache: () => {
    if (confirm('Repair the local app cache and reload? This does not roll back the deployed release.')) repairAppCache();
  },
  exportCsv: () => {
    const s = getState();
    const rows = s.rows; // export real readings currently loaded (can be filtered by extending)
    if (!rows.length) { alert('No real readings to export.'); return; }
    downloadCsv(`neural-core-${DEVICE.name}-${new Date().toISOString().slice(0,10)}.csv`, rows);
  }
};

async function boot() {
  document.getElementById('appVersion')?.replaceChildren(document.createTextNode(APP.version));
  bindUI(actions);
  subscribe(() => { render(); });
  render();
  const canvas = document.getElementById('neuralCanvas');
  if (canvas) initNeuralViz(canvas);
  await initSupabase();
  // pulse on new data
  let lastId = null;
  subscribe((s) => { const id = s.rows[0]?.id; if (id && id !== lastId) { lastId = id; pushPulse(); } });
  setInterval(render, RUNTIME.statusTickMs);
  registerSW().then(r => { if (r.supported) console.log('SW registered'); });
  // periodic update check
  doCheckUpdate();
  setInterval(doCheckUpdate, 30*60*1000);
  window.addEventListener('beforeunload', teardown);
}

boot().catch(err => {
  console.error(err);
  const el = document.getElementById('fatalError');
  if (el) { el.hidden = false; el.textContent = 'Startup error: ' + (err.message || err); }
});
