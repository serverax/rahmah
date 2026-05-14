#!/usr/bin/env bash
# =============================================================================
# apply-rahma-ops-updates.sh
#
# Apply ONLY the Rahma ops-update manifests in safe order:
#   - rahma-platform-config         (ConfigMap)
#   - rahma-postgres-backup         (PVC + CronJob)
#   - rahma-internal-health-check   (CronJob)
#   - rahma-security-scan           (ConfigMap + CronJob)
#
# REFUSES to apply:
#   - any ingress (public exposure stays deferred)
#   - any rahma-web / rahma-admin manifest
#   - against a forbidden kubectl context
#   - if a public Rahma ingress already exists
#
# NEVER touches: firewall, UFW, iptables, SSH, K3s service, Traefik,
# cert-manager, NetworkPolicy, kube-system.
#
# Usage:
#   apply-rahma-ops-updates.sh            # live apply
#   apply-rahma-ops-updates.sh --dry-run  # static checks only
# =============================================================================
set -u

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
ok()     { printf "[ops-apply] OK: %s\n" "$*"; }

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) echo "Usage: $0 [--dry-run]"; exit 0 ;;
    *)         red "Unknown flag: $arg"; exit 1 ;;
  esac
done

cd "$(dirname "$0")/../../.." || exit 1

MANIFESTS=(
  "deployment/k3s/config/rahma-platform-config.yaml"
  "deployment/k3s/backup/rahma-postgres-backup.yaml"
  "deployment/k3s/monitoring/rahma-internal-health-check.yaml"
  "deployment/k3s/security/rahma-security-scan-placeholder.yaml"
)

# --- 1. Static checks (always) ----------------------------------------------
for m in "${MANIFESTS[@]}"; do
  if [[ ! -f "$m" ]]; then red "Missing: $m"; exit 1; fi
  ok "manifest present: $m"
done

# Refuse if any forbidden domain appears in any of the manifests.
for m in "${MANIFESTS[@]}"; do
  if grep -RIn -E 'rahma\.ordinoxai|admin\.rahma|api\.rahma\.ordinoxai|api\.rahma\.example' "$m" >/dev/null 2>&1; then
    red "Forbidden / placeholder domain in $m. Refusing to apply."
    exit 1
  fi
done
ok "no forbidden / placeholder domains in ops manifests"

# Refuse if an ingress manifest under deployment/k3s/ exists.
if compgen -G "deployment/k3s/ingress/*.yaml" >/dev/null 2>&1; then
  red "deployment/k3s/ingress/*.yaml present — public ingress is deferred. Refusing to apply."
  exit 1
fi
ok "no deployment/k3s/ingress/*.yaml present"

# Refuse if any rahma-web/admin manifest exists.
if compgen -G "deployment/k3s/frontend/*" >/dev/null 2>&1 \
   || [[ -f "deployment/k3s/namespaces/rahma-web.yaml" ]] \
   || [[ -f "deployment/k3s/namespaces/rahma-admin.yaml" ]]; then
  red "rahma-web / rahma-admin manifests present. Rahma is mobile-only. Refusing to apply."
  exit 1
fi
ok "no rahma-web / rahma-admin manifests in repo"

# --- 2. Dry-run exit path ---------------------------------------------------
if [[ $DRY_RUN -eq 1 ]]; then
  green "==== ops-apply DRY-RUN validated ===="
  exit 0
fi

# --- 3. Cluster-side gate ---------------------------------------------------
if ! command -v kubectl >/dev/null 2>&1; then red "kubectl not found"; exit 1; fi
CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "$CTX" ]]; then red "no current kubectl context"; exit 1; fi
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ "$CTX" =~ $FORBIDDEN_RE ]]; then red "FORBIDDEN CONTEXT: $CTX"; exit 1; fi
green "Context OK: $CTX"

# Refuse if a Rahma ingress already exists on the cluster.
ING=$(kubectl get ingress -A 2>/dev/null | grep -E 'rahma-(api|web|admin)' || true)
if [[ -n "$ING" ]]; then
  red "Cluster has a Rahma ingress already — this script refuses to proceed."
  echo "$ING" >&2
  exit 1
fi

# --- 4. Apply each manifest -------------------------------------------------
for m in "${MANIFESTS[@]}"; do
  yellow "kubectl apply -f $m"
  kubectl apply -f "$m"
done

# --- 5. Verify ConfigMaps + CronJobs ----------------------------------------
yellow "Verifying ConfigMaps + CronJobs..."
kubectl -n rahma-api  get cm rahma-platform-config >/dev/null 2>&1 \
  && ok "ConfigMap rahma-api/rahma-platform-config present" \
  || red "ConfigMap rahma-api/rahma-platform-config missing"

kubectl -n rahma-data       get cronjob rahma-postgres-backup        >/dev/null 2>&1 \
  && ok "CronJob rahma-data/rahma-postgres-backup present" \
  || red "CronJob rahma-data/rahma-postgres-backup missing"

kubectl -n rahma-monitoring get cronjob rahma-internal-health-check  >/dev/null 2>&1 \
  && ok "CronJob rahma-monitoring/rahma-internal-health-check present" \
  || red "CronJob rahma-monitoring/rahma-internal-health-check missing"

kubectl -n rahma-security   get cronjob rahma-security-scan          >/dev/null 2>&1 \
  && ok "CronJob rahma-security/rahma-security-scan present" \
  || red "CronJob rahma-security/rahma-security-scan missing"

# Defensive: ensure no Rahma ingress appeared.
if kubectl get ingress -A 2>/dev/null | grep -q 'rahma-'; then
  red "POST-CHECK FAILED: a Rahma ingress appeared after ops apply."
  exit 3
fi
ok "no Rahma ingress after ops apply"

green "==== ops-apply complete ===="
