# Rahma — Mobile K3s Runbook

**Date:** 2026-05-14
**Audience:** operator (on master-of-brains or wherever the admin kubeconfig lives)
**Scope:** mobile-only Rahma. Public ingress deferred.

This runbook is the canonical deployment order for Rahma's internal-only
infrastructure. It supersedes the older
`RAHMA_K3S_DEPLOYMENT_RUNBOOK.md` for mobile-only operations.

## 0. Safety gate (every time)

```bash
export KUBECONFIG=<path to Sakina-safe kubeconfig>
kubectl config current-context
```

**Refuse** to proceed if the context matches `aks-iterlaw`, `prod`,
`iterlaw`, `rightsnow`, `ordinoxai`, `alaa-beauty`. The verify script
checks the same regex:

```bash
bash scripts/deploy/verify-rahma-cluster.sh
bash scripts/guard/verify-rahma-scope.sh
bash deployment/k3s/scripts/verify-rahma-manifests.sh
bash scripts/security/rahma-secret-scan.sh
bash scripts/security/rahma-k8s-safety-scan.sh
```

All five must exit 0.

## 1. Namespaces

```bash
kubectl apply -f deployment/k3s/namespaces/
kubectl get ns | grep rahma-
```

Expect 5: `rahma-api`, `rahma-data`, `rahma-ai`, `rahma-monitoring`,
`rahma-security`. **No `rahma-web`.**

## 2. ConfigMap

```bash
kubectl apply -f deployment/k3s/config/rahma-platform-config.yaml
```

## 3. Secrets (manual create, NOT from yaml)

See `docs/infra/RAHMA_SECRETS_REQUIRED.md` for the canonical list +
operator-run `kubectl create secret` commands.

## 4. Data layer

```bash
kubectl apply -f deployment/k3s/postgres/
kubectl apply -f deployment/k3s/redis/
kubectl -n rahma-data rollout status statefulset/rahma-postgres --timeout=180s
kubectl -n rahma-data rollout status statefulset/rahma-redis    --timeout=180s
```

## 5. Migrations (from a workstation with kubectl)

```bash
kubectl -n rahma-data port-forward svc/rahma-postgres 15432:5432 &
DATABASE_URL="postgres://<user>:<pw>@127.0.0.1:15432/<db>?sslmode=disable" \
  ( cd backend/app && npm run db:migrate )
kill %1
```

## 6. API placeholder (and later, the real image)

```bash
kubectl apply -f deployment/k3s/api/rahma-api-placeholder.yaml
kubectl -n rahma-api rollout status deployment/rahma-api --timeout=180s
```

Swap to the real backend deployment once the operator verifies the
`ghcr.io/serverax/rahmah/sakina-backend:main` image:

```bash
kubectl apply -f deployment/k3s/backend/rahma-api-deployment.yaml
kubectl apply -f deployment/k3s/backend/rahma-api-service.yaml
kubectl apply -f deployment/k3s/backend/rahma-api-pdb.yaml
```

## 7. WASM placeholders

```bash
kubectl apply -f deployment/k3s/wasm/rahma-wasm-placeholders.yaml
```

Four Services + Deployments in `rahma-ai`. Real `.wasm` runtime image is
operator-chosen (see `docs/wasm/RAHMA_WASM_LIMITATIONS.md`).

## 8. Backup + monitoring + security CronJobs

```bash
kubectl apply -f deployment/k3s/backup/
kubectl apply -f deployment/k3s/monitoring/
kubectl apply -f deployment/k3s/security/
```

## 9. NO public ingress

Public ingress is deferred until the operator chooses the final API
domain. See `docs/infra/RAHMA_PUBLIC_API_EXPOSURE_LATER.md`.

## 10. Verify

```bash
bash deployment/k3s/scripts/verify-rahma-mobile-infra.sh
```

Exits 0 only if every required workload and CronJob is present and
no public Rahma ingress is applied.

## 11. Rollback (operator-explicit)

```bash
# Stops CronJobs, removes deployments/services. PVCs preserved by default.
bash deployment/k3s/scripts/rollback-rahma-mobile-infra.sh

# To also delete the data PVCs (destructive!):
ROLLBACK_DELETE_PVCS=1 bash deployment/k3s/scripts/rollback-rahma-mobile-infra.sh
```

## Forbidden (every time)

- Applying against a forbidden context.
- Editing Traefik, cert-manager, NetworkPolicy, firewall, UFW,
  iptables, SSH, or K3s service config from this repo.
- Creating a `rahma-web` namespace or public website.
- Using a non-placeholder host in `rahma-api-ingress.yaml` without
  operator-confirmed DNS + ClusterIssuer.
- Committing real secret values.
