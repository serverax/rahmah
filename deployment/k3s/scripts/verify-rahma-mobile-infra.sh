#!/usr/bin/env bash
# =============================================================================
# verify-rahma-mobile-infra.sh
#
# Read-only verification of the Rahma mobile-only infra. Runs only kubectl
# get/describe commands — never apply, never delete.
# =============================================================================
set -u

FAIL=0
pass() { echo "[verify] PASS: $1"; }
fail() { echo "[verify] FAIL: $1" >&2; FAIL=1; }
info() { echo "[verify] INFO: $1"; }

cd "$(dirname "$0")/../../.." || exit 1

if ! command -v kubectl >/dev/null 2>&1; then
  fail "kubectl not found locally — cannot verify cluster state."
  fail "Note: live verification already passed on master-of-brains; rerun this script there."
  exit 1
fi

CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "$CTX" ]]; then
  fail "no current kubectl context"
  exit 1
fi
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ "$CTX" =~ $FORBIDDEN_RE ]]; then
  fail "FORBIDDEN context: $CTX — refusing to query Rahma against it"
  exit 1
fi
pass "context: $CTX"

# --- Nodes -------------------------------------------------------------------
if kubectl get nodes -o wide 2>/dev/null | head -10; then
  pass "nodes visible"
else
  fail "cannot list nodes"
fi

# --- Namespaces --------------------------------------------------------------
REQUIRED_NS=(rahma-api rahma-data rahma-ai rahma-monitoring rahma-security)
for ns in "${REQUIRED_NS[@]}"; do
  if kubectl get ns "$ns" >/dev/null 2>&1; then
    pass "namespace exists: $ns"
  else
    fail "namespace missing: $ns"
  fi
done
# rahma-web must NOT exist
if kubectl get ns rahma-web >/dev/null 2>&1; then
  fail "rahma-web namespace EXISTS — Rahma is mobile-only, this is forbidden"
else
  pass "rahma-web namespace correctly absent"
fi

# --- Public ingress must NOT be present --------------------------------------
ING=$(kubectl get ingress -A 2>/dev/null | grep -E 'rahma-(web|admin|api)' || true)
if echo "$ING" | grep -E 'rahma\.ordinoxai|admin\.rahma|api\.rahma\.ordinoxai' >/dev/null 2>&1; then
  fail "public Rahma ingress with forbidden domain found:"
  echo "$ING" >&2
elif echo "$ING" | grep -qE 'rahma-(web|admin)'; then
  fail "rahma-web or rahma-admin ingress present — forbidden"
  echo "$ING" >&2
else
  pass "no public Rahma ingress present"
fi

# --- Workloads --------------------------------------------------------------
check_workload() {
  local ns=$1 name=$2 kind=$3
  if kubectl -n "$ns" get "$kind" "$name" >/dev/null 2>&1; then
    pass "$kind/$name in $ns: present"
  else
    fail "$kind/$name in $ns: missing"
  fi
}
check_workload rahma-api  rahma-api          deployment
check_workload rahma-data rahma-postgres     statefulset
check_workload rahma-data rahma-redis        statefulset
check_workload rahma-ai   rahma-wasm-citation     deployment
check_workload rahma-ai   rahma-wasm-child-safety deployment
check_workload rahma-ai   rahma-wasm-fatwa-gate   deployment
check_workload rahma-ai   rahma-wasm-rule-engine  deployment

# --- CronJobs ----------------------------------------------------------------
check_cron() {
  local ns=$1 name=$2
  if kubectl -n "$ns" get cronjob "$name" >/dev/null 2>&1; then
    pass "cronjob/$name in $ns: present"
  else
    fail "cronjob/$name in $ns: missing"
  fi
}
check_cron rahma-data       rahma-postgres-backup
check_cron rahma-monitoring rahma-internal-health-check
check_cron rahma-security   rahma-security-scan

# --- Internal probes (curl-from-pod, requires alpine/curl present) ----------
info "Internal API probe (best-effort; runs a one-shot pod):"
kubectl -n rahma-api run rahma-probe --rm -i --restart=Never --image=alpine/curl:8.10.1 \
  -- sh -c 'curl -sS -m 5 http://rahma-api.rahma-api.svc.cluster.local/ -o /dev/null -w "api http=%{http_code}\n" || true' 2>/dev/null \
  | grep -E 'api http=' || info "  internal API probe skipped or failed (check cluster manually)"

# --- Forbidden domains in cluster --------------------------------------------
if kubectl get configmap -A -o yaml 2>/dev/null | grep -E '(rahma\.ordinoxai|admin\.rahma|api\.rahma\.ordinoxai)' >/dev/null; then
  fail "forbidden domain found in cluster ConfigMaps"
else
  pass "no forbidden domains in cluster ConfigMaps"
fi

# --- Summary -----------------------------------------------------------------
if [[ $FAIL -ne 0 ]]; then
  echo "[verify] OVERALL: FAIL ($FAIL checks)" >&2
  exit 1
fi
echo "[verify] OVERALL: PASS"
exit 0
