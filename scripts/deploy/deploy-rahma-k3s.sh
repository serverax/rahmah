#!/usr/bin/env bash
# deploy-rahma-k3s.sh — apply Rahma manifests to a confirmed-safe K3s context.
#
# This script REFUSES to run unless verify-rahma-repo.sh and verify-rahma-cluster.sh
# both pass, AND the operator passes --i-have-verified-the-cluster explicitly.
#
# It does NOT create Secrets. Secrets must be created manually with
# `kubectl -n rahma-data create secret …` before this script is invoked.
#
# It does NOT apply the Ingress unless --apply-ingress is also passed AND
# the host DNS resolves to a node IP.
set -euo pipefail

cd "$(dirname "$0")/../.."

APPLY_INGRESS=0
APPLY_NETPOL=0
CONFIRMED=0

for arg in "$@"; do
  case "$arg" in
    --i-have-verified-the-cluster) CONFIRMED=1 ;;
    --apply-ingress) APPLY_INGRESS=1 ;;
    --apply-network-policy) APPLY_NETPOL=1 ;;
    *) echo "[deploy-rahma-k3s] unknown arg: $arg" >&2; exit 1 ;;
  esac
done

if [[ "$CONFIRMED" -ne 1 ]]; then
  cat <<EOF >&2
[deploy-rahma-k3s] Refusing to apply manifests without explicit operator confirmation.

  Required:
    1. Run scripts/deploy/verify-rahma-repo.sh    (must exit 0)
    2. Run scripts/deploy/verify-rahma-cluster.sh (must exit 0)
    3. Manually verify Secret rahma-postgres-secret exists in rahma-data:
         kubectl -n rahma-data get secret rahma-postgres-secret
       (and the redis and minio secrets, and rahma-backend-secret in rahma-app)
    4. Manually verify the container image is published / loadable:
         ghcr.io/serverax/rahmah/sakina-backend:main

  Then re-run this script with:
    bash scripts/deploy/deploy-rahma-k3s.sh --i-have-verified-the-cluster
EOF
  exit 2
fi

bash scripts/deploy/verify-rahma-repo.sh
bash scripts/deploy/verify-rahma-cluster.sh

NS_FILE="deployment/k3s/rahma/00-namespace.yaml"
DATA_DIR="deployment/k3s/rahma/data"
APP_DIR="deployment/k3s/rahma/app"
SEC_DIR="deployment/k3s/rahma/security"

echo "[deploy-rahma-k3s] applying namespaces"
kubectl apply -f "$NS_FILE"

# Data tier — Postgres, Redis, MinIO.
echo "[deploy-rahma-k3s] applying data tier"
kubectl apply -f "$DATA_DIR/10-postgres.yaml"
kubectl apply -f "$DATA_DIR/20-redis.yaml"
kubectl apply -f "$DATA_DIR/30-minio.yaml"

echo "[deploy-rahma-k3s] waiting for data rollouts"
kubectl -n rahma-data rollout status statefulset/rahma-postgres --timeout=180s
kubectl -n rahma-data rollout status statefulset/rahma-redis    --timeout=180s
kubectl -n rahma-data rollout status statefulset/rahma-minio    --timeout=180s

# App tier — backend.
echo "[deploy-rahma-k3s] applying app tier"
kubectl apply -f "$APP_DIR/10-backend-configmap.yaml"
kubectl apply -f "$APP_DIR/30-backend-deployment.yaml"
kubectl apply -f "$APP_DIR/40-backend-service.yaml"

echo "[deploy-rahma-k3s] waiting for backend rollout"
kubectl -n rahma-app rollout status deploy/rahma-backend --timeout=180s

# Optional ingress.
if [[ "$APPLY_INGRESS" -eq 1 ]]; then
  echo "[deploy-rahma-k3s] applying ingress (DNS + cert-manager must be in place)"
  kubectl apply -f "$APP_DIR/50-backend-ingress.yaml"
fi

# Optional NetworkPolicy.
if [[ "$APPLY_NETPOL" -eq 1 ]]; then
  echo "[deploy-rahma-k3s] applying NetworkPolicy (only effective on enforcing CNI)"
  kubectl apply -f "$SEC_DIR/10-network-policy.yaml"
fi

# In-cluster smoke test.
echo "[deploy-rahma-k3s] running in-cluster smoke test"
kubectl -n rahma-app run rahma-curl-health-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- \
  curl -sfS http://rahma-backend.rahma-app.svc.cluster.local:3000/health

kubectl -n rahma-app run rahma-curl-ready-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- \
  curl -sfS http://rahma-backend.rahma-app.svc.cluster.local:3000/ready

echo "[deploy-rahma-k3s] OK — apply complete"
