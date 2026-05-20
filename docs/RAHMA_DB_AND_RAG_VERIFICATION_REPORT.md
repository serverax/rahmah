# Rahma DB And RAG Verification Report

## Scope

- Directory: `F:\rahma`
- Repo: `serverax/rahmah`
- Branch: `main`
- Rahma only: yes
- Other projects touched: no evidence of edits outside Rahma in this pass

## Git Status

- `git status -sb`: `## main...origin/main [ahead 1]`
- `git diff --stat`: active changes remain in backend, mobile, migration, docs, scripts, and k3s files

### Files changed in this pass

Backend wiring and verification:
- `backend/app/src/app.js`
- `backend/app/test/sprint-34-source-registry.test.js`
- `backend/app/test/sprint-36-rag-citation-gate.test.js`

Existing verification work already present in the tree:
- `scripts/db/run-migrations.js`
- `scripts/db/verify-rahma-schema.js`
- `backend/db/migrations/018_rahma_full_schema.sql`
- `backend/db/migrations/019_rahma_governance_compliance_chat.sql`
- `backend/db/migrations/020_rahma_source_governance_chat_links.sql`

## Commands Run

### Backend

- `npm test` in `F:\rahma\backend\app`
  - Result: `PASS`
  - Test count: `499`
  - Failures: `0`
- `npm run lint` in `F:\rahma\backend\app`
  - Result: `PASS_WITH_WARNINGS`
  - Errors: `0`
  - Warnings: `26`

### Database

- `npm run db:verify` against local test DB `rahma_schema_verification9`
  - Result: `PASS`
- `node scripts/content/import-tanzil-quran.js`
  - Result: `PASS`
  - Output:
    - `surah_count: 114`
    - `ayah_count: 6236`
    - `content_version: tanzil-uthmani-v1.1-full-2021-02`

### Live endpoint checks

- `GET /ready`
- `GET /api/rag/status`
- `POST /api/rag/query`

## DB Status

Verified live on the local PostgreSQL test database.

`npm run db:verify` output:

```json
{
  "db_status": "DB_VERIFIED_LIVE",
  "tables_checked": 98,
  "missing_tables": [],
  "missing_indexes": [],
  "missing_constraints": [],
  "rag_ready": true,
  "content_governance_ready": true,
  "app_ready": true,
  "blockers": [],
  "migration_files_checked": 20,
  "migration_hash_mismatches": [],
  "migration_files_missing_from_db": [],
  "optional_extensions": [
    { "name": "pgcrypto", "present": true },
    { "name": "vector", "present": false, "optional": true }
  ]
}
```

### DB conclusion

- Migrations executed successfully on a real test DB: yes
- Schema verified live: yes
- Required tables/indexes/constraints missing: no
- Approved-source content present in the RAG registry: no

## Backend Status

The live backend is wired to the DB-backed RAG startup path through:

- `backend/app/src/app.js`
- `backend/app/src/rag/source-registry.js`
- `backend/app/src/rag/retrieval.js`
- `backend/app/src/routes/rag.js`

Live `/ready` output:

```json
{
  "database_configured": true,
  "database_connected": true,
  "rag_configured": true,
  "llm_configured": false,
  "wasm_runtime_configured": false,
  "content_governance_enabled": true,
  "production_ready": false,
  "blockers": [
    "auth_not_configured",
    "redis_not_configured",
    "wasm_not_configured",
    "llm_not_configured",
    "no_approved_islamic_sources",
    "donations_provider_not_configured"
  ]
}
```

Backend readiness is truthful. It does **not** claim production readiness.

## RAG Status

Live `/api/rag/status` output after DB wiring:

```json
{
  "ok": true,
  "rag_enabled": true,
  "mode": "database",
  "database_configured": true,
  "vector_configured": false,
  "documents_indexed": 0,
  "chunks_indexed": 0,
  "approved_sources": 0,
  "pending_review_sources": 0,
  "unverified_sources": 0,
  "blocked_sources": 0,
  "complete_database": false,
  "safe_to_answer_from_rag": false,
  "ingestion_supported": true,
  "seed_policy_exists": true
}
```

Live `/api/rag/query` output for a real Islamic question:

```json
{
  "ok": true,
  "answer_ar": null,
  "citations": [],
  "safety_status": "insufficient_sources",
  "insufficient_sources_message_ar": "لا توجد مصادر معتمدة كافية للإجابة على هذا السؤال بعد. لا يجوز الجواب بدون مصدر.",
  "used_candidates": 0
}
```

### RAG conclusion

- Database-backed RAG route wiring exists: yes
- Approved Islamic sources available for retrieval: no
- Cited answer path verified: no
- Safe refusal path verified: yes
- End-to-end RAG answer path with approved content: not verified

## LLM Status

- `llm_configured`: false in `/ready`
- `llm_reachable`: not verified
- `llm_model`: `ollama` placeholder config present, but no configured runtime
- `external_llm_enabled`: false by default

### LLM conclusion

Local LLM fallback is not configured or proven in this pass.

## WASM Status

- Runtime contract present in the repo: yes
- Compiled WASM modules executed: no
- `policy gate`: contract only
- `citation verifier`: contract only
- `child safety`: contract only
- `prayer rules`: contract only

### WASM conclusion

WASM is not verified as a runtime dependency in this pass.

## Mobile Status

- Flutter analyze: not re-run in this pass
- Flutter test: not re-run in this pass
- Backend connectivity from Flutter: not re-verified in this pass

## App-Store / Compliance Status

- Privacy policy / child safety / moderation / source governance docs exist in the tree
- No fake scholar approval was introduced in this pass
- No unlicensed Azan audio was claimed in this pass
- Compliance is not fully verified end-to-end here

## Evidence Summary

- Backend test suite is green: `499/499`
- Backend lint is clean of errors but still has `26` warnings
- DB migrations ran successfully against a real test PostgreSQL database
- DB schema verification returned `DB_VERIFIED_LIVE`
- Live backend `/ready` is truthful and still reports blockers
- Live `/api/rag/status` shows `approved_sources: 0`
- Live `/api/rag/query` refuses safely with `insufficient_sources`

## Remaining Blockers

1. Approved Islamic source rows are still absent from the live RAG registry.
2. Because `approved_sources = 0`, Rahma cannot produce a verified cited answer from live stored content.
3. `llm_configured = false`, so local LLM fallback is not proven.
4. `wasm_runtime_configured = false`, so WASM is contract-only.
5. Mobile Flutter analyze/test were not re-run in this pass.

## Final Verdict

`FAILED_WITH_BLOCKERS`

The database schema is now verified live, but Rahma still does not have approved source rows in the active RAG registry, so the Islamic answer pipeline cannot be considered fully working.
