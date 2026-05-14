# Rahma — Release Candidate 1 Plan

**Date:** 2026-05-14
**Target:** RC1 is the first build the operator submits to internal
testing (TestFlight Internal + Play Internal Test). NOT a store
release.

## Pre-flight (all must pass)

| Gate | How |
|---|---|
| Backend tests | `cd backend/app && npm test` |
| Web tests | `cd apps/web && npm test` |
| WASM child-safety bridge tests | `cd wasm/child-safety/server && npm test` |
| Flutter analyze + test | CI workflow `rahma-mobile-flutter-ci` |
| Full QA | `bash scripts/qa/rahma-full-qa.sh` |
| Release security gate | `bash scripts/security/rahma-release-security-gate.sh` |
| Drift check on cluster | `bash deployment/k3s/scripts/check-rahma-live-drift.sh` (on master) |

## Operator action sequence

1. **Cluster image rollout**
   ```
   bash deployment/k3s/scripts/deploy-rahma-api-image.sh
   ```
2. **Ops apply**
   ```
   bash deployment/k3s/scripts/apply-rahma-ops-updates.sh
   ```
3. **Real secrets** (env-driven)
   ```
   bash deployment/k3s/scripts/create-rahma-secrets-from-env.sh
   ```
4. **DB migrations** (operator-confirmed)
   ```
   bash deployment/k3s/scripts/run-rahma-db-migrations-job.sh --confirm-run-migrations
   ```
5. **Seeds** (after migrations)
   ```
   ( cd backend/app && npm run db:seed )
   ```
6. **WASM child-safety image rollout**
   ```
   bash deployment/k3s/scripts/deploy-rahma-child-safety-runtime.sh
   ```
7. **Drift re-check**
   ```
   bash deployment/k3s/scripts/check-rahma-live-drift.sh
   ```
8. **OIDC provider live** (operator-side)
9. **Approved Islamic source #1 ingested** (operator-side)
10. **Mobile build**
    ```
    cd apps/mobile
    flutter create . --platforms=android,ios   # once per workstation
    flutter pub get
    flutter analyze && flutter test
    flutter build appbundle --release \
      --dart-define=RAHMA_API_BASE=https://api.<final-rahma-domain> \
      --dart-define=RAHMA_BUILD_FLAVOR=internal-test
    ```

## What stays deferred to RC2 / GA

- Public API ingress + final domain.
- Real wasmtime / wasmedge load in the WASM bridge.
- Payment provider live (Stripe credentials in secrets).
- Push notifications (APNs / FCM keys).

## Honesty record

When RC1 ships, capture:
- The exact image digests (rahma-api + child-safety + …).
- The captured `/ready` body showing `production_ready: false` (RC1 ≠ GA).
- The Flutter build artefact hashes (AAB + IPA).
- Into `reports/RAHMA_RC1_LIVE_<date>.md`.

Until that report exists, **no RC1 claim is made anywhere else**.
