# Rahma WASM Policy Workspace

Real, deterministic Rust → WASM ports of the JavaScript policy modules that
gate Sheikh Hasan answers and children's content. The intent is **identical
behaviour** in JS (today) and WASM (future), so the WASM modules can be
loaded into the backend (via `wasmtime`) or run as a sidecar policy
service without changing the on-the-wire contract.

## Crates

| Crate | JS counterpart | What it does |
|---|---|---|
| `citation-gate` | `backend/app/src/sheikh/citation-requirement.js` | Decides `citation_status` from a list of citation rows and whether public publish is allowed |
| `child-safety` | `backend/app/src/family/child-safety-policy.js` | Decides whether a child-bound content payload is safe to show |

Both crates compile to:

- A native test binary (`cargo test --workspace`).
- A `wasm32-unknown-unknown` library exporting JSON-in / JSON-out
  functions for host loaders.

## Build

```bash
# All native tests
cargo test --workspace

# WASM artifacts (from the workspace root)
cargo build --release --target wasm32-unknown-unknown -p citation-gate
cargo build --release --target wasm32-unknown-unknown -p child-safety
```

CI does both: see `.github/workflows/rahma-wasm-build.yml`.

## Determinism

These crates are pure functions: same input → same output, no IO, no time,
no randomness. The behaviour is mirrored 1:1 by the JS tests under
`backend/app/test/citation-requirement.test.js` and
`backend/app/test/family-child-safety.test.js`. When the WASM modules are
loaded into the backend, both sides assert the same outputs against the
same fixture inputs (parity test in `tests/parity.rs`).

## What this REPLACES

The placeholder `deployment/k3s/rahma/ai/30-wasm-policy-worker.yaml` (which
points at `REPLACE_ME_WASM_RUNTIME_IMAGE`) becomes the launcher for these
modules once the operator chooses a runtime image (`wasmedge` or a custom
runner). Until then:

- Source code: present and tested (this workspace).
- Compiled `.wasm` artifacts: produced by CI per push.
- Runtime image: not yet built. Sidecar is still placeholder-only.

## What this does NOT do

- It does not bypass the JS policy module. Today the backend still uses
  the JS version directly. The WASM port is the **second** implementation
  whose output must match the JS one byte-for-byte.
- It does not run inside the request path yet. Wiring lives in a later
  sprint; this turn produces the policy *source of truth*.
