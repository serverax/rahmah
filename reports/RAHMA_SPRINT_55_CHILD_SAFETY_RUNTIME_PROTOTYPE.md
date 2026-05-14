# Sprint 55 — child-safety runtime prototype

**Date:** 2026-05-14

## What ships

- `wasm/child-safety/server/src/index.js` — Fastify HTTP bridge.
- `wasm/child-safety/server/src/policy.js` — JS port of the Rust crate (byte-identical decision contract).
- `wasm/child-safety/server/test/runtime.test.js` — **9 tests** (health, 5 block cases, 1 allow, schema 400, no-echo).
- `wasm/child-safety/server/package.json` — Fastify-only dep.
- `wasm/child-safety/server/README.md`.
- `docs/wasm/RAHMA_CHILD_SAFETY_RUNTIME_PROTOTYPE.md`.

## Tests

`cd wasm/child-safety/server && npm test` runs:

1. /health identity
2. /evaluate empty body → block
3. /evaluate PII Arabic → block
4. /evaluate shaming → block
5. /evaluate sensitive topic for younger band → block
6. /evaluate sectarian → block via direct policy
7. /evaluate safe content → allow
8. /evaluate schema 400 for bad age_band
9. /evaluate response never echoes input body

Local run: see "Tests / checks run" section of the bundle final report.

## Honesty record

- This bridge is **NOT** a wasmtime / wasmedge integration.
- It runs the **JS port** of the policy in-process today.
- The cluster Deployment continues to run the nginx placeholder image.
- A "real WASM runtime live" claim requires:
  - operator-chosen runtime image built + signed + pushed,
  - K3s rollout captured in `reports/RAHMA_WASM_CHILD_SAFETY_LIVE_<date>.md`.

## Image target (future)

`ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest`

Build workflow NOT YET authored. CI continues to publish
`.wasm` artefacts via `rahma-wasm-build`.
