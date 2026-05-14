# Rahma — K3s Deployment Runbook (Mobile-App Only)

**Date:** 2026-05-14
**Pre-requisite:** master access restored (see `RAHMA_MASTER_ACCESS_RECOVERY.md`).

Rahma is **mobile-app-only**. There is no `rahma-web` namespace, no public
website deployment, and no public admin dashboard. The only public endpoint
is `api.<final-rahma-domain>` (placeholder: `api.rahma.example`).

This runbook is the *exact* command sequence to deploy Rahma to a verified
Sakina-safe K3s cluster. Do not run any of it until the context check passes.

## 0. Safety gate (mandatory, every time)

```bash
export KUBECONFIG=~/.kube/rahma-master.yaml
kubectl config current-context
```

**STOP IMMEDIATELY** if the context name matches `aks`, `prod`, `iterlaw`,
`rightsnow`, `ordinox`, `alaa` — see `scripts/deploy/verify-rahma-cluster.sh`
for the canonical regex.

```bash
bash scripts/deploy/verify-rahma-cluster.sh   # must say "context OK"
bash scripts/guard/verify-rahma-scope.sh      # must say "OVERALL: PASS"
bash deployment/k3s/scripts/verify-rahma-manifests.sh
bash scripts/security/rahma-k8s-safety-scan.sh
bash scripts/security/rahma-secret-scan.sh
```

If any of those exit non-zero, abort. Do not proceed.

## Hands-off items (operator-owned cluster resources)

The following are **operator-owned** and this runbook never modifies them:

- Traefik (ingress controller) — operator installs / configures.
- cert-manager (core install) — operator installs / configures.
- ClusterIssuer (Let's Encrypt or otherwise) — operator owns; this repo
  uses a placeholder name `REPLACE_ME_clusterissuer` in the ingress
  manifest, operator edits it to the real issuer name before applying.
- NetworkPolicy resources owned by other tenants on a shared cluster.
- Firewall / UFW / iptables.
- SSH server config on cluster nodes.

## 1. Connect to master (sanity check)

```bash
ssh root@138.201.253.56
systemctl is-active k3s
kubectl get nodes -o wide
kubectl get pods -A
exit
```

## 2. Apply the 5 namespaces

```bash
kubectl apply -f deployment/k3s/namespaces/
kubectl get ns | grep rahma-
```

Expect 5 namespaces in `Active` state: `rahma-api`, `rahma-data`,
`rahma-ai`, `rahma-monitoring`, `rahma-security`. **No `rahma-web`.**

## 3. Apply non-secret config

```bash
kubectl apply -f deployment/k3s/config/rahma-platform-config.yaml
kubectl get cm -n rahma-api | grep rahma-platform-config
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

## 7. Apply mobile API backend

```bash
kubectl apply -f deployment/k3s/backend/rahma-api-service.yaml
kubectl apply -f deployment/k3s/backend/rahma-api-deployment.yaml
kubectl apply -f deployment/k3s/backend/rahma-api-pdb.yaml
kubectl -n rahma-api rollout status deployment/rahma-api --timeout=180s
```

## 8. (No frontend step.) — Rahma has no public website.

## 9. Apply ingress for the single public endpoint

Pre-requisites:
- The operator has chosen and DNS-verified the final hostname.
- The operator has replaced `api.rahma.example` in
  `deployment/k3s/ingress/rahma-api-ingress.yaml` with the real host.
- The operator has replaced `REPLACE_ME_clusterissuer` with the name of
  the existing ClusterIssuer on the target cluster.

```bash
kubectl apply -f deployment/k3s/ingress/rahma-api-ingress.yaml
kubectl get ingress -A | grep rahma
kubectl get certificate -A | grep rahma
```

## 10. Live verification

```bash
kubectl get pods -n rahma-api
kubectl get pods -n rahma-data

# In-cluster probe:
kubectl -n rahma-api run probe --rm -it --image=alpine/curl --restart=Never -- \
  curl -sS http://rahma-api.rahma-api.svc.cluster.local/health

# Public probe (only after DNS is verified):
curl -I https://api.<final-rahma-domain>/health
```

A "deployment is verified" claim requires BOTH:

- `kubectl rollout status` output captured in the closeout report.
- A `curl -I https://api.<final-rahma-domain>/health` showing 200 AND
  the operator's expected TLS issuer.

## 11. Rollback (if needed)

```bash
kubectl -n rahma-api rollout undo deployment/rahma-api
```

## 12. Removal (only on operator instruction)

```bash
# Delete in REVERSE order. Never delete namespaces while data is needed.
kubectl delete -f deployment/k3s/ingress/
kubectl delete -f deployment/k3s/backend/
# Data layer: leave alone unless explicitly authorised.
```

## 13. Forbidden operations

- `kubectl delete ns ordinox-ai` — **NEVER**.
- Modify Traefik / cert-manager / NetworkPolicy / ClusterIssuer owned by
  another project — **NEVER**.
- Apply against any context named like `aks-*`, `prod-*`, `iterlaw*`,
  `rightsnow*`, `ordinox*`, `alaa-*` — **NEVER**.
- `ufw default deny`, `iptables -P INPUT DROP`, SSH config changes —
  **NEVER**.
- Create a `rahma-web` namespace or public website — **NEVER** (Rahma is
  mobile-only).
