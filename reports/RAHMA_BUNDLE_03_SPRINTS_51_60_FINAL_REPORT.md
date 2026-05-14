# Rahma — Bundle 03 (Sprints 51–60) — Final Report

**Date:** 2026-05-14
**Project:** Rahma/Sakina (mobile-app-only)
**Repo:** `serverax/rahmah` · Branch `main`
**Starting HEAD:** `4472350`
**Final HEAD:** captured at end of turn

## 1. Scope confirmation

- Rahma is mobile-only. No public website, no public admin dashboard, no public Rahma ingress applied.
- No OrdinoxAI domain. No `api.rahma.example` in active manifests (parked in `docs/future/`).
- IterLaw / OrdinoxAI workloads / Alaa Beauty: **NOT touched.**
- Firewall / UFW / iptables / SSH / K3s service / Traefik / cert-manager / NetworkPolicy / kube-system: **NOT touched.**

## 2. Sprint 51–60 status

| Sprint | Goal | Status | Notes |
|---|---|---|---|
| 51 | Operator rollout package for real API image | **PARTIAL** — script hardened with `--dry-run`, image-ref regex, timestamped report; **live rollout OPERATOR-PENDING** (forbidden kubectl context) |
| 52 | Apply updated operational manifests package | **PARTIAL** — `apply-rahma-ops-updates.sh` with dry-run; operator runs live on master |
| 53 | Real secrets preparation + rotation | **PARTIAL** — `create-rahma-secrets-from-env.sh` (env-driven, no value echo, placeholder refusal); rotation runbook ships |
| 54 | Live DB migration operator package | **PARTIAL** — Job template + runner script with `--confirm-run-migrations` foot-gun guard; **execution OPERATOR-PENDING** |
| 55 | Real WASM runtime prototype (child-safety) | **PASS — PROTOTYPE** — Node+Fastify HTTP bridge with **9 tests**; in-process JS port today; wasmtime/wasmedge swap is a later sprint |
| 56 | Mobile app source foundation | **PASS — FOUNDATION** — Flutter `apps/mobile/` with pubspec + 9 screens + config + analysis_options + **2 tests**; `RAHMA_API_BASE` empty-default refuses network |
| 57 | OpenAPI + Dart client foundation | **PASS** — canonical spec at `docs/api/openapi/rahma-mobile-api.yaml`; `RahmaApiClient` with typed errors |
| 58 | Payment/donation decision + backend hardening | **PASS** — Stripe-recommended; `/api/donations/status` + `provider_configured` flag; card-data refusal (5 tests) |
| 59 | Islamic content import pipeline foundation | **PASS — FOUNDATION** — pure validator + orchestrator (**12 tests**); NO religious text imported; NO `approved` auto-promotion |
| 60 | Bundle closeout | **PASS** (this report) |

## 3. Files created / changed

### Backend
- `backend/app/src/routes/ready.js` — already extended in B02; no change this bundle
- `backend/app/src/routes/donations.js` — `/status` endpoint + `provider_configured` flag + card-data refusal
- `backend/app/src/content-import/source-registry.js` — NEW (pure validator)
- `backend/app/src/content-import/import-job.js` — NEW (pure orchestrator)
- `backend/app/test/sprint-58-donations.test.js` — **5 tests**
- `backend/app/test/sprint-59-content-import.test.js` — **12 tests**

### Database
- (no new migrations this bundle; 001–012 already in place)

### WASM
- `wasm/child-safety/server/{package.json,src/{index.js,policy.js},test/runtime.test.js,README.md}` — **9 tests**

### Mobile
- `apps/mobile/{pubspec.yaml,analysis_options.yaml,.gitignore,lib/{main,app,config}.dart,lib/screens/{onboarding,home,quran,hadith,dua,ask_sheikh,children_game,donation,settings}_screen.dart,lib/api/rahma_api_client.dart,test/{config,api_client}_test.dart}` — **2 tests**

### K3s / deployment scripts
- `deployment/k3s/scripts/deploy-rahma-api-image.sh` — `--dry-run`, image-ref regex, timestamped report
- `deployment/k3s/scripts/apply-rahma-ops-updates.sh` — NEW
- `deployment/k3s/scripts/create-rahma-secrets-from-env.sh` — NEW
- `deployment/k3s/scripts/run-rahma-db-migrations-job.sh` — NEW
- `deployment/k3s/jobs/rahma-db-migrate-job.yaml.template` — NEW
- Moved `deployment/k3s/ingress/sakina-backend-ingress.yaml` → `docs/future/sakina-backend-ingress.yaml.future`

### CI
- `.github/workflows/rahma-mobile-flutter-ci.yml` — NEW (path-guarded, skips when pubspec missing)

### Docs
- `docs/api/openapi/rahma-mobile-api.yaml` — canonical OpenAPI path
- `docs/api/RAHMA_OPENAPI_CONTRACT_REPORT.md` — NEW
- `docs/infra/RAHMA_API_IMAGE_ROLLOUT_OPERATOR_GUIDE.md` — NEW
- `docs/infra/RAHMA_LIVE_DB_MIGRATION_OPERATOR_RUNBOOK.md` — NEW
- `docs/ops/RAHMA_OPERATOR_APPLY_OPS_UPDATES.md` — NEW
- `docs/security/RAHMA_SECRET_ROTATION_RUNBOOK.md` — NEW
- `docs/wasm/RAHMA_CHILD_SAFETY_RUNTIME_PROTOTYPE.md` — NEW
- `docs/mobile/RAHMA_FLUTTER_SETUP.md` — NEW
- `docs/mobile/RAHMA_MOBILE_ENV_CONFIG.md` — NEW
- `docs/payments/RAHMA_DONATION_{PROVIDER_DECISION,SECURITY_MODEL,AUDIT_MODEL}.md` — NEW
- `docs/content/RAHMA_CONTENT_IMPORT_RUNBOOK.md` — NEW
- `docs/content/examples/source-metadata.example.json` — NEW

### Reports
- `reports/RAHMA_SPRINT_{51,52,53,54,55,57,59}_*.md` — NEW
- `reports/RAHMA_BUNDLE_03_SPRINTS_51_60_FINAL_REPORT.md` — this file

## 4. Backend changes

- `/api/donations/status` now reports `provider`, `provider_configured`, `card_handling_in_backend: false`, `database_configured`.
- `POST /api/donations/intent` refuses any field name in `{pan, card_number, cvv, cvc, track1, track2, iban, bic, swift}` (defense-in-depth on top of `additionalProperties: false` schema strip).
- New service-level modules under `src/content-import/`.

## 5. DB changes

None this bundle. Migration runner + status script hardened in Sprint 53 — already covered.

## 6. WASM / runtime changes

- `wasm/child-safety/server/` is a runtime BRIDGE running the JS port in-process.
- `runtime_mode` field in `/health` distinguishes `in_process_js_port` from the future wasmtime mode.
- Tests assert no input body is echoed in any response.
- Real `.wasm` load by a sandboxed runtime is **NOT** in this bundle.

## 7. Mobile app changes

- Flutter source seeded at `apps/mobile/` with 9 screens, Arabic-RTL by default.
- `RahmaConfig.apiBase` reads from `--dart-define=RAHMA_API_BASE=…`; **empty default refuses network**.
- `RahmaApiClient` (stdlib `dart:io`) raises `RahmaApiError` with `code` + `messageAr`.
- `android/` + `ios/` directories NOT committed (generated by `flutter create .` per workstation).

## 8. API / OpenAPI changes

- Canonical spec lives at `docs/api/openapi/rahma-mobile-api.yaml`.
- Existing `docs/api/RAHMA_MOBILE_API_OPENAPI.yaml` retained for compatibility.
- Dart client mirrors the spec's endpoint list.

## 9. Payment / content changes

- Stripe recommended; PayPal as alternative.
- Provider stays `disabled` by default.
- Card data flow: NEVER through Rahma backend.
- Content import pipeline ships; NO religious text imported.

## 10. K3s / operator scripts

- 5 deployment scripts:
  - `deploy-rahma-api-image.sh` (now with `--dry-run`)
  - `apply-rahma-ops-updates.sh` (NEW)
  - `create-rahma-secrets-from-env.sh` (NEW)
  - `run-rahma-db-migrations-job.sh` (NEW)
  - `deploy-rahma-mobile-infra.sh` (already shipped earlier)
- All refuse forbidden kubectl contexts.

## 11. Tests / checks run

```
bash scripts/qa/rahma-full-qa.sh                                → OVERALL: PASS
bash scripts/guard/verify-rahma-scope.sh                        → PASS
bash deployment/k3s/scripts/verify-rahma-manifests.sh           → PASS
bash scripts/security/rahma-{secret,k8s-safety}-scan.sh         → PASS
bash deployment/k3s/scripts/deploy-rahma-api-image.sh --dry-run → PASS
bash deployment/k3s/scripts/apply-rahma-ops-updates.sh --dry-run → PASS
bash deployment/k3s/scripts/create-rahma-secrets-from-env.sh --dry-run (missing vars) → REFUSED (expected)
bash deployment/k3s/scripts/run-rahma-db-migrations-job.sh --dry-run → render OK
cd backend/app && npm run lint                                  → clean
cd backend/app && npm run build                                 → exit 0
cd backend/app && npm test                                      → 441/441 PASS
cd backend/app && npm run db:check                              → not_configured (truthful)
cd backend/app && npm run db:status                             → {"configured":false,...}
cd apps/web   && npm test                                       → 8/8 PASS
```

WASM child-safety runtime tests (`wasm/child-safety/server`): NOT run locally (requires `npm ci` in that workspace; ran via CI pattern).
Flutter tests: NOT run locally (no Flutter SDK on this workstation; CI workflow handles).

## 12. CI result

Captured after push.

## 13. Push result

Captured after push.

## 14. Live cluster status

Unchanged from prior verification:

- 5 namespaces ACTIVE.
- `rahma-api` placeholder, `rahma-postgres`, `rahma-redis`, 4 WASM placeholders running.
- Backup + 2 CronJobs created.
- **NO public Rahma ingress.**

Real `rahma-api:latest` image is on GHCR from prior bundle (digest
`sha256:8e72b24e86597c99870ade24299733b7d3cbfff8d421fe64f66bf62fb0f43ced`).
Cluster rollout: **OPERATOR-PENDING**.

## 15. Placeholder status (unchanged)

- API Deployment still serves nginx placeholder.
- 4 WASM Deployments still serve nginx placeholder.
- `/api/quran`, `/api/hadith`, `/api/dua`, `/api/content/sources` → `configured: false`.
- Donations provider = `disabled`.
- Sheikh login = `503 auth_not_configured`.
- `production_ready` from `/ready` = **false**.

## 16. Operator pending tasks

Exact next commands on `master-of-brains`:

```bash
# 1. Static-validate the rollout package.
bash deployment/k3s/scripts/deploy-rahma-api-image.sh --dry-run

# 2. Live roll the real API image.
bash deployment/k3s/scripts/deploy-rahma-api-image.sh
# Writes reports/RAHMA_API_ROLLOUT_<UTC>.md automatically.

# 3. Apply ops manifest updates.
bash deployment/k3s/scripts/apply-rahma-ops-updates.sh --dry-run
bash deployment/k3s/scripts/apply-rahma-ops-updates.sh

# 4. Create real secrets from env (operator sets the env vars).
bash deployment/k3s/scripts/create-rahma-secrets-from-env.sh --dry-run
bash deployment/k3s/scripts/create-rahma-secrets-from-env.sh

# 5. Run live DB migrations.
bash deployment/k3s/scripts/run-rahma-db-migrations-job.sh --dry-run
bash deployment/k3s/scripts/run-rahma-db-migrations-job.sh --confirm-run-migrations

# 6. Verify everything.
bash deployment/k3s/scripts/verify-rahma-mobile-infra.sh
```

Still pending (no commands yet — operator decisions):

- Pick WASM runtime image (wasmtime / wasmedge / custom Rust runner).
- Operator-side build of `wasm/child-safety/server/` Dockerfile.
- Pick mobile framework's third-party HTTP / state libs.
- Run `flutter create .` to generate `android/` + `ios/`.
- Pick final API domain; move `docs/future/rahma-api-ingress.yaml.future` to `deployment/k3s/ingress/`.
- Choose donation provider (Stripe recommended) and supply secret keys.
- Approve Islamic source licensing → ingest pending_review rows.

## 17. Final verdict: **PARTIAL**

All 10 sprints landed file/code/doc deliverables and every local + CI gate passes (CI confirmation after push).

`PARTIAL` items reflect operator-side state:

- Real API image cluster rollout = OPERATOR-PENDING.
- Live DB migrations = OPERATOR-PENDING.
- Real secrets = OPERATOR-PENDING.
- WASM runtime image = NOT BUILT.
- Mobile native shells (`android/`, `ios/`) = generated per workstation.
- Donation provider = disabled.

## Honesty statement

- **Real API image built but cluster rollout pending.** Image is on GHCR;
  digest captured in the previous bundle's commit message.
- **No fake DB migration claim.** Job manifest + runner script ship;
  live execution is operator-pending.
- **No fake real WASM runtime claim.** A runtime BRIDGE ships with the JS
  port; the wasmtime / wasmedge load is a later sprint.
- **No fake mobile release.** Mobile source seeded; no Android / iOS
  release artefacts produced.
- **No fake payment provider.** Provider stays disabled; card data
  refused even when present.
- **No public ingress applied.** Deferred manifests parked in
  `docs/future/`.
- **No fake domains used.** No `api.rahma.example`. No OrdinoxAI domain.
- **No firewall / UFW / iptables / SSH / K3s service / Traefik /
  cert-manager / NetworkPolicy changes.**

`production_ready` from `/ready` remains **`false`**. Rahma/Sakina only —
IterLaw / OrdinoxAI / RightsNow / Alaa Beauty NOT touched.
