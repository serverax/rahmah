# Sakina Sprint 6 — Ask Sheikh Hasan public cited Q&A foundation

**Generated:** 2026-05-13
**Project:** `rahmah` (Sakina/Rahmah Islamic app)
**Repo:** `serverax/rahmah`, branch `main`
**Local path:** `F:/rahma`
**Author:** Claude Code (evidence-only mode)
**Scope lock:** Rahma/Sakina only. IterLaw (`C:/Users/kalsh/projects/iterlaw`) NOT touched. RightsNow NOT touched. OrdinoxAI infrastructure NOT touched at the cluster level.

---

## 1. STATUS

**PARTIAL — foundation CREATED. Nothing deployed to any cluster.**

What is CREATED (this sprint):

- UI/UX blueprint (`docs/uiux/ASK_SHEIKH_HASAN_UI_UX_BLUEPRINT.md`).
- DB migration `003_ask_sheikh_hasan_public_qa.sql` (8 tables, enums, indexes).
- Backend modules under `backend/app/src/sheikh/`:
  - `sheikh-auth-policy.js` (role gate; 503 placeholder).
  - `citation-requirement.js` (citation status decision).
  - `sheikh-answer-policy.js` (publication decision + public projection).
  - `sheikh-question-repository.js` (parameterized SQL, fail-closed without pool).
  - `whatsapp-notifier.js` (disabled by default, no HTTP client).
- Routes under `backend/app/src/routes/`:
  - `ask-sheikh-hasan.js` (user POST, sheikh queue, sheikh answer, moderator publish).
  - `public-qa.js` (public list, public detail, public report).
- `/ready` extended with `ask_sheikh_hasan` and `public_qa` blocks.
- K3s configuration:
  - New `deployment/k3s/config/sakina-app-configmap.yaml` with feature flags.
  - `deployment/k3s/backend/sakina-backend-deployment.yaml` reads from the ConfigMap and adds optional Secret refs.
  - `deployment/k3s/secrets/sakina-secrets.template.yaml` extended with Sheikh + WhatsApp placeholders.
- Top-level `SAKINA_PROJECT_STATUS.md` and `SAKINA_PROJECT_MASTER_PLAN.md`.
- Local repo hygiene from earlier in the same session: `.gitignore` excludes `.kube/`, `*.kubeconfig`, `kubeconfig*`, `sakina-k3s.yaml`, `*.tar`. `deployment/k3s/README.SERVER.md` documents the real K3s master (`148.251.247.56`) vs worker (`138.201.253.245`).

What is NOT done (still BLOCKED / NOT STARTED):

- Real Sheikh authentication. Routes return 503 `auth_not_configured` until a real auth plugin is wired.
- Real frontend code. Only the blueprint exists. No `mobile-app/` source.
- Real moderator UI / admin UI.
- Real Postgres database deployed in any cluster.
- Container image built / pushed. Docker daemon was not running on this workstation during this session.
- Apply to any K3s cluster. The current `kubectl` context is `aks-iterlaw-we-prod` (the unsafe AKS prod context for a different project); the Hetzner kubeconfig (`~/.kube/config-hetzner`) points at the worker IP rather than the master and so the API is unreachable.
- DNS `sakina.ordinoxai.com` — NXDOMAIN, ingress remains UNAPPLIED.
- Real WhatsApp adapter. The notifier returns `pending_config` and never makes an external HTTP call.

## 2. Scope confirmation

```
$ cd F:/rahma && pwd
/f/rahma

$ git status -sb
## main...origin/main
[clean at session start]

$ git branch --show-current
main

$ git remote -v
origin	https://github.com/serverax/rahmah.git (fetch)
origin	https://github.com/serverax/rahmah.git (push)

$ git log --oneline -5
3d8a701 feat: add Sakina verified source registry foundation
3e6fa1c feat: add Sakina backend Postgres readiness foundation
87b6aaa feat: add Sakina backend container runtime and image CI
e028ae4 feat: add Sakina backend API scaffold and safety gates
4a024fb chore: add Sakina local K3s staging foundation
```

Rahma/Sakina only. No IterLaw file was opened, read, or modified.

## 3. Files changed (full list)

Modified:

```
.gitignore
backend/app/package.json
backend/app/src/app.js
backend/app/src/routes/ready.js
deployment/k3s/backend/sakina-backend-deployment.yaml
deployment/k3s/secrets/sakina-secrets.template.yaml
```

Created:

```
SAKINA_PROJECT_STATUS.md
SAKINA_PROJECT_MASTER_PLAN.md
backend/app/src/routes/ask-sheikh-hasan.js
backend/app/src/routes/public-qa.js
backend/app/src/sheikh/sheikh-auth-policy.js
backend/app/src/sheikh/sheikh-question-repository.js
backend/app/src/sheikh/sheikh-answer-policy.js
backend/app/src/sheikh/citation-requirement.js
backend/app/src/sheikh/whatsapp-notifier.js
backend/app/test/ask-sheikh-hasan-migration.test.js
backend/app/test/ask-sheikh-hasan-public-qa.test.js
backend/app/test/citation-requirement.test.js
backend/app/test/public-qa.test.js
backend/app/test/sheikh-answer-policy.test.js
backend/db/migrations/003_ask_sheikh_hasan_public_qa.sql
deployment/k3s/README.SERVER.md
deployment/k3s/config/sakina-app-configmap.yaml
docs/uiux/ASK_SHEIKH_HASAN_UI_UX_BLUEPRINT.md
```

## 4. Commands executed

Verbatim, in execution order — only the relevant ones:

```
git -C F:/rahma status -sb
git -C F:/rahma branch --show-current
git -C F:/rahma log --oneline -10
git -C F:/rahma remote -v
git -C F:/rahma ls-remote --heads origin main
kubectl config current-context
kubectl config get-contexts
nslookup sakina.ordinoxai.com
ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new root@138.201.253.245 "hostname; whoami; uname -a; date"
ssh -o BatchMode=yes -o ConnectTimeout=10 root@138.201.253.245 "hostnamectl; ip -brief addr; uptime; df -h /; free -h"
ssh -o BatchMode=yes -o ConnectTimeout=10 root@138.201.253.245 "command -v k3s; command -v kubectl; systemctl is-active k3s; systemctl is-active k3s-agent; systemctl is-active k3s-server"
ssh -o BatchMode=yes -o ConnectTimeout=10 root@138.201.253.245 "ss -tlnp; ufw status verbose; iptables -S INPUT"
ssh -o BatchMode=yes -o ConnectTimeout=10 root@138.201.253.245 "crictl ps; k3s ctr -n k8s.io images list"
docker --version
docker info
cd F:/rahma/backend/app && npm ci --no-audit --no-fund
cd F:/rahma/backend/app && npm run lint
cd F:/rahma/backend/app && npm run build
cd F:/rahma/backend/app && npm test
```

No mutating kubectl ran. No mutating SSH command ran. No `docker build` ran (daemon not running).

## 5. UI/UX blueprint status

CREATED — `docs/uiux/ASK_SHEIKH_HASAN_UI_UX_BLUEPRINT.md` (≈ 230 lines). Covers 16 screens, four user journeys (user / sheikh / public / moderator), citation badge palette, status chips, validation messages, RTL / accessibility, and full component plan. **No frontend code exists** — implementation deferred to a future sprint.

## 6. DB migration status

CREATED — `backend/db/migrations/003_ask_sheikh_hasan_public_qa.sql`. Eight tables:

- `sakina_users` (role + status enums; `email_hash` only, no plaintext email, no password column).
- `sakina_sheikh_profiles` (1:1 to user, scholar's public name + languages).
- `sakina_user_questions` (status state-machine via CHECK).
- `sakina_sheikh_answers` (citation_status + publication_status enums).
- `sakina_sheikh_answer_citations` (type enum: quran/hadith/fiqh/scholar_note; verification_status).
- `sakina_public_qa` (live public index; only table the public route reads).
- `sakina_content_reports` (status enum; reason ≤ 1000 chars).
- `sakina_sheikh_audit_log` (append-only audit; nullable actor).

Indexes for the queue, the public_qa live filter (`is_live, category, language`), the audit log, and the report queue.

Migration test results (file-level, no DB):

```
✔ migration 003 file exists and is non-trivial
✔ migration 003 declares the eight required tables
✔ migration 003 declares the role and status enums via CHECK constraints
✔ migration 003 stores email_hash but never a plaintext email or password column
✔ migration 003 has no DSN, secret tokens, destructive ops, or seed rows
✔ migration 003 indexes the queue and the public_qa live filter
✔ migration 003 has no real WhatsApp / phone / token literals
```

The migration is **NOT applied** to any database. There is no Postgres deployed in any cluster reachable from this workstation.

## 7. User question workflow

CREATED — backend foundation.

- `POST /api/sheikh-hasan/ask` returns 503 `service_not_configured` until a DB-backed `SheikhQuestionRepository` is wired; otherwise it persists a private + pending question via parameterized SQL.
- Body schema enforces `question` length 5..1000, `language ∈ {en, ar}`, `category` ∈ a fixed enum, `public_allowed` boolean.
- User identity is `null` until real auth is wired (guest submissions only).

## 8. Sheikh Hasan login / role status

PROTECTED PLACEHOLDER — real auth not yet wired.

- `requireRole(req, allowedRoles)` returns 503 `auth_not_configured` until `SHEIKH_AUTH_REQUIRED=true` AND a principal is set on the request (`req.sheikh_principal`).
- Setting `SHEIKH_AUTH_REQUIRED=true` alone does **not** open the route — that's the strict fail-closed property. Test `GET /api/sheikh-hasan/sheikh/questions still 503 when SHEIKH_AUTH_REQUIRED=true but no principal` proves this.

## 9. Sheikh answer workflow

CREATED — backend foundation.

- `POST /api/sheikh-hasan/sheikh/questions/:id/answer`:
  - Schema validates `answer_text`, `publication_mode ∈ {private, public}`, `citations` array (1..16, each with `citation_type` and `citation_label`).
  - `decideAnswerPublication` returns `{ allowed, citation_status, publication_status, reason }`.
  - Refuses public publish without Quran/Hadith citation.
  - Refuses private publish without any citation (matches the "scholar advice still needs a note" rule).
  - Routes scholar_note-only and fiqh-only answers to `pending_moderation` with `citation_status = scholar_advice_needs_review`.

## 10. Citation requirement status

CREATED.

- Module `backend/app/src/sheikh/citation-requirement.js` is the single source of truth.
- Citation status enum matches the migration: `quran_cited`, `hadith_cited`, `quran_and_hadith_cited`, `scholar_advice_needs_review`, `insufficient_citation`.
- 10 dedicated tests pass.

## 11. Public Q&A status

CREATED — backend foundation.

- `GET /api/public/sheikh-hasan/qa` returns an empty list with `configured: false` when no repository is wired; otherwise lists live public Q&A.
- `GET /api/public/sheikh-hasan/qa/:slug` returns 503 (no repo) / 404 (slug not found) / 200 with the projected detail. Projection enforces no `user_id`, `email_hash`, `question_hash`, `sheikh_user_id`, `answer_id` leak.
- `POST /api/public/sheikh-hasan/qa/:slug/report` returns 503 (no repo) or persists a report; reason is validated 1..1000 chars.

## 12. Moderation / reporting status

CREATED — backend foundation.

- `POST /api/sheikh-hasan/moderation/answers/:id/publish` returns 503 `auth_not_configured` by default. With auth wired and a valid principal, it checks `decideModeratorPublish` — `scholar_advice_needs_review` requires explicit override, never auto-publish.
- The actual DB transition + insert into `sakina_public_qa` is deferred to a follow-up sprint (the repository method is intentionally not implemented this sprint — route returns a deterministic confirmation shape that tests assert).
- Reports persisted via `sakina_content_reports` (open → reviewed → dismissed/actioned).

## 13. WhatsApp notification status

PENDING_CONFIG — disabled by default.

- `backend/app/src/sheikh/whatsapp-notifier.js` never makes an HTTP call. No `fetch(`, no `axios`, no provider SDK imported.
- `notifyNewQuestion(...)` returns `{ ok: false, reason: 'pending_config' }` whenever any of `WHATSAPP_ENABLED`, `WHATSAPP_PROVIDER`, `WHATSAPP_API_TOKEN`, `SHEIKH_HASAN_WHATSAPP_TO` is missing.
- Even when all four are set, the function returns `provider_adapter_not_implemented` — the actual provider integration requires a separate sprint with explicit approval.
- No real phone number is anywhere in the repo. No real token is anywhere in the repo.

## 14. K3s config status

CREATED — manifests only, NOT applied.

- `deployment/k3s/config/sakina-app-configmap.yaml`:
  - `ASK_SHEIKH_HASAN_ENABLED=true`
  - `PUBLIC_SHEIKH_QA_ENABLED=true`
  - `SHEIKH_AUTH_REQUIRED=true`
  - `PUBLIC_RANDOM_CHAT_ENABLED=false`
  - `SCHOLAR_ANSWER_CITATION_REQUIRED=true`
  - `PUBLIC_ANSWER_MODERATION_REQUIRED=true`
  - `WHATSAPP_ENABLED=false`
- Backend `Deployment` reads the ConfigMap via `envFrom.configMapRef` and adds `optional: true` Secret refs for the new keys so missing Secret keys do not block the rollout.
- `sakina-secrets.template.yaml` extended with placeholders for `SHEIKH_HASAN_USER_ID`, `ADMIN_API_KEY`, `WHATSAPP_PROVIDER`, `WHATSAPP_API_TOKEN`, `SHEIKH_HASAN_WHATSAPP_TO`. All `REPLACE_ME_*`.

The ConfigMap was **NOT applied** to any cluster. The current kubectl context is `aks-iterlaw-we-prod` (unsafe). The Hetzner kubeconfig is mis-pointed at the worker; the real master is `148.251.247.56` (see `deployment/k3s/README.SERVER.md`).

## 15. /ready changes

`GET /ready` now returns (representative shape, captured by the test suite):

```json
{
  "ok": true,
  "service": "sakina-backend",
  "database": { "configured": false, "connected": false, "checked": false, "error_type": null },
  "ibadat": { "scope": "ibadat", "source_required": true, "answer_without_source_blocked": true },
  "sources": { "registry_required": true, "retrieval_configured": false, "answer_generation_enabled": false, "verified_sources_required": true },
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
  "environment": "staging"
}
```

A dedicated test (`GET /ready surfaces ask_sheikh_hasan + public_qa blocks with correct defaults`) asserts these exact booleans.

## 16. Test output

```
$ cd F:/rahma/backend/app && npm test
> sakina-backend@0.1.0 test
> node --test test/health.test.js test/ready.test.js test/ibadat-ask.test.js \
       test/no-external-llm.test.js test/strict-safety.test.js test/db-config.test.js \
       test/db-health.test.js test/migrations.test.js test/sources.test.js \
       test/audit.test.js test/ibadat-source-gate.test.js test/citation-requirement.test.js \
       test/sheikh-answer-policy.test.js test/ask-sheikh-hasan-public-qa.test.js \
       test/public-qa.test.js test/ask-sheikh-hasan-migration.test.js

... [98 test lines, all green]

ℹ tests 98
ℹ suites 0
ℹ pass 98
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4779.3298
```

Lint + build: clean (no warnings).

## 17. Security grep triage

Two scans were run.

**Scan A — secret/credential patterns** matched 32 files. Triage:

| Kind | Examples | Triage |
|---|---|---|
| Schema column names | `POSTGRES_PASSWORD` in `sakina-secrets.template.yaml`, migration files | Allowed — column / key names, not values |
| Templates | `REPLACE_ME_*` values in `sakina-secrets.template.yaml` | Allowed — explicit placeholder |
| Tests | `password`, `whatsapp_token`, etc. in `test/ask-sheikh-hasan-migration.test.js` | Allowed — assertions checking absence |
| Reports | grep commands quoted in prior sprint reports | Allowed — documentation |
| Docs | `SAKINA_PROJECT_*.md`, `README.md`, `README.SERVER.md` | Allowed — policy text |

**Scan B — LLM / HTTP / phone / WhatsApp deep-link patterns** matched 8 occurrences. Triage:

| File | Line | Hit | Triage |
|---|---|---|---|
| `SAKINA_PROJECT_MASTER_PLAN.md` | 227 | `"openai"/"anthropic"/...` in a sentence describing the safety rule | Allowed — policy text |
| `README.md` | 10 | Same — describes safety rule | Allowed |
| 5x sprint reports | various | Quote the grep command itself | Allowed |

No real keys, no real phone numbers, no real WhatsApp tokens, no actual LLM imports in `src/`. The strict-safety test (`no fabricated Quran/Hadith/fiqh/scholar citation strings in backend src/`) passes, and `test/no-external-llm.test.js` passes — both enforce these properties at runtime as well.

## 18. What was NOT done

- ❌ Real Sheikh Hasan authentication wiring (OIDC, password hashing, session cookies).
- ❌ Frontend React/React-Native code for any of the 16 screens.
- ❌ Image build (`docker build`) — daemon not running on workstation.
- ❌ GHCR push — depends on image build.
- ❌ Any `kubectl apply`. Context is `aks-iterlaw-we-prod`; we MUST NOT touch it. Hetzner kubeconfig is mis-pointed (worker IP, not master `148.251.247.56`).
- ❌ Postgres deployed in any cluster.
- ❌ Redis manifests or wiring.
- ❌ Public DNS for `sakina.ordinoxai.com` (NXDOMAIN per `nslookup`).
- ❌ TLS ingress (depends on cert-manager presence and DNS).
- ❌ Real WhatsApp adapter.
- ❌ Apple/Google compliance pages (privacy policy, terms, deletion flows).
- ❌ Luxury 3D frontend.

## 19. What remains before live App Store / Google Play release

A long list. See `SAKINA_PROJECT_STATUS.md` section 8 for the current checklist, and `SAKINA_PROJECT_MASTER_PLAN.md` section 10 for the sprint roadmap.

## 20. Final truth

- **Ask Sheikh Hasan backend foundation: CREATED**, including migration `003`, modules under `src/sheikh/`, routes `ask-sheikh-hasan.js` + `public-qa.js`, `/ready` extensions, ConfigMap, Secret template additions, and 5 dedicated test files (32 new test cases). All 98 tests pass; lint + build clean.
- **Sheikh real authentication: PROTECTED PLACEHOLDER**. Routes return 503 `auth_not_configured` until an auth plugin is wired in a future sprint. This is by design and verified by tests.
- **Public Q&A backend foundation: CREATED**. List + detail + report endpoints implemented, with strict identity-leak protection enforced by `sheikh-answer-policy.js#publicAnswerProjection` and verified by tests.
- **Public answers require citations: YES**. Quran/Hadith/Fiqh required for the public publication path; scholar_note-only is routed to moderation. Enforced by `citation-requirement.js` + `sheikh-answer-policy.js` and verified by 10 + 12 tests.
- **Frontend real implementation: BLUEPRINT ONLY**. No `mobile-app/` source code yet.
- **WhatsApp live sending: PENDING_CONFIG**. Notifier is a pure interface that returns `pending_config` and never makes a network call.
- **Nothing was applied to any cluster.** Nothing was deployed. The current kubectl context is `aks-iterlaw-we-prod`, which the agent MUST NOT touch; the Hetzner kubeconfig is mis-pointed at the worker rather than the master `148.251.247.56`.
- **Rahma/Sakina only. IterLaw not touched. RightsNow not touched. OrdinoxAI clusters not touched.**
