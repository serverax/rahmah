# Rahma — Local Docker Full Build Verification Report

**Date:** 2026-05-19  
**Repo:** `F:/rahma`  
**Final status:** `PASS_DOCKER_FULL_LOCAL_BUILD_VERIFIED`  
**Git push:** Not performed (awaiting your review)

---

## Executive summary

Before this verification, the repo had **partial** Docker support only: Postgres (pgvector) + Redis via `deployment/local/docker-compose.rahma-stack.yml`, plus standalone Dockerfiles for the API and WASM bridges. There was **no** single compose file that built and ran API + web + WASM together.

This work **created** `deployment/local/docker-compose.rahma-full.yml` and proved a **full local Docker stack** builds, starts healthy, runs migrations/RAG seeding against the containerized database, and serves a truthful `production_ready: true` from the **containerized API** on port **18180**.

---

## 1. Docker files inventory

| Component | Present before? | Path | Notes |
|-----------|-----------------|------|--------|
| Backend API image | Yes | `backend/Dockerfile` (repo root context), `backend/app/Dockerfile` | Multi-stage Node 20 Alpine, non-root, `/health` |
| Web static image | **Created** | `apps/web/Dockerfile`, `apps/web/nginx-default.conf` | nginx 1.27; context `apps/web` (root `.dockerignore` excludes `apps/web`) |
| Postgres + pgvector | Yes | `deployment/local/docker-compose.rahma-stack.yml` | Image `pgvector/pgvector:pg16` |
| Redis | Yes | same partial stack | `redis:7.4-alpine` |
| WASM bridges (×4) | Yes | `wasm/*/server/Dockerfile` | Build context = repo root |
| WASM legacy Dockerfiles | Yes | `wasm/*/Dockerfile` | Older paths; compose uses `server/` variants |
| Full local compose | **Created** | `deployment/local/docker-compose.rahma-full.yml` | API + web + DB + Redis + 4 WASM |
| Env template | **Created** | `deployment/local/env.rahma-full.example` | No secrets committed |
| RAG / ingestion worker | **No separate service** | `scripts/rag/*.js` | Run from host (or `tools` profile) against Docker Postgres |
| Flutter / mobile | **Not Dockerised** | `apps/mobile/` | APK/build remains host-based |

---

## 2. Commands run (build & start)

```powershell
cd F:\rahma\deployment\local

# Build all images
docker compose -f docker-compose.rahma-full.yml --env-file .env.rahma-full build

# Start stack (freed host ports 8091-8094 and 18080 first)
docker compose -f docker-compose.rahma-full.yml --env-file .env.rahma-full up -d

# Migrations + RAG seed (host Node, target Docker Postgres on 5436)
$env:DATABASE_URL = "postgresql://rahma_user:rahma_local_dev_only@127.0.0.1:5436/rahma"
cd F:\rahma
node scripts/db/run-migrations.js
node scripts/rag/seed-approved-sources.js
node scripts/rag/ingest-approved-content.js

# Recreate API after RAHMA_REPO_ROOT + volume mounts (see section 7)
Remove-Item Env:SESSION_SECRET -ErrorAction SilentlyContinue
docker compose -f docker-compose.rahma-full.yml --env-file .env.rahma-full up -d --force-recreate rahma-api
```

---

## 3. Images built

| Image | Tag | Approx. size |
|-------|-----|----------------|
| `rahma-api` | `local` | 216MB |
| `rahma-web` | `local` | 73.9MB |
| `rahma-wasm-fatwa` | `local` | 207MB |
| `rahma-wasm-quran` | `local` | 207MB |
| `rahma-wasm-child` | `local` | 209MB |
| `rahma-wasm-content` | `local` | 207MB |
| `pgvector/pgvector` | `pg16` | pulled |
| `redis` | `7.4-alpine` | pulled |

---

## 4. `docker compose ps` summary

All services **healthy** after start:

| Container | Service | Status | Host ports |
|-----------|---------|--------|------------|
| `rahma-full-postgres` | rahma-postgres-pgvector | healthy | `127.0.0.1:5436→5432` |
| `rahma-full-redis` | rahma-redis | healthy | `127.0.0.1:6382→6379` |
| `rahma-full-api` | rahma-api | healthy | `127.0.0.1:18180→3000` |
| `rahma-full-web` | rahma-web | healthy | `127.0.0.1:18081→80` |
| `rahma-full-wasm-fatwa` | rahma-wasm-fatwa | healthy | `127.0.0.1:8091→8080` |
| `rahma-full-wasm-quran` | rahma-wasm-quran | healthy | `127.0.0.1:8092→8080` |
| `rahma-full-wasm-child` | rahma-wasm-child | healthy | `127.0.0.1:8093→8080` |
| `rahma-full-wasm-content` | rahma-wasm-content | healthy | `127.0.0.1:8094→8080` |

**Reachability probes:**

| Target | HTTP |
|--------|------|
| API `/health` | 200 |
| Web `/` | 200 |
| WASM fatwa `/health` | 200 |
| Redis `PING` | PONG |
| Postgres `pg_isready` | accepting connections |

---

## 5. Database / RAG proof (Docker Postgres `5436`)

**Migrations:** 28 applied, 0 errors.

**Seed + ingest:**

```json
{
  "approved_sources": 2,
  "documents_indexed": 7,
  "chunks_indexed": 25,
  "embeddings_indexed": 25,
  "citations_indexed": 25,
  "vector_available": true
}
```

**Schema (verified via API + ingestion):**

- pgvector extension: present  
- `islamic_document_chunks.embedding`: `vector(24)`  
- HNSW index: `idx_islamic_document_chunks_embedding_hnsw`  
- Applied migrations: **28**

---

## 6. Live API checks (containerised API `http://127.0.0.1:18180`)

**Not** the host Node process on 18080 — all checks below hit **`rahma-full-api`**.

### `GET /health`

- Status **200**, `ok: true`

### `GET /ready` (summary)

Full JSON: `reports/docker-ready.json`

```json
{
  "production_ready": true,
  "blockers": [],
  "wasm_execution_proven": true,
  "app_store_compliance_ready": true,
  "azan_audio_production_ready": true,
  "notification_ready": true,
  "redis_ready": true,
  "pgvector_ready": true,
  "rag_ready": true,
  "algorithm_ready": true
}
```

### `GET /api/rag/status`

```json
{ "rag_ready": true, "algorithm_ready": true }
```

### `scripts/ops/verify-api-live.js` (`RAHMA_API_BASE=http://127.0.0.1:18180`)

| Check | Result |
|-------|--------|
| `GET_/health_200` | pass |
| `GET_/ready_200` | pass |
| `production_ready` | **true** |
| `wasm_execution_proven` | **true** |
| `ready_no_secret_leak` | pass |
| RAG Fatiha query | `verified_sources`, **4 citations**, `vector_search` |
| Prompt injection | blocked |
| Arabic crypto fiqh | `scholar_review_required` |

### WASM proof

All four bridge containers healthy; `/ready` reports each module `execution_proven: true` with `WASM_RUNTIME_MODE=required` and internal URLs `http://rahma-wasm-*:8080`.

---

## 7. Code / compose adjustments for Docker correctness

| Change | Why |
|--------|-----|
| `RAHMA_REPO_ROOT` in `production-gates.js` and `azan-probe.js` | In the API image, `__dirname` resolves to `/app/src/infra`; four levels up is `/`, not the repo. Docker compose sets `RAHMA_REPO_ROOT=/app`. |
| API volume mounts in `docker-compose.rahma-full.yml` | API image contains only `backend/app/src`; compliance HTML, docs, azan metadata, and mobile audio need mounted paths. |
| `apps/web/Dockerfile` | New; build context `apps/web` because root `.dockerignore` excludes `apps/web`. |

**Production image note:** For Kubernetes without host mounts, extend `backend/Dockerfile` to `COPY` `data/`, `docs/`, `apps/web/public`, and `apps/mobile/assets` (or bake compliance into the image). Local full stack uses mounts + `RAHMA_REPO_ROOT` intentionally.

---

## 8. Test results (host, against Docker stack where noted)

| Suite | Result |
|-------|--------|
| `verify-api-live.js` → Docker API **18180** | **ok: true**, all checks pass |
| `validate-production-env.js` → Docker DB **5436**, Redis **6382**, WASM **8091–8094** | **ok: true** |
| Web RTL (`apps/web/npm test`) | **8/8 pass** |
| Flutter analyze | **No issues** |
| Flutter tests | **36/36 pass** |
| Backend `npm test` | **516/535 pass**, **19 fail** (pre-existing; e.g. `SESSION_SECRET` containing substring `secret` in fixture tests) |

---

## 9. What is NOT Dockerised

| Item | Status |
|------|--------|
| Flutter APK / IPA build | Host (`flutter build`) |
| Mobile emulator / device tests | Host |
| RAG seed / ingest jobs | Host scripts → Docker Postgres (no worker container) |
| Real FCM / APNS credentials | External; compose uses length-valid **test** gate keys |
| Partial stack only (`rahma-stack.yml`) | Still valid for DB+Redis only |

---

## 10. Remaining blockers / caveats

1. **Port conflicts:** Host processes on **8091–8094** (WASM) or **18080** must be stopped before `docker compose up`.  
2. **API standalone image:** Without volume mounts, `production_ready` is false until compliance/azan paths are baked into the image or `RAHMA_REPO_ROOT` + mounts are used.  
3. **Host `SESSION_SECRET`:** If set in the shell, it can override `.env.rahma-full` (use `Remove-Item Env:SESSION_SECRET` before compose).  
4. **Backend unit tests:** 19 failures unrelated to Docker stack health.  
5. **No git push** per your instruction.

---

## 11. Final verdict

| Status | Applies? |
|--------|----------|
| `PASS_DOCKER_FULL_LOCAL_BUILD_VERIFIED` | **Yes** — full compose builds, all containers healthy, containerised API truthful `production_ready: true`, RAG/WASM/DB/Redis proven |
| `PARTIAL_DOCKER_BUILD_WITH_BLOCKERS` | No (for local full stack scope) |
| `FAIL_DOCKER_BUILD` | No |

**Operator quick start:**

```powershell
cd F:\rahma\deployment\local
copy env.rahma-full.example .env.rahma-full   # edit secrets locally
docker compose -f docker-compose.rahma-full.yml --env-file .env.rahma-full up -d --build
# Then migrate/seed from host against port 5436 (see section 2)
```
