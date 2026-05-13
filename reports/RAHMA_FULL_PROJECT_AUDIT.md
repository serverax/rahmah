# Rahma/Sakina Full Project Audit

**Audit date:** 2026-05-13  
**Auditor:** Cursor agent (command-backed verification on this workstation)

## 1. Scope confirmation

- **Directory audited:** `F:/rahma` (canonical workspace).
- **`F:/rahmah` exists:** **NO** — path does not exist on this machine; audit used `F:/rahma` only (no guessing).
- **`F:/rahma` exists:** **YES**.
- **Repo:** `https://github.com/serverax/rahmah.git` (matches expected `serverax/rahmah`).
- **Branch:** `main` (tracking `origin/main`).
- **HEAD at audit time:** `dc8672ca5596d0aceec77ffdd556f648fbb17174` (includes Sprint 20–24 deliverables per `reports/SAKINA_SPRINTS_20_TO_24_REPORT.md`). **Follow-up fix in this session:** `libraryRoute` and `privacyRoute` were **not registered in `buildApp()`** while tests expected them — **wired in `backend/app/src/app.js`**; **`npm test` → 273/273 pass** after that change.
- **Remote:** `origin  https://github.com/serverax/rahmah.git` (fetch/push).
- **Other projects touched:** **NO** — no IterLaw / OrdinoxAI / RightsNow / Alaa Beauty code was modified in this audit session; only Rahma paths and CI manifests under this repo.
- **Contamination scan (`rg` for iterlaw|ordinox|rightsnow|alaa in tracked-like paths):**
  - **Allowed historical / scope-lock text:** `reports/*`, `docs/*`, `SAKINA_PROJECT_MASTER_PLAN.md`, `SAKINA_PROJECT_STATUS.md`, `deployment/k3s/README.SERVER.md`, `.github/workflows/rahma-security-scan.yml` (step titles and allowlists), `scripts/deploy/verify-rahma-*.sh` (forbidden-context guards).
  - **Forbidden active reference (fixed in this audit):** `deployment/k3s/rahma/data/secrets.example.yaml` and `deployment/k3s/rahma/00-namespace.yaml` contained a third-party cluster vendor name in comments; comments were rephrased so the **cross-project name grep** passes without weakening the “never apply to wrong context” meaning.
  - **Ingress placeholders:** `sakina.ordinoxai.com` hostnames remain in some **placeholder** ingress YAML (DNS not Sakina-owned) — classify as **deployment placeholder**, not app logic.

## 2. Executive verdict

- **Overall status:** **PARTIAL**
- **Reason:** Strong backend + tests and honest subsystem flags, but **no verified Rahma deployment** on a Sakina-dedicated cluster, **no `DATABASE_URL` in this session** (`not_configured`), **RAG foundation-first** (vector not proven), and **default kubectl context** is **`aks-iterlaw-we-prod`** (wrong project for apply). Sprint **20–24** report stated library/privacy routes were intentionally **not** registered in `app.js` — that left **`npm test` failing** (8 cases); **route registration was added** so behaviour matches tests and product wiring. **Docker build** not proven here (daemon unavailable). Prior **CI** failures on self-scanning workflows were addressed in earlier commits — re-verify on next push.
- **Biggest blockers:** Sakina-safe **kubeconfig** + DNS + secrets; real **Postgres** + `DATABASE_URL`; optional **Docker Desktop** for local image proof; confirm **GitHub Actions green** after this fix.
- **Safe to deploy:** **NO** — not proven on a Sakina-safe cluster; current workstation `kubectl` context is `aks-iterlaw-we-prod` (**out of scope / forbidden target** per project rules). `kubectl get ns rahma` → **NotFound** on this context (and cluster is wrong project anyway).
- **Safe to call RAG active:** **NO** — `buildRagStatus()` reports `vector_configured: false`, `documents_indexed: 0`, `chunks_indexed: 0`; `safe_to_answer_from_rag` is only true when DB + registry + retrieval are all wired and approved sources exist.
- **Safe to call DB backed:** **NO** — without a reachable `DATABASE_URL`, only **migrations + adapter code** are verified by tests; not production data plane.
- **Safe to call auth complete:** **NO** — Sheikh auth is **policy + placeholder / env-gated**; not a full IdP integration.
- **Safe to call payment active:** **NO** — charity routes intentionally return **disabled / not_configured** unless a real provider is wired; tests forbid fake success strings.

## 3. Sprint claim audit

Reports found under `reports/` and related `docs/`, including **`reports/SAKINA_SPRINTS_20_TO_24_REPORT.md`**.

| Sprint / report | Claimed status (from report) | Evidence found in repo | Mismatch | False PASS risk | Corrected status | Notes |
|-----------------|------------------------------|-------------------------|----------|-------------------|------------------|-------|
| **Backend 2** | Historical backend scaffold | `backend/app`, routes, tests | NO | LOW | **PARTIAL / foundation** | Superseded by later work. |
| **Backend 3** | Container + CI | Dockerfile, `backend-image-ci.yml` | NO | LOW | **PARTIAL** | Image pipeline exists; deploy not proven here. |
| **Backend 4** | Postgres readiness | migrations `001`, db client, tests | NO | LOW | **PARTIAL** | Code ready; real DB not verified without DSN. |
| **Backend 5** | Verified source registry | `002` migration, `source-repository.js`, tests | NO | LOW | **PARTIAL** | Registry honest when empty. |
| **Sprint 3** | Closeout + truth audit | Public Q&A foundation, migration `003` | NO | MEDIUM | **PARTIAL** | PASS in report for *repo* work; explicitly **not deployed**. |
| **Sprints 4–8** | Infra + cache + closeout | K3s dirs, cache module, workflows | NO | MEDIUM | **PARTIAL** | Reports correctly say **NOT DEPLOYED** / forbidden context. |
| **Sprint 8** | Redis cache report | `cache/index.js`, docs | NO | LOW | **PARTIAL** | Foundation. |
| **Sprints 10–14** | RAG, Sheikh audit, family, charity, engine stub | Migrations `004`–`006`, RAG routes, engine routes, tests | **YES** (Sprint 14 engine) | MEDIUM | **Sprint 14 engine claim superseded** | Report said `engine_implemented: false`; codebase now **`engine_implemented: true`** (Sprint 17). Sprint **11** (older): no Sheikh frontend — superseded by Sprint **20** committed pages. |
| **Sprints 15–19** | RTL frontend, Sheikh UI, engine, DB tooling, CI | `apps/web/public/*`, engine module, `scripts/db/*`, workflows | **YES** (Sprint 16 vs later) | MEDIUM | **Sprint 16 superseded by Sprint 20** | Early report: dashboard not started; Sprint 20 added committed Sheikh UI. |
| **Sprints 20–24** (`SAKINA_SPRINTS_20_TO_24_REPORT.md`) | 20–21 PASS; 22–24 PARTIAL | Sheikh pages, game assets, library + privacy routes, `007` migration, scripts | **YES** (S22–S23 app mount) | HIGH → **mitigated** | **S22–S23 PASS after `app.js` wiring** | Report claimed routes intentionally not registered; **`buildApp()` omitted them**, breaking integration tests — **fixed** in this session. |

## 4. Feature audit

| Feature | Status | Evidence | Gaps |
|--------|--------|----------|------|
| Backend API | **Real** | `backend/app/src`, Fastify, 273 passing tests | Needs configured DSN + secrets in real env |
| Frontend (public) | **Partial / foundation** | `apps/web/public/*.html` (including `terms.html`, `account-deletion.html`, `data-export.html`, `contact.html`, child-game pages, library subpages), `assets/app.js`, RTL tests on core 7 pages | Core RTL test list still **7 pages** — extended pages rely on Sprint 20–24 tests |
| DB / migrations | **Foundation** | `backend/db/migrations/*.sql`, `scripts/db/run-migrations.js` | No migration apply run here without `DATABASE_URL` |
| RAG | **Foundation** | `src/rag/*`, `/api/rag/status`, tests | No vector index; counts zero by design until wired |
| Rahma Control Engine | **Real (deterministic)** | `src/engine/*`, `/api/engine/status`, `rahma-control-engine.test.js` | Audit persistence depends on DB |
| Sheikh Hasan workflow | **Partial** | `public-qa.js`, policies, tests; **7** committed `sheikh-*.html` + `sheikh.js` | Auth still placeholder / env-gated |
| Children / family | **Partial** | Migration `005`, `family.js`, `child-safety-policy.js`, tests | UI: `child.html` only; guardian flows mostly API-level |
| Children’s game | **Partial / real (static)** | `child.html`, `hasanat-game.js`, `hasanat-scenarios.json` (**32 scenarios**) | Local JSON; no server persistence |
| Islamic library | **Partial** | `library.html` + subpages, **`GET /api/library/*`** (mounted in `app.js` after this fix) | Content volume operator-dependent; approved-only when DB wired |
| Charity / sadaqah | **Foundation** | `006`, `charity.js`, `sadaqah.html`, tests | Payment deliberately off |
| Privacy / terms / data rights | **Partial** | `privacy.html`, **`terms.html`**, **`account-deletion.html`**, **`data-export.html`**, **`contact.html`**, `/api/privacy/*`, `/api/terms/status`, migration `007` | End-to-end persistence requires DB + ops process |
| Deployment / K3s | **Files only** | `deployment/k3s/rahma/*`, scripts | **Not** applied to Sakina-safe cluster from this audit |
| Docker | **Client only (this run)** | `backend/app/Dockerfile` | **`docker build` failed** — daemon pipe missing (Docker Desktop engine not running) |
| GitHub Actions | **Mixed** | `backend-ci` / `backend-image-ci` **success** on last push; `rahma-ci` + `rahma-security-scan` **failure** | Self-scan + comment triggers; **patched** in this audit |
| Tests | **Real** | `npm test` **273** pass, `npm run lint` clean, `apps/web` **8** RTL tests | — |
| Reports / docs | **Real** | `reports/`, `docs/` | Some sprint rows outdated vs HEAD |

## 5. Arabic RTL audit

- **Pages checked (in `frontend-rtl.test.js`):** `index.html`, `ask.html`, `answers.html`, `child.html`, `sadaqah.html`, `library.html`, `privacy.html`.
- **`lang="ar"` + `dir="rtl"`:** **PASS** (asserted by tests on those seven files).
- **English UI text:** **None** in stripped HTML per automated forbidden-word list in tests.
- **Pages checked:** Core bundle in `frontend-rtl.test.js`: seven pages (`index`, `ask`, `answers`, `child`, `sadaqah`, `library`, `privacy`). **Additional** committed pages (Sheikh suite, `terms.html`, account deletion/export, child-game split, library subpages) covered by **`sprints-20-24.test.js`**.
- **Issues:** Consider merging extended pages into **`PAGES`** in `frontend-rtl.test.js` for one RTL gate; otherwise two-tier coverage is intentional.

## 6. Sheikh Hasan audit

- **Public ask:** **Real API + UI** — `ask.html`, routes under sheikh/public QA; persistence requires DB + repository wiring; **503 / empty** when not configured (honest).
- **Dashboard:** **Partial** — **7** static Arabic RTL pages + `sheikh.js` on `main` (Sprint 20); auth remains **not configured** (truthful UI copy).
- **Auth:** **Partial / env-gated** — not a complete production auth stack; policies in code + tests.
- **Citation enforcement:** **Real in code** — `citation-requirement.js`, `sheikh-answer-policy.js`, engine gates, tests (`sheikh-answer-policy.test.js`, `citation-requirement.test.js`).
- **Public/private protection:** **Real** — `publicAnswerProjection` + route comments; tests for field leakage.
- **Audit logs:** **Partial** — writer exists; persistence **only** when audit storage / DB configured; engine returns `not_persisted_*` when appropriate.
- **Issues:** Sprint **20–24** report text about “not registered in `app.js`” for library/privacy was **misaligned with tests** — **corrected** by registering routes.

## 7. Rahma Control Engine audit

- **`engine_implemented`:** **true** (`rahma-control-engine.js` / `engineMetadata()`).
- **Modules:** citation, review, child safety, freshness, recommendation, ingestion controller, audit logger (see `src/engine/`).
- **Events:** matches required list in `engine-types.js` (`USER_ASKED_SHEIKH_QUESTION`, … `ADMIN_REQUESTED_RECOMMENDations`).
- **Safety rules:** enforced in gates + covered by `rahma-control-engine.test.js` / related tests.
- **API routes:** `/api/engine/status`, `POST /api/engine/process-event`, `GET /api/engine/recommendations`, `GET /api/engine/review-queue`.
- **Audit persistence:** **Conditional** on DB / audit table configuration — status fields truthful on `/api/engine/status`.
- **Issues:** None blocking code honesty; operational wiring still needed.

## 8. DB and RAG audit

- **`DATABASE_URL` configured (this workstation):** **NO** — `npm run db:check` → `{"configured":false,…,"public_safe_status":"not_configured"}`.
- **DB reachable:** **NOT VERIFIED** (no DSN).
- **Migrations:** **Present** (`001`–`006`); runner records `schema_migrations` with content hash; **not applied** here.
- **RAG mode:** **Foundation** (and honest `mode` in `rag-status.js`); vector path **not** proven.
- **Documents / chunks indexed:** **0** (explicit in `rag-status.js`).
- **Approved sources:** from registry counts when configured; else zero.
- **`safe_to_answer_from_rag`:** **false** without DB + registry + retrieval + approved rows.
- **Issues:** Earlier **`db:check` bug** (`pg` not resolved from `scripts/db/`); **fixed** via `createRequire` from `backend/app/package.json`.

## 9. Children/family/game audit

- **Family:** **API foundation** + policies; **no** full guardian UI surface.
- **Child mode:** **One page** (`child.html`) + safety copy; no PII collection in game JSON.
- **Game:** **32** scenarios in `hasanat-scenarios.json` (meets **≥ 30** requirement); client-side scoring in `hasanat-game.js`.
- **PII blocking:** policy + tests (`family-child-safety.test.js`); game filters `child_safe !== true`.
- **Issues:** Progress is **local** only; no harsh-language test corpus beyond scenario design + `enforceChildSafety`.

## 10. Islamic library audit

- **Pages:** `library.html` exists.
- **API:** source listing gated by approval / DB configuration in backend.
- **Approved-only rule:** **Enforced in policy** when store wired; fail-closed when empty.
- **Source display:** projected fields when data exists; otherwise unavailable messaging via app shell patterns.
- **Issues:** No standalone “scholar verified every paragraph” claim — good; content volume still **operator-dependent**.

## 11. Charity/sadaqah audit

- **Campaigns:** migration + routes + **policy** (`campaign-policy.js`).
- **Payment status:** **Disabled / not_configured** unless real provider env — **no fake success**.
- **Transparency:** transparency route shape exists in backend tests/docs patterns.
- **Fake claim scan:** tests assert responses omit `donation successful`, `payment complete`, etc.
- **Issues:** None for “fake payment success”; legal/regulatory copy still **operator responsibility**.

## 12. Privacy/data rights audit

- **Privacy:** **Page +** `GET /api/family/privacy` content.
- **Terms:** **`terms.html`** present + **`GET /api/terms/status`**.
- **Delete account / data export:** **`account-deletion.html`**, **`data-export.html`** + **`POST /api/privacy/delete-account-request`**, **`POST /api/privacy/data-export-request`** (honest `storage_not_configured` without DB).
- **Child privacy:** addressed inside privacy article fetch + family policy docs.
- **Issues:** GDPR-style flows **not** end-to-end in UI.

## 13. Security audit

| Severity | Finding | File/line (indicative) | Risk | Fix status | Recommendation |
|----------|---------|-------------------------|------|------------|----------------|
| High | **Library + privacy routes not registered in `buildApp()`** | `backend/app/src/app.js` | **8** failing integration tests on `dc8672c` | **Fixed** — `app.register(libraryRoute…)` + `privacyRoute` | Aligns code with `sprints-20-24.test.js` and product wiring |
| Medium | **CI fake-claim job matched own workflow text** | `.github/workflows/rahma-ci.yml` | Permanent red `rahma-ci` | **Fixed earlier on `main`** (`--exclude='rahma-ci.yml'`) | Re-verify on next push |
| Medium | **`db:check` / migrations scripts could not resolve `pg`** when run from `scripts/db/` | `scripts/db/*.js` | Script appears broken | **Fixed earlier on `main`** (`createRequire` from `backend/app/package.json`) | `npm run db:check` OK without DSN |
| Medium | **Secret-scan grep matched its own pattern line + CI doc** | `rahma-security-scan.yml`, `docs/ci/RAHMA_GITHUB_PIPELINES.md` | False positive red builds | **Fixed** (grep `--exclude` for those files) | Extend excludes only when documenting patterns |
| Medium | **Cross-project grep hit deployment comments** | `secrets.example.yaml`, `00-namespace.yaml` | Blocks `rahma-security-scan` | **Fixed** (rephrased comments) | Prefer neutral wording in active YAML |
| Low | **`kubectl` default context is foreign AKS prod** | user kubeconfig | Accidental apply if scripts bypassed | **Not fixed** (environment) | Run `verify-rahma-cluster.sh` before any apply |
| — | No raw production secrets observed in sampled paths | — | — | — | Keep `.env` out of git; maintain `.dockerignore` |

## 14. Docker/CI/K3s audit

- **Docker:** Client **29.4.1** present; **`docker build` failed** — Docker Desktop Linux engine **not running** (`npipe://...dockerDesktopLinuxEngine` missing).
- **CI:** On last `main` push (`gh run list`): **`backend-ci` ✅**, **`backend-image-ci` ✅**, **`rahma-ci` ❌**, **`rahma-security-scan` ❌**, **`rahma-release-readiness` ❌** (0s — needs separate look if still relevant). Failures explained by **self-matching scans** and **deployment comment strings** — addressed in this audit commit.
- **K3s context:** `kubectl config current-context` → **`aks-iterlaw-we-prod`** (**wrong project** for Rahma apply).
- **Namespace `rahma`:** **Not found** on this context (`kubectl get ns rahma` → NotFound).
- **Pods/Services/Ingress:** **N/A** for Rahma on correct cluster — **NOT DEPLOYED / NOT VERIFIED**.
- **Deployment status:** **Manifests + docs only** until a Sakina-safe kubeconfig and DNS exist.
- **Issues:** Do not treat AKS nodes as Rahma infrastructure.

## 15. Tests and commands

| Command | Result |
|---------|--------|
| `cd F:/rahma/backend/app && npm run lint` | **PASS** |
| `cd F:/rahma/backend/app && npm run build` | **PASS** |
| `cd F:/rahma/backend/app && npm test` | **PASS** — **273** tests |
| `cd F:/rahma/apps/web && npm test` | **PASS** — **8** tests |
| `cd F:/rahma/backend/app && npm run db:check` (no `DATABASE_URL`) | **PASS** — JSON `not_configured` (**after** `pg` resolution fix) |
| `docker build -f Dockerfile .` in `backend/app` | **FAIL** — daemon unavailable |
| `kubectl config current-context` | `aks-iterlaw-we-prod` |
| `kubectl get ns rahma` | **NotFound** |
| `gh run list --limit 5` | Shows recent **success** + **failure** mix (see §14) |

No `npm run typecheck` script at package level.

## 16. Fixes applied

| File | Fix | Reason | Tests |
|------|-----|--------|-------|
| `scripts/db/check-db-health.js` | Load `pg` via `createRequire(backend/app/package.json)` | `npm run db:check` threw `ERR_MODULE_NOT_FOUND` | `npm run db:check`, `db-tooling.test.js` |
| `scripts/db/run-migrations.js` | Same `pg` resolution + `__dirname` order | Same module resolution for `db:migrate` | `migrations.test.js` (indirect) |
| `.github/workflows/rahma-ci.yml` | Exclude `rahma-ci.yml` from fake-claim grep; restore literal patterns | Job matched its own strings | — (CI on next push) |
| `.github/workflows/rahma-security-scan.yml` | Exclude self + `RAHMA_GITHUB_PIPELINES.md` from first secret grep | Self-match false positive | — |
| `deployment/k3s/rahma/data/secrets.example.yaml` | Rephrase comment | Cross-project scan false positive | — |
| `deployment/k3s/rahma/00-namespace.yaml` | Rephrase comment | Cross-project scan false positive | — |
| `backend/app/src/app.js` | Register `libraryRoute` (`/api/library`) and `privacyRoute` (`/api`) in `buildApp()` | Routes existed but were omitted — **`npm test` had 8 failures** on `dc8672c` | **`npm test` 273/273 pass** |
| `reports/RAHMA_FULL_PROJECT_AUDIT.md` | Refreshed for `dc8672c` + route fix | Audit deliverable | — |

## 17. Remaining work

- **Critical:** Obtain **Sakina-safe** kube context; **never** apply to `aks-iterlaw-we-prod`; provision **`rahma` namespace** on correct cluster; configure **secrets** via operator process (not git).
- **High:** Wire **`DATABASE_URL`** in staging and run **`npm run db:migrate`** + **`db:check`**; confirm **GitHub Actions** green after this push; optionally extend **`frontend-rtl.test.js`** `PAGES` to all public HTML.
- **Low:** Run **`docker build`** when Docker Desktop is running; optionally add root **`package.json`** orchestrator for monorepo commands.

## 18. Final truth statement

I did not claim PASS, DONE, DEPLOYED, RAG ACTIVE, DB BACKED, K3S VERIFIED, AUTH COMPLETE, PAYMENT ACTIVE, DOCKER BUILT, WORKFLOW PASSED, or PUSHED without real command evidence.
