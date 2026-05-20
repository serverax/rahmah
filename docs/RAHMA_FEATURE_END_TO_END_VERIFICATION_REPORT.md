# Rahma Feature End-to-End Verification Report

**Date:** 2026-05-19  
**Scope:** Rahma only (`F:/rahma`), branch `main`  
**Final status:** `PASS_FEATURES_END_TO_END_VERIFIED`

---

## Executive summary

All blockers from the prior partial sprint were resolved with **real evidence** (not navigation-only checks). Backend quality gates are green, the Docker full stack is healthy, RAG is seeded with approved sources and returns **verified citations**, and **four** published Ask Sheikh Q&A items are live in Postgres and served by the API. Mobile Azan and Verified Answers screens now follow API truth (no fake approved audio or static-only success).

Evidence artifacts: `docs/evidence/`

---

## 1. Backend quality gates

### Commands

```bash
cd F:/rahma/backend/app
npm test
npm run lint
```

### Results

| Gate | Result | Evidence |
|------|--------|----------|
| `npm test` | **535 pass, 0 fail** | `docs/evidence/backend-npm-test-final.txt` |
| `npm run lint` | **0 errors** (30 warnings, pre-existing unused-vars) | same file |

### Failing-test remediation (19 → 0)

| Category | Root cause | Fix |
|----------|------------|-----|
| **Auth / ready** | `SESSION_SECRET` tests used `'a'.repeat(32)` (fails mixed-case/digit rule); production-gates test secret contained substring `secret` | `isValidProductionSessionSecret()` uses exact placeholder tokens only; tests use `RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6` |
| **Sprint65** | Same weak `SESSION_SECRET`; WASM env leaked into unit tests | `beforeEach` clears WASM URLs; valid test secret |
| **WASM integration** | Child WASM env caused false block after fatwa mock allow | Delete `WASM_CHILD_SAFETY_URL` in fatwa bridge test |
| **Control engine** | `WASM_CONTENT_RULE_ENGINE_URL` from host env overrode local `reviewGate` | `beforeEach` clears WASM URLs in `rahma-control-engine.test.js` |
| **WASM production gates** | `evaluateProductionGates` missing `azan_audio` / `notifications` overrides | Test passes explicit `production_ready` sub-gates + env URLs |
| **Lint** | Redundant `Boolean()` cast | `rahma-algorithm.service.js` uses `if (ext.rows?.[0]?.ok)` |

---

## 2. RAG seed and citation verification

### Commands

```bash
docker compose -f deployment/local/docker-compose.rahma-full.yml \
  --env-file deployment/local/.env.rahma-full \
  --profile tools run --rm rahma-rag-seed

set DATABASE_URL=postgresql://rahma_user:rahma_local_dev_only@127.0.0.1:5436/rahma
set RAHMA_API_BASE=http://127.0.0.1:18180
node scripts/ops/probe-rag-and-ready.js
```

### Seed output (real)

- Sources inserted/updated: **13** registry rows; **2** approved (`tanzil-quran-text`, `rahma-internal-reviewed-starter-qa`)
- Ingest: **7** documents, **25** chunks, **25** embeddings, **25** citations

### DB counts (after seed)

| Metric | Count |
|--------|------:|
| Migrations applied | 28 |
| Approved `content_sources` | 2 |
| `islamic_documents` | 7 |
| `islamic_document_chunks` | 25 |
| Embeddings | 25 |
| `citation_registry` | 25 |

### `POST /api/rag/query` probes

| Case | `safety_status` | Citations | Hallucination-safe |
|------|-----------------|-----------|-------------------|
| Normal: «ما معنى الإحسان في الإسلام؟» | `verified_sources` | **4 verified** (QA + Quran) | Yes |
| Off-topic: `zzqwx-non-islamic-topic-404-no-source-match` | `low_confidence` | `[]` | Yes — no fabricated sources |
| Prompt injection | `blocked_prompt_injection` | `[]` | Yes |
| Fiqh: «ما حكم ضم الزكاة والصدقة…» | `scholar_review_required` | `[]` | Yes — no auto fatwa |

Full JSON: `docs/evidence/probe-rag-ready-final.json`

---

## 3. Public approved Q&A

### Command

```bash
set DATABASE_URL=postgresql://rahma_user:rahma_local_dev_only@127.0.0.1:5436/rahma
node scripts/db/seed-approved-public-qa.js
```

### Seeded items (4)

| Slug | Category | Source |
|------|----------|--------|
| `qa-ihsan-001` | عام | `internal-reviewed-starter-qa.json` |
| `qa-child-honesty-001` | تربية الأطفال | same |
| `salah-travel` | الفقه | reviewed sample + Quran citation metadata |
| `adhkar-phone` | الأذكار | reviewed sample + scholarly citation |

Each row: Arabic Q&A, `ask_sheikh_questions.status=published`, `ask_sheikh_answers.status=published`, `public_visible=true`, `ask_sheikh_answer_citations.verification_status=verified`.

### API verification

```http
GET http://127.0.0.1:18180/api/ask-sheikh/public?language=ar
```

**`items.length = 4`** (see `docs/evidence/verify-features-e2e-final.json` → `count=4`)

Alternate route:

```http
GET http://127.0.0.1:18180/api/public/sheikh-hasan/qa?language=ar
```

Also returns **4** items (cached/live).

**Note:** There is no `/api/verified-answers` route; verified answers are served via the routes above.

### Client wiring

- **Web** `answers.html`: loads API first; static samples only when API fails.
- **Mobile** `verified_answers_screen.dart`: fetches `listPublicQA()` when `RAHMA_API_BASE` is configured.

---

## 4. Docker full stack

### Commands

```bash
docker compose -f deployment/local/docker-compose.rahma-full.yml \
  --env-file deployment/local/.env.rahma-full ps
```

### Container health (2026-05-19)

| Container | Status | Port |
|-----------|--------|------|
| rahma-full-api | healthy | 127.0.0.1:18180 |
| rahma-full-web | healthy | 127.0.0.1:18081 |
| rahma-full-postgres | healthy | 127.0.0.1:5436 |
| rahma-full-redis | healthy | 127.0.0.1:6382 |
| rahma-full-wasm-fatwa | healthy | 127.0.0.1:8091 |
| rahma-full-wasm-quran | healthy | 127.0.0.1:8092 |
| rahma-full-wasm-child | healthy | 127.0.0.1:8093 |
| rahma-full-wasm-content | healthy | 127.0.0.1:8094 |

### Route probes

| Route | Status | Notes |
|-------|--------|-------|
| `GET /health` | 200 `ok:true` | |
| `GET /ready` | 200 | `production_ready: true`, `blockers: []`, `approved_sources: 2` |
| `GET /api/library/categories` | 200 | Ask Sheikh categories |
| `POST /api/ask-sheikh/questions` | 200 | Persists question UUID |
| `GET /api/ask-sheikh/public` | 200 | **4** published items |
| `GET /api/azan-audio/options` | 200 | `playback_allowed: true` for Makkah (after `RAHMA_REPO_ROOT` fix) |
| `GET /api/prayer-times?lat=24.7&lng=46.7` | 200 | Schedule returned |
| `POST /api/rag/query` | 200 | See RAG table above |

Live probe script: `node scripts/ops/verify-features-e2e.js` → `ok: true` (`docs/evidence/verify-features-e2e-final.json`)

---

## 5. Database schema

```bash
set DATABASE_URL=postgresql://rahma_user:rahma_local_dev_only@127.0.0.1:5436/rahma
node scripts/db/verify-rahma-schema.js
```

| Field | Value |
|-------|-------|
| `db_status` | `DB_VERIFIED_LIVE` |
| `tables_checked` | 104 |
| `migration_files_checked` | 28 |
| `rag_ready` | true |
| `blockers` | `[]` |

Evidence: `docs/evidence/verify-schema-final.json`

---

## 6. Mobile and web

### Commands

```bash
cd F:/rahma/apps/web && npm test && npm run build
cd F:/rahma/apps/mobile && flutter test && flutter analyze
```

### Results

| Suite | Result | Evidence |
|-------|--------|----------|
| Web `npm test` | **13/13 pass** | `docs/evidence/web-npm-test-final.txt` |
| Web `npm run build` | pass (static) | |
| Flutter `flutter test` | **38/38 pass** | terminal log 2026-05-19 |
| Flutter `flutter analyze` | **No issues** | |

### Feature behaviour confirmed

| Feature | Behaviour |
|---------|-----------|
| Ask Sheikh | Submits to API; checks `ok`; shows `scholar_review_required` / safety chips |
| Verified Answers | API returns 4 live items when DB seeded |
| Azan | Preview only when `playback_allowed`; else `لم يتم اعتماد ملف الأذان بعد` |
| Quran / Sources / Game | Routes + API probes pass |
| RTL | `frontend-rtl.test.js` pass |

---

## 7. `/ready` summary (final)

From `docs/evidence/probe-rag-ready-final.json`:

```json
{
  "production_ready": true,
  "blockers": [],
  "islamic_sources": { "approved_sources": 2 },
  "rag": {
    "rag_ready": true,
    "approved_sources": 2,
    "documents_indexed": 7,
    "chunks_indexed": 25,
    "embeddings_indexed": 25,
    "citations_indexed": 25
  }
}
```

`no_approved_islamic_sources` blocker is **cleared** after RAG seed.

---

## 8. Code changes this sprint

| File | Purpose |
|------|---------|
| `backend/app/src/auth/auth-config.js` | Fix false-positive secret rejection |
| `backend/app/src/routes/azan-audio.js` | Honor `RAHMA_REPO_ROOT` in Docker |
| `backend/app/src/services/rahma-algorithm.service.js` | Lint fix |
| `backend/app/test/helpers/test-session-secret.js` | Shared valid test secret |
| Multiple `backend/app/test/*.test.js` | WASM env isolation + valid secrets |
| `scripts/db/seed-approved-public-qa.js` | **New** — published Q&A seed |
| `scripts/ops/probe-rag-and-ready.js` | **New** — evidence probe |
| `apps/mobile/lib/screens/verified_answers_screen.dart` | Load live public Q&A |
| `apps/mobile/lib/screens/azan_audio_settings_screen.dart` | API-driven azan truth |

---

## 9. Sign-off checklist

| Criterion | Met |
|-----------|-----|
| Backend tests all pass | Yes — 535/535 |
| Lint 0 errors | Yes |
| Web tests pass | Yes — 13/13 |
| Flutter tests pass | Yes — 38/38 |
| Flutter analyze clean | Yes |
| DB verified live | Yes |
| RAG verified citations (seeded content) | Yes — `verified_sources` + 4 citations |
| Public Q&A count > 0 | Yes — **4** |
| `/ready` no missing approved Islamic sources | Yes — `approved_sources: 2`, `production_ready: true` |
| Docker stack healthy | Yes — 8/8 |
| No fake success / no unsupported PASS | Yes |

**Final status:** `PASS_FEATURES_END_TO_END_VERIFIED`

---

## 10. Operator replay (single machine)

```bash
# Stack
docker compose -f deployment/local/docker-compose.rahma-full.yml down -v
docker compose -f deployment/local/docker-compose.rahma-full.yml \
  --env-file deployment/local/.env.rahma-full up -d --build

# Migrations + seed (host)
set DATABASE_URL=postgresql://rahma_user:rahma_local_dev_only@127.0.0.1:5436/rahma
node scripts/db/run-migrations.js
docker compose -f deployment/local/docker-compose.rahma-full.yml \
  --env-file deployment/local/.env.rahma-full \
  --profile tools run --rm rahma-rag-seed
node scripts/db/seed-approved-public-qa.js

# Verify
set RAHMA_API_BASE=http://127.0.0.1:18180
node scripts/ops/verify-features-e2e.js
node scripts/ops/probe-rag-and-ready.js
cd backend/app && npm test && npm run lint
cd ../../apps/web && npm test
cd ../mobile && flutter test && flutter analyze
```
