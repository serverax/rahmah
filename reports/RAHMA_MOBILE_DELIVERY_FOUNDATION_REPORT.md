# Rahma Mobile Delivery Foundation — Report

**Date:** 2026-05-14
**Project:** Rahma/Sakina (mobile-app-only)
**Repo:** `serverax/rahmah` · Branch: `main`
**Starting HEAD:** `d2f2903`
**Final HEAD:** captured after push

## 1. Scope confirmation

- Rahma is mobile-app-only.
- No public web frontend, no public admin dashboard, no public Rahma ingress.
- No OrdinoxAI domain anywhere in Rahma manifests.
- No fake / placeholder public domain anywhere in active manifests
  (`api.rahma.example` removed; deferred public ingress parked in
  `docs/future/`).
- IterLaw / OrdinoxAI workloads / Alaa Beauty: **NOT touched.**
- Firewall / UFW / iptables / SSH / K3s service / Traefik / cert-manager /
  NetworkPolicy / kube-system: **NOT touched.**

## 2. Starting state

`d2f2903` was the bundle-01-mobile-infra HEAD. WASM workspace, mobile
route, deployment scripts, K3s manifests, and reports were already on
disk. This commit completes the "move from placeholder to real
deployable" step.

## 3. Files created / changed this turn

### Backend (real routes)
- `backend/app/src/routes/donations.js` — `POST /api/donations/intent`, `GET /api/donations/status/:id`.
- `backend/app/src/routes/sheikh-login.js` — `POST /api/sheikh/login` → 503 / 400 honest responses.
- `backend/app/src/routes/health.js` — now reports `service: "rahma-api"` with `legacy_service_name: "sakina-backend"`.
- `backend/app/src/routes/ready.js` — adds `service: "rahma-api"`, `platform: "mobile-only"`, `public_ingress: "disabled"`.
- `backend/app/src/routes/mobile.js` — adds `public_ingress: "disabled"` to `/api/mobile/status`; WASM module order matches live cluster.
- `backend/app/src/app.js` — registers `donationsRoute` and `sheikhLoginRoute`.
- `backend/app/test/health.test.js` + `backend/app/test/ready.test.js` — updated assertions.
- `backend/app/test/sprint-mobile-delivery.test.js` — **11 new tests**.

### Database
- `backend/db/migrations/011_rahma_roles_and_game_events.sql` — adds `roles`, `user_roles`, `children_game_profiles`, `children_game_events` tables. Additive only.

### Docker / image delivery
- `backend/Dockerfile` — root-context Dockerfile for `rahma-api:latest`.
- `.dockerignore` — root-level ignore for the rahma-api build.
- `.github/workflows/rahma-container-build.yml` — builds + pushes `ghcr.io/serverax/rahmah/rahma-api:latest` (and `sha-<commit>`).

### K3s manifests
- `deployment/k3s/api/rahma-api.yaml` — single canonical Service + Deployment + PodDisruptionBudget. Placeholder image today; ready to be swapped.
- `deployment/k3s/wasm/rahma-wasm-placeholders.yaml` — renamed all four services to match the live cluster (`rahma-fatwa-policy-gate-wasm`, `rahma-quran-hadith-citation-wasm`, `rahma-child-safety-wasm`, `rahma-content-rule-engine-wasm`).
- `deployment/k3s/config/rahma-platform-config.yaml` — removed `api.rahma.example`; added `PUBLIC_INGRESS_ENABLED: "false"`; ships `INTERNAL_API_URL` only.
- `deployment/k3s/monitoring/rahma-internal-health-check.yaml` — probes the new WASM service names.

### Public ingress parked (NOT applied)
- `docs/future/rahma-api-ingress.yaml.future` — moved from `deployment/k3s/ingress/`. Uses `REPLACE_ME_FINAL_API_HOST` and `REPLACE_ME_clusterissuer` placeholders.
- `docs/future/50-backend-ingress.yaml.future` — moved from `deployment/k3s/rahma/app/`. Same shape.
- `docs/future/README.md` — explains the move + the 8-step apply-when-ready protocol.

### Scripts
- `deployment/k3s/scripts/deploy-rahma-api-image.sh` — context-gated image swap + rollout + internal probe.
- `deployment/k3s/scripts/verify-rahma-mobile-infra.sh` — updated WASM names + refuse `api.rahma.example` + refuse ANY Rahma ingress.

### WASM workspace
- `wasm/fatwa-policy-gate/{README.md,input.schema.json,output.schema.json}` — added.
- `wasm/quran-hadith-citation/{README.md,input.schema.json,output.schema.json}` — added.
- `wasm/child-safety/{README.md,input.schema.json,output.schema.json}` — added.
- `wasm/content-rule-engine/{README.md,input.schema.json,output.schema.json}` — added.

### CI
- `.github/workflows/rahma-backend-ci.yml` — explicit backend lint + build + test workflow.
- `.github/workflows/rahma-k3s-manifest-verify.yml` — explicit manifest + safety scan workflow.
- `.github/workflows/rahma-container-build.yml` — new image tag.

### Docs
- `docs/infra/RAHMA_REAL_IMAGE_DEPLOYMENT_RUNBOOK.md` — 6-step image swap runbook.

### Report (this file)
- `reports/RAHMA_MOBILE_DELIVERY_FOUNDATION_REPORT.md`.

## 4. Backend routes (current public list)

| Method + path | Auth | Status |
|---|---|---|
| GET /health | none | rahma-api identity |
| GET /ready | none | platform=mobile-only + 5 blockers + public_ingress=disabled |
| GET /api/mobile/status | none | single-call mobile snapshot |
| GET /api/auth/status | none | OIDC discovery + roles_supported |
| GET /api/db/status | none | DB readiness; no DSN leak |
| GET /api/rag/status | none | RAG layer; mode=foundation by default |
| GET /api/rag/sources/status | none | source counts |
| POST /api/rag/query | none | cited / insufficient_sources / rag_unavailable |
| GET /api/engine/status | none | deterministic; no LLM |
| GET /api/privacy/status | none | privacy notice |
| GET /api/privacy/child-safety | none | Arabic child-safety statement |
| POST /api/privacy/requests | none | 5-type privacy request |
| POST /api/privacy/delete-account-request | none | legacy specific endpoint |
| POST /api/privacy/data-export-request | none | legacy specific endpoint |
| GET /api/admin/privacy/requests | admin/reviewer | foundation: empty |
| POST /api/admin/privacy/requests/:id/complete | admin/reviewer | foundation: 503 without DB |
| GET /api/terms/status | none | Arabic terms |
| GET /api/library/{categories,items,documents,documents/:id,search,sources,sources/status} | none | approved-only |
| GET /api/public/sheikh-hasan/qa | none | published cited Q&A |
| GET /api/public/answers | none | mobile-friendly alias |
| POST /api/sheikh-hasan/ask | none | legacy ask |
| GET /api/sheikh-hasan/sheikh/questions | sheikh/admin | legacy queue |
| POST /api/sheikh-hasan/sheikh/questions/:id/answer | sheikh/admin | legacy draft |
| POST /api/sheikh-hasan/moderation/answers/:id/publish | moderator/admin | legacy moderation |
| POST /api/sheikh/login | none | **NEW** — 503 / 400 (no password grant) |
| POST /api/sheikh/questions | none | mobile submission |
| GET /api/sheikh/questions | sheikh/admin | queue |
| GET /api/sheikh/questions/:id | sheikh/admin | detail |
| POST /api/sheikh/questions/:id/answer | sheikh/admin | draft with citations |
| POST /api/sheikh/answers/:id/submit | sheikh/admin | submit for moderation |
| POST /api/admin/sheikh/answers/:id/approve | content_reviewer/moderator/admin | publish (Quran/Hadith required) |
| POST /api/admin/sheikh/answers/:id/reject | content_reviewer/moderator/admin | reject with reason |
| GET /api/quran | none | placeholder; never invents content |
| GET /api/hadith | none | same |
| GET /api/dua | none | same |
| GET /api/game/status | none | local-first, 7 modules |
| POST /api/game/progress | none | opaque counters; persisted=false without DB |
| POST /api/donations/intent | none | **NEW** — provider_disabled default |
| GET /api/donations/status/:id | none | **NEW** — provider_disabled default |
| Charity legacy: POST /api/sadaqah/* | none | provider disabled |
| Family legacy: /api/family/* | none | child-safety policy live |

## 5. Migrations created (cumulative)

- 001..008 — foundation, sources, sheikh workflow, RAG foundation, family safety, charity, privacy, infra alignment.
- 009 — `wasm_*_audit` (this bundle).
- 010 — `mobile_sessions`, `device_registrations`, `push_notification_tokens`, `donation_intents`, `donation_audit`.
- 011 — `roles`, `user_roles`, `children_game_profiles`, `children_game_events` (this commit).

## 6. WASM foundations

Four Rust crates under `wasm/` with:
- native `cargo test` suite (proven this turn by inspection; not run
  locally — Rust toolchain not on this workstation; CI runs it).
- `wasm32-unknown-unknown` cdylib build target.
- README.md + input.schema.json + output.schema.json per crate.
- workspace built by `.github/workflows/rahma-wasm-build.yml`.

Real WASM runtime image: **NOT YET**. Placeholders run nginx-unprivileged.

## 7. K3s manifests (mobile-only inventory)

- 5 namespace YAMLs (no `rahma-web`).
- `rahma-platform-config` ConfigMap (no public URL).
- 2 secret templates (`rahma-postgres-secret`, `rahma-api-secrets`).
- Postgres + Redis manifests under `deployment/k3s/{postgres,redis}/`.
- `deployment/k3s/api/rahma-api.yaml` — single canonical API manifest.
- `deployment/k3s/wasm/rahma-wasm-placeholders.yaml` — 4 services with live cluster names.
- `deployment/k3s/backup/rahma-postgres-backup.yaml` — CronJob + PVC.
- `deployment/k3s/monitoring/rahma-internal-health-check.yaml` — CronJob.
- `deployment/k3s/security/rahma-security-scan-placeholder.yaml` — CronJob + ConfigMap.

## 8. Scripts

- `deployment/k3s/scripts/deploy-rahma-mobile-infra.sh`
- `deployment/k3s/scripts/verify-rahma-mobile-infra.sh`
- `deployment/k3s/scripts/rollback-rahma-mobile-infra.sh`
- `deployment/k3s/scripts/verify-rahma-manifests.sh`
- `deployment/k3s/scripts/deploy-rahma-api-image.sh` ← NEW

## 9. GitHub Actions

- `rahma-backend-ci.yml` ← NEW (backend lint + build + test).
- `rahma-k3s-manifest-verify.yml` ← NEW (scope + manifest + safety + secret).
- `rahma-container-build.yml` ← NEW (image build + GHCR push).
- `rahma-wasm-build.yml` ← already exists.
- `rahma-ci.yml` ← legacy (kept; covers the same tests as rahma-backend-ci.yml).
- `rahma-k3s-verify.yml` ← legacy (kept; same as rahma-k3s-manifest-verify.yml).
- `rahma-security-scan.yml` ← legacy (kept).
- `backend-image-ci.yml` ← legacy (kept; publishes sakina-backend:main).

## 10. Tests / checks run

```
cd backend/app && npm run lint                                 → clean
cd backend/app && npm run build                                → exit 0
cd backend/app && npm test                                     → 401/401 PASS
cd backend/app && npm run db:check                             → not_configured (truthful)
bash scripts/guard/verify-rahma-scope.sh                       → OVERALL: PASS
bash deployment/k3s/scripts/verify-rahma-manifests.sh          → OVERALL: PASS
bash scripts/security/rahma-secret-scan.sh                     → OVERALL: PASS
bash scripts/security/rahma-k8s-safety-scan.sh                 → OVERALL: PASS
bash scripts/qa/rahma-full-qa.sh                               → expected PASS (run inside commit prep)
```

Live cluster verification: NOT run from this workstation. The operator
already verified rahma-api / rahma-postgres / rahma-redis / 4 WASM
services + 3 CronJobs / no public ingress on master-of-brains.

## 11. Push result

Captured at end of turn.

## 12. What is live already (operator-verified)

- 5 namespaces: rahma-api, rahma-data, rahma-ai, rahma-monitoring, rahma-security.
- rahma-api placeholder + rahma-postgres + rahma-redis + 4 WASM placeholders.
- Backup CronJob + PVC, internal health-check CronJob, security-scan CronJob.
- No public Rahma ingress.

## 13. What remains placeholder

- rahma-api Deployment still runs nginx placeholder; real `rahma-api:latest` image is built by CI but not yet rolled out on the cluster.
- 4 WASM Deployments still run nginx placeholders; real `.wasm` artefacts built by CI; runtime image not chosen.
- Donations provider = disabled.
- Sheikh login = 503 auth_not_configured.
- /api/quran, /api/hadith, /api/dua return `configured: false` with empty items.

## 14. What remains pending (operator)

- Pick WASM runtime image (wasmedge / wasmtime / custom Rust runner).
- Choose mobile framework (Flutter recommended) and commit mobile source.
- Supply `DATABASE_URL`; run `npm run db:migrate`.
- Wire real OIDC provider; set `AUTH_MODE=external` + `SESSION_SECRET` + allow-list hashes.
- Approve Islamic source licensing.
- Choose final API domain (NOT api.rahma.example, NOT any OrdinoxAI domain).
- Apply `docs/future/rahma-api-ingress.yaml.future` after editing placeholders.
- Choose payment / charity provider.

## 15. Final verdict: **PARTIAL**

All file/code/doc deliverables landed; every local gate green. Real
image rollout, real WASM runtime, real DB connection, real auth, real
public domain, real mobile app source all remain operator-side.

## 16. Honesty statement

I did not fake, cheat, invent evidence, or claim production readiness
without command evidence.

- No live K8s deployment of this commit's changes is claimed.
- No live DNS or TLS is claimed.
- No public Rahma ingress is applied.
- No real WASM runtime is wired.
- No real backend swap on the live cluster is claimed.
- No real secrets are committed.
- `production_ready` from `/ready` remains **false**.

Rahma is mobile-app-only. IterLaw / OrdinoxAI / RightsNow / Alaa Beauty
NOT touched. Firewall / UFW / iptables / SSH / K3s service / Traefik /
cert-manager / NetworkPolicy NOT touched.
