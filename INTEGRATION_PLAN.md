# INTEGRATION_PLAN.md — StudentIoT3 / Neural Core Evolution

**Date:** 2026-11-22  
**Target directory:** `C:\Users\ASUS\life-monitor-main`  
**Baseline:** `https://github.com/zensansford-jpg/Student-iot3`  
**Constraint:** No destructive changes, no fake sensor data, no secret exposure, no schema/policy changes without approval.

## 1. Goal

Evolve the existing local demo into a **real-data StudentIoT3 Neural Core dashboard** while preserving compatibility with the existing ESP32 + DHT11 + Supabase + GitHub Pages system.

## 2. Confirmed Constraints / Source of Truth

- **Supabase:** `https://bbnvfbjkzjexcfyprkbl.supabase.co`
- **Table:** `public.sensor_readings`
- **Columns:** `id`, `created_at`, `sensor_name`, `sensor_type`, `sensor_value`, `unit`
- **Device:** `ESP32-01`
- **Sensors:** `temperature` (°C), `humidity` (%)
- **Firmware:** `firmware/StudentIoT_DHT11/StudentIoT_DHT11.ino`
- **GitHub baseline:** `zensansford-jpg/Student-iot3`
- **Client key rule:** publishable/anon key only in frontend; never service_role.

## 3. Strategy Decision (needs confirmation)

### Option A — Recommended: Evolve this folder in-place, align with Student-iot3
- Initialize git, add remote/reference to Student-iot3, import missing baseline files (firmware, README content, data contract), replace mock data with real Supabase integration.
- **Pros:** Uses the folder user specified; preserves useful UI shell; reversible via git.
- **Cons:** Requires careful reconciliation because local demo differs from repo.

### Option B — Clone official Student-iot3 and port Neural Core UI
- Clone `Student-iot3` into a clean folder; port visual/UX improvements from `life-monitor-main`.
- **Pros:** Cleanest compatibility with existing repo/deploy.
- **Cons:** User asked to work in `life-monitor-main`; may require moving/copying.

**Recommendation:** Option A, but only after creating a backup branch/checkpoint and importing baseline firmware/docs from Student-iot3.

## 4. Phased Implementation

### Phase 1 — Audit & Safety (complete after approval of docs)
- [x] Inspect local folder and remote baseline.
- [x] Create `PROJECT_AUDIT.md`, `INTEGRATION_PLAN.md`, `SYSTEM_ARCHITECTURE.md`.
- [ ] User confirms strategy, scope, and whether to initialize git in `life-monitor-main`.

### Phase 2 — Baseline Alignment
- Create backup checkpoint (`git init`, initial commit, or copy backup) before edits.
- Add `.gitignore`, `.env.example`, `CHANGELOG.md`, `TESTING_REPORT.md`.
- Import/add `firmware/StudentIoT_DHT11/StudentIoT_DHT11.ino` from baseline (preserve wiring/config placeholders).
- Create centralized config module: Supabase URL, publishable key, device name, sensor types, online threshold, polling interval, version/update endpoints.
- Remove all simulated/random sensor values.

### Phase 3 — Real Supabase Integration
- Implement Supabase read path for `sensor_readings`.
- Add Realtime INSERT subscription with duplicate-channel protection and cleanup.
- Add polling fallback (default 15s) with visibility-aware/backoff behavior.
- Implement device states: `ONLINE`, `OFFLINE`, `WAITING`, `ERROR`.
- Handle empty table, invalid rows, network errors, reconnects.

### Phase 4 — Dashboard / Data / Device Features
- Live temperature/humidity cards from real latest records.
- Last received timestamp, total readings count, recent history table.
- Temperature and humidity history charts with adaptive axes and 1H/24H/7D ranges.
- Device Intelligence: ESP32-01 status, last seen, sensor health, diagnostics.
- Data Center: search/filter by date/type/value, CSV export of displayed/selected real records.

### Phase 5 — Neural Core UI (safe, performance-aware)
- Visual redesign: midnight navy, cyan/blue/purple accents, glass panels, subtle grid.
- Neural visualization (SVG/Canvas) representing real system nodes: ESP32, Wi-Fi, Supabase, Dashboard.
- Node states driven by real health checks; no fake \"active\" states.
- Reduced-motion support; lazy-load heavy visuals; mobile optimization.

### Phase 6 — Safe Software Center / PWA
- Version display (`APP_VERSION`, build metadata).
- Check GitHub Releases or `version.json` manifest for latest approved release.
- Show release notes and update availability; **user-controlled reload/update**.
- Optional PWA: service worker with versioned caches and explicit activation.
- True release rollback requires restoring and redeploying the previous approved GitHub Pages commit. Browser-side cache repair only clears this app's local cache.
- **No arbitrary remote JS execution; no auto-publish; no self-modifying code.**

### Phase 7 — Analytics & ML Architecture Prep
- Statistical analytics module over real records: trends, rate of change, missing readings, downtime, anomalies, data quality.
- Explainable insight cards with traceable data references/time windows.
- Separate `analytics/` and future `ml/` interfaces; no trained-model claims until real model exists.

### Phase 8 — Testing / Docs / Handover
- Run software tests; document hardware tests as not run unless device available.
- Create `TESTING_REPORT.md`, `CHANGELOG.md`, update `README.md`.
- Verify GitHub Pages compatibility.
- Provide exact run/connect/test instructions.

## 5. File Plan (proposed)

| File | Action | Purpose |
|---|---|---|
| `index.html` | Modify | Neural Core layout, sections, accessible controls, real-data placeholders. |
| `styles.css` | Modify/split | Theme, responsive layout, reduced-motion, visualization styling. |
| `app.js` | Replace/refactor | Remove mock data; bootstrap modules. |
| `js/config.js` | Create | Central config/constants/env-safe defaults. |
| `js/supabase.js` | Create | Supabase client, queries, realtime, reconnection. |
| `js/state.js` | Create | App state, device status, data normalization. |
| `js/ui.js` | Create | Rendering, charts, tables, notifications. |
| `js/analytics.js` | Create | Traceable statistical insights. |
| `js/update.js` | Create | Safe version check/update/rollback logic. |
| `js/neural-viz.js` | Create | Real-state system visualization. |
| `firmware/StudentIoT_DHT11/StudentIoT_DHT11.ino` | Add | Baseline firmware; keep secrets as placeholders. |
| `.gitignore` | Create | Ignore env/editor/OS/build artifacts. |
| `.env.example` | Create | Safe placeholders only. |
| `version.json` / manifest | Create | Static update metadata for GitHub Pages. |
| `sw.js` | Create (optional PWA) | Versioned caching/update flow. |
| Docs | Create/update | Audit, plan, architecture, testing, changelog, README.

## 6. Risk Controls

- **Backup first:** no major edit before git checkpoint/backup.
- **Small commits:** one phase/feature group at a time.
- **Real data only:** remove demo randomizer and sample arrays.
- **No secret leakage:** publishable key only; never service_role.
- **No schema drift:** no DB migrations/policy edits.
- **No unsafe auto-update:** user-approved reload; verified source; rollback.
- **No false ML claims:** label analytics as statistical unless real model exists.

## 7. Approval Gates

Before implementation, confirm:
1. Use `C:\Users\ASUS\life-monitor-main` as the working project.
2. Option A (evolve in-place) or Option B (clone official repo).
3. Initialize git and create initial checkpoint commit in this folder.
4. Accept safe-update scope (version check + user-controlled update/PWA), not silent arbitrary code installation.
5. Neural Core visual redesign can replace the current \"Life Monitor\" demo branding/layout while preserving real StudentIoT3 data contract.