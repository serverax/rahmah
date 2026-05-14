#!/usr/bin/env bash
# =============================================================================
# check-rahma-live-drift.sh
#
# Compare what the live cluster exposes vs what the repo manifests declare.
# NEVER prints secret values. NEVER mutates anything.
#
# Reports drift for:
#   - rahma-api image + env var NAMES (no values)
#   - rahma-api Service targetPort
#   - Rahma ingress presence (must be NONE today)
#   - rahma-ai services (4 WASM placeholder names)
#   - rahma-data services (rahma-postgres, rahma-redis)
#   - CronJobs (rahma-postgres-backup, rahma-internal-health-check, rahma-security-scan)
# =============================================================================
set -u

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
ok()     { printf "[drift] OK: %s\n" "$*"; }
miss()   { printf "[drift] DRIFT: %s\n" "$*" >&2; FAIL=1; }

FAIL=0

cd "$(dirname "$0")/../../.." || exit 1

if ! command -v kubectl >/dev/null 2>&1; then
  red "kubectl not found — cannot inspect cluster"; exit 1
fi
CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "$CTX" ]]; then red "no current kubectl context"; exit 1; fi
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ "$CTX" =~ $FORBIDDEN_RE ]]; then red "FORBIDDEN CONTEXT: $CTX"; exit 1; fi
green "Context: $CTX"

# --- 1. Public ingress must NOT exist ---------------------------------------
ING=$(kubectl get ingress -A 2>/dev/null | grep -E 'rahma-(api|web|admin)' || true)
if [[ -n "$ING" ]]; then
  miss "Rahma ingress present on the cluster (none expected):"
  echo "$ING" >&2
else
  ok "no Rahma ingress on cluster"
fi

# --- 2. rahma-api Deployment image + env-var names --------------------------
IMG=$(kubectl -n rahma-api get deploy rahma-api -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)
if [[ -z "$IMG" ]]; then
  miss "rahma-api Deployment missing in namespace rahma-api"
else
  ok "rahma-api image: $IMG"
  if [[ "$IMG" =~ ^ghcr\.io/serverax/rahmah/rahma-api(:[A-Za-z0-9._-]+)?$ ]]; then
    ok "image source matches repo expectation (ghcr.io/serverax/rahmah/rahma-api)"
  elif [[ "$IMG" =~ nginx-unprivileged ]]; then
    yellow "image is still the placeholder — operator rollout pending"
  else
    miss "image is not the expected Rahma image or placeholder"
  fi
fi

# Env var NAMES only — values are intentionally not fetched.
ENV_NAMES=$(kubectl -n rahma-api get deploy rahma-api -o jsonpath='{range .spec.template.spec.containers[0].env[*]}{.name}{"\n"}{end}' 2>/dev/null || true)
if [[ -n "$ENV_NAMES" ]]; then
  ok "rahma-api env var names (values intentionally hidden):"
  printf '  %s\n' $ENV_NAMES
fi

# --- 3. rahma-api Service targetPort ---------------------------------------
SVC_TPORT=$(kubectl -n rahma-api get svc rahma-api -o jsonpath='{.spec.ports[0].targetPort}' 2>/dev/null || true)
if [[ -n "$SVC_TPORT" ]]; then
  ok "rahma-api Service targetPort: $SVC_TPORT"
else
  miss "rahma-api Service missing in namespace rahma-api"
fi

# --- 4. rahma-ai placeholder services --------------------------------------
EXPECTED_AI=(rahma-fatwa-policy-gate-wasm rahma-quran-hadith-citation-wasm rahma-child-safety-wasm rahma-content-rule-engine-wasm)
for s in "${EXPECTED_AI[@]}"; do
  if kubectl -n rahma-ai get svc "$s" >/dev/null 2>&1; then
    ok "rahma-ai/$s service present"
  else
    miss "rahma-ai/$s service missing"
  fi
done

# --- 5. rahma-data services ------------------------------------------------
for s in rahma-postgres rahma-redis; do
  if kubectl -n rahma-data get svc "$s" >/dev/null 2>&1; then
    ok "rahma-data/$s service present"
  else
    miss "rahma-data/$s service missing"
  fi
done

# --- 6. CronJobs -----------------------------------------------------------
for nsj in rahma-data/rahma-postgres-backup rahma-monitoring/rahma-internal-health-check rahma-security/rahma-security-scan; do
  NS=${nsj%%/*}; NAME=${nsj##*/}
  if kubectl -n "$NS" get cronjob "$NAME" >/dev/null 2>&1; then
    ok "cronjob $NS/$NAME present"
  else
    miss "cronjob $NS/$NAME missing"
  fi
done

# --- 7. ConfigMap names -----------------------------------------------------
if kubectl -n rahma-api get cm rahma-platform-config >/dev/null 2>&1; then
  ok "rahma-api/rahma-platform-config ConfigMap present"
else
  miss "rahma-api/rahma-platform-config ConfigMap missing"
fi

# --- 8. Forbidden domains in ConfigMaps -------------------------------------
if kubectl get cm -A -o yaml 2>/dev/null \
   | grep -E '(rahma\.ordinoxai|admin\.rahma|api\.rahma\.ordinoxai|api\.rahma\.example)' >/dev/null; then
  miss "forbidden / placeholder domain found in cluster ConfigMaps"
else
  ok "no forbidden / placeholder domain in cluster ConfigMaps"
fi

echo ""
if [[ $FAIL -ne 0 ]]; then
  red "==== drift detected ===="
  exit 1
fi
green "==== no drift ===="
exit 0
