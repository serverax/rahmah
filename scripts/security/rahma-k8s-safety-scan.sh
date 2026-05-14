#!/usr/bin/env bash
# =============================================================================
# rahma-k8s-safety-scan.sh — Kubernetes manifest safety check.
#
# Read-only. Exits 1 on any violation.
#
# Checks:
#   - No LoadBalancer / NodePort for postgres / redis / ollama
#   - No hostNetwork: true / privileged: true / allowPrivilegeEscalation: true
#     in YAML manifests
#   - Every Deployment / StatefulSet has resources.limits AND resources.requests
#   - No plaintext Secret values outside `*.template.yaml` / `*.example.yaml`
#   - No firewall lockdown commands in scripts under deployment/k3s/
# =============================================================================
set -u

FAIL=0
pass() { echo "[k8s-safety] PASS: $1"; }
fail() { echo "[k8s-safety] FAIL: $1" >&2; FAIL=1; }

# 1. Data + AI Service exposure
PROTECTED_PATHS=(
  "deployment/k3s/postgres"
  "deployment/k3s/redis"
  "deployment/k3s/rahma/data"
  "deployment/k3s/rahma/ai"
)
for p in "${PROTECTED_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  bad=$(grep -RIn --include='*.yaml' --include='*.yml' -E "type:[[:space:]]*(LoadBalancer|NodePort)" "$p" 2>/dev/null || true)
  if [[ -n "$bad" ]]; then
    fail "$p exposes a protected workload via LoadBalancer/NodePort:"
    echo "$bad" | head -5 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "protected workloads (postgres/redis/ollama) are not publicly exposed"

# 2. Privilege flags
DEPLOY_PATHS=(
  "deployment/k3s"
)
for p in "${DEPLOY_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  bad=$(grep -RIn --include='*.yaml' --include='*.yml' -E "(hostNetwork:[[:space:]]*true|privileged:[[:space:]]*true|allowPrivilegeEscalation:[[:space:]]*true)" "$p" 2>/dev/null || true)
  if [[ -n "$bad" ]]; then
    fail "unsafe privilege flag in $p:"
    echo "$bad" | head -10 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "no hostNetwork/privileged/allowPrivilegeEscalation=true"

# 3. Plaintext Secret values outside templates
SECRET_FILES=$(find deployment/k3s -name '*.yaml' 2>/dev/null \
               | xargs grep -lE "^kind:[[:space:]]*Secret" 2>/dev/null || true)
for f in $SECRET_FILES; do
  if [[ "$f" =~ (template|example|\.example\.) ]]; then continue; fi
  # Suspicious: stringData / data with non-REPLACE_ME / non-CHANGE_ME / non-empty values
  bad=$(grep -E "^[[:space:]]+[A-Z_]+:[[:space:]]*['\"]?[^'\"R][^'\"E]" "$f" 2>/dev/null \
        | grep -vE "REPLACE_ME|CHANGE_ME|PLACEHOLDER|\.example" || true)
  if [[ -n "$bad" ]]; then
    fail "non-template Secret manifest has potential plaintext values: $f"
    echo "$bad" | head -5 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "no plaintext Secret values outside templates"

# 4. Resource limits required
DEPLOY_KINDS_FILES=$(find deployment/k3s -name '*.yaml' 2>/dev/null \
                    | xargs grep -lE "^kind:[[:space:]]*(Deployment|StatefulSet|DaemonSet)" 2>/dev/null || true)
for f in $DEPLOY_KINDS_FILES; do
  has_limits=$(grep -cE "^\s+limits:" "$f" 2>/dev/null || echo 0)
  has_requests=$(grep -cE "^\s+requests:" "$f" 2>/dev/null || echo 0)
  if [[ "$has_limits" == "0" ]] || [[ "$has_requests" == "0" ]]; then
    fail "$f missing resources.limits or resources.requests"
  fi
done
[[ $FAIL -eq 0 ]] && pass "every Deployment/StatefulSet declares resources.limits + resources.requests"

# 5. Firewall lockdown commands
SCRIPT_PATHS=("deployment/k3s/scripts" "scripts")
for p in "${SCRIPT_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  bad=$(grep -RIn -E "(ufw default deny|iptables -P INPUT DROP|iptables -P OUTPUT DROP|iptables -P FORWARD DROP)" "$p" 2>/dev/null \
        | grep -vE "rahma-k8s-safety-scan\.sh|rahma-secret-scan\.sh|verify-rahma-(scope|manifests)\.sh" || true)
  if [[ -n "$bad" ]]; then
    fail "firewall lockdown command in $p:"
    echo "$bad" | head -5 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "no firewall lockdown commands in deployment scripts"

if [[ $FAIL -ne 0 ]]; then
  echo "[k8s-safety] OVERALL: FAIL" >&2
  exit 1
fi
echo "[k8s-safety] OVERALL: PASS"
exit 0
