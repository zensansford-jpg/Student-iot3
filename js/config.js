export const APP = {
  name: 'Neural Core — StudentIoT3',
  version: '1.0.1',
  build: '2026-11-22',
  channel: 'stable',
  repo: 'https://github.com/zensansford-jpg/Student-iot3',
  pagesUrl: 'https://zensansford-jpg.github.io/Student-iot3/'
};

export const SUPABASE = {
  url: 'https://bbnvfbjkzjexcfyprkbl.supabase.co',
  publishableKey: 'sb_publishable_LVBYcxg9tXCvag0DVPjumQ_uBoGI451',
  table: 'sensor_readings',
  schema: 'public'
};

export const DEVICE = {
  name: 'ESP32-01',
  sensorTypes: ['temperature', 'humidity'],
  sensors: {
    temperature: { label: 'Temperature', unit: '°C', icon: 'temp', min: -20, max: 60 },
    humidity: { label: 'Humidity', unit: '%', icon: 'humidity', min: 0, max: 100 }
  }
};

export const RUNTIME = {
  onlineThresholdMs: 30000,
  pollIntervalMs: 15000,
  statusTickMs: 5000,
  maxRows: 500,
  chartRanges: {
    '1H': 60 * 60 * 1000,
    '24H': 24 * 60 * 60 * 1000,
    '7D': 7 * 24 * 60 * 60 * 1000
  },
  reconnectBaseMs: 2000,
  reconnectMaxMs: 30000
};

export const UPDATE = {
  manifestUrl: './version.json',
  checkIntervalMs: 30 * 60 * 1000,
  storageKey: 'neural-core-update-state',
  layoutKey: 'neural-core-layout',
  themeKey: 'neural-core-theme'
};
