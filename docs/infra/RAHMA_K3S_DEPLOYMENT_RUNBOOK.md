# Rahma — K3s Deployment Runbook

**Date:** 2026-05-14
**Pre-requisite:** master access restored (see `RAHMA_MASTER_ACCESS_RECOVERY.md`).

This runbook is the *exact* command sequence to deploy Rahma to a
verified Sakina-safe K3s cluster. Do not run any of it until the
context check passes.

## 0. Safety gate (mandatory, every time)

```bash
export KUBECONFIG=~/.kube/rahma-master.yaml
kubectl config current-context
```

**STOP IMMEDIATELY** if the context name matches `aks`, `prod`,
`iterlaw`, `rightsnow`, `ordinox`, `alaa` — see
`scripts/deploy/verify-rahma-cluster.sh` for the canonical regex.

```bash
bash scripts/deploy/verify-rahma-cluster.sh   # must say "context OK"
bash scripts/guard/verify-rahma-scope.sh      # must say "OVERALL: PASS"
bash deployment/k3s/scripts/verify-rahma-manifests.sh
bash scripts/security/rahma-k8s-safety-scan.sh
bash scripts/security/rahma-secret-scan.sh
```

If any of those exit non-zero, abort. Do not proceed.

## 1. Connect to master (sanity check)

```bash
ssh root@138.201.253.56
systemctl is-active k3s
kubectl get nodes -o wide
kubectl get pods -A
exit
```

## 2. Apply namespaces

```bash
kubectl apply -f deployment/k3s/namespaces/
kubectl get ns | grep rahma-
```

Expect 6 namespaces in `Active` state:
`rahma-web`, `rahma-api`, `rahma-data`, `rahma-ai`, `rahma-monitoring`,
`rahma-security`.

## 3. Apply non-secret config

```bash
kubectl apply -f deployment/k3s/config/rahma-platform-config.yaml
kubectl get cm -A | grep rahma-platform-config
```

## 4. Create real Secrets MANUALLY (never via yaml-in-repo)

```bash
# rahma-postgres-secret
kubectl -n rahma-data create secret generic rahma-postgres-secret \
  --from-literal=POSTGRES_DB=rahma \
  --from-literal=POSTGRES_USER=rahma_app \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 24)"

# rahma-redis-secret
kubectl -n rahma-data create secret generic rahma-redis-secret \
  --from-literal=REDIS_PASSWORD="$(openssl rand -base64 24)"

# rahma-api-secrets — DATABASE_URL must match the above values
DB_PW=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d)
RD_PW=$(kubectl -n rahma-data get secret rahma-redis-secret -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d)
kubectl -n rahma-api create secret generic rahma-api-secrets \
  --from-literal=DATABASE_URL="postgres://rahma_app:${DB_PW}@rahma-postgres.rahma-data.svc.cluster.local:5432/rahma?sslmode=disable" \
  --from-literal=REDIS_URL="redis://:${RD_PW}@rahma-redis.rahma-data.svc.cluster.local:6379/0" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=SESSION_SECRET="$(openssl rand -base64 48)" \
  --from-literal=SHEIKH_ALLOWED_EMAIL_HASHES="<operator-supplied sha256 hexes>" \
  --from-literal=ADMIN_ALLOWED_EMAIL_HASHES="<operator-supplied sha256 hexes>"
```

`unset DB_PW RD_PW` immediately after.

## 5. Apply data layer

```bash
kubectl apply -f deployment/k3s/postgres/rahma-postgres-service.yaml
kubectl apply -f deployment/k3s/postgres/rahma-postgres-statefulset.yaml
kubectl apply -f deployment/k3s/postgres/rahma-postgres-init-configmap.yaml
kubectl -n rahma-data rollout status statefulset/rahma-postgres --timeout=180s

kubectl apply -f deployment/k3s/redis/rahma-redis-service.yaml
kubectl apply -f deployment/k3s/redis/rahma-redis-statefulset.yaml
kubectl -n rahma-data rollout status statefulset/rahma-redis --timeout=180s
```

## 6. Run migrations against the new Postgres

```bash
# From a developer workstation with kubectl access:
kubectl -n rahma-data port-forward svc/rahma-postgres 15432:5432 &
export DATABASE_URL="postgres://rahma_app:${DB_PW}@127.0.0.1:15432/rahma?sslmode=disable"
( cd backend/app && npm run db:migrate )
kill %1
unset DATABASE_URL DB_PW
```

## 7. Apply backend

```bash
kubectl apply -f deployment/k3s/backend/rahma-api-service.yaml
kubectl apply -f deployment/k3s/backend/rahma-api-deployment.yaml
kubectl apply -f deployment/k3s/backend/rahma-api-pdb.yaml
kubectl -n rahma-api rollout status deployment/rahma-api --timeout=180s
```

## 8. Apply frontend

```bash
kubectl apply -f deployment/k3s/frontend/rahma-web-service.yaml
kubectl apply -f deployment/k3s/frontend/rahma-web-deployment.yaml
kubectl -n rahma-web rollout status deployment/rahma-web --timeout=180s
```

## 9. Apply cert-manager ClusterIssuer

First confirm cert-manager itself is installed and Ready
(`kubectl get pods -n cert-manager`). Then:

```bash
# Edit the email field before applying.
kubectl apply -f deployment/k3s/cert-manager/letsencrypt-prod-clusterissuer.yaml
kubectl get clusterissuer letsencrypt-prod -o wide
```

## 10. Apply ingress

```bash
kubectl apply -f deployment/k3s/ingress/rahma-web-ingress.yaml
kubectl apply -f deployment/k3s/ingress/rahma-api-ingress.yaml
kubectl get ingress -A | grep rahma
kubectl get certificate -A | grep rahma
```

## 11. Live verification

```bash
kubectl get pods -n rahma-api
kubectl get pods -n rahma-web
kubectl get pods -n rahma-data

# In-cluster probe:
kubectl -n rahma-api run probe --rm -it --image=alpine/curl --restart=Never -- \
  curl -sS http://rahma-api.rahma-api.svc.cluster.local/health

# Public probe (only after DNS is verified):
curl -I https://rahma.ordinoxai.com
curl -I https://api.rahma.ordinoxai.com/health
```

A "deployment is verified" claim requires BOTH:

- `kubectl rollout status` output captured in the closeout report.
- A `curl -I https://...` showing 200/30x AND a Let's Encrypt issuer.

## 12. Rollback (if needed)

```bash
kubectl -n rahma-api rollout undo deployment/rahma-api
kubectl -n rahma-web rollout undo deployment/rahma-web
```

## 13. Removal (only on operator instruction)

```bash
# Delete in REVERSE order. Never delete namespaces while data is needed.
kubectl delete -f deployment/k3s/ingress/
kubectl delete -f deployment/k3s/backend/
kubectl delete -f deployment/k3s/frontend/
# Data layer: leave alone unless explicitly authorised.
```

## 14. Forbidden operations

- `kubectl delete ns ordinox-ai` — **NEVER**.
- `kubectl edit clusterissuer letsencrypt-prod` if it's owned by another
  project — **NEVER without operator authorisation**.
- `kubectl apply` against any context named like `aks-*`, `prod-*`,
  `iterlaw*`, `rightsnow*`, `ordinox*`, `alaa-*` — **NEVER**.
- `ufw default deny`, `iptables -P INPUT DROP` — **NEVER**.
