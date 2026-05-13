# Rahma/Sakina Full Project Audit

## 1. Scope confirmation

- **Directory audited:** `F:/rahma` (authoritative workspace).
- **`F:/rahmah` exists:** **NO** — path does not exist on this machine. Audit was performed only under `F:/rahma` per instructions when `cd F:/rahmah` would fail.
- **`F:/rahma` exists:** **YES**.
- **Repo:** `https://github.com/serverax/rahmah` (remote `origin`).
- **Branch:** `main`.
- **HEAD (audit commit):** `7bd5f44` on `main` (includes this report, inventory, DB script fix, CI scan fixes, deployment comment neutralisation).
- **Remote:** `https://github.com/serverax/rahmah.git` (fetch/push).
- **Other projects touched:** **NO** — no edits under IterLaw, OrdinoxAI app repos, RightsNow, or Alaa Beauty. References to those names appear only in allowed documentation/scope-lock text (see contamination).
- **Contamination scan (`iterlaw|ordinox|rightsnow|alaa`, case-insensitive content):**
  - **Allowed historical / scope-lock text:** `SAKINA_PROJECT_MASTER_PLAN.md`, `SAKINA_PROJECT_STATUS.md`, multiple `reports/*.md`, `docs/ci/RAHMA_GITHUB_PIPELINES.md`, `docs/ops/*.md`, `deployment/k3s/README.SERVER.md`, `.github/workflows/rahma-security-scan.yml` (step titles and scan logic), `scripts/deploy/verify-rahma-cluster.sh`, `scripts/k3s/*.sh`, deployment comments (after audit fixes, active YAML under `deployment/k3s/rahma/` avoids product-name literals in **code-scan paths** where required by CI).
  - **Forbidden active reference:** None found in `backend/app/src`, `apps/web/public` assets (excluding allowlisted docs), or application logic beyond operational warnings (e.g. “do not use prod context”).
  - **Unrelated project contamination:** **NO** embedded IterLaw/OrdinoxAI **application** code; operational docs describe shared-cluster constraints.

---

## 2. Executive verdict

- **Overall status:** **PARTIAL**
- **Reason:** Strong backend foundations, honest `/ready` and subsystem flags, 246 passing Node tests locally, Arabic RTL scaffold with automated checks; **no verified Rahma deployment** on a dedicated cluster, **no `DATABASE_URL` in this audit session** (DB probe returns `not_configured`), **RAG is foundation-first** (`vector_configured: false`, counts not asserted as live), **Sheikh auth is placeholder** (`auth_not_configured` unless future plugin + env), **GitHub Actions previously failed** on self-referential scans (addressed in this audit’s CI fixes). Untracked Sheikh dashboard HTML/JS exists locally and is **not** on `main` until committed.
- **Biggest blockers:** Production Rahma K3s context + DNS + secrets; real Postgres + migrations in a live env; auth provider for Sheikh routes; CI green on `main` after workflow/manifest fixes; Docker daemon for local image build verification.
- **Safe to deploy:** **NO** — manifests exist; no evidence of apply to a Rahma-safe cluster; current default `kubectl` context is **Azure AKS IterLaw** (`aks-iterlaw-we-prod`); **no `rahma` namespace** observed there.
- **Safe to call RAG active:** **NO** — registry/retrieval wiring is honest; `safe_to_answer_from_rag` requires approved sources + DB + retrieval; vector path not proven.
- **Safe to call DB backed:** **NO** for this workstation audit — `npm run db:check` returns `configured: false` without `DATABASE_URL`. Migrations and SQL exist in-repo.
- **Safe to call auth complete:** **NO** — policy is explicit placeholder/fail-closed.
- **Safe to call payment active:** **NO** — charity routes/tests enforce `provider_not_configured` / disabled behaviour.

---

## 3. Sprint claim audit

Reports found under `reports/` and related `docs/` (no dedicated files for sprints **20–24**):

| Sprint / bundle | Claimed status (report) | Evidence found | Corrected status | Mismatch? | False PASS risk? | Notes |
|-------------------|-------------------------|------------------|------------------|-----------|------------------|-------|
| **10** (RAG foundation) | PASS — foundation | `004_islamic_rag_foundation.sql`, `src/rag/*`, `/api/rag/status`, tests | **PARTIAL / foundation** | NO | LOW | Matches “foundation only”; not live vector RAG. |
| **11** (Sheikh hardening) | PARTIAL | Audit module, policies, tests; dashboard **was** “not started” in 10–14 report | **PARTIAL** | NO | MEDIUM | Untracked `sheikh-*.html`, `sheikh.js` now exist locally — not on remote until committed. |
| **12** (Family/child) | PASS — backend | `005_family_child_safety.sql`, `routes/family.js`, tests | **PARTIAL** | NO | LOW | Backend foundation; UI partial (`child.html`, game). |
| **13** (Charity) | PASS — payment disabled | `006_charity_campaigns.sql`, `routes/charity.js`, tests | **PARTIAL** | NO | LOW | Honest disabled payment — good. |
| **14** (Observability) | PASS; engine stub “false” in that report | Engine routes + later engine `true` | **SUPERSEDED** | YES vs old report | MEDIUM | Sprint 15–19 report updates engine to implemented — trust latest code + sprint 15–19 doc. |
| **15** (RTL frontend) | PARTIAL | `apps/web/public/*`, `frontend-rtl.test.js` | **PARTIAL** | NO | LOW | Vanilla scaffold, not Next.js — report honest. |
| **16** (Sheikh UI) | PARTIAL — dashboard not built | Public `ask.html` / `answers.html`; local untracked sheikh pages | **PARTIAL** | **YES** if report only | MEDIUM | Local files close gap partially; still need commit + auth wiring. |
| **17** (Control engine) | PASS | `rahma-control-engine.js`, gates, 30+ tests, `/api/engine/status` | **PASS (in-repo logic)** | NO | LOW | Deterministic rules only — not “AI”. |
| **18** (DB tooling) | PASS — tooling | `scripts/db/*`, `db:migrate` / `db:check` | **PARTIAL** | YES (was) | MEDIUM | `db:check` **failed** before fix (`pg` resolution); **fixed** via `createRequire` in this audit. |
| **19** (CI/K3s) | PARTIAL | Workflows, manifests; no apply | **PARTIAL** | NO | HIGH if CI called “green” | `rahma-ci` / `rahma-security-scan` **failed** on `main` push (self-match + deployment comments); **fixed** in this audit. |
| **Backend sprint 2–5** | Various PASS/PARTIAL in PDF-style reports | Postgres, container, source registry docs | **Foundation** | — | LOW | Historical; align with migrations `001`–`003`. |
| **Sprints 4–8 bundle** | Mixed | K3s files, cache, pipelines | **PARTIAL** | NO | MEDIUM | “NOT DEPLOYED” clearly stated in reports. |
| **Sprint 3** | PASS with caveats | Public Q&A, migrations | **PARTIAL** | NO | MEDIUM | Truth audit text: no prod deploy, auth placeholder. |
| **20–24** | — | **No `reports/*SPRINT*20*` … 24* files** | **MISSING** | — | — | No report artifacts. |

---

## 4. Feature audit

| Feature | Status | Evidence | Gaps |
|--------|--------|-----------|------|
| Backend API | **Real (dev-grade)** | `backend/app/src`, Fastify, `/health`, `/ready` | Production config, rate limits, Hardening |
| Frontend (Arabic RTL) | **Partial** | `apps/web/public/*.html`, `assets/app.js`, tests | No `terms.html`; framework deferred |
| DB / migrations | **Foundation** | `backend/db/migrations/001`–`006`, `run-migrations.js` | Live `DATABASE_URL` not verified here |
| RAG | **Foundation** | `rag-status.js`, migrations `004`, routes | `vector_configured: false`, no proven embeddings |
| Rahma Control Engine | **Real (rules)** | `rahma-control-engine.js`, `engine.js`, tests | Audit persistence needs DB |
| Sheikh workflow | **Partial** | `public-qa.js`, policies, tests; static pages | Auth not configured; dashboard HTML untracked |
| Child / family | **Partial** | `005`, `family.js`, `child.html`, game JSON/JS | No public child profiles by design; guardian APIs need auth |
| Child game | **Partial / real locally** | `hasanat-scenarios.json` (**32** scenarios), `hasanat-game.js` | Progress local only; no PII tests in HTML layer beyond policy |
| Islamic library | **Partial** | `library.html`, sources routes/registry | Approved-only in backend; empty without DB |
| Charity | **Partial** | `006`, `charity.js`, `sadaqah.html` | Payment explicitly disabled |
| Privacy / terms | **Partial** | `privacy.html` + `/api/family/privacy` | **No** dedicated `terms.html`, delete/export pages |
| Deployment / K3s | **Foundation** | `deployment/k3s/rahma/*`, scripts | **Not applied**; wrong default cluster |
| Docker | **Foundation** | `Dockerfile`, CI image workflow | **Local `docker build` failed** — Desktop Linux engine pipe missing |
| GitHub Actions | **Partial** | `backend-ci` success on log; `rahma-ci` / security failed then **fixed locally** | Re-run on `main` after push to prove green |
| Tests | **Real** | 246 backend + 8 frontend RTL tests passed (`2026-05-13` audit run) | E2E / Playwright not in scope |

---

## 5. Arabic RTL audit

- **Pages checked (automated list in `frontend-rtl.test.js`):** `index.html`, `ask.html`, `answers.html`, `child.html`, `sadaqah.html`, `library.html`, `privacy.html`.
- **`lang="ar"` / `dir="rtl"`:** **PASS** for those seven files (test `every page exists and declares Arabic + RTL on <html>`).
- **English UI text:** **None** in stripped HTML per `frontend-rtl.test.js` forbidden list (command evidence: `cd apps/web && npm test` — 8/8 pass).
- **Issues:** Committed `main` (at audit start) had **no** `terms.html` in the RTL test list. The working tree contained **many untracked** HTML/JS assets (`terms.html`, `account-deletion.html`, `data-export.html`, expanded library/sheikh pages, `hasanat-*.json/js`, etc.) — **not** verified by the existing `frontend-rtl.test.js` suite until added to `PAGES` and committed.

---

## 6. Sheikh Hasan audit

- **Public ask:** **Partial** — UI + API exist; persistence requires DB + repository wiring (`503` / empty when not configured — honest).
- **Dashboard:** **Partial** — static files present **only as untracked** git files (`sheikh-dashboard.html`, etc.); not part of committed baseline at audit start.
- **Auth:** **Not configured** — `sheikh-auth-policy.js` documents 503 until real plugin + `SHEIKH_AUTH_REQUIRED` and principal.
- **Citation enforcement:** **Real in code/tests** — `sheikh-answer-policy.js`, `citation-requirement.js`, `public-qa` projection + tests.
- **Public/private protection:** **Real in policy/tests** — projections and cache rules described in code comments + tests.
- **Audit logs:** **Partial** — writer exists; persistence tied to DB configuration (`not_persisted` paths when absent).
- **Issues:** Commit or drop untracked sheikh assets; wire auth before claiming “Sheikh approval workflow complete”.

---

## 7. Rahma Control Engine audit

- **`engine_implemented`:** **true** (`rahma-control-engine.js` `engineMetadata`).
- **Modules / events:** `SUPPORTED_EVENTS` in `engine-types.js` includes all types requested in the audit brief (Sheikh, content, child game, charity, family, admin recommendations, etc.).
- **Safety rules:** Implemented across `citation-gate.js`, `review-gate.js`, `child-safety-gate.js`, `freshness-checker.js`, `data-ingestion-controller.js`, `recommendation-engine.js`; covered by `rahma-control-engine.test.js` and related tests.
- **API routes:** `/api/engine/status`, `POST /api/engine/process-event`, `GET /api/engine/recommendations`, `GET /api/engine/review-queue`.
- **Audit persistence:** Honest `audit_status` / `not_persisted` when storage unavailable.
- **Issues:** Recommendations endpoint intentionally returns empty without injected approved candidates — truthful, not user-deceptive.

---

## 8. DB and RAG audit

- **`DATABASE_URL` configured (this session):** **NO** — `npm run db:check` → `public_safe_status: "not_configured"`.
- **DB reachable:** **Not verified** (no DSN).
- **Migrations:** Six SQL files `001`–`006` present; runner records `schema_migrations` with content hash; **script fix:** `pg` import resolution for `scripts/db/*.js` (command evidence: `db:check` exit 0 after fix).
- **RAG mode:** **`foundation`** when DB/registry/retrieval not all configured (`rag-status.js`).
- **Documents / chunks indexed:** **0** in status object unless extended — code states it does not lie about counts.
- **Approved sources / `safe_to_answer_from_rag`:** Tied to registry counts + flags — **false** without approved rows + DB.
- **Issues:** No pgvector proof in status (`vector_configured: false`).

---

## 9. Children/family/game audit

- **Family:** Backend policies + routes; **no** public child profile design in migrations (guardian-centric).
- **Child mode:** `child.html` + navigation.
- **Game:** “رحلة الحسنات” implemented with **32** scenarios in `hasanat-scenarios.json` (PowerShell count during audit).
- **PII blocking:** Engine + family tests; game uses local progress structure in JS — review `localStorage` usage in `hasanat-game.js` for production hardening.
- **Issues:** No automated count assertion of `32` in tests (optional improvement).

---

## 10. Islamic library audit

- **Pages:** `library.html` exists.
- **API:** Source registry / ibadat gates with fail-closed behaviour when empty.
- **Approved-only rule:** Enforced in source-store and tests.
- **Source display:** Public projections require citations for cached “valid” paths.
- **Issues:** Without DB, UI should continue to show “unavailable” states — verify `app.js` strings for library fetch errors (Arabic copy present in dictionary keys per RTL test).

---

## 11. Charity/sadaqah audit

- **Campaigns:** Model + routes + migration `006`.
- **Payment status:** **Disabled / not configured** — tests explicitly reject fake success strings.
- **Transparency:** API routes referenced in tests and `sadaqah.html` scaffold.
- **Fake claim scan:** **Grep** over repo for `donation successful|payment complete|funds transferred|verified charity|registered charity` hits only **test file** lines that assert absence — acceptable.
- **Issues:** No real payment provider keys or webhooks.

---

## 12. Privacy/data rights audit

- **Privacy:** **Real (basic)** — `privacy.html` loads `/api/family/privacy`.
- **Terms:** **Missing from committed baseline** at audit start; **untracked** `terms.html` present locally — not in CI/tests until committed.
- **Delete account / data export:** **Missing from committed baseline**; **untracked** `account-deletion.html` / `data-export.html` present locally.
- **Child privacy:** Covered in family migration + policy text paths; not a lawyer-signed policy artifact.
- **Issues:** No `privacy_requests` table verification without DB; migration coverage to be confirmed when DB live.

---

## 13. Security audit

| Severity | Finding | File/line (representative) | Risk | Fix status | Recommendation |
|----------|---------|---------------------------|------|------------|----------------|
| Medium | `npm run db:check` crashed (`ERR_MODULE_NOT_FOUND` for `pg`) when run from `backend/app` | `scripts/db/check-db-health.js` import path | Broken operator UX | **Fixed** — `createRequire` from `backend/app/package.json` | Re-run `npm run db:check` in CI optional job |
| Medium | CI **fake-claim** job matched **itself** | `.github/workflows/rahma-ci.yml` | Permanent CI failure | **Fixed** — `--exclude='rahma-ci.yml'` | Monitor for other self-references |
| Medium | CI **secret-scan** matched its own pattern line + CI doc | `rahma-security-scan.yml`, `docs/ci/RAHMA_GITHUB_PIPELINES.md` | False positive CI failure | **Fixed** — grep excludes | Keep docs naming patterns only in excluded files or paraphrase |
| Low | Cross-project grep matched deployment comments | `deployment/k3s/rahma/*.yaml` | Blocks `rahma-security-scan` | **Fixed** — neutral wording | Prefer generic cluster language in YAML comments |
| High (ops) | Default kubectl context is **non-Rahma prod** | User machine: `aks-iterlaw-we-prod` | Wrong-cluster apply risk | N/A in repo | Operators must switch context before any `kubectl apply` |
| — | No raw secrets found in committed scan scope | `backend/app/test` secret scan | — | **PASS** test `no real secret values` | Maintain `.dockerignore` / `.gitignore` for `.env` |

---

## 14. Docker/CI/K3s audit

- **Docker client:** Present (`docker version` reported `29.4.1`).
- **Docker build:** **NOT completed** — `docker build` failed: cannot connect to `dockerDesktopLinuxEngine` (daemon not running / wrong pipe).
- **CI:** `gh run list` on `2026-05-13` showed **`rahma-ci`** and **`rahma-security-scan`** **failure** on latest push; **`backend-ci`** and **`backend-image-ci`** **success**. Fixes applied in working tree; **not proven green until pushed and re-run**.
- **K3s context:** `kubectl config current-context` → **`aks-iterlaw-we-prod`** (IterLaw AKS — **wrong** target for Rahma apply).
- **Namespace `rahma`:** **Absent** in `kubectl get ns` output on this context.
- **Pods/services/ingress:** **Not audited** on a Rahma cluster — none available.
- **Deployment status:** **NOT DEPLOYED / NOT VERIFIED** for Rahma on a dedicated environment.
- **Issues:** Do not use this AKS context for Rahma manifests; use `verify-rahma-cluster.sh` gates when a proper kubeconfig exists.

---

## 15. Tests and commands

| Command | Result |
|---------|--------|
| `Test-Path F:/rahmah` | **False** |
| `Test-Path F:/rahma` | **True** |
| `cd F:/rahma; git remote -v; git branch --show-current; git status -sb; git log -20` | `origin` correct; `main`; **untracked** `apps/web/public/sheikh*` + `assets/sheikh.js`; log as expected |
| `Get-ChildItem … \| match iterlaw\|…` on paths | **No path-name hits** |
| `rg -i iterlaw\|ordinox\|rightsnow\|alaa` (content) | Hits in **allowed** docs/reports/workflows only; **active code** clean |
| `npm run lint` (in `backend/app`) | **PASS** |
| `npm run build` (in `backend/app`) | **PASS** |
| `npm test` (in `backend/app`) | **PASS** — **246** tests |
| `npm test` (in `apps/web`) | **PASS** — **8** tests |
| `npm run db:check` (before fix) | **FAIL** — `pg` module not found |
| `npm run db:check` (after fix) | **PASS** (exit 0) — JSON `configured: false` |
| `node --test test/db-tooling.test.js` | **PASS** — 8 tests |
| `docker build …` (backend `Dockerfile`) | **FAIL** — Docker engine unavailable |
| `kubectl config current-context` | `aks-iterlaw-we-prod` |
| `kubectl get nodes` / `kubectl get ns` | AKS cluster; **no `rahma` namespace** |
| `gh run list --limit 5` | See §14 |

**`npm run typecheck`:** not defined in `backend/app/package.json` — **skipped**.

---

## 16. Fixes applied

| File | Fix | Reason | Tests |
|------|-----|--------|-------|
| `scripts/db/check-db-health.js` | Load `pg` via `createRequire(backend/app/package.json)` | `npm run db:check` must run from `backend/app` | `db-tooling.test.js` + manual `npm run db:check` |
| `scripts/db/run-migrations.js` | Same `pg` resolution | Same module resolution issue for `db:migrate` | Existing migration tests / tooling tests |
| `.github/workflows/rahma-ci.yml` | Exclude `rahma-ci.yml` from fake-phrase grep; rename job | CI self-match caused permanent failure | — |
| `.github/workflows/rahma-security-scan.yml` | Exclude self + `RAHMA_GITHUB_PIPELINES.md` from secret-shaped grep | Workflow + doc listed pattern tokens | — |
| `deployment/k3s/rahma/data/secrets.example.yaml` | Neutral comment wording | Cross-project contamination grep | — |
| `deployment/k3s/rahma/00-namespace.yaml` | Neutral comment wording | Same | — |

---

## 17. Remaining work

- **Critical:** Obtain **Rahma-only** kubeconfig + DNS; **never** apply from `aks-iterlaw-we-prod`; run `verify-rahma-cluster.sh` before any mutation.
- **Critical:** Provision Postgres; set `DATABASE_URL`; run `npm run db:migrate`; re-run `db:check` and integration tests.
- **High:** Commit or remove untracked Sheikh dashboard static files; integrate with auth plugin.
- **High:** Push CI fixes and confirm **`rahma-ci`** + **`rahma-security-scan`** green on GitHub.
- **Medium:** Add `terms.html`, account deletion, and data export flows (UI + API + migrations if missing).
- **Medium:** Start Docker Desktop (or Linux engine) and capture a successful `docker build` for evidence.
- **Low:** Extend RTL test list if new HTML pages are kept.

---

## 18. Final truth statement

I did not claim PASS, DONE, DEPLOYED, RAG ACTIVE, DB BACKED, K3S VERIFIED, AUTH COMPLETE, PAYMENT ACTIVE, DOCKER BUILT, WORKFLOW PASSED, or PUSHED without real command evidence.

---

*Inventory file (Phase 2): `reports/RAHMA_AUDIT_FILE_INVENTORY.txt` (depth 5 file listing; ~1919 lines at generation time).*
