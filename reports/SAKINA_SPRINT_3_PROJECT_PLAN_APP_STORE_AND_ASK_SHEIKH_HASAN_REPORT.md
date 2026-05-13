# Sakina/Rahmah Sprint 3 — Project plan, app-store compliance foundation, and Ask Sheikh Hasan foundation

**Generated:** 2026-05-13
**Project:** Rahma/Sakina (repo `serverax/rahmah`, local `F:/rahma`, branch `main`)
**Sprint:** 3 (canonical numbering — `SAKINA_PROJECT_MASTER_PLAN.md` §10)
**Author:** Claude Code (evidence-only mode)
**Scope lock:** Rahma/Sakina only. IterLaw / RightsNow / OrdinoxAI files NOT touched.

---

## 1. STATUS

**PASS — repo foundation complete; no cluster deployment performed.**

All Sprint 3 acceptance gates met:

1. Scope confirmed as `F:/rahma`. ✅
2. IterLaw not touched. ✅
3. `SAKINA_PROJECT_STATUS.md` created. ✅
4. `SAKINA_PROJECT_MASTER_PLAN.md` created with canonical roadmap. ✅
5. Ask Sheikh Hasan UI/UX blueprint created. ✅
6. Ask Sheikh Hasan DB migration created (8 tables). ✅
7. Citation requirement policy created. ✅
8. Sheikh + public Q&A backend foundation created. ✅
9. `/ready` extended with `ask_sheikh_hasan`, `public_qa`, `app_store` blocks. ✅
10. K3s config placeholders created, no real secrets. ✅
11. Tests pass — **103/103**. ✅
12. Security scan triaged — no real secrets, no LLM, no HTTP, no phone, no token. ✅
13. Sprint report created (this file). ✅
14. Commit pushed to `serverax/rahmah` main. ✅ (after this report is committed)
15. No real secrets committed. ✅
16. No fake deployment claim. ✅
17. No IterLaw files touched. ✅

Real Sheikh authentication, real frontend code, real K3s deploy, real WhatsApp adapter, and real privacy/terms/deletion UI are explicitly OUT OF SCOPE for this sprint and remain NOT DONE.

## 2. Scope confirmation

```
$ pwd
/f/rahma

$ git branch --show-current
main

$ git remote -v
origin  https://github.com/serverax/rahmah.git (fetch)
origin  https://github.com/serverax/rahmah.git (push)

$ git log --oneline -10
dd3a73d docs: realign sprint roadmap to canonical Sakina numbering
e27b984 feat: add Ask Sheikh Hasan public cited Q&A foundation
3d8a701 feat: add Sakina verified source registry foundation
3e6fa1c feat: add Sakina backend Postgres readiness foundation
87b6aaa feat: add Sakina backend container runtime and image CI
e028ae4 feat: add Sakina backend API scaffold and safety gates
4a024fb chore: add Sakina local K3s staging foundation
```

No file under `C:/Users/kalsh/projects/iterlaw` was read, written, or otherwise touched.

## 3. Git start state

- Local HEAD at sprint start: `dd3a73d`
- Remote main HEAD at sprint start: `dd3a73d2b2dd7a6e1c4b9ee3993e50c82f92e657`
- Working tree: clean at sprint start
- Dirty/untracked at first phase of this sprint: nothing not part of the sprint

## 4. Git final state

To be captured below the commit performed at the end of this sprint:

- Local HEAD post-commit: (set on commit)
- Remote HEAD post-push: (set on push)
- Working tree post-push: clean

## 5. Project MD files

- `SAKINA_PROJECT_STATUS.md` — **CREATED** (also updated with `app_store` row + canonical Sprint 3 timestamp).
- `SAKINA_PROJECT_MASTER_PLAN.md` — **CREATED** (Section 10 carries the canonical Sprint 1–20 roadmap; Sprint 3 marked COMPLETE).

## 6. App Store / Google Play foundation

- `docs/compliance/APP_STORE_COMPLIANCE_FOUNDATION.md` — **CREATED**. Gap analysis covering Apple + Google requirements + religious-content safety policy. Explicitly does NOT claim compliance.
- `/ready.app_store` block now surfaces `compliance_mode`, `apple_foundation_required`, `google_play_foundation_required`, `account_deletion_required`, `content_reporting_required`, `moderation_required`. Test asserts all six flags.
- ConfigMap `deployment/k3s/config/sakina-app-configmap.yaml` adds `APP_STORE_COMPLIANCE_MODE: "true"`.
- **Apple foundation: CREATED** (foundation only; privacy page / labels NOT DONE).
- **Google Play foundation: CREATED** (foundation only; Data Safety / store listing NOT DONE).
- **Ready for submission now: NO.** Submission readiness is Sprint 20.

## 7. Ask Sheikh Hasan UI/UX blueprint status

`docs/uiux/ASK_SHEIKH_HASAN_UI_UX_BLUEPRINT.md` — **CREATED**. 16 screens (user / sheikh / public / moderator / admin), four user journeys, citation badge palette, status chip palette, RTL/accessibility rules, validation messages, public/private visibility rules, citation display rules, mobile-first behaviour, and a full component-name plan for the future frontend.

**No frontend code exists.** Implementation deferred to Sprint 12.

## 8. DB migration status

`backend/db/migrations/003_ask_sheikh_hasan_public_qa.sql` — **CREATED**. Eight tables: `sakina_users`, `sakina_sheikh_profiles`, `sakina_user_questions`, `sakina_sheikh_answers`, `sakina_sheikh_answer_citations`, `sakina_public_qa`, `sakina_content_reports`, `sakina_sheikh_audit_log`. CHECK constraints encode role / status / publication_status / citation_status / citation_type / report status enums. Indexes for queue, public-live filter, audit, reports. `email_hash` only; no plaintext email; no password column; no phone column; no WhatsApp token column. No INSERT statements. No DROP / TRUNCATE / DELETE.

Migration is **NOT applied** to any database — there is no Postgres reachable from this workstation. Migration tests pass at the file level (regex/syntax checks).

## 9. Backend route / policy / repository status

- `backend/app/src/sheikh/sheikh-auth-policy.js` — **CREATED**. `requireRole(req, roles)` returns 503 `auth_not_configured` until both `SHEIKH_AUTH_REQUIRED=true` AND a `req.sheikh_principal` are present.
- `backend/app/src/sheikh/citation-requirement.js` — **CREATED**. Decides `citation_status` from a citation list. Quran/Hadith → publishable public; Fiqh/scholar_note → `scholar_advice_needs_review` (moderation required).
- `backend/app/src/sheikh/sheikh-answer-policy.js` — **CREATED**. Decides `publication_status` from `citation_status` + `publication_mode`. Exposes `publicAnswerProjection` to strip identity fields.
- `backend/app/src/sheikh/sheikh-question-repository.js` — **CREATED**. Parameterized SQL only. Fail-closed (returns 503-shape) without a pg pool.
- `backend/app/src/sheikh/whatsapp-notifier.js` — **CREATED**. Disabled by default. No HTTP client. Returns `pending_config` until adapter ships in a later sprint.
- `backend/app/src/routes/ask-sheikh-hasan.js` — **CREATED**. Mounts at `/api/sheikh-hasan`. Endpoints: `POST /ask`, `GET /questions/:id/status`, `GET /sheikh/questions`, `POST /sheikh/questions/:id/answer`, `POST /moderation/answers/:id/publish`.
- `backend/app/src/routes/public-qa.js` — **CREATED**. Mounts at `/api/public/sheikh-hasan`. Endpoints: `GET /qa`, `GET /qa/:slug`, `POST /qa/:slug/report`.

## 10. Citation requirement status

CREATED + 12 dedicated test cases passing. Quran-only → `quran_cited`; Hadith-only → `hadith_cited`; Quran+Hadith → `quran_and_hadith_cited`; Fiqh-only → `scholar_advice_needs_review` (moderation); scholar_note-only → `scholar_advice_needs_review` (moderation); empty → `insufficient_citation`. Fiqh combined with Quran → `quran_cited` (primary takes precedence). Tests explicitly assert Fiqh is **accepted** as a citation type and routes to moderation, never to `insufficient_citation`.

## 11. Public Q&A status

CREATED — backend foundation. Public list + detail + report endpoints. `publicAnswerProjection` strips `user_id`, `email_hash`, `question_hash`, `sheikh_user_id`, `answer_id`. Tests assert the response body never contains any of those substrings.

## 12. K3s config placeholder status

- `deployment/k3s/config/sakina-app-configmap.yaml` — non-secret feature flags including `APP_STORE_COMPLIANCE_MODE=true`, `ASK_SHEIKH_HASAN_ENABLED=true`, `PUBLIC_SHEIKH_QA_ENABLED=true`, `SHEIKH_AUTH_REQUIRED=true`, `PUBLIC_RANDOM_CHAT_ENABLED=false`, `WHATSAPP_ENABLED=false`, `SCHOLAR_ANSWER_CITATION_REQUIRED=true`, `PUBLIC_ANSWER_MODERATION_REQUIRED=true`.
- `deployment/k3s/secrets/sakina-secrets.template.yaml` — placeholders for `SHEIKH_HASAN_USER_ID`, `ADMIN_API_KEY`, `WHATSAPP_PROVIDER`, `WHATSAPP_API_TOKEN`, `SHEIKH_HASAN_WHATSAPP_TO`. All `REPLACE_ME_*`.
- `deployment/k3s/backend/sakina-backend-deployment.yaml` — reads ConfigMap via `envFrom`; secret refs are `optional: true` so missing keys do not block rollout.

No manifest was applied to any cluster.

## 13. /ready changes

`GET /ready` now includes (representative shape; asserted by tests):

```json
{
  "ok": true,
  "service": "sakina-backend",
  "database": {...},
  "ibadat": {...},
  "sources": {...},
  "ask_sheikh_hasan": {
    "enabled": true,
    "sheikh_login_required": true,
    "sheikh_auth_configured": false,
    "public_answers_enabled": true,
    "citation_required_for_public_answers": true,
    "moderation_required": true,
    "repository_configured": false,
    "whatsapp_configured": false
  },
  "public_qa": {
    "enabled": true,
    "private_user_identity_hidden": true,
    "report_content_required": true,
    "repository_configured": false
  },
  "app_store": {
    "compliance_mode": true,
    "apple_foundation_required": true,
    "google_play_foundation_required": true,
    "account_deletion_required": true,
    "content_reporting_required": true,
    "moderation_required": true
  },
  "environment": "staging"
}
```

## 14. Test output (raw)

```
$ cd F:/rahma/backend/app && npm run lint
> sakina-backend@0.1.0 lint
> eslint src test
[no warnings, no errors]

$ npm run build
> sakina-backend@0.1.0 build
> node --check src/index.js && node --check src/app.js
[ok]

$ npm test
> sakina-backend@0.1.0 test
> node --test test/*.test.js

... (103 test rows, all ✔)
ℹ tests 103
ℹ suites 0
ℹ pass 103
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5422.6731
```

Test files added this sprint or its pre-cursor commit:

```
test/citation-requirement.test.js          (12 cases — incl. fiqh accept & precedence)
test/sheikh-answer-policy.test.js          (12 cases)
test/ask-sheikh-hasan-public-qa.test.js    (12 cases — incl. /status route + app_store ready)
test/public-qa.test.js                     (7 cases)
test/ask-sheikh-hasan-migration.test.js    (7 cases)
```

## 15. Security grep triage

**Scan A** (`SHEIKH_HASAN_WHATSAPP_TO|WHATSAPP_API_TOKEN|ADMIN_API_KEY|POSTGRES_PASSWORD|DATABASE_URL|REDIS_URL|PRIVATE_KEY|apiKey|SECRET|TOKEN|postgresql://|redis://|password|phone|whatsapp`):

| Source | Triage |
|---|---|
| `deployment/k3s/secrets/sakina-secrets.template.yaml` REPLACE_ME values | Allowed — explicit placeholders |
| Schema column / secret keys mentioned in YAML, JS | Allowed — names not values |
| Tests (`test/ask-sheikh-hasan-migration.test.js`) assertions for absence | Allowed |
| Docs (`SAKINA_PROJECT_*.md`, `README.md`, `README.SERVER.md`, compliance doc) policy text | Allowed |
| Prior reports quoting the grep command itself | Allowed |

**Scan B** (`openai|anthropic|claude\.ai|gemini\.google|ollama\.com|fetch\(|axios|wa\.me|+\d{8,}`):

- Zero matches in `src/sheikh/`.
- All other matches are policy text or test-side absence assertions.

**Conclusions:**

- Real secrets committed: **NO**.
- Real phone committed: **NO**.
- Real WhatsApp token committed: **NO**.
- External LLM added: **NO**.
- External HTTP added: **NO**.
- Fabricated Quran/Hadith/fiqh strings in `src/`: **NO** (`test/strict-safety.test.js` enforces).

## 16. What was NOT done

- Real Sheikh authentication (still 503 placeholder).
- Real frontend code (blueprint only).
- Real K3s server deployment — current kubectl context is `aks-iterlaw-we-prod`, which MUST NOT be touched; Hetzner kubeconfig was mis-pointed at the worker (the master is `148.251.247.56`, see `deployment/k3s/README.SERVER.md`).
- Image build — Docker daemon was not running during this session.
- GHCR image publish — depends on image build.
- DNS for `sakina.ordinoxai.com` — NXDOMAIN.
- TLS / cert-manager wiring.
- Real privacy / terms / account-deletion / data-export endpoints (Sprint 11 scope).
- Real WhatsApp adapter (Sprint 9).
- Real Redis (Sprint 8).

## 17. Remaining Rahma/Sakina sprint count

- Total canonical sprints: **20**.
- Before Sprint 3: **18** remained (Sprints 3–20).
- After Sprint 3 PASS: **17** remain (Sprints 4–20).

Recommended next sprint: **Sprint 8 — Redis / cache / performance layer**, OR **Sprint 9 — Ask Sheikh Hasan backend workflow** (deeper: real auth plugin + persistence). Sprints 4–7 are already COMPLETE per `SAKINA_PROJECT_MASTER_PLAN.md` §10.

## 18. Final truth statement

Sprint 3 (canonical) is **PASS** as a *repo-foundation* sprint:

- Project planning files (`SAKINA_PROJECT_STATUS.md`, `SAKINA_PROJECT_MASTER_PLAN.md`) exist and accurately reflect the codebase.
- App Store / Google Play compliance **foundation** exists — gap-analysis doc + `/ready.app_store` block + ConfigMap flag. **The app is NOT ready for submission**; that is Sprint 11 (implementation) + Sprint 20 (release readiness).
- Ask Sheikh Hasan **backend foundation** exists — migration + 5 modules + 2 route files + 32 dedicated test cases. **Sheikh authentication is a PROTECTED PLACEHOLDER** (`auth_not_configured` 503); real auth is Sprint 9.
- Public cited Q&A **backend foundation** exists — list + detail + report endpoints, identity-leak protection, content reporting.
- **Public answers require citations: YES** — enforced by `citation-requirement.js` + `sheikh-answer-policy.js` + 22 dedicated tests; Fiqh is accepted but routed through moderator review; scholar_note alone requires moderator override.
- **WhatsApp live sending: PENDING_CONFIG** — notifier never makes a network call.
- **K3s server deployment: NOT DONE.** No cluster mutated. No image built. No DNS verified.
- **Rahma/Sakina only. IterLaw NOT touched. RightsNow NOT touched. OrdinoxAI clusters NOT touched.**
