# Rahma — WASM Architecture

**Date:** 2026-05-14
**Status:** FOUNDATION — source written, real runtime image pending operator choice

## Why WASM

Three properties the Rust → WASM stack gives us:

1. **Determinism.** Same JSON input → same JSON output, byte-for-byte, on every
   node and every architecture. Critical for policy decisions that the
   backend will re-verify against the JS implementation.
2. **Memory safety.** Rust + `wasm32-unknown-unknown` cannot panic into the
   host. Bad inputs return the fail-closed default (`block` /
   `insufficient_citation`).
3. **Sandboxable runtime.** A future runtime image (`wasmedge`, `wasmtime`,
   or a custom Rust runner) can load multiple modules with strict resource
   limits and no syscalls — appropriate for code that gates Sheikh Hasan
   answers.

## Crate inventory

| Crate | Status | JS mirror |
|---|---|---|
| `wasm/quran-hadith-citation` | tested, parity with JS | `backend/app/src/sheikh/citation-requirement.js` |
| `wasm/child-safety` | tested, parity with JS | `backend/app/src/family/child-safety-policy.js` |
| `wasm/fatwa-policy-gate` | tested, foundation logic only | (no JS mirror yet) |
| `wasm/content-rule-engine` | tested, foundation logic only | (no JS mirror yet) |

## How the host calls a WASM module

```
host (Rust runner or backend via wasmtime):
  1. Load <module>.wasm
  2. Allocate: u8* = alloc(input_len)
  3. memcpy(u8*, input_json, input_len)
  4. result_u64 = evaluate_json(u8*, input_len)
  5. out_ptr = (result_u64 >> 32) as usize
     out_len = (result_u64 & 0xffff_ffff) as usize
  6. Read out_ptr..out_ptr+out_len as the JSON-encoded Decision
  7. dealloc(out_ptr, out_len)
  8. dealloc(u8*,    input_len)
```

All four crates expose the same `(alloc, dealloc, evaluate_json)` ABI.

## Build + test

```bash
# From wasm/ workspace root
cargo test --workspace --release       # native parity tests
# Per-crate WASM build
cargo build --release --target wasm32-unknown-unknown -p quran-hadith-citation
cargo build --release --target wasm32-unknown-unknown -p child-safety
cargo build --release --target wasm32-unknown-unknown -p fatwa-policy-gate
cargo build --release --target wasm32-unknown-unknown -p content-rule-engine
```

CI runs both: `.github/workflows/rahma-wasm-build.yml`.

## Deployment

K3s manifests for the four placeholder Deployments + Services live at
`deployment/k3s/wasm/rahma-wasm-placeholders.yaml`. They use an nginx
placeholder container today; the real image must be supplied by the
operator's chosen WASM runtime once a runtime is picked.

## Honest claims

- WASM source code: present and tested via `cargo test --workspace`.
- Compiled `.wasm` artifacts: produced by CI per push to `wasm/**`.
- Runtime image: NOT BUILT.
- Inside the request path: NOT WIRED. JS implementations are the
  source of truth today; the WASM modules are the second
  implementation whose output must match byte-for-byte.

## What we will NEVER do

- Generate religious content from a WASM module. Rahma does not do that.
- Use a WASM module to bypass the JS citation requirement. They run in
  parallel and both must agree.
- Expose any of these modules to the public internet. They are
  internal-only and live in `rahma-ai`.
