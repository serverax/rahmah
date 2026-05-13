#!/usr/bin/env bash
# verify-rahma-cluster.sh — refuse to use the wrong kubectl context.
# Read-only. Never applies anything. Run before any deploy script.
set -euo pipefail

FORBIDDEN_CONTEXT_RE='(aks|prod|iterlaw|rightsnow|ordinox|alaa)'

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
  echo "[verify-rahma-cluster] ERROR: kubectl context '$CONTEXT' matches forbidden pattern" >&2
  echo "[verify-rahma-cluster] Refusing to use this context. Set KUBECONFIG to a Sakina-safe kubeconfig." >&2
  exit 3
fi

# Read-only probes — never mutates state.
echo "[verify-rahma-cluster] nodes:"
kubectl get nodes -o wide || true
echo "[verify-rahma-cluster] namespaces (filtered):"
kubectl get ns | grep -E 'rahma|sakina|NAME' || true

echo "[verify-rahma-cluster] OK — context appears safe; manual review still required before apply."
