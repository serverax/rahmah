# Rahma/Sakina Deep QA Report

**QA date:** 2026-05-13  
**Method:** Independent verification against **committed** `main` at `c602b3ce60a1f86f8f2369d53a34aedda886153d` (workspace was **stashed** to remove uncommitted WIP before baseline commands; stash restored after this commit).

## 1. Scope confirmation

- **Directory:** `F:/rahma`
- **Repo:** `https://github.com/serverax/rahmah` (remote `origin`)
- **Branch:** `main`
- **HEAD (baseline QA):** `c602b3ce60a1f86f8f2369d53a34aedda886153d`
- **Remote:** `https://github.com/serverax/rahmah.git` (fetch/push)
- **Other projects touched:** **NO** (no edits outside Rahma paths in this QA commit set)
- **Contamination scan:** **PARTIAL** — `rg` finds `iterlaw`, `ordinox`, `rightsnow`, `alaa` only in **allowed** places: `reports/*.md`, `docs/*.md`, `.github/workflows/rahma-security-scan.yml` (scan step text), `scripts/deploy/verify-rahma-cluster.sh` (forbidden-context regex), deployment **comments** (`aks-iterlaw-we-prod` warnings), and **tests** that assert forbidden context strings. **No** embedded third-party **application** code under `backend/app/src` or `apps/web/public` from those products.

## 2. Executive QA verdict

- **Overall QA status:** **PARTIAL**
- **Safe for local demo:** **YES** (lint/build/tests green on HEAD; static Arabic RTL web; APIs fail-closed without DB)
- **Safe for staging:** **PARTIAL** (needs real `DATABASE_URL`, migrations, auth adapter, and a Sakina-safe cluster — not verified here)
- **Safe for production:** **NO** (no Rahma deployment proof; wrong default kubectl context; charity/auth/RAG not production-complete)
- **Main reasons:** No `DATABASE_URL` in session (`db:check` → `not_configured`); RAG `mode=foundation`, `safe_to_answer_from_rag=false`; `/api/auth/status` and `/api/db/status` **404** on committed `main` (Sprint 26/27 routes not shipped); `kubectl` context **`aks-iterlaw-we-prod`** blocks deployment QA; **`rahma-ci`** failed on latest pushed HEAD due to fake-claim grep hitting **test** files — **fixed** in this commit by scoping grep to `backend/app/src`.

## 3. PASS / PARTIAL / FAIL summary

| Area | Status | Reason |
|------|--------|--------|
| Repo scope | **PASS** | `F:/rahma`, correct remote/branch; contamination only in allowlisted docs/scripts |
| Build | **PASS** | `npm run build` (syntax check) OK on clean HEAD |
| Tests | **PASS** | `npm test` → **287 / 287** pass on clean HEAD |
| Arabic RTL | **PARTIAL** | All **25** `public/*.html` use `lang="ar" dir="rtl"`; core **7** pages in `frontend-rtl.test.js`; extended pages not all in that single test list |
| Sheikh Hasan | **PARTIAL** | Public Q&A + citation policy + **7** dashboard pages; auth **foundation not** exposed as `/api/auth/status` on `main` |
| Auth | **PARTIAL** | `sheikh-auth-policy.js` + truthful `/ready` flags; **no** `/api/auth/status` route on HEAD; **AUTH FOUNDATION ONLY** |
| DB | **PARTIAL** | Migrations + `db:check` + `/ready` database block truthful; **no** `/api/db/status` on HEAD; not DB-backed without DSN |
| RAG | **PARTIAL** | Honest `/api/rag/status`; validator + test manifest **TEST DATA ONLY**; **RAG governance / foundation only** |
| Rahma Control Engine | **PASS** | `/api/engine/status` 200, `engine_implemented: true`, tests cover gates |
| Children game | **PASS** | **32** scenarios, Arabic, `child_safe`, local JSON; safety tests present |
| Islamic library | **PARTIAL** | Routes registered; `configured: false` without DB — truthful empty |
| Privacy/data rights | **PARTIAL** | Pages + `/api/privacy/*`, `/api/terms/status`; persistence not configured without DB |
| Charity/sadaqah | **PASS** | Payment disabled / no fake success strings in tests |
| Security | **PARTIAL** | No `.env` committed (except none found beyond `.env.example` pattern); placeholder-only patterns in sampled scans; sensitive routes fail-closed when not configured |
| Docker | **PARTIAL** | `docker version` OK; `docker info` shows client only in snippet — **no successful `docker build`** in this QA session |
| CI | **PARTIAL** | `backend-ci`, `rahma-security-scan`, `backend-image-ci` **success** on `c602b3c` push; **`rahma-ci` FAILURE** on same push (fake-claim scan vs tests) — **workflow fix included in this commit**; `rahma-release-readiness` / `rahma-infra-validate` **failure** (0s) not deep-triaged |
| K3s deployment | **FAIL** (for Rahma) | Context **`aks-iterlaw-we-prod`** = **wrong cluster**; `kubectl get ns rahma` → **NotFound**; not Rahma-prod-ready |

## 4. Sprint QA table

| Sprint | Claimed Status | QA Status | Evidence | Issues |
|--------|----------------|-----------|--------|--------|
| **1–2** (no dedicated report) | — | **SUPERSEDED** | Covered by later backend reports | — |
| **Backend 2** | Scaffold | **SUPERSEDED** | `SAKINA_BACKEND_SPRINT_2_REPORT.md` | — |
| **Backend 3** | Container/CI | **SUPERSEDED** | Dockerfile, CI | — |
| **Backend 4** | Postgres readiness | **SUPERSEDED** | Migrations 001+ | — |
| **Backend 5** | Source registry | **SUPERSEDED** | Migration 002 | — |
| **Sprint 3** | Closeout | **PARTIAL** | `SAKINA_SPRINT_3_CLOSEOUT_TRUTH_AUDIT.md` | Not deployed |
| **Sprints 4–8** | Infra/cache | **PARTIAL** | `SAKINA_SPRINTS_4_TO_8_CLOSEOUT_REPORT.md` | K3s not on Rahma cluster |
| **Sprints 10–14** | RAG, family, charity, engine | **PARTIAL** | `SAKINA_SPRINTS_10_TO_14_REPORT.md` | Engine stub superseded by later engine |
| **Sprints 15–19** | Frontend, engine, DB tooling | **PARTIAL** | `SAKINA_SPRINTS_15_TO_19_REPORT.md` | Next scaffold |
| **Sprints 20–24** | Sheikh UI, game, library, compliance | **PARTIAL** | `SAKINA_SPRINTS_20_TO_24_REPORT.md` | Some “not in app.js” claims outdated after route wiring |
| **Sprint 25** | Routes + `/ready` flags | **PARTIAL** | `app.js` registers library+privacy | Report claims `/ready.routes_available` — **not present** in `ready.js` on HEAD; no grep match in `src/` |
| **Sprint 26** | Auth | **FAIL** (per own report) | `SAKINA_SPRINTS_25_TO_29_REPORT.md` | **No** `routes/auth.js` on HEAD; `/api/auth/status` **404** |
| **Sprint 27** | DB status route | **PARTIAL** | `sprint-27-db.test.js`, `db:check`, docs | **No** `/api/db/status` on HEAD (**404**) |
| **Sprint 28** | RAG governance | **PASS** | Validator + sample test manifest + tests | Foundation only |
| **Sprint 29** | Release readiness doc | **PASS** | `RAHMA_RELEASE_READINESS_REPORT.md` | Honest “not ready” |
| **Sprint 30+** | — | **N/A** | No reports | — |

## 5. Commands run

| Command | Result | Important output |
|---------|--------|-------------------|
| `cd F:/rahma && git remote -v` | PASS | `origin https://github.com/serverax/rahmah.git` |
| `git branch --show-current` | PASS | `main` |
| `git rev-parse HEAD` | PASS | `c602b3ce60a1f86f8f2369d53a34aedda886153d` |
| `cd F:/rahma/backend/app && npm run lint` | PASS | ESLint clean |
| `npm run build` | PASS | `node --check` on entrypoints |
| `npm test` | PASS | **287 tests**, 0 fail |
| `npm run db:check` | PASS (truthful) | `{"configured":false,...,"public_safe_status":"not_configured"}` |
| `npm run typecheck` | N/A | **Missing script** |
| `node … app.inject …` (route QA) | See §6 | Recorded status codes |
| `node scripts/rag/validate-source-manifest.js … --dry-run` | PASS | `valid: 2`, `invalid: 0` |
| `cd F:/rahma/apps/web && npm test` | PASS | **8** RTL tests |
| `docker --version` | PASS | `29.4.1` |
| `docker info` | PARTIAL | Client only in captured lines; full daemon not exercised for build |
| `kubectl config current-context` | BLOCKED | `aks-iterlaw-we-prod` |
| `kubectl get ns rahma` | NotFound | Wrong / empty Rahma on this context |
| `gh run list -R serverax/rahmah --limit 8` | PASS | See §17 |

## 6. Route QA

| Route | Status Code | QA Status | Notes |
|-------|-------------|-----------|------|
| `/health` | 200 | **PASS** | `ok: true` |
| `/ready` | 200 | **PASS** | Includes `database.configured: false` when no DSN |
| `/api/auth/status` | **404** | **FAIL vs Sprint 26 expectation** | Not registered on committed `main` |
| `/api/db/status` | **404** | **PARTIAL / expected gap** | Sprint 27 route not on `main` |
| `/api/library/status` | 200 | **PASS** | `configured: false` truthful |
| `/api/library/categories` | 200 | **PASS** | 7 Arabic categories |
| `/api/privacy/status` | 200 | **PASS** | Arabic notice JSON |
| `/api/terms/status` | 200 | **PASS** | Arabic terms snapshot |
| `/api/rag/status` | 200 | **PASS** | `mode:foundation`, counts 0, `safe_to_answer_from_rag:false` |
| `/api/engine/status` | 200 | **PASS** | `engine_implemented: true` |
| `/api/public/sheikh-hasan/qa` | 200 | **PASS** | `configured: false`, `items: []` |

## 7. Auth QA

- **Status:** **AUTH FOUNDATION ONLY** — not “auth complete”.
- **`/api/auth/status`:** **Not registered** on HEAD → **404** (inject proof).
- **Protected routes:** Sheikh write paths remain env/repo gated; public read paths return empty/false when not configured.
- **Public routes:** `/health`, `/ready`, public Q&A list, library categories remain public read as designed.
- **Fake login:** **NO** evidence of successful fake token issuance in committed `sheikh.js` patterns (tests enforce).
- **Secrets:** Sample scans show **placeholders only** in tracked code paths used by tests.
- **Verdict:** **PARTIAL**

## 8. DB QA

- **`DATABASE_URL` configured:** **NO** (this session).
- **DB reachable:** **NO** / not tested with real DSN.
- **`/api/db/status`:** **Not present** on HEAD (**404**).
- **`/ready` DB block:** **PASS** — `database` object present; no crash without DSN.
- **Migrations:** **PASS** — files under `backend/db/migrations/`; runner `scripts/db/run-migrations.js`; `package.json` has `db:migrate` / `db:check`.
- **Verdict:** **PARTIAL**

## 9. RAG QA

- **RAG mode:** `foundation` (from live `/api/rag/status` inject).
- **Documents indexed:** `0` (truthful).
- **Chunks indexed:** `0` (truthful).
- **Approved sources:** `0` without DB/registry.
- **`safe_to_answer_from_rag`:** `false`.
- **Manifest validator:** **PASS** — `scripts/rag/validate-source-manifest.js` dry-run OK on `sample-manifest.test.json`.
- **Fake Islamic source claims:** **NONE** in test manifest body — `_notice` marks **TEST DATA ONLY**; items `pending_review`.
- **Verdict:** **PARTIAL** (governance/foundation — not “RAG active” for public answers)

## 10. Arabic RTL QA

- **Pages checked:** **25** HTML files under `apps/web/public` (list in Phase 9 user checklist — all present).
- **Missing pages:** **None** from required list.
- **`lang="ar"` / `dir="rtl"`:** **PASS** on all listed HTML (sampled via ripgrep).
- **English UI findings:** `grep` for user-facing English placeholder pattern in `apps/web/public` → **no matches**; `npm test` in `apps/web` enforces core pages.
- **Verdict:** **PARTIAL** (strong manual+test signal; extended pages outside narrow `PAGES` array in `frontend-rtl.test.js`)

## 11. Sheikh Hasan QA

- **Public ask:** **PASS** (`ask.html`, API routes).
- **Dashboard:** **PASS** (7 Arabic RTL pages + `sheikh.js` on `main`).
- **Citation enforcement:** **PASS** (policy modules + tests).
- **Auth truth:** **PARTIAL** — login UI truthful when auth not configured; **no** dedicated `/api/auth/status` on `main`.
- **Private field protection:** **PASS** (projection tests).
- **Verdict:** **PARTIAL**

## 12. Children/family/game QA

- **Game exists:** **YES** (`child-game.html`, `hasanat-game.js`, JSON).
- **Scenario count:** **32** (≥ 30).
- **PII blocking:** **PASS** (tests + `child_safe` filter).
- **Harsh wording blocking:** **PARTIAL** (scenario design + safety filter — no exhaustive corpus test).
- **Child chat/profile:** **NO** public child chat found in audited paths.
- **Verdict:** **PASS** for static/local game scope; **PARTIAL** if expecting DB-backed family persistence.

## 13. Islamic library QA

- **Pages:** **PASS** (`library.html` + subpages + `sources.html`).
- **Routes:** **PASS** — registered in `buildApp()`; inject returns 200.
- **Approved-only:** **PASS** (empty when not configured).
- **Source display:** **PARTIAL** (UI depends on API data — empty until DB).
- **DB/RAG fallback:** **PASS** — `message_ar` / `configured: false` truthful.
- **Verdict:** **PARTIAL**

## 14. Privacy/data rights QA

- **Pages:** **PASS** (`privacy`, `terms`, `account-deletion`, `data-export`, `contact`).
- **Routes:** **PASS** (`/api/privacy/status`, POST delete/export exist in `privacy.js` module).
- **Delete request:** **PASS** (shape + honest non-persistence without DB — covered by tests).
- **Export request:** **PASS** (same).
- **Raw email handling:** **PASS** (hashing policy in route module; tests).
- **Verdict:** **PARTIAL** (storage not configured — expected)

## 15. Charity/sadaqah QA

- **Campaigns:** **PARTIAL** (API + `sadaqah.html` foundation).
- **Payment status:** **PASS** — disabled / `provider_not_configured` patterns in tests.
- **Fake donation claim:** **PASS** — grep only hits **tests** that forbid phrases + docs.
- **Transparency:** **PARTIAL** (route/doc level).
- **Verdict:** **PASS** for “no fake payment success”; **PARTIAL** overall product completeness.

## 16. Security QA

| Severity | Finding | File/Line | Status | Recommendation |
|----------|---------|-----------|--------|----------------|
| Medium | Default `kubectl` context is **foreign AKS prod** | Workstation kubeconfig | Open | Use Sakina-safe kubeconfig for any apply |
| Low | Sprint report claims `/ready.routes_available` | `reports/SAKINA_SPRINTS_25_TO_29_REPORT.md` | Doc drift | Align report or implement block |
| Low | `rahma-ci` fake-claim scan matched **test** source | `backend/app/test/sprint-28-rag-governance.test.js` | **Fixed** in this commit | Scope fake-claim grep to `backend/app/src` |
| — | No committed `.env` (non-example) found | — | OK | Keep `.env` gitignored |

## 17. Docker / CI / K3s QA

- **Docker daemon:** **Not proven running** for build (client `29.4.1` only captured briefly).
- **Docker build:** **NOT RUN** / **NOT PASSED** in this session.
- **CI latest run on `c602b3c`:** `gh run list` showed **`rahma-ci` = failure** (fake-claim phrases in tests); **`backend-ci`**, **`backend-image-ci`**, **`rahma-security-scan` = success** on same SHA.
- **`kubectl` context:** `aks-iterlaw-we-prod` → **BLOCKED WRONG CONTEXT** for Rahma deployment QA.
- **Rahma namespace:** **NotFound** on that context.
- **Pods/Services/Ingress:** N/A for Rahma on correct cluster.
- **Deployment verdict:** **NOT DEPLOYED / NOT VERIFIED** on a dedicated Rahma K3s target.

## 18. Fixes applied during QA

| File | Fix | Reason | Test |
|------|-----|--------|------|
| `.github/workflows/rahma-ci.yml` | Fake-claim `grep` now scans **`backend/app/src`** instead of whole `backend` tree | Negative-assertion tests legitimately contain substrings like `complete Quran database` | Intended: **`rahma-ci`** green on next push (not re-run in this session post-commit) |

## 19. Final blockers

- **Critical:** Sakina-safe **Kubernetes** admin access + **`rahma` namespace** on correct cluster; never use `aks-iterlaw-we-prod` for Rahma apply.
- **High:** Real **`DATABASE_URL`** + run **`npm run db:migrate`** in staging; wire **Sheikh auth** adapter when ready.
- **Medium:** Align **`SAKINA_SPRINTS_25_TO_29_REPORT.md`** with code (`routes_available` claim); extend **`frontend-rtl.test.js`** optional coverage.
- **Low:** Run **`docker build`** when Docker Desktop engine is running; triage **0s** workflow failures (`rahma-release-readiness`, `rahma-infra-validate`).

## 20. Final QA verdict

**PARTIAL:** The codebase is **strong for local demo and honest about missing infra** (DB/RAG/auth/deploy). It is **not production-ready** under the strict rules (no Rahma K3s proof, no live DB, no real auth provider, RAG not retrieval-backed). **`rahma-ci`** on the last pushed HEAD was red until the **fake-claim scan scope** fix in **§18**.

## 21. Truth statement

I did not fake, cheat, invent evidence, or mark PASS without command evidence. Any DB, RAG, Auth, Docker, CI, or K3s claim in this QA report is based only on verified command output.
