# Rahma — Real Image Deployment Runbook

**Date:** 2026-05-14
**Audience:** operator (master-of-brains or wherever the Sakina-safe kubeconfig lives)

This runbook swaps the `rahma-api` placeholder for the real Rahma API
image published by CI. Internal-only Service traffic; public exposure is
still deferred (see `RAHMA_PUBLIC_API_EXPOSURE_LATER.md`).

## 0. Pre-requisites

- `rahma-backend-ci.yml` is green for the commit you intend to ship.
- `rahma-container-build.yml` succeeded for that commit and published
  `ghcr.io/serverax/rahmah/rahma-api:sha-<commit>` AND
  `ghcr.io/serverax/rahmah/rahma-api:latest`.
- Cluster has `rahma-api` namespace and the `rahma-api` Deployment
  already applied (the placeholder is fine — we're swapping its image).
- `rahma-api-secrets` Secret created **manually** with real values
  (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SESSION_SECRET`,
  `SHEIKH_ALLOWED_EMAIL_HASHES`, `ADMIN_ALLOWED_EMAIL_HASHES`).
- `rahma-postgres-secret` + `rahma-redis-secret` created in `rahma-data`.

## 1. Context safety gate

```bash
export KUBECONFIG=<Sakina-safe kubeconfig path>
kubectl config current-context
```

REFUSE if context matches `aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw`.

## 2. Uncomment the env block in deployment/k3s/api/rahma-api.yaml

In `deployment/k3s/api/rahma-api.yaml`, uncomment the four `secretKeyRef`
env entries (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SESSION_SECRET`).
Apply:

```bash
kubectl apply -f deployment/k3s/api/rahma-api.yaml
```

## 3. Swap the image (single command)

```bash
bash deployment/k3s/scripts/deploy-rahma-api-image.sh \
  ghcr.io/serverax/rahmah/rahma-api:latest
```

The script:

- refuses forbidden kubectl contexts;
- refuses if any Rahma ingress already exists (we are internal-only here);
- sets the new image on `deploy/rahma-api`;
- waits for rollout to succeed with `kubectl rollout status`;
- runs a one-shot internal `/health` probe pod and captures its status.

## 4. Verify

```bash
kubectl -n rahma-api get pods -o wide
kubectl -n rahma-api get deploy rahma-api -o jsonpath='{.spec.template.spec.containers[0].image}'
bash deployment/k3s/scripts/verify-rahma-mobile-infra.sh
```

Internal probe:

```bash
kubectl -n rahma-api run rahma-probe --rm -it --restart=Never \
  --image=alpine/curl:8.10.1 -- \
  curl -sS http://rahma-api.rahma-api.svc.cluster.local/ready
```

`/ready` must report `service=rahma-api`, `platform=mobile-only`,
`public_ingress=disabled`. Production_ready remains `false` until DB +
auth + sources are all wired.

## 5. Rollback (if anything is wrong)

```bash
kubectl -n rahma-api rollout undo deployment/rahma-api
kubectl -n rahma-api rollout status deployment/rahma-api --timeout=60s
```

Or set image back to the placeholder:

```bash
kubectl -n rahma-api set image deployment/rahma-api \
  rahma-api=nginxinc/nginx-unprivileged:1.27-alpine
```

## 6. Honesty record

After a successful rollout, write a follow-up report at
`reports/RAHMA_REAL_IMAGE_LIVE_<date>.md` containing:

- the exact image digest (`kubectl get pods -n rahma-api -o jsonpath='{...imageID}'`),
- the captured `/ready` output (which should now show `database.configured: true`, `redis.configured: true` once secrets are wired),
- the kubectl context name (must NOT match the forbidden regex),
- the timestamp.

Until that report exists, **no real rahma-api image is claimed live**.
