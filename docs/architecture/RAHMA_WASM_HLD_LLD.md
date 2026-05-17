# Rahma WASM HLD/LLD

## 1. Purpose

WASM is an optional foundation used for deterministic safety and rule logic in the Rahma ecosystem. It provides high-performance, verifiable rule execution across the backend and potentially the mobile app.

WASM MUST NOT be used to fake AI responses or Islamic rulings.

## 2. High-Level Design

### Components
- **Rust Crates:** The source of truth for deterministic logic.
- **Node.js Bridges:** HTTP sidecars that load `.wasm` files and expose them to the backend API.
- **JS Fallbacks:** Integrated JS/TS implementations of the Rust logic for environments without a WASM runtime.

### Boundaries
WASM modules are "pure function" units: they take JSON input and return JSON decisions without I/O or state.

## 3. Low-Level Design

### Expected Repo Structure
```text
wasm/
  child-safety/
  quran-hadith-citation/
  fatwa-policy-gate/
  content-rule-engine/
    Cargo.toml
    src/lib.rs
    server/
      package.json
      src/index.js (Bridge)
      src/policy.js (JS Fallback)
```

### Toolchain Verification
- `rustup --version`
- `cargo --version`
- `wasm-pack --version`

### Build Command
```powershell
# Example for child-safety
cd F:/rahma/wasm/child-safety
wasm-pack build --target nodejs --out-dir server --release
```

### Runtime Decision Logic (Backend)
1. Check `process.env.WASM_*_URL`.
2. If set, call bridge `/evaluate`.
3. If bridge returns error or URL is unset, fall back to local `src/policy.js`.
4. Report `engine: "wasm" | "js_fallback"` in `/ready`.

## 4. Verification

A WASM module is "PASS" only if:
1. `Cargo.toml` and `lib.rs` exist.
2. Unit tests in `lib.rs` pass.
3. Compiled `.wasm` artifact exists in `server/`.
4. Bridge tests (`npm test`) pass while loading the WASM artifact.

If the artifact is missing, status MUST be **PARTIAL — WASM FOUNDATION ONLY**.
