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
| GET  | `/ready`  | Readiness + safety flags. Reports `database.configured` and `database.connected` (the latter is `false` in this scaffold; real probe arrives in Sprint 4). Always exposes `ibadat.source_required=true` and `ibadat.answer_without_source_blocked=true`. Never leaks `DATABASE_URL`. |
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

Optional DB mode for the smoke script:

```
DATABASE_URL='postgres://...' bash backend/app/scripts/docker-smoke-local.sh
```

The script forwards `DATABASE_URL` to the container, never echoes the value, and asserts that the `/ready` response contains no `postgres(ql)://` substring.

## GHCR image CI

`.github/workflows/backend-image-ci.yml` builds the backend image with Buildx on every PR (no push) and on every push to `main` (publishes `:sha-<commit>` and `:main`). Uses `secrets.GITHUB_TOKEN` only — no personal access tokens. OCI labels: `org.opencontainers.image.{title,source,revision}`.

The K3s manifest `deployment/k3s/backend/sakina-backend-deployment.yaml` references `ghcr.io/serverax/rahmah/sakina-backend:main`. **Do not apply that manifest until** (a) the workflow has actually published the tag, AND (b) the kubectl context is a safe Sakina K3s context (never `aks-iterlaw-we-prod` or any cluster matching `aks`/`prod`/`iterlaw` — the deploy script enforces this).

## Status

Scaffold + local container runtime verified. Not deployed. Real DB connectivity not implemented (Sprint 4). Real source registry not implemented (Sprint 5). RAG knowledge base not built (Sprint 14/15).
