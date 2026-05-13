# sakina-backend

Backend API for the Sakina Islamic app. Built with Fastify, ESM, Node 20+.

---

## Strict safety rules

- **Scope is locked to ibadat only**: طهارة، صلاة، صيام، زكاة، حج، عمرة، أذكار، قرآن، نوافل، رمضان.
- **No external LLM calls** anywhere in `src/`. No openai/anthropic/gemini/ollama, no axios, no `fetch(` — enforced by `test/no-external-llm.test.js`.
- **No unsourced religious answers** under any circumstance. The source store at `src/safety/source-store.js` is intentionally empty until Sprint 14/15 wires it to a verified RAG knowledge base. While empty, every in-scope question resolves to the blocked fallback: `لا أملك جواباً موثقاً لهذا السؤال حالياً. يرجى الرجوع إلى عالم موثوق.`
- **No fabricated Quran/Hadith/fiqh/scholar citations** — enforced by `test/strict-safety.test.js`.
- **No DSN leakage** from `/ready` even when `DATABASE_URL` is set — enforced by `test/strict-safety.test.js`.
- **No real secret strings** committed in `backend/app`, `deployment/`, or `.github/` — enforced by `test/strict-safety.test.js` (real-key patterns: AWS access key, GitHub PAT, Slack token, PEM blocks).

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET  | `/health` | Liveness. Static `{ ok:true, service:"sakina-backend", status:"healthy" }`. |
| GET  | `/ready`  | Readiness + safety flags. Real DB probe (Sprint 4) — bounded by a tight internal timeout. Reports `database.{configured,connected,checked,error_type}` (error_type is a coarse bucket — never the raw pg error message). Always exposes `ibadat.source_required=true` and `ibadat.answer_without_source_blocked=true`. Never leaks `DATABASE_URL`. |
| POST | `/api/ibadat/ask` | Schema-validated. Rejects out-of-scope questions politely. For in-scope questions, returns the blocked fallback while the source store is empty. **No answer generation.** |

`/health` meaning: process is alive.
`/ready` meaning: process is alive, ibadat safety flags are wired, and (eventually) the database is reachable.

## Local commands (Node)

```
npm ci                 # reproducible install (CI path)
npm install            # developer install (regenerates lock if needed)
npm run lint           # eslint
npm run build          # node --check (pure ESM — no transpile)
npm test               # node:test (16 cases as of Sprint 3)
npm start              # node src/index.js
npm run dev            # node --watch src/index.js
```

## Local Docker

```
bash backend/app/scripts/docker-build-local.sh   # builds ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local
bash backend/app/scripts/docker-smoke-local.sh   # starts container, probes /health and /ready over real HTTP, removes container
```

Windows-native PowerShell variants live alongside (`.ps1`).

**The local smoke test is NOT a cluster deployment.** It runs the image on the host Docker engine, hits `127.0.0.1:3331` (configurable via `SAKINA_SMOKE_PORT`), and tears the container down. No registry push.

Optional DB mode for the Docker smoke script:

```
DATABASE_URL='postgres://...' bash backend/app/scripts/docker-smoke-local.sh
```

The script forwards `DATABASE_URL` to the container, never echoes the value, and asserts that the `/ready` response contains no `postgres(ql)://` substring.

## DB readiness states (`/ready.database`)

| State | When | `configured` | `connected` | `checked` | `error_type` |
|---|---|---|---|---|---|
| Not configured | `DATABASE_URL` unset | `false` | `false` | `false` | `null` |
| Configured but unreachable | DSN set, host refused / DNS / timeout / auth fail | `true` | `false` | `true` | coarse bucket (`connection_refused`, `dns_unresolved`, `connection_timeout`, `auth_failed`, `unknown_database`, `probe_timeout`, `unknown_error`) |
| Connected | DSN set, `SELECT 1` returned 1 | `true` | `true` | `true` | `null` |

`error_type` is **never** the raw pg error message and **never** the DSN. Connection-pool background errors are silently swallowed so they cannot crash the process.

## Local DB readiness smoke (host, no Docker)

```
DATABASE_URL='postgres://...' bash backend/app/scripts/db-ready-smoke-local.sh
```

Starts the app on the host on `SAKINA_LOCAL_PORT` (default `3332`), forwards `DATABASE_URL` (never echoed), prints **only** the four `database.*` booleans/strings, asserts no DSN appears in the `/ready` body, and kills the server on exit.

## No-secret-logging rule

The backend never logs `DATABASE_URL`, `POSTGRES_PASSWORD`, `JWT_SECRET`, or any secret-shaped string. The `redactDatabaseUrlForDiagnostics()` helper exists for human-debug callers and intentionally emits only `[unconfigured]` / `[configured: postgres scheme]` / `[configured: non-postgres scheme]`.

## GHCR image CI

`.github/workflows/backend-image-ci.yml` builds the backend image with Buildx on every PR (no push) and on every push to `main` (publishes `:sha-<commit>` and `:main`). Uses `secrets.GITHUB_TOKEN` only — no personal access tokens. OCI labels: `org.opencontainers.image.{title,source,revision}`.

The K3s manifest `deployment/k3s/backend/sakina-backend-deployment.yaml` references `ghcr.io/serverax/rahmah/sakina-backend:main`. **Do not apply that manifest until** (a) the workflow has actually published the tag, AND (b) the kubectl context is a safe Sakina K3s context (never `aks-iterlaw-we-prod` or any cluster matching `aks`/`prod`/`iterlaw` — the deploy script enforces this).

## Verified source registry (Sprint 5)

The route `POST /api/ibadat/ask` is gated by a citation validator that requires every cited source to:

- have a non-empty `id`,
- have a non-empty `citation_label`,
- have a non-empty `chunk_text`, and
- be `approved` (pending / rejected are never acceptable).

Even when valid approved sources are present, **Sprint 5 deliberately does not generate answer text**. The response stays the blocked fallback with `reason: 'answer_generation_not_enabled'`. The wiring is in place so a future sprint can flip the switch atomically.

DB tables backing the registry (created by `backend/db/migrations/002_verified_islamic_sources.sql`):

| Table | Purpose |
|---|---|
| `sakina_verified_sources` | Catalog of source bodies (Quran, Hadith collections, fiqh refs, scholar refs, dua collections). License + verification status tracked. |
| `sakina_source_documents` | Documents within a source. Content hash (sha256) stored, not raw text. |
| `sakina_source_chunks` | Retrievable chunks. **Only `verification_status='approved'` is eligible for retrieval** — enforced by CHECK + a partial index `WHERE verification_status='approved'`. Every chunk must have a non-empty `citation_label`. |
| `sakina_answer_audit` | One row per `/api/ibadat/ask` call. Stores `question_hash` (sha256 of the trimmed question) — **never the raw question, never any user identity**. |

The application **never inserts copyrighted religious content** through this migration. Population is the scope of a later licensing-reviewed sprint.

## Audit hook

`src/audit/answer-audit.js` exposes `recordAnswerAudit({ pool, question, scope, blocked, blockReason, sourceCount })`. Behavior:

- If `pool` is missing → safe no-op (returns `{ recorded:false, reason:'no_pool' }`).
- If `question` is empty after trim → no-op.
- Otherwise inserts via parameterized SQL: `INSERT INTO sakina_answer_audit (question_hash, scope, blocked, block_reason, source_count) VALUES ($1, $2, $3, $4, $5)`.
- `question_hash` is computed locally via Node `crypto.createHash('sha256')`. **The raw question never appears in SQL or in bound parameters.**
- Errors are swallowed silently. Audit must never affect the user-facing response.

## No-copyright / no-scraping rule

The backend request path does NOT scrape external sites, does NOT call external HTTP, and does NOT call any LLM. Every source must be loaded into the DB through a deliberate (out-of-route) ingestion process that documents license + verification status. The repository query path filters to `approved`-only at SQL level; defense-in-depth filtering happens again in the source-store wrapper and a third time in the citation validator.

## Status

Scaffold + local container runtime + DB readiness + verified-source registry foundation. **Not deployed.** **Answer generation NOT enabled** — every in-scope question still resolves to the blocked fallback because the source store is empty and, even when sources are present, the route currently returns `reason: 'answer_generation_not_enabled'`.
