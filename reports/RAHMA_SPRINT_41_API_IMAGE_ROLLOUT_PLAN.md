# Sprint 41 — Rahma API Image Rollout Plan

**Date:** 2026-05-14
**Project:** Rahma/Sakina (mobile-app-only)
**Image:** `ghcr.io/serverax/rahmah/rahma-api:latest`
**Manifest digest:** `sha256:5f388eb38539ba2cba5927e31aa504e5de5691f61105e1e40c3323f3436a1fb2`
**Built by:** `.github/workflows/rahma-container-build.yml` (CI run `25837672242`)

## What this sprint does

Hardens the rollout script + records the exact operator commands. **The
rollout itself is NOT executed from this workstation.** Local
`kubectl config current-context` is `aks-iterlaw-we-prod` (forbidden by
saved memory rule `[[feedback-never-deploy-to-prod]]`); the operator
runs the rollout on `master-of-brains` with the Rahma-safe kubeconfig.

## Script changes (`deployment/k3s/scripts/deploy-rahma-api-image.sh`)

| Change | Why |
|---|---|
| Default IMAGE = `ghcr.io/serverax/rahmah/rahma-api:latest` | Operator can `bash deploy-rahma-api-image.sh` with no args |
| Print current image before swap | Audit trail in operator's shell |
| Run both `/health` AND `/ready` internal probes | Verify the new image's contract on both endpoints |
| Post-check: refuse to silently leave behind a Rahma ingress | Defense in depth against accidental public exposure |

## Safety properties the script preserves

- Refuses forbidden kubectl contexts (`aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw`).
- Refuses to run if `deploy/rahma-api` is missing (operator must apply
  `deployment/k3s/api/rahma-api.yaml` first).
- Refuses to run if any Rahma ingress already exists.
- Touches **only** `deployment/rahma-api` in namespace `rahma-api`.
- Never touches firewall / UFW / iptables / SSH / K3s service /
  Traefik / cert-manager / NetworkPolicy / kube-system.
- Never prints DSN / JWT / secret values.

## Rollout status: **OPERATOR-PENDING**

Reason: local kubectl context is `aks-iterlaw-we-prod` (forbidden); no
Rahma-safe kubeconfig is available on this workstation.

## Exact operator commands

See `docs/infra/RAHMA_OPERATOR_ROLLOUT_COMMANDS.md` for the full
sequence the operator runs on `master-of-brains`.

## Verification after rollout (operator captures + pastes back)

1. `kubectl -n rahma-api get deploy rahma-api -o jsonpath='{.spec.template.spec.containers[0].image}'`
   → must show `ghcr.io/serverax/rahmah/rahma-api:latest` or the sha- tag.
2. `kubectl -n rahma-api rollout status deployment/rahma-api`
   → must say `deployment "rahma-api" successfully rolled out`.
3. Internal `/health` probe → 200 + `{"ok":true,"service":"rahma-api",...}`.
4. Internal `/ready` probe → 200 + `production_ready: false` (until DB / auth / sources are wired) + truthful blockers.
5. `kubectl get ingress -A | grep rahma` → must return **no** Rahma rows.

## Honesty record

When the rollout is executed live, the operator (or assistant on a
Rahma-safe context) writes:

`reports/RAHMA_REAL_IMAGE_LIVE_<date>.md`

containing the captured output of all 5 verification commands. **Until
that report exists, the rollout is NOT claimed live.**
