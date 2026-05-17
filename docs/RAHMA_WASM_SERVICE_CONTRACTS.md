# Rahma WASM Service Contracts

## 1. Purpose

This document defines the service contracts for the optional Rahma WASM rule engine sidecars. WASM is used only for deterministic rule execution, not for AI fatwa generation.

If a compiled WASM artifact is not available, the system uses the Node.js JS/TS fallback and reports:

**WASM FOUNDATION ONLY — COMPILED WASM ARTIFACT NOT VERIFIED**

## 2. Runtime Modes

| Mode | Description | Status |
|---|---|---|
| wasm | Uses compiled `.wasm` artifact | PASS only if artifact exists and loads |
| js_fallback | Uses TypeScript/JavaScript fallback | Allowed if WASM toolchain/artifact unavailable |

The system must never claim WASM PASS unless a real `.wasm` artifact exists and tests verify it.

## 3. Required Artifacts

Expected artifact paths:
- `wasm/child-safety/server/*.wasm`
- `wasm/quran-hadith-citation/server/*.wasm`
- `wasm/fatwa-policy-gate/server/*.wasm`
- `wasm/content-rule-engine/server/*.wasm`

Current status: **PARTIAL — WASM artifact missing (Foundation only)**.

## 4. Required Toolchain

To build the artifacts, the following are required on the workstation:
- rustup (1.75+)
- rustc
- cargo
- wasm-pack
- wasm32-unknown-unknown target

Verification commands:
- `rustup --version`
- `cargo --version`
- `wasm-pack --version`

## 5. Build Contract

If Cargo.toml exists at `wasm/<module>/Cargo.toml`:

```powershell
cd F:/rahma/wasm/<module>
wasm-pack build --target nodejs --out-dir server --release
```

Verification command:
```powershell
Get-ChildItem F:/rahma/wasm/*/server -Recurse -Filter *.wasm
```

## 6. Rule Engine Response Contract

All WASM/fallback rule functions must return this JSON structure:

```json
{
  "allowed": true,
  "reason": "string",
  "rule_id": "string",
  "engine": "wasm_or_js_fallback",
  "artifact_verified": false
}
```

## 7. Individual Contracts

### `child-safety`
- **Input:** `{ "body_ar": "string", "age_band": "4-6|7-9|10-12|13+" }`
- **Output:** `{ "decision": "allow|block", "reason": "string" }`

### `quran-hadith-citation`
- **Input:** `Array<{ "citation_type": "string", "citation_label": "string" }>`
- **Output:** `{ "citation_status": "string", "can_publish_public": boolean }`

### `fatwa-policy-gate`
- **Input:** `{ "has_scholar_approval": boolean, "has_citation": boolean, "mode": "public|private" }`
- **Output:** `{ "decision": "allow|block", "reason": "string" }`

### `content-rule-engine`
- **Input:** `{ "status": "string", "has_citation": boolean, "is_published": boolean }`
- **Output:** `{ "public_visible": boolean, "private_visible": boolean }`
