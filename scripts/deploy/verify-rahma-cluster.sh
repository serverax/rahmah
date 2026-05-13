#!/usr/bin/env bash
# verify-rahma-cluster.sh — refuse to use the wrong kubectl context.
# Read-only. Never applies anything. Run before any deploy script.
set -euo pipefail

FORBIDDEN_CONTEXT_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'

# Operator may override for one exact case via env, never via flags.
# Setting RAHMA_OVERRIDE_FORBIDDEN_CONTEXT=1 bypasses the regex check but
# requires the operator to type out the explicit context name in
# RAHMA_OVERRIDE_CONTEXT_NAME (and it must match current-context exactly).

if ! command -v kubectl >/dev/null; then
  echo "[verify-rahma-cluster] ERROR: kubectl not installed" >&2
  exit 3
fi

CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
echo "[verify-rahma-cluster] current-context = '$CONTEXT'"

if [[ -z "$CONTEXT" ]]; then
  echo "[verify-rahma-cluster] ERROR: no current kubectl context" >&2
  exit 3
fi

if echo "$CONTEXT" | grep -qiE "$FORBIDDEN_CONTEXT_RE"; then
  if [[ "${RAHMA_OVERRIDE_FORBIDDEN_CONTEXT:-}" = "1" ]] && [[ "${RAHMA_OVERRIDE_CONTEXT_NAME:-}" = "$CONTEXT" ]]; then
    echo "[verify-rahma-cluster] WARNING: forbidden pattern matched but operator override is set for '$CONTEXT'" >&2
  else
    echo "[verify-rahma-cluster] ERROR: kubectl context '$CONTEXT' matches forbidden pattern" >&2
    echo "[verify-rahma-cluster] Refusing to use this context. Set KUBECONFIG to a Sakina-safe kubeconfig." >&2
    exit 3
  fi
fi

# Read-only probes — never mutates state.
echo "[verify-rahma-cluster] nodes:"
kubectl get nodes -o wide || true
echo "[verify-rahma-cluster] namespaces (filtered):"
kubectl get ns | grep -E 'rahma|sakina|NAME' || true

echo "[verify-rahma-cluster] OK — context appears safe; manual review still required before apply."
