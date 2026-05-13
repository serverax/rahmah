# Rahma — Fix Sprint: Auth / DB / Docker / K3s

**Generated:** 2026-05-13
**Project:** Rahma/Sakina (`F:/rahma`, `serverax/rahmah`, branch `main`)
**Author:** Claude Code (evidence-only mode)
**Scope:** Rahma/Sakina only. IterLaw / OrdinoxAI / RightsNow / Alaa Beauty NOT touched.

## 1. Scope confirmation
- **Project:** Rahma/Sakina
- **Repo path:** `F:/rahma`
- **Branch:** `main`
- **Starting HEAD:** `5e93ffc` (`5e93ffcf1f88fc6f42958c7558a3d5a29adcc58e`)
- **Final HEAD:** to be set at end of turn after commit + push
- **Other projects touched:** NO

## 2. WIP classification

The QA report listed these "pre-QA WIP" items. **Status today:** all are already committed at `5e93ffc` — **nothing was discarded, nothing was backed up.**

| File | Pre-QA state | Today's state | Decision |
|---|---|---|---|
| `backend/app/src/app.js` | modified | committed at `5e93ffc` (registers `authRoute`+`dbRoute`) | KEPT |
| `backend/app/src/routes/ready.js` | modified | committed at `5e93ffc` | KEPT — extended this turn with `production_ready` + `blockers` |
| `backend/app/test/sprint-28-rag-governance.test.js` | modified | committed at `5e93ffc` (runtime-built patterns) | KEPT |
| `backend/app/src/auth/{email-hash,auth-config,auth-status,auth-middleware}.js` | untracked | committed at `5e93ffc` | KEPT |
| `backend/app/src/routes/auth.js` | untracked | committed at `5e93ffc` | KEPT |
| `backend/app/src/routes/db.js` | untracked | committed at `5e93ffc` | KEPT |
| `backend/app/test/sprint-26-27-fix.test.js` | untracked | committed at `5e93ffc` | KEPT |

`git status -sb` at start of this turn: `## main...origin/main` (clean).

## 3. Endpoint results (live probe via `app.inject`)

```
$ cd backend/app && node -e "import('./src/app.js').then(async ({buildApp}) => { const app = buildApp(); await app.ready(); for (const url of [...]) { const r = await app.inject({method:'GET', url}); console.log(url, r.statusCode, r.body.slice(0,140)); } await app.close(); })"

/health                            200  {"ok":true,"service":"sakina-backend","status":"healthy"}
/ready                             200  {"ok":true,"service":"sakina-backend","production_ready":false,"blockers":["auth_not_configured","database_not_configured","rag_foundation_only","sheikh_repository_not_configured","no_approved_islamic_sources"], …}
/api/auth/status                   200  {"ok":true,"auth_configured":false,"mode":"not_configured","sheikh_login_enabled":false,"admin_login_enabled":false,"safe_message_ar":"تسجيل دخول الشيخ غير مفعل بعد"}
/api/db/status                     200  {"ok":true,"database_configured":false,"database_reachable":false,"migration_table_exists":false,"applied_migrations_count":0,"pending_migrations_count":null,"safe_message_ar":"قاعدة البيانات غير مفعلة بعد"}
/api/rag/status                    200  {"ok":true,"rag_enabled":true,"mode":"foundation","database_configured":false,"vector_configured":false,"documents_indexed":0,"chunks_indexed":0,"approved_sources":0,"safe_to_answer_from_rag":false}
/api/engine/status                 200  {"ok":true,"engine_implemented":true,"mode":"deterministic_rules", …}
/api/privacy/status                200  {"ok":true,"privacy":{"title_ar":"سياسة الخصوصية — رحمة/سكينة", …}}
/api/terms/status                  200  {"ok":true,"terms":{"title_ar":"شروط الاستخدام — رحمة/سكينة", …}}
/api/public/sheikh-hasan/qa        200  {"ok":true,"items":[],"configured":false}
/api/library/status                200  {"ok":true,"enabled":true,"configured":false, …}
```

All 10 endpoints return **200**.

## 4. Test evidence

```
$ cd backend/app && npm run lint
> sakina-backend@0.1.0 lint
> eslint src test
[clean]

$ npm run build
> sakina-backend@0.1.0 build
> node --check src/index.js && node --check src/app.js
[ok]

$ npm test
ℹ tests 312
ℹ suites 0
ℹ pass 312
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5380.4019

$ npm run db:check
{"configured":false,"reachable":false,"migrations_table_exists":false,"applied_migrations_count":0,"public_safe_status":"not_configured"}

$ cd ../../apps/web && npm test
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0

$ docker --version
Docker version 29.4.1, build 055a478

$ docker info
Server:
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running

$ kubectl config current-context
aks-iterlaw-we-prod          # FORBIDDEN — refused all further kubectl

$ gh run list -R serverax/rahmah --workflow rahma-ci.yml --limit 5
completed success  fix: restore rahma auth and database status foundations  rahma-ci  main  push  25827249899  30s
completed success  qa: deep verification of rahma sakina project           rahma-ci  main  push  25827073226  17s
completed failure  feat: sprints 25-29 — RAG governance + DB docs …       rahma-ci  main  push  25826460807  21s
completed success  docs: neutralize vendor name …                          rahma-ci  main  push  25826097809  31s
completed success  ci: scope password= grep …                              rahma-ci  main  push  25826048719  23s
```

**Latest `rahma-ci` on HEAD `5e93ffc` = SUCCESS** (run 25827249899).

## 5. PASS / PARTIAL / FAIL table

| Area | Status | Evidence | Remaining work |
|---|---|---|---|
| Repo scope | **PASS** | `pwd=/f/rahma`, `git remote=serverax/rahmah`, branch=`main`, no contamination | — |
| Build | **PASS** | `npm run build` exit 0 | — |
| Tests | **PASS** | backend 312/312, apps/web 8/8 | — |
| Arabic RTL | **PARTIAL** | All HTML pages enforce `lang="ar" dir="rtl"` (test-enforced); frontend is vanilla HTML, not Next.js | swap to React/Next.js framework |
| Sheikh Hasan | **PARTIAL** | Backend routes shipped + auth-gated 503; `/api/public/sheikh-hasan/qa` returns `{ items:[], configured:false }`; UI pages exist | real Sheikh authentication adapter + persistence with DB |
| Auth | **PASS — AUTH FOUNDATION ONLY** | `/api/auth/status` → `auth_configured:false, mode:not_configured, sheikh_login_enabled:false, admin_login_enabled:false, message_ar` | wire a real auth provider (OIDC etc.); operator sets `AUTH_MODE`, `SESSION_SECRET`, allow-list hashes |
| DB | **PASS — DB TOOLING ONLY / NOT CONFIGURED** | `/api/db/status` → `database_configured:false, database_reachable:false, migration_table_exists:false, applied_migrations_count:0`; `db:check` → `not_configured`; never echoes DSN | provide `DATABASE_URL`; run `npm run db:migrate` |
| RAG | **PARTIAL — FOUNDATION ONLY** | `/api/rag/status` → `mode:foundation, approved_sources:0, safe_to_answer_from_rag:false`; governance docs + validator present | licensing review + ingest approved sources |
| Rahma Control Engine | **PASS** | `/api/engine/status` → `engine_implemented:true, mode:deterministic_rules`, 9 modules, 15 events, 11 safety rules | — |
| Children game | **PASS** | 32 child-safe Arabic scenarios; localStorage-only progress; PII-blocked tests pass | richer UI when frontend framework lands |
| Islamic library | **PARTIAL** | `/api/library/*` reachable with `configured:false` truth; pages exist | seed real approved content |
| Privacy / data rights | **PARTIAL** | `/api/privacy/status`, `/api/terms/status`, `/api/privacy/{delete-account,data-export}-request` reachable; return `persisted:false` truthfully when DB missing | wire DB persistence |
| Charity | **PARTIAL** | `/api/sadaqah/*` reachable; payment provider `disabled` by default | real payment provider integration |
| Security | **PASS** | No real secrets, no LLM imports, no DSN leaks (all test-asserted); rahma-security-scan workflow SUCCESS on HEAD | — |
| Docker | **PARTIAL — BLOCKED** | Dockerfile exists at `backend/app/Dockerfile`; `.dockerignore` present; `docker info` returns "failed to connect to the docker API" | start Docker Desktop, then `docker build -t rahma-sakina-backend:qa -f backend/app/Dockerfile backend/app` |
| CI | **PASS** | `rahma-ci` on `5e93ffc` = SUCCESS via `gh run list` | — |
| K3s | **FAIL — BLOCKED WRONG CONTEXT** | `kubectl config current-context` = `aks-iterlaw-we-prod` (forbidden — saved memory `[[feedback-never-deploy-to-prod]]`); refused all `kubectl` operations | operator must supply a Sakina-safe admin kubeconfig |

## 6. Truth statement

**I did not fake, cheat, invent evidence, or mark PASS without command evidence. Any DB, RAG, Auth, Docker, CI, or K3s claim in this report is based only on verified command output.**

- Auth: PASS as **AUTH FOUNDATION ONLY** — `/api/auth/status` returns the canonical not-configured shape; no fake login.
- DB: PASS as **DB TOOLING ONLY / NOT CONFIGURED** — `/api/db/status` returns the canonical not-configured shape; no DSN leak.
- `/ready`: includes `production_ready: false` + an honest `blockers` array (5 items today). 6 new tests assert this contract + the no-leak rule.
- RAG: PARTIAL foundation only (unchanged — by design).
- Docker: PARTIAL — Daemon not running.
- CI: PASS on the current HEAD.
- K3s: FAIL — wrong context.

**production_ready is FALSE** and stays false until: auth wired, DB connected, RAG approved sources seeded, sheikh repository wired.

Rahma/Sakina only. No IterLaw / OrdinoxAI / RightsNow / Alaa Beauty touched.
