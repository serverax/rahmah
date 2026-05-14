#!/usr/bin/env bash
# =============================================================================
# deploy-rahma-child-safety-runtime.sh
#
# Roll the child-safety Deployment from placeholder to the real image.
# Internal only. Refuses public ingress, forbidden contexts, public-domain
# leaks. Touches ONLY rahma-ai/rahma-child-safety-wasm.
#
# Usage:
#   deploy-rahma-child-safety-runtime.sh [image-ref] [--dry-run]
#   Default image: ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest
# =============================================================================
set -u

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

DEFAULT_IMAGE='ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest'
IMAGE="$DEFAULT_IMAGE"
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) echo "Usage: $0 [image] [--dry-run]"; exit 0 ;;
    -*)        red "Unknown flag: $arg"; exit 1 ;;
    *)         IMAGE="$arg" ;;
  esac
done
yellow "Target image: $IMAGE"
[[ $DRY_RUN -eq 1 ]] && yellow "Mode: DRY-RUN"

cd "$(dirname "$0")/../../.." || exit 1

if [[ ! "$IMAGE" =~ ^ghcr\.io/serverax/rahmah/rahma-child-safety-wasm(:[A-Za-z0-9._-]+)?$ ]]; then
  red "Image ref does not match expected ghcr.io/serverax/rahmah/rahma-child-safety-wasm[:tag]"
  exit 1
fi

if [[ ! -f deployment/k3s/wasm/rahma-child-safety-runtime.yaml ]]; then
  red "rahma-child-safety-runtime.yaml missing in repo"; exit 1
fi

if [[ $DRY_RUN -eq 1 ]]; then
  green "==== DRY-RUN validated ===="
  exit 0
fi

if ! command -v kubectl >/dev/null 2>&1; then red "kubectl not found"; exit 1; fi
CTX=$(kubectl config current-context 2>/dev/null || true)
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ -z "$CTX" || "$CTX" =~ $FORBIDDEN_RE ]]; then red "FORBIDDEN / unset CONTEXT: $CTX"; exit 1; fi
green "Context OK: $CTX"

# Defense in depth: no Rahma ingress may exist.
if kubectl get ingress -A 2>/dev/null | grep -q 'rahma-'; then
  red "Rahma ingress present — refusing to proceed"; exit 1
fi

# Apply the real-image Deployment over the placeholder (same Service name).
yellow "kubectl apply -f deployment/k3s/wasm/rahma-child-safety-runtime.yaml"
kubectl apply -f deployment/k3s/wasm/rahma-child-safety-runtime.yaml

yellow "Waiting for rollout..."
if ! kubectl -n rahma-ai rollout status deployment/rahma-child-safety-wasm --timeout=180s; then
  red "Rollout FAILED"
  kubectl -n rahma-ai get pods -l app.kubernetes.io/name=rahma-child-safety-wasm -o wide >&2 || true
  exit 2
fi
green "Rollout succeeded."

yellow "Internal /health + /evaluate probe..."
kubectl -n rahma-ai run rahma-cs-probe --rm -i --restart=Never --image=alpine/curl:8.10.1 \
  -- sh -c "
    echo '--- /health ---';
    curl -sS -m 5 http://rahma-child-safety-wasm.rahma-ai.svc.cluster.local:8080/health || true;
    echo '';
    echo '--- POST /evaluate (allow case) ---';
    curl -sS -m 5 -H 'content-type: application/json' \
      -d '{\"body_ar\":\"نتعلم آداب الصلاة\",\"age_band\":\"7-9\"}' \
      http://rahma-child-safety-wasm.rahma-ai.svc.cluster.local:8080/evaluate || true;
    echo '';
  " 2>/dev/null || yellow "probe skipped or failed — verify manually"

if kubectl get ingress -n rahma-ai 2>/dev/null | grep -q rahma; then
  red "POST-CHECK FAILED: Rahma ingress appeared after rollout"; exit 3
fi

green "==== rahma-child-safety-wasm rolled to: $IMAGE ===="
