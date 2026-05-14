# rahma-child-safety-wasm — runtime bridge (foundation prototype)

This directory holds the **runtime bridge** that fronts the child-safety
policy module with an HTTP interface the in-cluster API can call.

## Status: FOUNDATION PROTOTYPE

- Current implementation runs the deterministic JavaScript port of
  `wasm/child-safety/src/lib.rs` **in-process**. Same input → same
  output as the Rust crate; the parity is tested.
- A later sprint swaps the in-process call for a real `wasmtime` /
  `wasmedge` load of `child_safety.wasm` (built by
  `rahma-wasm-build`). The HTTP contract does NOT change.
- This is **NOT** a claim that "real WASM runtime is live". The runtime
  bridge is the operator-visible foundation; the actual WASM loader
  swap is operator-decided.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | liveness + `runtime_mode` field |
| `POST` | `/evaluate` | JSON in, JSON out (see schema below) |

### `POST /evaluate` schema

Request:
```json
{
  "body_ar": "string (≤4000 chars)",
  "age_band": "4-6|7-9|10-12|13+",
  "topic_tags": ["string", "..."]    (optional, ≤32 items)
}
```

Response:
```json
{
  "ok": true,
  "decision": "allow|block",
  "reason": "string|null",
  "sensitive_topic": "string"        (only when blocked for topic)
}
```

## Build & test

```bash
cd wasm/child-safety/server
npm ci
npm test                       # 9 tests pass
```

## Image target (future)

`ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest` — built by a
future `rahma-wasm-runtime-images.yml` workflow (NOT yet authored).
The K3s placeholder Deployment at
`deployment/k3s/wasm/rahma-wasm-placeholders.yaml` is the slot this
image will fill.

## Safety properties

- NEVER persists `body_ar`.
- NEVER echoes `body_ar` in any response.
- NEVER opens an outbound network call.
- NEVER reaches the public internet.
- NEVER includes secrets / DSNs.

## What this directory does NOT include

- A wasmtime / wasmedge dependency. The in-process call mode is the
  current bridge; the real `.wasm` load happens in a later sprint.
- A Dockerfile that builds the runtime bridge image. The placeholder
  Dockerfile is at `wasm/child-safety/Dockerfile`; the operator-decided
  real Dockerfile replaces it when the runtime is chosen.
