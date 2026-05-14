# Rahma — Bundle 04 (Sprints 61–70) — Final Report

**Date:** 2026-05-14
**Project:** Rahma/Sakina (mobile-only)
**Repo:** `serverax/rahmah` · Branch `main`
**Starting HEAD:** `0da4613`
**Final HEAD:** `142bfce` (Bundle 04 work + 3 post-bundle fixes: mobile `app.dart` bottom-nav shell · repair of pre-existing release-gate workflow YAML · child-safety runtime auto-listen guard)

## 1. Scope confirmation

- Rahma is mobile-only. No public website, admin dashboard, or public ingress applied.
- No OrdinoxAI domain. No `api.rahma.example` in active YAML manifests.
- IterLaw / OrdinoxAI workloads / Alaa Beauty: **NOT touched.**
- Firewall / UFW / iptables / SSH / K3s service / Traefik / cert-manager / NetworkPolicy / kube-system: **NOT touched.**

## 2. Sprint 61–70 status

| # | Goal | Status |
|---|---|---|
| 61 | API rollout + drift script | **PASS** — drift script; live rollout OPERATOR-PENDING |
| 62 | /ready v2 contract | **PASS** — schema_version "2", per-WASM blocks, islamic_sources, donations, 8 new tests |
| 63 | DB migration dry-run + seeds | **PASS — FOUNDATION** — `db:seed`, seeds runner refuses placeholders, Job template |
| 64 | Auth + session foundation | **PASS — FOUNDATION** — password-policy + session-service + device-service + 12 tests |
| 65 | Sheikh workflow v1 | **PASS — SERVICE LAYER** — workflow + citation-policy services, 9 tests |
| 66 | Child-safety runtime image | **PASS** — Dockerfile + workflow + deploy script + real-image K3s manifest |
| 67 | Flutter MVP shell | **PASS — FOUNDATION** — bottom-nav, themes, smoke tests |
| 68 | Offline + sync foundation | **PASS** — cache_policy + sync_status + `/api/mobile/sync/status` + 8 tests |
| 69 | Security + privacy release gate | **PASS** — 12-check aggregator + 4 security docs |
| 70 | Bundle closeout | **PASS** — this report; checklist docs |

## 3. Files created/changed

50+ new/modified files across:

- `backend/app/src/`: ready.js (v2), routes/auth-session.js, routes/mobile-sync.js, services/{sheikh-workflow,citation-policy}-service.js, auth/{password-policy,session-service,device-service,auth-errors}.js
- `backend/app/test/`: sprint-62, 64, 65, 68 (37 new tests)
- `backend/db/seeds/`: README + 001_system_roles.sql
- `scripts/db/run-seeds.js`
- `deployment/k3s/scripts/`: check-rahma-live-drift.sh, deploy-rahma-child-safety-runtime.sh
- `deployment/k3s/jobs/rahma-db-seed-job.yaml.template`
- `deployment/k3s/wasm/rahma-child-safety-runtime.yaml`
- `scripts/security/rahma-release-security-gate.sh`
- `wasm/child-safety/server/Dockerfile`
- `.github/workflows/rahma-child-safety-image.yml`
- `apps/mobile/lib/`: app.dart (bottom-nav), nav/, theme/, offline/
- `apps/mobile/test/`: app_smoke_test.dart, offline_policy_test.dart
- `docs/api/`: READY_V2_CONTRACT.md, SHEIKH_WORKFLOW_V1.md
- `docs/security/`: AUTH_IMPLEMENTATION_FOUNDATION.md, PRIVACY_MODEL.md, CHILD_DATA_PROTECTION.md, API_SECURITY_RELEASE_GATE.md, THREAT_MODEL_MOBILE_API.md
- `docs/mobile/`: OFFLINE_FIRST_DESIGN.md, SYNC_CONFLICT_POLICY.md, MOBILE_MVP_SHELL_REPORT.md
- `docs/wasm/`: CHILD_SAFETY_IMAGE_ROLLOUT.md
- `docs/infra/`: DB_SEED_RUNBOOK.md
- `docs/release/`: RC1_PLAN.md, PUBLIC_API_READINESS_CHECKLIST.md, MOBILE_APP_READINESS_CHECKLIST.md
- 10 sprint reports + bundle final

## 4. Backend changes

- `/ready` upgraded to schema version 2 with per-WASM-module blocks, `islamic_sources`, `donations`, new blocker `donations_provider_not_configured`.
- 4 new auth modules + auth-session route (`/api/auth/session/{start,refresh,logout}` + `/api/device/register`).
- Sheikh workflow + citation-policy services.
- `/api/mobile/sync/status` route.
- 37 new tests; total backend test count: **509 PASS**.

## 5. DB / migration changes

- `db:seed` script + seeds runner; refuses placeholder DSN; refuses destructive SQL before any DB write.
- `001_system_roles.sql` (only allowed seed — role catalogue).
- `rahma-db-seed-job.yaml.template` for cluster-side seed application.

## 6. Auth / Sheikh workflow changes

- Auth: 503/400 honest responses; no password grant ever.
- Sheikh workflow service refuses without citation, refuses if WASM gates unreachable, returns `persisted: false` when DB/repo missing.

## 7. WASM / runtime changes

- Real Dockerfile + GHCR build workflow + deploy script for `rahma-child-safety-wasm`.
- Cluster rollout OPERATOR-PENDING.

## 8. Mobile app changes

- Bottom-nav shell + 5 tabs + light/dark themes.
- Offline cache policy + sync-status enum.
- Tests for app boot, tab swap, offline policy, API client refusal.

## 9. Offline / sync changes

- Donations NEVER queueable offline.
- Question drafts + game progress ARE queueable.
- Server is source of truth for everything except local game counters.

## 10. Security / privacy changes

- Release security gate aggregator (12 checks, all PASS locally).
- Privacy model, child data protection, threat model, release-gate docs.

## 11. K3s / operator scripts

- `check-rahma-live-drift.sh` — read-only cluster comparison.
- `deploy-rahma-child-safety-runtime.sh` — placeholder → real image swap.
- All existing scripts unchanged.

## 12. Tests / checks run

```
bash scripts/qa/rahma-full-qa.sh                          → OVERALL: PASS
bash scripts/security/rahma-release-security-gate.sh      → PASS (all 12 checks)
bash deployment/k3s/scripts/deploy-rahma-api-image.sh --dry-run → PASS
bash deployment/k3s/scripts/apply-rahma-ops-updates.sh --dry-run → PASS
bash deployment/k3s/scripts/deploy-rahma-child-safety-runtime.sh --dry-run → PASS
cd backend/app && npm run lint                            → clean
cd backend/app && npm run build                           → exit 0
cd backend/app && npm test                                → 509/509 PASS
cd backend/app && npm run db:check                        → not_configured (truthful)
cd backend/app && npm run db:status                       → {"configured":false,...}
cd backend/app && npm run db:seed                         → DATABASE_URL not set — refusing (truthful)
cd apps/web && npm test                                   → 8/8 PASS
```

Flutter tests + WASM bridge tests: run in CI workflows (no local SDK).

## 13. CI result

On final HEAD `142bfce` (push event):

| Workflow | Conclusion |
|---|---|
| rahma-ci (backend lint+build+test) | **success** |
| rahma-security-scan | **success** |
| rahma-wasm-build | **success** |
| rahma-infra-validate | **success** (first green ever; broken by YAML-indent bug since `c895ce2`, fixed in `eb83353` + `87d4a17`) |
| rahma-release-readiness | **success** (first green ever; same root cause + scanner-tightening) |
| rahma-mobile-flutter-ci | **success** on `363a447` (path-filtered, not triggered by `142bfce`) |
| backend-image-ci | last green on `1b18471` (path-filtered to `backend/app/**`) |
| rahma-child-safety-image | **success** on `142bfce` — first successful build + push. The original `1b18471` and `87d4a17` runs hung at `npm test` because `src/index.js` unconditionally called `app.listen(8080)` on import; fixed by gating the listener on `import.meta.url === pathToFileURL(argv[1]).href`. |

## 14. Push result

`142bfce` pushed to `serverax/rahmah` `main`. Commit chain on top of the Bundle 04 initial push (`1b18471`):

- `521e07c` — fix(rahma-mobile-flutter-ci): pass `--project-name` + drop the auto-generated widget_test.dart.
- `b8ec815` — fix(rahma-mobile): use `pumpAndSettle()` so async localization lookups complete before assertions.
- `fe6b708` — fix(rahma-mobile): assert against `BottomNavigationBar` (framework type), not `RahmaBottomNav`.
- `363a447` — fix(rahma-mobile): actually apply the bottom-nav shell to `apps/mobile/lib/app.dart` (earlier Write had silently failed).
- `eb83353` — fix(workflows): repair pre-existing YAML-indent bug in `rahma-infra-validate.yml` + `rahma-release-readiness.yml`. Both had python heredoc / multi-line `python -c '...'` bodies at column 0, outside the `run: |` block-scalar indent. Both workflows had **never produced a green run** since they were introduced in `c895ce2`.
- `87d4a17` — fix(workflows): tighten the now-running release-gate scanners to remove false positives (`POSTGRES_DB` / `POSTGRES_USER` are identifiers not credentials; exclude `test/` and the scanner workflow itself from the doc-claim scan).
- `f89f9cd` — docs(bundle-04): interim CI-status record.
- `142bfce` — fix(child-safety-runtime): only auto-listen when this file is the Node entrypoint; gate with `import.meta.url === pathToFileURL(argv[1]).href` instead of the previous `NODE_ENV !== 'test'` (which Node's test runner doesn't set, so importing `buildServer` from the test file pinned the listener open and hung CI).

## 15. Live cluster status

Unchanged on the live K3s cluster. Real images published to GHCR (anon-pullable; verified via `https://ghcr.io/v2/.../manifests/latest`):

| Image | Last green build | amd64 digest |
|---|---|---|
| `ghcr.io/serverax/rahmah/rahma-api:latest` | `1b18471` | `sha256:44b61cb0b447fd526d2ebc8388ea2d1c4c4ad588b1cc4e887465cbc14b3184a6` |
| `ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest` | `142bfce` | `sha256:c3100eb1be9fbbde3d09fd0636d3374df2c1135293bfe942b04cc4f5a0139cbd` |

Cluster rollout for both images: OPERATOR-PENDING.

## 16. Placeholder status

- API + 4 WASM Deployments still nginx placeholder on cluster.
- `/api/quran|hadith|dua|content/sources` → `configured: false`.
- Donations provider = `disabled`.
- Sheikh login = `503 auth_not_configured`.
- `production_ready` from `/ready` = **false** (8 blockers).

## 17. Operator pending tasks

```bash
ssh root@148.251.247.56
cd /root/rahma-deployment && git pull --ff-only origin main

# 1. Drift check (read-only).
bash deployment/k3s/scripts/check-rahma-live-drift.sh

# 2. Release security gate.
bash scripts/security/rahma-release-security-gate.sh

# 3. Apply ops updates.
bash deployment/k3s/scripts/apply-rahma-ops-updates.sh

# 4. Real secrets (env-driven).
bash deployment/k3s/scripts/create-rahma-secrets-from-env.sh

# 5. Migrations.
bash deployment/k3s/scripts/run-rahma-db-migrations-job.sh --confirm-run-migrations

# 6. Seeds (after migrations).
( cd backend/app && DATABASE_URL=... npm run db:seed )

# 7. Real API image rollout.
bash deployment/k3s/scripts/deploy-rahma-api-image.sh

# 8. Real child-safety WASM image rollout (after CI built the image).
bash deployment/k3s/scripts/deploy-rahma-child-safety-runtime.sh
```

Plus: pick mobile framework's HTTP/state libs, `flutter create .`, wire OIDC, approve Islamic sources, choose donation provider, decide final API domain.

## 18. Final verdict: **PARTIAL**

All 10 sprints landed file/code/test deliverables and every local + CI gate passes. PARTIAL reflects operator-side state:

- Real API cluster rollout OPERATOR-PENDING.
- Live DB migrations + seeds OPERATOR-PENDING.
- Real secrets OPERATOR-PENDING.
- Real WASM runtime image: built by CI on this push; cluster rollout OPERATOR-PENDING.
- Mobile native shells: `flutter create .` is per-workstation.
- Final API domain + ingress: OPERATOR-DECIDED.
- Payment provider: OPERATOR-DECIDED.

## Honesty statement

- **No fake live rollout claim.** Local kubectl context forbidden; operator-pending throughout.
- **No fake DB migration / seed claim.** Runners refuse placeholder DSN; live exec OPERATOR-PENDING.
- **No fake real WASM runtime claim.** Image built by CI; cluster swap operator-pending. Child-safety bridge currently runs JS port in-process; wasmtime/wasmedge load remains future.
- **No fake mobile release claim.** Shell + 17 tests ship; release builds need real domain.
- **No fake payment claim.** Provider stays `disabled`; card data refused.
- **No public ingress applied. No fake domains. No OrdinoxAI domain.**
- **No firewall / UFW / iptables / SSH / K3s service / Traefik / cert-manager / NetworkPolicy changes.**

`production_ready` from `/ready` remains **`false`**. Rahma/Sakina only.
