#!/usr/bin/env bash
# =============================================================================
# deploy-rahma-mobile-infra.sh
#
# Applies the Rahma mobile-only infrastructure manifests in order against a
# verified Sakina-safe kubectl context. REFUSES to apply against any
# forbidden context. REFUSES to apply public-ingress / web / admin manifests
# even if they were re-introduced.
#
# This script is operator-run. The assistant never runs it.
# Pre-requisites:
#   - KUBECONFIG points at the Rahma-safe master.
#   - rahma-postgres-secret, rahma-redis-secret, rahma-api-secrets created
#     manually via `kubectl create secret` (never from this repo).
# =============================================================================
set -euo pipefail

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }

cd "$(dirname "$0")/../../.." || exit 1

# --- 1. Context safety gate --------------------------------------------------
if ! command -v kubectl >/dev/null 2>&1; then
  red "kubectl not found. Aborting."; exit 1
fi
CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "$CTX" ]]; then
  red "No current kubectl context. Aborting."; exit 1
fi
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ "$CTX" =~ $FORBIDDEN_RE ]]; then
  red  "FORBIDDEN CONTEXT: $CTX"
  red  "Refusing to deploy Rahma against a non-Sakina context."
  exit 1
fi
green "Context OK: $CTX"

# --- 2. Repo-side guard checks ------------------------------------------------
bash scripts/guard/verify-rahma-scope.sh
bash deployment/k3s/scripts/verify-rahma-manifests.sh
bash scripts/security/rahma-secret-scan.sh
bash scripts/security/rahma-k8s-safety-scan.sh

# --- 3. Refuse forbidden manifests (web/admin/public-ingress with real host) -
if [[ -f deployment/k3s/namespaces/rahma-web.yaml ]] \
   || [[ -d deployment/k3s/frontend ]] \
   || [[ -f deployment/k3s/ingress/rahma-web-ingress.yaml ]]; then
  red "rahma-web manifests detected. Rahma is mobile-only. Refusing to deploy."
  exit 1
fi
# Public ingress: must contain api.rahma.example placeholder, NOT a real domain.
if grep -RIn "host:\s*\(api\.rahma\.ordinoxai\.com\|rahma\.ordinoxai\.com\|admin\.rahma\.ordinoxai\.com\)" deployment/k3s/ingress 2>/dev/null; then
  red "Ingress contains a non-placeholder host. Refusing to deploy."
  exit 1
fi
green "No forbidden manifests detected."

# --- 4. Apply ----------------------------------------------------------------
yellow "Applying namespaces..."
kubectl apply -f deployment/k3s/namespaces/

yellow "Applying config..."
kubectl apply -f deployment/k3s/config/

# Secrets — refuse to apply yaml-tracked templates that still contain
# REPLACE_ME / CHANGE_ME (those are templates only).
yellow "Skipping secret apply: secrets must be created manually via 'kubectl create secret'."
yellow "See docs/infra/RAHMA_SECRETS_REQUIRED.md for the list."

yellow "Applying data layer..."
kubectl apply -f deployment/k3s/postgres/
kubectl apply -f deployment/k3s/redis/

yellow "Applying API placeholder..."
kubectl apply -f deployment/k3s/api/

yellow "Applying WASM placeholders..."
kubectl apply -f deployment/k3s/wasm/

yellow "Applying backup CronJob + PVC..."
kubectl apply -f deployment/k3s/backup/

yellow "Applying internal health-check CronJob..."
kubectl apply -f deployment/k3s/monitoring/

yellow "Applying security-scan CronJob..."
kubectl apply -f deployment/k3s/security/

# --- 5. NO PUBLIC INGRESS APPLY ----------------------------------------------
yellow "Skipping public ingress: api.<final-rahma-domain> not yet chosen."

green "==== Rahma mobile infra applied (internal-only). ===="
green "Verify with: bash deployment/k3s/scripts/verify-rahma-mobile-infra.sh"
