# SYSTEM_ARCHITECTURE.md — StudentIoT3 / Neural Core

**Date:** 2026-11-22  
**Status:** Proposed target architecture (Phase 1 audit output; implementation is in this handover package)

## 1. System Overview

The platform connects physical ESP32 telemetry to a Supabase data layer and two compatible presentation surfaces: a local IDE/dev dashboard and the GitHub Pages dashboard. Both surfaces must use the same Supabase project, table contract, and device/sensor definitions.

```text
ESP32 + DHT11 (GPIO4)
        |
        | Wi-Fi + HTTPS REST (anon/publishable key, RLS-constrained)
        v
Supabase Postgres: public.sensor_readings
        |
        +--> Supabase Realtime (postgres_changes INSERT)
        +--> REST/select polling fallback
        |
        v
Neural Core Web App (static/PWA-compatible)
        |
        +--> Live Monitoring (temp/humidity/cards/charts)
        +--> Device Intelligence (ONLINE/OFFLINE/WAITING/ERROR)
        +--> Data Center (history/filter/export)
        +--> AI Analytics (traceable statistical insights)
        +--> Software Center (version check, safe update, rollback)
        |
        v
GitHub Pages deployment (main/root, approved releases only)
```

## 2. Existing Production Contract (must preserve)

### Supabase
- URL: `https://bbnvfbjkzjexcfyprkbl.supabase.co`
- Table: `public.sensor_readings`
- Columns: `id bigint identity`, `created_at timestamptz`, `sensor_name text`, `sensor_type text`, `sensor_value numeric`, `unit text`

### Device/Sensors
- Device: `ESP32-01`
- `temperature` in `°C`
- `humidity` in `%`
- DHT11 DATA on GPIO 4

## 3. Component Responsibilities

| Component | Responsibility | Real-data rule |
|---|---|---|
| ESP32 firmware | Read DHT11, validate NaN, POST readings every interval | Only sends measured sensor values. |
| Supabase | Store readings, enforce RLS, provide Realtime/REST | Source of truth for telemetry. |
| Data access layer | Query, subscribe, normalize, dedupe, reconnect | No fake rows; preserve timestamps. |
| State/store | Latest-by-type, history, device status, connection health | Status derived from real timestamps/errors. |
| UI layer | Render dashboard, charts, tables, notifications | Clearly label loading/empty/error/offline. |
| Analytics layer | Compute trends/anomalies from real records | Every insight traceable to data window. |
| Update layer | Check version manifest/releases, notify, controlled reload | No arbitrary code execution. |

## 4. Frontend Module Layout

```text
life-monitor-main/
  index.html
  styles.css
  sw.js
  version.json
  js/
    config.js
    supabase-client.js
    store.js
    ui.js
    neural-viz.js
    analytics.js
    software-center.js
    main.js
  firmware/
    StudentIoT_DHT11/StudentIoT_DHT11.ino
```

## 5. Data Flow

1. **Ingest:** ESP32 reads DHT11; if valid, POSTs `temperature` and `humidity` rows to Supabase REST.
2. **Persist:** Supabase inserts rows with `created_at`.
3. **Realtime:** Dashboard receives INSERT events via Supabase Realtime.
4. **Fallback:** Polling fetch runs every 15s (configurable) and on manual refresh/reconnect.
5. **Normalize:** Rows validated for expected device/type/unit/value sanity checks.
6. **Derive:** Latest values, history windows, total count, device freshness, analytics.
7. **Render:** UI updates cards/charts/table/status/visualization; no simulated values.

## 6. Device Status Model

| Status | Rule | UI behavior |
|---|---|---|
| `ONLINE` | Latest valid reading age <= configured threshold (default 30s) | Green/live indicator. |
| `OFFLINE` | Latest valid reading exists but age > threshold | Amber/offline indicator, show last seen. |
| `WAITING` | No readings ever received for configured device | Neutral waiting state. |
| `ERROR` | Data fetch/subscription/config/runtime error prevents determination | Red/error state with actionable message. |

## 7. Safe Update Architecture

### Allowed
- Display current app version from local config/build metadata.
- Fetch `version.json` or trusted release metadata.
- Compare versions and show release notes.
- Prompt for user-controlled update/reload.
- Stage service-worker updates until explicit activation.
- True release rollback requires restoring and redeploying a previous approved GitHub Pages commit; browser cache repair only clears this app's local cache.

### Disallowed
- Downloading and executing arbitrary JS from untrusted sources.
- Silent self-modifying source code.
- Automatic schema/policy changes.
- Auto-publishing releases without tests/approval.
- Exposing service_role or private signing keys in browser.

## 8. Neural Visualization Mapping

Visualization is an **operational schematic**, not a trained ML model.

| Node | Data source | Healthy | Degraded/Error |
|---|---|---|---|
| ESP32 | Latest reading timestamp | Recent reading within threshold | OFFLINE/WAITING |
| Wi-Fi/Link | Fetch/realtime/network errors | Successful requests | Intermittent/reconnect |
| Supabase | Query/subscription status | Connected/subscribed | Read/realtime error |
| Dashboard | App runtime/render/update state | Rendering live | Stale/error/loading |

Animations are subtle, respect `prefers-reduced-motion`, and should pause when the tab is hidden where practical.

## 9. Analytics / ML Boundary

- Frontend analytics are deterministic statistics over real records.
- A future ML service must be separate, versioned, and evaluated.
- Measured sensor values are never overwritten by predictions. Predictions are labeled separately.

## 10. Security & Deployment

- Publishable/anon key only in client-side code.
- `.env.example` contains placeholders; no real secrets committed.
- Keep RLS enabled; no policy weakening.
- GitHub Pages deployment from approved commits/releases only.
- Firmware currently uses `setInsecure()` for prototype TLS; use CA-validated TLS before production.
