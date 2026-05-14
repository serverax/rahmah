# Rahma — WASM Limitations & Honest Status

**Date:** 2026-05-14

This document records what the WASM workspace is, and what it is NOT.

## What it IS

- A Rust workspace under `wasm/` with four crates.
- Each crate exposes a deterministic, fail-closed policy function.
- Each crate has a native `cargo test` suite that proves the contract.
- A CI workflow (`.github/workflows/rahma-wasm-build.yml`) builds all four
  for `wasm32-unknown-unknown` and uploads the `.wasm` artifacts.

## What it is NOT (yet)

- **Not running inside the request path.** The backend currently uses
  the JavaScript implementations directly. The WASM modules are the
  *second* implementation, intended to be loaded by a future host
  loader and checked for parity.
- **Not deployed.** The K3s manifests at
  `deployment/k3s/wasm/rahma-wasm-placeholders.yaml` declare four
  placeholder Deployments using an `nginx-unprivileged` container.
  These are placeholders for inventory only.
- **Not signed.** No image signing, no in-toto attestation, no
  reproducible build attestation.
- **Not connected to `wasm_*_audit` tables.** Migration 009 ships the
  tables, but the host loader that writes rows into them is not yet
  implemented.
- **Not an Islamic ruling engine.** No WASM module here authors a
  religious answer. They check structural prerequisites only.

## What the operator must choose before going live

1. **WASM runtime.** `wasmedge`, `wasmtime`, or a custom Rust runner.
   The chosen runtime determines the image used in the K3s placeholders.
2. **Signing posture.** sigstore? cosign? operator-internal CA?
3. **Resource limits.** Today the placeholder limits are `100m CPU /
   64Mi memory`. The real runtime image will need different bounds.
4. **Parity check cadence.** Run JS-vs-WASM parity on every evaluation,
   or sample 1%?

Until those choices land, the WASM workspace is **source of truth +
artifacts** but **NOT enforced**.

## What we will never silently do

- We will not flip from JS to WASM as the enforcing implementation
  without a parity-test sprint and operator sign-off.
- We will not deploy any WASM image that has not been signed by the
  operator's chosen mechanism.
- We will not expose any WASM service to the public internet.

## Update cadence

When any of the four crates change:

1. CI runs `cargo fmt --check`, `cargo clippy -D warnings`,
   `cargo test --workspace --release`, and WASM builds.
2. Audit log: add a row to `reports/` mentioning the change and the
   parity test result (once parity tests exist).
