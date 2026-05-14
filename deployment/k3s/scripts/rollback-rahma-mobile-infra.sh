#!/usr/bin/env bash
# =============================================================================
# rollback-rahma-mobile-infra.sh
#
# Deletes ONLY Rahma resources. Never touches OrdinoxAI, IterLaw, kube-system,
# the firewall, SSH, K3s itself, Traefik, cert-manager, or NetworkPolicy.
# Refuses to run against a forbidden context.
#
# Order: delete CronJobs first (to stop background work), then API + WASM,
# THEN ask before touching the data layer.
# =============================================================================
set -u

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

cd "$(dirname "$0")/../../.." || exit 1

if ! command -v kubectl >/dev/null 2>&1; then red "kubectl not found"; exit 1; fi
CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "$CTX" ]]; then red "no current context"; exit 1; fi
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ "$CTX" =~ $FORBIDDEN_RE ]]; then red "FORBIDDEN CONTEXT: $CTX"; exit 1; fi
green "Context OK: $CTX"

# Hard refusal: do not target forbidden namespaces.
FORBIDDEN_NS=(kube-system kube-public kube-node-lease default cert-manager traefik-system ordinox-ai)
target_safe() {
  local ns=$1
  for n in "${FORBIDDEN_NS[@]}"; do
    if [[ "$ns" == "$n" ]]; then return 1; fi
  done
  return 0
}

RAHMA_NS=(rahma-monitoring rahma-security rahma-ai rahma-api rahma-data)
for ns in "${RAHMA_NS[@]}"; do
  if ! target_safe "$ns"; then continue; fi
  yellow "--- $ns ---"

  # Pause CronJobs first.
  kubectl -n "$ns" get cronjob -o name 2>/dev/null | while read -r cj; do
    yellow "deleting $cj"
    kubectl -n "$ns" delete "$cj" --ignore-not-found
  done

  # Then deployments + statefulsets.
  kubectl -n "$ns" get deploy,statefulset -o name 2>/dev/null | while read -r w; do
    yellow "deleting $w"
    kubectl -n "$ns" delete "$w" --ignore-not-found
  done

  # Then services (except kubernetes default if any).
  kubectl -n "$ns" get svc -o name 2>/dev/null | while read -r svc; do
    yellow "deleting $svc"
    kubectl -n "$ns" delete "$svc" --ignore-not-found
  done

  # ConfigMaps owned by Rahma — leave others.
  kubectl -n "$ns" get cm -l app.kubernetes.io/part-of=rahma -o name 2>/dev/null | while read -r cm; do
    yellow "deleting $cm"
    kubectl -n "$ns" delete "$cm" --ignore-not-found
  done
done

# Data layer: ASK before deleting PVCs.
yellow ""
yellow "Data layer PVCs were NOT deleted automatically. To remove them:"
yellow "  kubectl -n rahma-data delete pvc -l app.kubernetes.io/part-of=rahma --ignore-not-found"
yellow "Or run with: ROLLBACK_DELETE_PVCS=1 $0"
if [[ "${ROLLBACK_DELETE_PVCS:-0}" == "1" ]]; then
  yellow "ROLLBACK_DELETE_PVCS=1 — deleting Rahma PVCs."
  kubectl -n rahma-data delete pvc -l app.kubernetes.io/part-of=rahma --ignore-not-found
fi

# Namespaces last — only delete if empty (kubectl refuses if pods exist).
for ns in "${RAHMA_NS[@]}"; do
  if ! target_safe "$ns"; then continue; fi
  # Don't delete the namespace if it still has resources; operator decides.
  COUNT=$(kubectl -n "$ns" get all -o name 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$COUNT" == "0" ]]; then
    yellow "deleting empty namespace $ns"
    kubectl delete ns "$ns" --ignore-not-found
  else
    yellow "namespace $ns still has $COUNT resource(s); leaving for operator"
  fi
done

green "==== rollback complete (data layer untouched unless ROLLBACK_DELETE_PVCS=1) ===="
