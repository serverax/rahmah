# Rahma/Sakina LLD — Sprints 71–100

## 1. Purpose

This LLD translates the HLD into file-level, API-level, schema-level, and test-level implementation instructions for Sprints 71–100.

## 2. Repository Areas to Inspect

- `backend/app/src/`: Core backend logic.
- `apps/mobile/lib/`: Flutter mobile app logic.
- `wasm/`: Rust source and Node.js bridge servers.
- `deployment/k3s/`: Infrastructure manifests.
- `reports/`: Sprint and bundle reports.
- `.github/workflows/`: CI/CD pipelines.

## 3. API Design

### Health API
- `GET /health`: Returns `{ ok: true, service: "rahma-backend", environment: "..." }`.

### Readiness API
- `GET /ready`: Returns detailed status of `database`, `auth`, `wasm`, `rag`, and `donations`.
- `production_ready` field is `false` if any critical blocker exists.

### Ask Sheikh APIs
- `POST /api/sheikh/questions`: Accepts `question_text`, returns `question_id`.
- `POST /api/sheikh/questions/:id/answer`: Protected; accepts `answer_ar` and `citations`.
- `GET /api/public/sheikh-hasan/qa`: Returns approved public answers only.

### Library APIs
- `GET /api/library/categories`: List categories.
- `GET /api/library/articles`: List articles (approved-only for public).

### Game APIs
- `GET /api/game/status`: Single-call readiness for mobile game.
- `POST /api/game/progress`: Saves scenario progress (local/remote).

### WASM Rule Engine Contract
- Structure: `{ "allowed": boolean, "reason": string, "rule_id": string, "engine": "wasm|js_fallback", "artifact_verified": boolean }`.

## 4. Database / Schema Design

### Entities (Target)
- `users`: `id`, `role`, `status`.
- `sakina_user_questions`: `id`, `user_id`, `question_text`, `status`, `public_visible`.
- `sakina_sheikh_answers`: `id`, `question_id`, `answer_text`, `citation_status`.
- `sakina_public_qa`: Projected live entries.
- `wasm_audit`: Logs of WASM vs JS-fallback decisions.

## 5. WASM LLD

- **Source:** `wasm/*/src/lib.rs` (Rust).
- **Bridge:** `wasm/*/server/src/index.js` (Node/Fastify).
- **Artifact:** `*.wasm` (Target `nodejs`).
- **Fallback:** In-process JS port of the Rust logic.
- **Verification:** `Get-ChildItem wasm/*/server/*.wasm`.

## 6. RAG + Algorithm LLD

- **Registry:** `backend/app/src/rag/source-registry.js`.
- **Retrieval:** `backend/app/src/rag/retrieval.js`.
- **Recommendation:** `backend/app/src/engine/recommendation-engine.js`.
- **Safety:** No religious claim without source; no AI-generated fatwa without human sheikh approval.

## 7. Test Plan

- **Backend:** `npm test` covering routes, services, and safety gates.
- **WASM:** `npm test` in each server bridge; native Rust tests in `lib.rs`.
- **Mobile:** `flutter test` for API client, sync, and UI indicators.
- **Security:** Scans for secrets and DSN leakage in logs/ready.

## 8. File-Level Implementation Rules

1. Find target module.
2. Ensure async/await support if calling WASM bridges.
3. Use `envSnap`/`envRestore` for test isolation.
4. Maintain Arabic "safe_message_ar" for all user-facing errors.

## 9. Sprint Execution Mapping

| Sprint | LLD focus |
|---|---|
| 71 | blocker resolution (Test regressions + Flutter shell) |
| 72 | Child-Safety WASM (Rust port) |
| 73 | Child-Safety Bridge (Wiring) |
| 74 | Engine Integration (Async refactor) |
| 75 | WASM Infrastructure (Final verify) |
| 76 | Citation WASM (Rust port) |
| 77 | Citation Bridge (Wiring) |
| 78 | Citation Integration (Backend wiring) |
| 79 | Fatwa WASM (Rust port) |
| 80 | Fatwa Bridge (Wiring) |
| 81 | Fatwa Integration (Workflow refactor) |
| 82 | Rule Engine WASM (Rust port) |
| 83 | Rule Engine Bridge (Wiring) |
| 84 | Rule Engine Integration (Review gate refactor) |
| 85 | WASM Ecosystem (Infrastructure completion) |
| 86 | Mobile Storage (sqflite foundation) |
| 87 | Mobile API (Hardening + Retry) |
| 88 | Mobile Sync (SQLite + API logic) |
| 89 | Mobile UI (Offline indicators) |
| 90 | Mobile Data (Final verify) |
| 91 | Auth Hardening (Persistent sessions) |
| 92 | Device Identity (Registration) |
| 93 | Biometric Lock (Local security) |
| 94 | Privacy Mode (UI obfuscation) |
| 95 | Security & Identity (Final verify) |
| 96 | Arabic LQA (Language audit) |
| 97 | Performance Hardening (Efficiency audit) |
| 98 | Security Scan (Secret audit) |
| 99 | RC1 Report (Readiness verify) |
| 100| Project Completion (Final gate) |

## 10. LLD Acceptance Criteria

- Actual repo paths documented.
- API and retrieval contracts defined.
- WASM build/runtime fallback strategy clear.
- Sprint mapping provides clear implementation path.
- No fake production claims.
