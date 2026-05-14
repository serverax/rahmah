# Rahma — API Image Rollout Operator Guide

**Date:** 2026-05-14
**Audience:** operator on master-of-brains.
**Image:** `ghcr.io/serverax/rahmah/rahma-api:latest`

## Two modes

| Mode | Command | What it does |
|---|---|---|
| Dry-run | `bash deployment/k3s/scripts/deploy-rahma-api-image.sh --dry-run` | Static checks only — verifies image ref shape, `deployment/k3s/api/rahma-api.yaml` present, no `deployment/k3s/ingress/*.yaml` present. NO `kubectl` calls. |
| Live rollout | `bash deployment/k3s/scripts/deploy-rahma-api-image.sh` | Performs `kubectl set image` + `kubectl rollout status` + internal `/health` + `/ready` probes + post-check that no Rahma ingress appeared. Writes a timestamped report under `reports/RAHMA_API_ROLLOUT_<UTC>.md`. |

The default image is `ghcr.io/serverax/rahmah/rahma-api:latest`. To
target a specific commit (recommended for production rollouts), pass
the sha-tag explicitly:

```bash
bash deployment/k3s/scripts/deploy-rahma-api-image.sh \
  ghcr.io/serverax/rahmah/rahma-api:sha-44723505c9464dca537c2be07516e6004fd3e733
```

## Pre-flight (operator)

```bash
# 1. Confirm Rahma-safe kubectl context.
kubectl config current-context
# REFUSE if it matches aks-iterlaw / prod-iterlaw / iterlaw / rightsnow / ordinoxai / alaa-beauty / aks-prod.

# 2. Pull latest repo.
git pull --ff-only origin main

# 3. Confirm CI built the image for the commit you intend to ship.
gh run list -R serverax/rahmah --workflow rahma-container-build.yml --limit 3
```

## Run the rollout

```bash
bash deployment/k3s/scripts/deploy-rahma-api-image.sh --dry-run
# Expect: "DRY-RUN complete — no kubectl mutation performed"

bash deployment/k3s/scripts/deploy-rahma-api-image.sh
# Expect: "rahma-api image rolled to: ghcr.io/..."
# A timestamped local report appears at reports/RAHMA_API_ROLLOUT_<UTC>.md
```

## Post-rollout verification

```bash
kubectl -n rahma-api get pods -o wide
kubectl -n rahma-api get deploy rahma-api -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl get ingress -A | grep rahma || echo "OK: no Rahma ingress"
```

## Failure modes

| Exit code | Meaning |
|---|---|
| `0` | success (or dry-run completed) |
| `1` | precondition failed (forbidden context / missing manifest / image-ref shape) |
| `2` | rollout itself failed (CrashLoopBackOff / ImagePullBackOff / health probe failure) |
| `3` | post-check failed (a Rahma ingress appeared) |

For `exit 2`:
```bash
kubectl -n rahma-api describe deploy rahma-api | tail -50
kubectl -n rahma-api logs deploy/rahma-api --tail=100
kubectl -n rahma-api rollout undo deployment/rahma-api
```

## Hard rules during rollout

- NEVER paste secret values in shell history.
- NEVER apply a public ingress from this script (the script refuses).
- NEVER touch Traefik / cert-manager / NetworkPolicy / firewall / UFW /
  iptables / SSH / K3s service from this script.
- NEVER use the forbidden kubectl contexts.

## What the script does NOT do

- Build images. Image building is CI-only.
- Push images. CI is the only publisher.
- Apply a Service / ConfigMap / Secret manifest. Use the dedicated
  scripts for those (`apply-rahma-ops-updates.sh`,
  `create-rahma-secrets-from-env.sh`).
- Touch any other namespace.
