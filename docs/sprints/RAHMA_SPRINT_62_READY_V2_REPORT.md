# Sprint 62 — /ready v2 Report

**Date:** 2026-05-14

## What ships
- `/ready` adds `readiness_schema_version: "2"` + `public_ingress_state` object + per-WASM-module sub-objects + `islamic_sources` + `donations` + new blocker `donations_provider_not_configured`.
- `docs/api/RAHMA_READY_V2_CONTRACT.md` — single contract page.
- 8 new tests in `sprint-62-ready-v2.test.js`.

## Honesty
- The `public_ingress` field stays as the string `"disabled"` for backward compatibility; `public_ingress_state` is the new v2 nested form.
- `wasm.<module>.reachable` remains `null` until a real probe ships.
- No secret leaked anywhere; tests assert with distinctive leak markers.
