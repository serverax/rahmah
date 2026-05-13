#!/usr/bin/env bash
# =============================================================================
# scripts/k3s/delete-sakina-staging.sh
# -----------------------------------------------------------------------------
# Tears down the sakina-ai staging namespace and ALL resources inside it.
# DESTRUCTIVE. Requires the same context safety gates as the deploy script
# and a typed confirmation.
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

readonly NS="sakina-ai"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
die() { red "FATAL: $*"; exit 1; }

command -v kubectl >/dev/null 2>&1 || die "kubectl not found in PATH."

CTX="$(kubectl config current-context 2>/dev/null || true)"
[[ -n "${CTX}" ]] || die "No current kubectl context."

bold "Current context: ${CTX}"
CTX_LOWER="$(printf '%s' "${CTX}" | tr '[:upper:]' '[:lower:]')"
for forbidden in aks prod iterlaw; do
  if [[ "${CTX_LOWER}" == *"${forbidden}"* ]]; then
    red "BLOCKED: context contains '${forbidden}'. Refusing to delete in this context."
    exit 2
  fi
done

red "About to DELETE namespace '${NS}' and all resources inside it on context '${CTX}'."
read -r -p "Type exactly \"DELETE ${NS}\" to proceed: " CONFIRM
[[ "${CONFIRM}" == "DELETE ${NS}" ]] || die "Confirmation not given. Aborting."

# Order: drop high-level objects first so PVC reclaim can be observed.
kubectl -n "${NS}" delete ingress --all --ignore-not-found
kubectl -n "${NS}" delete deploy,svc --all --ignore-not-found
kubectl -n "${NS}" delete statefulset --all --ignore-not-found
kubectl -n "${NS}" delete pvc --all --ignore-not-found
kubectl -n "${NS}" delete configmap,secret --all --ignore-not-found
kubectl delete namespace "${NS}" --ignore-not-found

green "Teardown command sequence issued. Verify with verify-sakina-k3s.sh."
