# PROJECT_AUDIT.md — StudentIoT3 / Life Monitor Local Workspace

**Audit date:** 2026-11-22  
**Auditor:** OpenCode (Iceman Free)  
**Scope:** Local directory `C:\Users\ASUS\life-monitor-main` + remote baseline `https://github.com/zensansford-jpg/Student-iot3`  
**Mode:** Read-only audit. No project files were modified before this report was created.

## 1. Executive Summary

The local folder `C:\Users\ASUS\life-monitor-main` is a **static demo/prototype dashboard** ("Life Monitor") with simulated sensor values. It is **not connected** to the existing StudentIoT3 Supabase project, does **not** use real ESP32/DHT11 readings, and is **not a git repository**. It differs significantly from the GitHub StudentIoT3 baseline.

The requested Neural Core evolution is feasible only if we first establish a safe integration baseline: preserve real-data contracts, import/align with the StudentIoT3 repo structure, and implement changes in small reversible phases.

## 2. Local Project Inventory

| Path | Type | Size | Notes |
|---|---:|---:|---|
| `index.html` | HTML | 8494 B | Static dashboard layout; "DEMO MODE"; 4 metric cards (temp, humidity, light, distance); 2 devices; sample readings table. |
| `app.js` | JS | 2790 B | Hardcoded `sample` chart data; refresh button randomizes fake values; no Supabase, no network, no realtime. |
| `styles.css` | CSS | 10234 B | Dark dashboard styling, responsive rules, minified/compressed formatting. |
| `README.md` | MD | 14 B | Contains only `# life-monitor`. |

**Missing locally:** `.git/`, `firmware/`, Supabase config, package manifest, tests, CI/deploy config, changelog, audit/architecture docs, environment examples.

## 3. Git / Deployment Status

- `git status`: **not a git repository**.
- No remote configured.
- No GitHub Pages configuration in folder.
- No branch/commit history available locally.

## 4. Remote Baseline (Student-iot3)

Inspected from GitHub API/raw (`main`):

| Path | Purpose |
|---|---|
| `README.md` | Project docs, wiring, Supabase/GitHub Pages notes. |
| `index.html` | StudentIoT dashboard; real-data messaging; temp/humidity only. |
| `app.js` | Supabase read + Realtime INSERT subscription + 15s polling fallback; device online threshold 30s. |
| `styles.css` | StudentIoT styling. |
| `firmware/StudentIoT_DHT11/StudentIoT_DHT11.ino` | ESP32 DHT11 firmware; posts temp/humidity to Supabase REST endpoint. |

**Remote facts:** has GitHub Pages enabled; default branch `main`; recent push 2026-11-22T04:18:01Z.

## 5. Compatibility & Gap Analysis

### 5.1 Critical Gaps

| Finding | Local | Remote/Baseline | Risk | Action |
|---|---|---|---|---|
| Real Supabase integration | Missing | Present | High - violates "real sensor data only" | Implement Supabase client module using existing project/table. |
| Simulated data | Present (`sample`, random refresh) | Avoided; real readings only | High - misleading UI | Remove simulated data paths; label missing data explicitly. |
| Device/data contract | ESP32-01/02, light/distance | ESP32-01, DHT11 temp/humidity | High - schema/UI mismatch | Align to existing `sensor_readings` contract; do not invent sensors. |
| Firmware | Missing | Present | Medium - cannot validate end-to-end locally | Add firmware from baseline; keep hardware config intact. |
| Git history | Missing | Present | High - unsafe changes/no rollback | Initialize git or clone baseline into a proper working repo before major changes. |
| Deployment compatibility | Unknown static folder | GitHub Pages root on main | Medium | Preserve static deployability; document build/deploy if tooling added. |

### 5.2 What Works Locally

- Static HTML/CSS/JS loads without build tooling.
- Responsive layout foundation exists.
- Chart/tab interaction pattern exists (but mock data).
- Visual direction can be evolved, but content must be replaced with real data.

### 5.3 What Must Not Change Without Approval

- Supabase project URL/table/schema/RLS policies.
- Existing `public.sensor_readings` column contract.
- Real sensor semantics: ESP32-01, DHT11, temperature °C, humidity %.
- GitHub Pages deployment expectations for the existing repo.
- No service_role key in frontend/firmware; no secrets committed.

## 6. Security & Reliability Findings

| Area | Finding | Severity | Recommendation |
|---|---|---|---|
| Secrets | No Supabase keys in local demo; remote uses publishable key (acceptable). | Low | Keep only publishable/anon key client-side; use env/example patterns. |
| Fake telemetry | Refresh/randomizes values. | High | Remove before any production use. |
| TLS in firmware (remote) | `setInsecure()` noted. | Medium | Document CA-validated TLS path for production; test on hardware before changing. |
| Update system (requested) | "Autonomous updates" can be unsafe if misimplemented. | High | Implement safe version check + user-approved reload/PWA cache update only; no arbitrary code execution. |
| RLS/DB | No DB changes audited locally. | Medium | Do not alter schema/policies without explicit approval. |

## 7. Neural Core Vision — Feasibility Audit

| Requested Feature | Feasibility | Notes |
|---|---|---|
| Futuristic neural UI | Feasible | Can be implemented with CSS/SVG/Canvas; must respect performance/reduced motion. |
| Neural visualization mapped to real system state | Feasible | Must reflect actual connection/device/db states; not a trained neural net claim. |
| Safe software update/version center | Feasible (limited) | Static GitHub Pages can check GitHub releases/manifest, notify, and reload/PWA update. No silent arbitrary code install. |
| Automatic deployment | Partially feasible | GitHub Actions/deployment pipeline can automate release deployment after approval; not "self-modifying live site". |
| PWA/service worker | Feasible | Must use versioned cache and safe invalidation; careful with Supabase/fresh data. |
| Adaptive dashboard layouts/widgets | Feasible | Store layout in localStorage; accessible controls. |
| AI analytics/statistical insights | Feasible | Use real DB records; traceable insights only. |
| ML training/forecasting pipeline | Feasible as architecture prep | Keep separate from frontend; do not claim trained model unless real pipeline/model exists. |

## 8. Audit Conclusion

**Current state:** Demo UI shell, not production StudentIoT3.  
**Primary blocker:** No real Supabase/data integration and no git baseline in this folder.  
**Recommended next step:** Confirm target strategy (evolve this folder into a git-managed StudentIoT3-compatible app, or clone the official repo and port UI). Then implement Phase 2 integration plan in small reversible commits.
