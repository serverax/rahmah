# Sprint 61 — API Rollout + Drift Reconciliation

**Date:** 2026-05-14

## What ships

- `deployment/k3s/scripts/check-rahma-live-drift.sh` — read-only cluster comparison vs repo manifests. Never echoes secret values.
- The existing `deploy-rahma-api-image.sh` (Sprints 41+51) — unchanged for this sprint.

## What the drift script checks

| Check | Source of truth |
|---|---|
| `rahma-api` Deployment image | repo: `deployment/k3s/api/rahma-api.yaml` (placeholder) → expected `ghcr.io/serverax/rahmah/rahma-api[:tag]` once rolled |
| `rahma-api` env-var NAMES (no values) | repo: same file |
| `rahma-api` Service `targetPort` | repo: same file |
| Rahma ingress presence | repo: NONE under `deployment/k3s/ingress/` → cluster MUST also have none |
| 4 `rahma-ai` WASM services | repo: `deployment/k3s/wasm/rahma-wasm-placeholders.yaml` |
| 2 `rahma-data` services | repo: `deployment/k3s/postgres/*` + `deployment/k3s/redis/*` |
| 3 CronJobs | repo: `deployment/k3s/{backup,monitoring,security}/*` |
| `rahma-api/rahma-platform-config` ConfigMap | repo: `deployment/k3s/config/rahma-platform-config.yaml` |
| Forbidden / placeholder domains in cluster ConfigMaps | always forbidden |

## Operator command block

```bash
ssh root@148.251.247.56
cd /root/rahma-deployment   # or wherever the operator keeps the repo on master
git pull --ff-only origin main

# Pre-flight (always safe — read-only).
bash deployment/k3s/scripts/check-rahma-live-drift.sh

# Static-validate the rollout.
bash deployment/k3s/scripts/deploy-rahma-api-image.sh --dry-run

# Live rollout (writes a timestamped report to reports/RAHMA_API_ROLLOUT_<UTC>.md).
bash deployment/k3s/scripts/deploy-rahma-api-image.sh
```

## Live execution status: **OPERATOR-PENDING**

Local kubectl context on this workstation is `aks-iterlaw-we-prod`
(forbidden by saved memory rule). The drift script + rollout itself run
on `master-of-brains` only.

## Honesty record

- Drift script NEVER prints DSN / token / password values.
- Drift script NEVER mutates anything (no `apply` / `set` / `delete` /
  `patch` anywhere).
- The script reports "drift" when a repo-declared item is missing on
  the cluster — operator decides whether to apply.
- No "cluster matches repo" claim is made until the operator runs the
  script on master and pastes the output into a follow-up report.
