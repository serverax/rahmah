# Rahma — WASM Runtime Decision

**Date:** 2026-05-14
**Status:** recommendation; final pick is operator-side.

## Options evaluated

| Runtime | Pros | Cons |
|---|---|---|
| **wasmtime + thin Rust HTTP wrapper** (recommended) | reference WASI implementation; mature; trivial sandboxing; deterministic; tiny image (Alpine-based static binary) | new Rust binary to maintain |
| wasmedge | excellent perf; sandboxed; CNCF-graduated; large language coverage | image larger; slower image-bump cadence |
| Spin (Fermyon) | HTTP-native runtime; fast cold starts | extra control plane in cluster; overkill for 4 deterministic modules |
| wasmCloud | OCI-style WASM hosting | overkill; assumes lattice |
| Node `node:wasi` + thin Express wrapper | reuses the existing Node stack | reduces sandbox guarantees; Node WASI is unstable; less ideal for security-critical policy code |

## Recommendation: wasmtime + Rust HTTP wrapper

A single binary per crate: load the `<crate>.wasm` artefact from the
CI workflow, expose `GET /health` + `POST /evaluate`. Same Dockerfile
template per crate (variable: the `.wasm` filename + the module name).
The wrapper is ~50 lines of Rust around `wasmtime` and `axum`.

Operator may pick `wasmedge` instead by swapping the runtime image; the
Rahma-side contract (HTTP `/evaluate` with JSON in / JSON out) does not
change.

## Why not run WASM in-process in the backend

The mobile API backend should never link a WASM runtime directly. The
sidecar approach lets us:

- enforce resource limits per module independently of the API,
- rotate WASM artefacts without restarting the API,
- run a parity-check loop (JS-in-backend vs WASM-in-sidecar) and audit
  divergence rows in `wasm_*_audit` tables,
- run each module as a separate K8s Deployment, with its own CPU /
  memory budget.

## What ships next sprint (planned)

1. `wasm/<crate>/server/` — Rust HTTP wrapper with `/health` +
   `POST /evaluate`. Builds as `Cargo.toml` sibling to the existing
   crate.
2. `wasm/<crate>/Dockerfile` — multi-stage build: `cargo build --release`
   the wrapper, copy the `.wasm` next to it, run unprivileged.
3. `.github/workflows/rahma-wasm-images.yml` — build + push four images
   under `ghcr.io/serverax/rahmah/rahma-<crate>-wasm:latest`.

## NEVER

- Run WASM with `--allow-host-fs` / `--allow-net`. The sandboxes are
  pure-WASI with no host syscalls.
- Sign WASM artefacts with a developer key. Operator chooses signing
  posture (sigstore / cosign / operator-internal CA) before any
  cluster image rollout.
- Expose any WASM service publicly. ClusterIP only.
