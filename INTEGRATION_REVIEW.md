# Integration Review — Neural Core / StudentIoT3

**Review date:** 2026-11-22  
**Source package:** OpenCode Phase 2 handoff (`life-monitor-main`)  
**Local Git history supplied:** `f7b6edc` → `233b577`

## Confirmed

- The project is a static HTML/CSS/ES-module application and its local asset references resolve.
- JavaScript modules and service worker pass syntax checks.
- The frontend points to the existing Supabase project and `public.sensor_readings` contract.
- The existing table has the expected columns: `id`, `created_at`, `sensor_name`, `sensor_type`, `sensor_value`, `unit`.
- RLS is enabled; existing public SELECT and validated INSERT policies are present.
- `sensor_readings` is included in `supabase_realtime`.
- The publishable key is used by the browser client; the ESP32 firmware sends it in the `apikey` header only.
- The production interface is based on real ESP32-01 temperature/humidity records and contains no simulated sensor readings.
- No database schema or policy changes were made.

## Integration hardening applied to this handover copy

- Service-worker updates are staged and wait for explicit user approval.
- The version manifest bypasses the service-worker cache.
- App cache names and cache repair are scoped to StudentIoT.
- The UI calls the cache action "Repair app cache", not "Rollback".
- Documentation explains that a true deployed-release rollback requires redeploying a previous approved GitHub Pages commit.
- Neural visualization pulse routing is deterministic and does not use random values.

## Not yet verified

- Browser-side Supabase JS read and Realtime behavior in a live browser.
- Fresh ESP32 hardware telemetry.
- GitHub Pages deployment and deployed-origin PWA behavior.
- Browser interaction tests for filters, CSV export, and mobile layouts.

## Deployment status

No GitHub files were pushed, no pull request was opened, no GitHub Pages deployment was triggered, and no Supabase schema or policy changes were made during this review.
