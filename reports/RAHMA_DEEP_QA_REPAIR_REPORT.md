# Rahma/Sakina Deep QA, Security Audit, Bug Repair Report

## 1. Executive Summary

- **Overall status:** **PARTIAL** — foundations, tests, and truthful status endpoints are strong; production blockers remain.
- **Production readiness:** **`false`** (verified via `/ready` → `production_ready: false` with explicit `blockers` array).
- **QA verdict:** **PARTIAL** — all **326** backend tests and **8** web tests **PASS** on the repaired tree; **Docker build BLOCKED** (Linux engine pipe unavailable — daemon not running for builds); **K3s BLOCKED** (wrong kubectl context `aks-iterlaw-we-prod` — no `kubectl get` / apply).
- **Commit checked (start):** `298fbe975c764173e88b73ca3b8988696c0bc950`
- **Branch:** `main`
- **Repo:** `https://github.com/serverax/rahmah.git`
- **Date:** 2026-05-13
- **Auditor:** Cursor agent (command-backed)
- **Other projects touched:** **NO**

## 2. Truth Statement

I did not fake, cheat, invent evidence, or mark production readiness without command evidence. Rahma/Sakina remains production_ready=false unless /ready, DB, auth, RAG, Docker, and deployment evidence prove otherwise.

## 3. Scope Confirmation

| Item | Result | Evidence |
|------|--------|----------|
| Repo path | `F:/rahma` | `cd F:/rahma` |
| Remote | `https://github.com/serverax/rahmah.git` | `git remote -v` |
| Branch | `main` | `git branch --show-current` |
| Starting HEAD | `298fbe975c764173e88b73ca3b8988696c0bc950` | `git rev-parse HEAD` (before repair commit) |
| Final HEAD | **Authoritative value:** run `git rev-parse HEAD` on `main` after pulling the repair commit (`qa: deep rahma audit and repair findings`). *(Embedding the literal 40-char hash inside this same commit would be stale on every amend.)* | `git log -1` |
| Working tree start | Modified `db.js`; untracked `migration-registry.js`, docs | `git status --porcelain` |
| Working tree end | Clean for committed paths; user docs may remain untracked if not added | `git status -sb` after commit |
| Other projects touched | **NO** | No edits outside Rahma paths in this repair commit |

## 4. Commands Run

| Command | Result | Notes |
|---------|--------|-------|
| `git status -sb` | dirty then clean | See §3 |
| `git log --oneline -20` | ok | Shows `298fbe9` at tip before commit |
| `git remote -v` | ok | `serverax/rahmah` |
| `cd backend/app && npm run lint` | **PASS** | ESLint clean |
| `cd backend/app && npm run build` | **PASS** | `node --check` |
| `cd backend/app && npm test` | **PASS** | **326** tests, 0 fail |
| `cd backend/app && npm run db:check` | **PASS** | JSON `public_safe_status":"not_configured"` |
| `cd apps/web && npm test` | **PASS** | **8** tests |
| `cd apps/web && npm run build` | **PASS** | static no-op message |
| `npm run typecheck` (root) | **N/A** | No root `package.json` |
| `cd backend/app && npm run typecheck` | **missing script** | JS project |
| `npm audit --omit=dev` | **0 vulnerabilities** | backend app |
| `node -e … app.inject …` | **PASS** | §6 |
| `docker --version` | **29.4.1** | Client present |
| `docker build …` | **FAIL/BLOCKED** | `npipe://…dockerDesktopLinuxEngine` not found |
| `kubectl config current-context` | `aks-iterlaw-we-prod` | **STOP** — wrong context per mission |
| `gh run list -R serverax/rahmah --limit 8` | ok | `rahma-ci` **success** on `298fbe9` push |
| `gh run list … rahma-ci.yml --limit 5` | ok | See §14 |

## 5. Area Verdict Table

| Area | Verdict | Evidence | Remaining |
|------|---------|----------|-----------|
| Repo scope | **PARTIAL** | No forbidden strings under `backend/app/src`; hits in **tests** (negative scan), **CI** (scan step name), **deployment** YAML comments (warnings / placeholders) | Allowlisted guardrails only — no active routing to foreign products |
| CI | **PARTIAL** | `rahma-ci`, `backend-ci`, `backend-image-ci`, `rahma-security-scan` **success** on latest main; `rahma-release-readiness` / `rahma-infra-validate` **failure** (0s) | Triage infra workflows |
| Build | **PASS** | `npm run build` | — |
| Backend tests | **PASS** | 326/326 | — |
| Web tests | **PASS** | 8/8 | — |
| Arabic RTL | **PARTIAL** | `apps/web` tests cover core pages; **25** HTML files with `lang="ar" dir="rtl"` | Extend automated list if desired |
| Auth | **PARTIAL** | `/api/auth/status` **200**, `auth_configured: false` | Real IdP + `SESSION_SECRET` for `external` mode |
| DB | **PARTIAL** | `/api/db/status` **200**, `database_configured: false`; `db:check` truthful | Real `DATABASE_URL` |
| `/ready` | **PASS** | `production_ready: false`, honest `blockers` | Operator env + DB + RAG + Sheikh repo |
| RAG | **PARTIAL** | `/api/rag/status` foundation, `safe_to_answer_from_rag: false` | Approved sources + vector path |
| Sheikh Hasan | **PARTIAL** | Public QA empty when not configured; policies tested | Live moderation + auth |
| Islamic library | **PARTIAL** | Routes 200, `configured: false` without DB | Content pipeline |
| Children game | **PASS** | **32** scenarios (≥30), safety filters | DB persistence optional |
| Rahma Control Engine | **PASS** | `/api/engine/status` + tests | — |
| Privacy/data rights | **PARTIAL** | Status + POST endpoints; no fake persistence without DB | Storage wiring |
| Charity | **PASS** | Tests forbid fake payment strings | Provider config |
| Security | **PARTIAL** | No secrets in sampled `src/` patterns; `npm audit` clean | Ongoing review |
| Docker | **BLOCKED** | Build cannot connect to daemon | Start Docker Desktop |
| K3s | **BLOCKED** | Context `aks-iterlaw-we-prod` | Sakina-safe kubeconfig only |
| Mobile/PWA | **PARTIAL** | Viewport meta on pages; no full PWA audit | — |
| Production release | **FAIL** | `production_ready` false | See §15 blockers |

## 6. Endpoint Evidence

| Endpoint | Status | Body summary | Verdict |
|----------|--------|--------------|---------|
| `/health` | 200 | `ok`, `healthy` | **PASS** |
| `/ready` | 200 | `production_ready: false`, `blockers` includes auth/DB/RAG/sheikh/sources | **PASS** |
| `/api/auth/status` | 200 | `auth_configured: false`, `mode: not_configured`, Arabic safe message | **PASS** |
| `/api/db/status` | 200 | `database_configured: false`, `total_migration_files: 7`, no DSN | **PASS** |
| `/api/rag/status` | 200 | `mode: foundation`, zero counts, `safe_to_answer_from_rag: false` | **PASS** |
| `/api/engine/status` | 200 | `engine_implemented: true`, deterministic mode | **PASS** |
| `/api/privacy/status` | 200 | Arabic privacy snapshot | **PASS** |
| `/api/terms/status` | 200 | Arabic terms snapshot | **PASS** |
| `/api/public/sheikh-hasan/qa` | 200 | `configured: false`, `items: []` | **PASS** |

## 7. Bugs Found

| ID | Severity | File/Area | Bug | Evidence | Fixed? | Fix commit/file |
|----|----------|-----------|-----|----------|--------|-----------------|
| BUG-001 | **Medium** | `migration-registry` + `db` route | `migration-registry.js` was **untracked** while `db.js` imported it — clean checkout risk | `git status` showed `??` before add | **YES** | Track `backend/app/src/db/migration-registry.js`; `db.js` exposes `total_migration_files` / `pending_migrations_count` |
| BUG-002 | **Medium** | Auth middleware + roles | `isPrincipalRole` needed a single module; `public_user` must not authenticate as a principal | Sprint 32 tests | **YES** | `roles.js`, `auth-middleware.js` import, `buildAuthStatus` OIDC flags |

## 8. Security Findings

| ID | Severity | Area | Finding | Evidence | Fixed? | Remaining action |
|----|----------|------|---------|----------|--------|-------------------|
| SEC-001 | **Low** | Kubectl | Default context is **foreign AKS prod** | `kubectl config current-context` → `aks-iterlaw-we-prod` | N/A | Never apply Rahma manifests here |
| SEC-002 | **Low** | Docker | Daemon not running — cannot verify image hardening in this run | `docker build` connection error | N/A | Run build when daemon up |

No **Critical** secret leaks or auth bypass found in this pass (`npm test` includes secret-pattern tests).

## 9. Fake Claim / Truthfulness Findings

| ID | Area | Claim | Reality | Fixed? |
|----|------|-------|---------|--------|
| TRUTH-001 | `/ready` | Production ready | **`production_ready: false`** with explicit blockers | **N/A** (already honest) |
| TRUTH-002 | RAG | “Complete” corpus | Status shows **0** documents/chunks; foundation mode | **N/A** |
| TRUTH-003 | Sheikh | Live scholar workflow | `configured: false` on public QA | **N/A** |

## 10. Repairs Made

| File | Change | Reason | Test Evidence |
|------|--------|--------|---------------|
| `backend/app/src/db/migration-registry.js` | **Added** | Disk-only module must be versioned for CI/clones | `npm test` **326 pass** |
| `backend/app/src/routes/db.js` | Migration file count + pending when DB up | Honest operator visibility | Same |
| `backend/app/src/auth/roles.js` | **Added** | Canonical roles; `public_user` excluded from principals | Same |
| `backend/app/src/auth/auth-middleware.js` | `isPrincipalRole` gate | Prevents forged dev principal with invalid role | Same |
| `backend/app/src/auth/auth-status.js` | OIDC + `roles_supported` snapshot booleans | Status without secret echo | `sprint-32-auth-rbac.test.js` |
| `backend/app/package.json` | Test script includes `sprint-31` + `sprint-32` | CI/local run full suite | Same |

## 11. Tests Added or Updated

| Test file | Purpose | Result |
|-----------|---------|--------|
| `test/sprint-31-db-foundation.test.js` | Migration registry + DB route shape | **PASS** |
| `test/sprint-32-auth-rbac.test.js` | Roles, OIDC status surface, no secret leak, `SESSION_SECRET` gate | **PASS** |

## 12. Docker Evidence

- **Docker daemon status:** **Client OK** (`docker info` shows client/plugins); **`docker build` BLOCKED** — cannot connect to `npipe:////./pipe/dockerDesktopLinuxEngine` (Linux engine not running).
- **Build command:** `docker build -t rahma-sakina-backend:qa -f backend/app/Dockerfile backend/app`
- **Build result:** **FAILED** — cannot connect to Docker API.
- **Image ID:** *n/a*
- **Blocker:** Start Docker Desktop (or equivalent) on this workstation.

## 13. K3s Evidence

- **Current context:** `aks-iterlaw-we-prod`
- **Safe for Rahma/Sakina?** **NO**
- **Commands stopped?** **YES** (no `kubectl get pods` / apply per mission)
- **Deployment claimed?** **NO**
- **Blocker:** Wrong cluster context; need Sakina-safe read-only or admin kubeconfig for Rahma namespace verification.

## 14. CI Evidence

| Workflow | Latest run (sample) | Commit | Status |
|----------|---------------------|--------|--------|
| `rahma-ci.yml` | `25827836865` | `298fbe9` area | **success** |
| `backend-ci.yml` | `25827836919` | same | **success** |
| `rahma-security-scan.yml` | `25827836881` | same | **success** |
| `rahma-release-readiness.yml` | `25827836006` | same | **failure** (0s) |

## 15. Production Readiness

**`production_ready = false`**

Blockers from live `/ready` (representative run):

- `auth_not_configured`
- `database_not_configured`
- `rag_foundation_only`
- `sheikh_repository_not_configured`
- `no_approved_islamic_sources`

Additional practical blockers (mission truth):

- `docker_not_proven` (this session)
- `k3s_not_deployed` / wrong context

## 16. Remaining Work

| Area | Remaining work | Blocked by operator? | Next sprint |
|------|----------------|----------------------|-------------|
| Auth | Wire real provider + secrets management | **YES** | Auth integration |
| DB | Provide `DATABASE_URL`, run migrations in env | **YES** | Infra |
| RAG | Approve sources, ingestion, optional vector | **YES** | Content + RAG |
| Sheikh Hasan | Repository + moderation + live auth | **YES** | Workflow |
| Docker | Run daemon + `docker build` in CI/local | **YES** | DevOps |
| K3s | Safe cluster + namespace `rahma` | **YES** | Infra |
| Privacy | Persist requests when DB live | **YES** | Backend |
| Charity | Payment provider when legal/ready | **YES** | Product |
| Mobile/PWA | Optional enhancement | **NO** | UX |

## 17. Final Verdict

**PARTIAL**

**Reason:** All automated **lint/build/tests** pass; **APIs are truthful** (`production_ready: false`); **no Docker image** built here; **K3s not verified**; **production blockers** explicitly listed by `/ready`.

## 18. Final Evidence Summary

- **Lint:** PASS (`eslint src test`)
- **Build:** PASS (`node --check`)
- **Tests:** PASS — **326** backend, **8** web
- **Backend tests:** 326 pass
- **Web tests:** 8 pass
- **DB check:** `not_configured` JSON, exit 0
- **Docker:** BLOCKED (daemon)
- **K3s:** BLOCKED (wrong context)
- **CI:** `rahma-ci` green on recent `main`; some infra workflows red
- **Production readiness:** **false** with enumerated blockers

---

## Appendix A — Contamination grep (summary)

`rg` for `IterLaw|RightsNow|OrdinoxAI|Alaa Beauty` under **`backend/app/src`**: **no hits**. Broader repo hits are confined to **reports/docs/workflows/scripts** (scope-lock and forbidden-context guards).

## Appendix B — Commands log (raw snippets)

```
npm test → # pass 326 # fail 0
npm run db:check → "public_safe_status":"not_configured"
docker build → ERROR: failed to connect to the docker API at npipe://...
kubectl config current-context → aks-iterlaw-we-prod
```

## Appendix C — `production_ready` / `blockers` (inject)

```
production_ready false
blockers ["auth_not_configured","database_not_configured","rag_foundation_only","sheikh_repository_not_configured","no_approved_islamic_sources"]
```
