# Neural Core — StudentIoT3

Futuristic real-time IoT command center for the existing **StudentIoT3** system.  
It visualizes real ESP32-01 + DHT11 telemetry from Supabase with explainable analytics and a safe software update center.

## Source of truth / preserved contract

- **Supabase project:** `https://bbnvfbjkzjexcfyprkbl.supabase.co`
- **Table:** `public.sensor_readings` (unchanged)
- **Columns:** `id`, `created_at`, `sensor_name`, `sensor_type`, `sensor_value`, `unit`
- **Device:** `ESP32-01`
- **Sensors:** `temperature` (°C), `humidity` (%)
- **Firmware:** `firmware/StudentIoT_DHT11/StudentIoT_DHT11.ino`
- **Baseline repo:** https://github.com/zensansford-jpg/Student-iot3

**No simulated production readings. No light/distance sensors. No schema/policy changes.**

## Project structure

```text
life-monitor-main/
  index.html                # Neural Core UI
  styles.css                # Dark futuristic responsive theme
  app.js                    # Legacy stub (no mock data)
  sw.js                     # PWA service worker (versioned static cache)
  manifest.webmanifest      # PWA manifest
  version.json              # Safe update manifest
  .env.example              # Placeholder config values only
  .gitignore
  CHANGELOG.md
  HANDOFF.md
  PROJECT_AUDIT.md
  INTEGRATION_PLAN.md
  SYSTEM_ARCHITECTURE.md
  TESTING_REPORT.md
  firmware/
    StudentIoT_DHT11/
      StudentIoT_DHT11.ino  # ESP32 DHT11 firmware
  js/
    config.js               # Central config/constants
    store.js                # State, normalization, device status
    supabase-client.js      # Supabase read/realtime/poll/reconnect
    analytics.js            # Explainable real-data insights
    neural-viz.js           # Real-state neural/system visualization
    software-center.js      # Safe version check/update/rollback
    ui.js                   # Rendering/UI bindings
    main.js                 # Bootstrap
```

## Requirements

- Modern browser (Chrome/Edge/Firefox/Safari).
- For local dev: Python 3 or Node.js (to serve static files; ES modules require HTTP).
- Supabase project with existing `public.sensor_readings` table and existing RLS/policies.
- ESP32 + DHT11 hardware for real telemetry.

## Install / run locally

No build step required.

### Option A — Python
```powershell
cd C:\Users\ASUS\life-monitor-main
python -m http.server 8080
```
Open: http://localhost:8080

### Option B — Node
```powershell
cd C:\Users\ASUS\life-monitor-main
npx serve .
```

## Environment variables

This is a static frontend. `.env.example` documents configuration values.  
The browser app currently reads public config from `js/config.js`. **Do not add service_role keys.**

| Variable | Purpose | Example / Placeholder |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | `https://bbnvfbjkzjexcfyprkbl.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Public anon/publishable key only | `your_supabase_publishable_or_anon_key` |
| `DEVICE_NAME` | Device filter | `ESP32-01` |
| `SENSOR_TYPES` | Allowed sensors | `temperature,humidity` |
| `ONLINE_THRESHOLD_MS` | Device online window | `30000` |
| `POLL_INTERVAL_MS` | Poll fallback interval | `15000` |
| `UPDATE_MANIFEST_URL` | Safe update manifest | `./version.json` |
| `WIFI_SSID` | Firmware Wi-Fi name (do not commit real) | `YOUR_WIFI_NAME` |
| `WIFI_PASSWORD` | Firmware Wi-Fi password (do not commit real) | `YOUR_WIFI_PASSWORD` |

## Supabase integration

- Uses `@supabase/supabase-js@2` from CDN.
- Reads from `public.sensor_readings` with existing columns only.
- Subscribes to Realtime `INSERT` events for `sensor_readings`.
- Polling fallback every 15s (configurable).
- Device status: `ONLINE` / `OFFLINE` / `WAITING` / `ERROR`.
- **No schema changes, no policy changes, no service_role key.**

## ESP32 / hardware setup

1. Open `firmware/StudentIoT_DHT11/StudentIoT_DHT11.ino` in Arduino IDE.
2. Install libraries: **DHT sensor library by Adafruit**, **Adafruit Unified Sensor**.
3. Set board/port for your ESP32.
4. Set `WIFI_SSID` and `WIFI_PASSWORD`.
5. Confirm `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DEVICE_NAME`.
6. Upload. Open Serial Monitor at **115200** baud.
7. Verify DHT11 wiring: VCC->3V3, GND->GND, DATA->GPIO4.

Prototype note: firmware uses `setInsecure()` for TLS; acceptable for prototype, but use CA-validated TLS before production.

## Safe software update center

- Displays current version from `js/config.js`.
- Checks `version.json` for latest approved release metadata.
- Checks an approved same-origin `version.json` manifest.
- Stages a new service worker and waits for explicit user approval before activation.
- Bypasses the service-worker cache for `version.json` so update checks can detect releases.
- The cache-repair action clears this app's local cache only; it is not a release rollback.
- True release rollback requires restoring and redeploying the previous approved GitHub Pages commit.
- PWA service worker uses an app-specific versioned static cache (`sw.js`).
- **No arbitrary downloaded JS execution. No self-modifying source. No auto-publish.**

## GitHub Pages deployment

- Compatible with static GitHub Pages (root).
- Ensure relative paths remain valid (`./js/...`, `./styles.css`).
- Deploy approved commits only.
- Do not push/deploy without approval.
- For each release, bump `APP.version` in `js/config.js`, `version` in `version.json`, and `CACHE_NAME` in `sw.js` together. Keep the service worker waiting for user approval.

## Testing

See `TESTING_REPORT.md`. Hardware tests require physical ESP32+DHT11 and are marked not run unless executed.

## Handover

See `HANDOFF.md` for ChatGPT/GitHub/Supabase integration checklist and completed/incomplete features.
