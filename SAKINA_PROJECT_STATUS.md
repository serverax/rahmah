# Sakina/Rahmah Project Status

Last updated: 2026-05-13 (Sprint 3 — Project plan, app-store compliance, and Ask Sheikh Hasan foundation).

## 1. Scope Lock

- Project: **Rahma/Sakina**
- Local directory: `F:/rahma`
- GitHub repo: `serverax/rahmah`
- Branch: `main`
- **IterLaw: excluded** — different repo at `C:/Users/kalsh/projects/iterlaw`, not touched.
- **RightsNow: excluded** — not a canonical project name in this codebase.
- **Other repos: excluded** — no cross-repo edits.

This file is the single source of truth for "what exists in this repo right now". It does NOT make claims about runtime state without evidence.

## 2. Current Confirmed State

Status legend:
- **CREATED** — files/code exist in repo.
- **BUILT** — verified by `npm run build` / `docker build` in this or a prior recorded sprint.
- **PUSHED** — verified by git/GHCR evidence.
- **DEPLOYED** — verified by safe K3s/server evidence (`kubectl rollout status`).
- **RUNNING** — verified by runtime curl/logs.
- **NOT VERIFIED** — no direct evidence.
- **NOT DONE** — evidence proves missing.
- **BLOCKED** — exact blocker proven by command output (see latest report).

| Area | Status | Evidence |
|---|---|---|
| Backend scaffold | CREATED | `backend/app/` with Fastify ESM, package.json |
| `/health` | CREATED | `backend/app/src/routes/health.js`, tested in `test/health.test.js` |
| `/ready` | CREATED | `backend/app/src/routes/ready.js`, tested in `test/ready.test.js` |
| `/api/ibadat/ask` | CREATED + FAIL-CLOSED | `backend/app/src/routes/ibadat.js` — source store empty, always returns blocked fallback |
| Dockerfile | CREATED | `backend/app/Dockerfile` — non-root user, healthcheck |
| Docker image | NOT VERIFIED | Docker daemon was not running locally on 2026-05-13; build blocked |
| GHCR image | NOT VERIFIED | No published evidence captured in this sprint |
| K3s manifests | CREATED — PARTIAL | `deployment/k3s/` has namespace, postgres, backend, ingress, secrets template |
| Server K3s infra | NOT VERIFIED | 138.201.253.245 is a K3s **worker** of OrdinoxAI's cluster, master is `148.251.247.56`; no admin kubeconfig in this workstation; details in `deployment/k3s/README.SERVER.md` |
| Postgres runtime | NOT VERIFIED | Manifest exists; never applied to a real cluster |
| Redis runtime | NOT DONE | No Redis manifests, no client wiring in backend |
| Verified Islamic source DB | CREATED (schema only) | Migration `002_verified_islamic_sources.sql` |
| Citation validator | CREATED | `backend/app/src/safety/citation-validator.js` + tests |
| RAG retrieval | NOT DONE | Sprint 14/15 — hybrid retrieval not implemented |
| **Ask Sheikh Hasan** | CREATED — backend foundation | Migration `003_ask_sheikh_hasan_public_qa.sql`, modules under `backend/app/src/sheikh/`, routes `ask-sheikh-hasan.js` + `public-qa.js`, tests, UI/UX blueprint |
| Sheikh real authentication | NOT DONE | Routes return `503 auth_not_configured` when no auth context is wired |
| Public Q&A | CREATED — backend foundation | `routes/public-qa.js` returns live entries when DB configured, else `service_not_configured` |
| Moderation queue | CREATED — backend foundation | `POST /api/sheikh-hasan/moderation/answers/:id/publish` placeholder (auth-gated) |
| Reporting | CREATED — backend foundation | `POST /api/public/sheikh-hasan/qa/:slug/report` |
| Apple/Google compliance — foundation | CREATED | `docs/compliance/APP_STORE_COMPLIANCE_FOUNDATION.md` + `/ready.app_store` block + `APP_STORE_COMPLIANCE_MODE` ConfigMap flag. Real privacy/terms/deletion UI still NOT DONE (Sprint 11). |
| Luxury 3D UI | NOT DONE | Blueprint only in `docs/uiux/ASK_SHEIKH_HASAN_UI_UX_BLUEPRINT.md`; no `mobile-app/` real code yet |
| WhatsApp notifier | CREATED — PENDING_CONFIG | `backend/app/src/sheikh/whatsapp-notifier.js` — disabled by default, no HTTP client, returns `pending_config` |

## 3. Required Architecture

The product target requires (most NOT yet built):

- PostgreSQL (manifest in repo; never deployed by this workstation).
- pgvector (extension reference only in `001_sakina_foundation.sql` comment; not enabled).
- Redis (not in repo).
- Hybrid retrieval: keyword + vector + metadata filters + Reciprocal Rank Fusion + reranking (not in repo).
- Citation validator (CREATED).
- Answer safety gate (CREATED — fail-closed default).
- Verified Islamic source DB (CREATED — schema only).
- Answer audit (CREATED).
- Scholar review queue (CREATED — backend foundation via Sprint 6).
- App Store / Google Play compliance foundation (NOT DONE).
- Ask Sheikh Hasan workflow (CREATED — backend foundation).
- Public cited Q&A (CREATED — backend foundation).
- Luxury 3D mobile-first UI (BLUEPRINT ONLY).

## 4. Islamic Answer Safety

These rules are non-negotiable and enforced both by code (tests) and by SQL CHECK constraints:

- No verified source → no answer.
- No citation → no public religious answer.
- No fabricated Quran citation.
- No fabricated Hadith citation.
- No fabricated fiqh/fatwa citation.
- Sheikh Hasan public answers must include Quran/Hadith/fiqh citation OR be classified as `scholar_advice_needs_review` and require moderator approval before publication.
- User private identity must not appear in any public Q&A response.
- Audit row stores only a sha-256 hash of the trimmed question, never raw text, never any user identity.

## 5. Ask Sheikh Hasan Status

Target workflow:

1. User submits Islamic question via the app (language EN or AR, category from the controlled vocabulary).
2. Question is stored as **private + pending_review**.
3. Sheikh Hasan logs in (auth not yet wired — route returns 503 auth_not_configured).
4. Sheikh Hasan sees pending questions queue.
5. Sheikh Hasan writes an answer.
6. Sheikh Hasan must add at least one citation; without it, server refuses to mark answer for public publication.
7. Citation may be `quran`, `hadith`, `fiqh`, or `scholar_note`. `scholar_note` alone forces moderation.
8. Answer is reviewed by moderator if `pending_moderation`.
9. Published answer becomes visible in the public Q&A library.
10. User who asked sees their question's status transition.
11. Public users can browse / filter / search the published Q&A.
12. Citations are always shown in the public answer.

Current status: **backend foundation CREATED** in this sprint. Sheikh real authentication, real moderator UI, and frontend implementation are all **NOT DONE**.

## 6. App Store / Google Play Requirements

These are tracked but **NOT YET IMPLEMENTED in code**:

- Privacy policy (`/legal/privacy`).
- Terms of service (`/legal/terms`).
- Account deletion request flow (required by both stores when accounts exist).
- Data deletion + export workflow.
- Content reporting (CREATED in backend; UI not built).
- Moderation flow (CREATED in backend; admin UI not built).
- Admin / scholar workflow (CREATED in backend foundation).
- Google Play **Data Safety form** content.
- Apple App **Privacy labels** content.
- Push notification consent (no notifications wired yet).
- No public unmoderated chat.
- No harmful content rules.
- No broken / placeholder screens at release.

## 7. K3s Server Infrastructure

Required namespace structure (target):

- `sakina-app` — backend, workers.
- `sakina-data` — Postgres, Redis.
- `sakina-workers` — ingestion / vector index workers.
- `sakina-ingress` — Traefik routes (if dedicated cluster).
- `sakina-monitoring` — Prometheus / Loki / Grafana (deferred).

Current K3s manifests live under `deployment/k3s/` and use **`sakina-ai`** as a single namespace (from prior sprints). The new target multi-namespace layout is documented but not yet split — that is a deliberate carry-over decision.

Required workloads:

- Postgres StatefulSet + PVC (manifest exists; never applied by this workstation).
- Redis internal service + PVC (NOT DONE — manifest missing).
- Backend Deployment + Service (manifest exists; image not built / not pushed).
- Ingestion worker placeholder (NOT DONE).
- Traefik ingress (cluster has Traefik per `deployment/k3s/README.SERVER.md`).
- Kubernetes Secrets (template only; rendered secrets gitignored).
- ConfigMaps (`deployment/k3s/configmaps/` and `deployment/k3s/postgres/postgres-configmap.yaml`).

Rules:

- Do NOT expose Postgres publicly.
- Do NOT expose Redis publicly.
- Do NOT commit real secrets.
- Do NOT touch `aks-iterlaw-we-prod` (Azure AKS context belongs to a different project).
- Server infra is confirmed only with raw `kubectl` / `ssh` evidence captured in a sprint report.

## 8. Remaining Work

- [ ] Build Docker image (`docker build ...sakina-backend:main`).
- [ ] Push image to GHCR or import to K3s.
- [ ] Verify server K3s — admin kubeconfig for the real master (`148.251.247.56`).
- [ ] Create namespaces in cluster.
- [ ] Deploy Postgres.
- [ ] Deploy Redis (manifest + apply).
- [ ] Deploy backend.
- [ ] Verify `/health` from inside the cluster.
- [ ] Verify `/ready` from inside the cluster, including new sheikh + public_qa blocks.
- [ ] Wire Sheikh Hasan **real authentication** (probably OIDC via an upstream provider; currently 503).
- [ ] Implement public Q&A admin / moderation UI.
- [ ] Implement Ask Sheikh Hasan user UI (mobile-first, RTL Arabic).
- [ ] Implement App Store / Google Play compliance foundation (privacy, terms, deletion, reporting UI).
- [ ] Implement luxury 3D frontend per the UI/UX blueprint.
- [ ] Begin verified Islamic source ingestion (Sprint 14+, after licensing review).
- [ ] Begin hybrid RAG retrieval (Sprint 15+).

## 9. Final Truth

This file records factual project state. It must NOT be cited as evidence of deployment, runtime health, or compliance. Any claim of "deployed" / "running" / "live" in any future communication must be backed by command output in a sprint report under `reports/`.
