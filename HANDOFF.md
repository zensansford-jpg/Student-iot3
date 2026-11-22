# HANDOFF.md — Neural Core / StudentIoT3

This project is prepared for handover to ChatGPT for final GitHub and Supabase integration.  
**No GitHub push, no deployment, no Supabase schema/policy changes were performed.**

## 1. What this package contains

- Complete static frontend source (HTML/CSS/JS modules).
- PWA files (`sw.js`, `manifest.webmanifest`) and safe update manifest (`version.json`).
- ESP32 DHT11 firmware baseline.
- Audit/integration/architecture/changelog/testing docs.
- `.env.example` with placeholders only.

## 2. What must NOT be changed

- Supabase project URL: `https://bbnvfbjkzjexcfyprkbl.supabase.co`
- Table: `public.sensor_readings`
- Columns: `id, created_at, sensor_name, sensor_type, sensor_value, unit`
- Device: `ESP32-01`
- Sensors: `temperature` (°C), `humidity` (%)
- No service_role key in frontend/firmware.
- No simulated production readings.

## 3. Environment variables / config

See `.env.example`. Static frontend config lives in `js/config.js`.

| Name | Required | Secret | Notes |
|---|---:|---:|---|
| SUPABASE_URL | Yes | No (public) | Existing project URL |
| SUPABASE_PUBLISHABLE_KEY | Yes | Public-only | Anon/publishable key; never service_role |
| WIFI_SSID | Firmware | Yes (private) | Do not commit real value |
| WIFI_PASSWORD | Firmware | Yes (private) | Do not commit real value |

## 4. Supabase integration requirements

- Existing table `public.sensor_readings` must remain unchanged.
- RLS remains enabled; do not weaken policies.
- Realtime publication must include `sensor_readings` (baseline already does).
- Client uses anon/publishable key only.
- Reads: select by `sensor_name=ESP32-01`, `sensor_type in (temperature,humidity)`, order `created_at desc`.
- Realtime: INSERT subscription on `public.sensor_readings`.

## 5. GitHub integration / Pages

- Baseline repo: `https://github.com/zensansford-jpg/Student-iot3`
- Local project path used: `C:\Users\ASUS\life-monitor-main`
- Git initialized locally; checkpoint commit `f7b6edc` exists; implementation commits added during work.
- **Do not push** without approval.
- GitHub Pages expected: branch `main`, folder `/ (root)`.
- Before publishing: bump `js/config.js` APP.version, `version.json`, and `sw.js` CACHE_NAME together.

## 6. Completed features

- [x] Audit docs (PROJECT_AUDIT, INTEGRATION_PLAN, SYSTEM_ARCHITECTURE).
- [x] Git checkpoint before major changes.
- [x] Real Supabase read + Realtime INSERT + polling fallback.
- [x] Device status model (ONLINE/OFFLINE/WAITING/ERROR).
- [x] Neural Core UI redesign (dark/cyan/purple/glass).
- [x] Real-state neural visualization (canvas, reduced-motion aware).
- [x] Live temperature/humidity cards and history charts.
- [x] Explainable analytics from real readings.
- [x] Data filters and CSV export.
- [x] Safe Software Center (approved manifest check, release notes, staged service-worker update requiring user approval, app-scoped cache repair).
- [x] PWA service worker + manifest (static asset cache only).
- [x] Firmware baseline included.
- [x] Handover/docs.

## 7. Incomplete / requires real environment testing

- [ ] Real ESP32 hardware end-to-end test (upload firmware, confirm rows appear in Supabase, dashboard updates).
- [ ] Supabase Realtime live verification against actual project (requires network/access).
- [ ] GitHub Pages deployment verification (requires push approval).
- [ ] PWA install/update behavior verification on deployed HTTPS origin.
- [x] Service worker update UX stages the new worker and waits for explicit user approval before activation.
- [ ] True release rollback requires restoring and redeploying the previous approved GitHub Pages commit; client-side cache repair is not a release rollback.
- [ ] CA-validated TLS in firmware (prototype uses `setInsecure()`).
- [ ] Optional: GitHub Actions workflow for approved release deployment (not added; requires approval).

## 8. ZIP packaging notes

Include: all source files, docs, firmware, `.gitignore`, `.env.example`, `version.json`, `manifest.webmanifest`, `sw.js`, `js/*`.  
Exclude: `node_modules/`, `.env`, real Wi-Fi passwords, private keys, service_role keys, `*.zip`, OS junk.  
The `.git` folder may be included if desired for history, but not required.