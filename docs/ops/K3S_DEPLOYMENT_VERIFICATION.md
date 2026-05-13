# Rahma — K3s deployment verification runbook

Sprint 14 deliverable. Step-by-step verification of a real Rahma deployment. **Until each step prints expected output, the system is NOT DEPLOYED.**

## Pre-flight (every time)

```
bash scripts/deploy/verify-rahma-repo.sh    # repo = serverax/rahmah, branch = main
bash scripts/deploy/verify-rahma-cluster.sh # kubectl context not aks/prod/iterlaw/ordinox
kubectl config current-context
kubectl get nodes -o wide
```

If `verify-rahma-cluster.sh` exits non-zero, **STOP**.

## Namespace verification

```
kubectl get ns | grep -E '^(rahma-app|rahma-data|rahma-security|rahma-monitoring)\b'
```

All 4 must exist. If only `rahma` (singular) exists, the operator chose the single-namespace layout — fine, but the deploy script default expects the 4-split.

## Data tier verification

```
kubectl -n rahma-data get pods -o wide
kubectl -n rahma-data get svc
kubectl -n rahma-data get pvc
kubectl -n rahma-data get statefulset rahma-postgres -o jsonpath='{.status.readyReplicas}'
kubectl -n rahma-data get statefulset rahma-redis    -o jsonpath='{.status.readyReplicas}'
kubectl -n rahma-data get statefulset rahma-minio    -o jsonpath='{.status.readyReplicas}'
```

Expected: all three `readyReplicas = 1`. All Services `type: ClusterIP`.

## App tier verification

```
kubectl -n rahma-app get deploy rahma-backend
kubectl -n rahma-app get pods -o wide
kubectl -n rahma-app rollout status deploy/rahma-backend --timeout=180s
```

If the rollout times out, fetch:
```
kubectl -n rahma-app logs deploy/rahma-backend --tail=200
kubectl -n rahma-app describe pod -l app.kubernetes.io/name=rahma-backend | tail -50
```

## Functional smoke

```
bash scripts/deploy/check-rahma-health.sh
```

Expected response shapes:

- `/health` → `{ "ok": true, ... }`
- `/ready` → `database.configured: true`, `database.connected: true`, `safe_to_serve_public: true`, `rag.mode: "database"` (once registry+retrieval are wired).
- `/api/rag/status` → `database_configured: true`, `approved_sources: ≥ 0`, no errors.
- `/api/engine/status` → `engine_implemented: false` until the Control Engine ships. This is correct.
- `/api/sadaqah/transparency` → `provider_status: "disabled"` until a real provider is wired. This is correct.

## Ingress verification (only if DNS + cert-manager are in place)

```
kubectl get ingressclass
kubectl -n rahma-app get ingress
dig +short sakina.ordinoxai.com   # must resolve to a node IP
curl -I  http://sakina.ordinoxai.com/health
curl -kI https://sakina.ordinoxai.com/health
```

If DNS is NXDOMAIN, ingress stays unapplied — the system is reachable via `kubectl port-forward` only. Document `NO PUBLIC DOMAIN CONFIGURED YET`.

## NetworkPolicy verification (optional)

```
kubectl -n rahma-data get networkpolicy
kubectl get pods -A | grep -iE 'calico|cilium|kube-router|weave-net'
```

Without an enforcing CNI, NetworkPolicy is a no-op. Document it honestly.

## What success looks like (all three must be true)

1. Every Deployment / StatefulSet `readyReplicas == replicas`.
2. `/ready` returns `safe_to_serve_public: true`.
3. A test public Q&A entry is fetched end-to-end and the citation list is non-empty.

If any of these fails, the deployment is **NOT DEPLOYED**. No report may say otherwise.
