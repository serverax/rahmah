#!/usr/bin/env bash
# =============================================================================
# deploy-rahma-api-image.sh
#
# Swap the rahma-api Deployment from placeholder to a real image and wait for
# rollout. Operator-run on a verified Sakina-safe context. NEVER touches
# ingress, web/admin, firewall, K3s service, Traefik, or cert-manager.
#
# Usage:
#   deploy-rahma-api-image.sh <image>
#   deploy-rahma-api-image.sh ghcr.io/serverax/rahmah/rahma-api:latest
# =============================================================================
set -u

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

IMAGE=${1:-}
if [[ -z "$IMAGE" ]]; then
  red "Usage: $0 <image-ref>"
  red "Example: $0 ghcr.io/serverax/rahmah/rahma-api:latest"
  exit 1
fi

cd "$(dirname "$0")/../../.." || exit 1

if ! command -v kubectl >/dev/null 2>&1; then red "kubectl not found"; exit 1; fi
CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "$CTX" ]]; then red "no current kubectl context"; exit 1; fi
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ "$CTX" =~ $FORBIDDEN_RE ]]; then red "FORBIDDEN CONTEXT: $CTX"; exit 1; fi
green "Context OK: $CTX"

# Refuse if the rahma-api Deployment doesn't exist yet — operator must apply
# deployment/k3s/api/rahma-api.yaml first.
if ! kubectl -n rahma-api get deploy rahma-api >/dev/null 2>&1; then
  red "Deployment rahma-api/rahma-api missing. Apply deployment/k3s/api/rahma-api.yaml first."
  exit 1
fi

# Refuse if any ingress for Rahma exists (we should stay internal-only here).
ING=$(kubectl get ingress -A 2>/dev/null | grep -E 'rahma-(api|web|admin)' || true)
if [[ -n "$ING" ]]; then
  red "A Rahma ingress already exists — this script only rolls the internal Deployment."
  red "Operator: verify the ingress is intentional and run the rollout manually."
  echo "$ING" >&2
  exit 1
fi

yellow "Setting image: rahma-api/rahma-api → $IMAGE"
kubectl -n rahma-api set image deployment/rahma-api rahma-api="$IMAGE" --record=false

yellow "Waiting for rollout..."
if ! kubectl -n rahma-api rollout status deployment/rahma-api --timeout=180s; then
  red "Rollout FAILED. Pods:"
  kubectl -n rahma-api get pods -o wide >&2 || true
  kubectl -n rahma-api describe deploy rahma-api | tail -40 >&2 || true
  exit 2
fi
green "Rollout succeeded."

# Internal health probe (best-effort). Uses an ephemeral pod so we never
# expose the service externally.
yellow "Running an internal /health probe..."
if kubectl -n rahma-api run rahma-probe \
    --rm -i --restart=Never \
    --image=alpine/curl:8.10.1 \
    -- sh -c "curl -sS -m 5 -o /dev/null -w 'http_status=%{http_code}\n' http://rahma-api.rahma-api.svc.cluster.local/health" 2>/dev/null \
    | grep -E 'http_status='; then
  green "Internal health probe captured (see line above)."
else
  yellow "Internal health probe could not capture status — verify manually."
fi

green "==== rahma-api image rolled to: $IMAGE ===="
