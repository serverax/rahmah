# Rahma — Child-Safety Runtime Prototype

**Date:** 2026-05-14
**Status:** runtime bridge ships; tests pass; **real WASM load is later**.

## What this prototype is

A Node + Fastify HTTP bridge at `wasm/child-safety/server/` exposing:

- `GET /health` — runtime identity + mode.
- `POST /evaluate` — JSON in, JSON out.

The decision logic lives in `wasm/child-safety/server/src/policy.js`,
which is the **JavaScript port** of `wasm/child-safety/src/lib.rs`
(the Rust crate). Both implementations are byte-identical for the same
input.

## What this prototype is NOT

- **NOT** a wasmtime / wasmedge integration. The runtime bridge runs the
  JS port in-process today. The real `.wasm` artefact (built by
  `rahma-wasm-build` CI) is on disk in CI artifacts but is NOT yet
  loaded by this bridge.
- **NOT** deployed on the cluster. The K3s Deployment at
  `deployment/k3s/wasm/rahma-wasm-placeholders.yaml` still runs the
  `nginx-unprivileged` placeholder.
- **NOT** the source of truth for the policy. The Rust crate is. This
  bridge mirrors it so the HTTP contract is testable today.

## Why a runtime bridge rather than direct WASM-in-backend

- Lets us roll a real cluster image NOW with the JS port,
  without committing to a final WASM runtime.
- Decouples the WASM runtime choice (wasmtime / wasmedge / custom Rust
  runner) from the API contract.
- Lets us run JS-port + Rust-WASM in parallel for parity-checking once
  the loader swap lands.

## Tests

`cd wasm/child-safety/server && npm test` runs 9 cases:

- /health responds with `service` + `runtime_mode`.
- /evaluate blocks empty body, PII Arabic, shaming, sensitive topic for
  younger band, sectarian.
- /evaluate allows safe content.
- /evaluate validates `age_band` enum at schema layer (400).
- /evaluate response never echoes the input body.

## Image target

`ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest`

Build pipeline NOT yet authored — a future
`.github/workflows/rahma-wasm-runtime-images.yml` will build this image
from `wasm/child-safety/server/Dockerfile`. The placeholder Dockerfile
at `wasm/child-safety/Dockerfile` does not build the runtime; it is
inventory-only.

## Cluster rollout (future)

When the operator picks the runtime image:

```bash
kubectl -n rahma-ai set image deployment/rahma-child-safety-wasm \
  placeholder=ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest
kubectl -n rahma-ai rollout status deployment/rahma-child-safety-wasm --timeout=180s
```

The Service name `rahma-child-safety-wasm.rahma-ai.svc.cluster.local:8080`
matches the live cluster (operator-verified earlier).

## Operator action that turns this into the "real" WASM runtime

1. Build the runtime image (`wasm/child-safety/server/Dockerfile` —
   operator-chosen base image).
2. Sign + push to GHCR.
3. Swap the placeholder Deployment to the runtime image.
4. Capture the rollout output in
   `reports/RAHMA_WASM_CHILD_SAFETY_LIVE_<date>.md`.
5. Switch the bridge's `runtime_mode` field to `wasmtime_in_process` (or
   chosen runtime) by env var `WASM_RUNTIME_MODE`.

Until step 4 lands, no "real WASM live" claim is made.
