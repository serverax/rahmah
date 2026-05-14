#!/usr/bin/env bash
# =============================================================================
# verify-rahma-manifests.sh — local YAML safety scanner for Rahma manifests.
#
# Verifies (read-only, no kubectl):
#   1. Required namespace YAMLs exist.
#   2. No plaintext secret literal values committed.
#   3. No LoadBalancer Service for postgres / redis / ollama.
#   4. No `hostNetwork: true`, `privileged: true`, or
#      `allowPrivilegeEscalation: true` in deployment YAMLs.
#   5. No firewall lockdown commands (ufw default deny, iptables -P INPUT DROP).
#   6. Postgres and Redis services are ClusterIP.
#
# Output: exit 0 PASS, exit 1 FAIL.
# =============================================================================
set -u

FAIL=0
pass() { echo "[k3s-verify] PASS: $1"; }
fail() { echo "[k3s-verify] FAIL: $1" >&2; FAIL=1; }

# 1. Required namespaces (Rahma is mobile-only — NO rahma-web namespace)
REQUIRED_NS=(rahma-api rahma-data rahma-ai rahma-monitoring rahma-security)
# Explicit refusal: rahma-web must NOT exist as a namespace manifest.
if [[ -f "deployment/k3s/namespaces/rahma-web.yaml" ]]; then
  fail "deployment/k3s/namespaces/rahma-web.yaml exists; Rahma is mobile-only (no public web)."
fi
for ns in "${REQUIRED_NS[@]}"; do
  if [[ ! -f "deployment/k3s/namespaces/${ns}.yaml" ]]; then
    fail "namespace manifest missing: deployment/k3s/namespaces/${ns}.yaml"
  fi
done
[[ $FAIL -eq 0 ]] && pass "all required namespace manifests exist"

# 2. Plaintext secret scan (basic — CI scanner is more exhaustive)
SECRET_PATTERNS=(
  "password:[[:space:]]*['\"][^R][^E][^P]"
  "DATABASE_URL:[[:space:]]*['\"]postgres://[^R][^E]"
  "JWT_SECRET:[[:space:]]*['\"][a-zA-Z0-9_-]{8,}"
  "SESSION_SECRET:[[:space:]]*['\"][a-zA-Z0-9_-]{8,}"
)
if [[ -d "deployment/k3s" ]]; then
  for pat in "${SECRET_PATTERNS[@]}"; do
    hits=$(grep -RIn -E "$pat" deployment/k3s 2>/dev/null \
           | grep -vE "REPLACE_ME|CHANGE_ME|placeholder|PLACEHOLDER|REDACTED|template|TEMPLATE|example|\.example\." || true)
    if [[ -n "$hits" ]]; then
      fail "possible plaintext secret literal in deployment/k3s:"
      echo "$hits" | head -5 >&2
    fi
  done
fi
[[ $FAIL -eq 0 ]] && pass "no plaintext secrets detected in deployment/k3s"

# 3 & 6. LoadBalancer / NodePort scan for data-layer services
DATA_LAYER_PATHS=(
  "deployment/k3s/postgres"
  "deployment/k3s/redis"
  "deployment/k3s/rahma/data"
)
for p in "${DATA_LAYER_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  bad=$(grep -RIn -E "type:[[:space:]]*(LoadBalancer|NodePort)" "$p" 2>/dev/null || true)
  if [[ -n "$bad" ]]; then
    fail "data-layer service exposed via LoadBalancer/NodePort in $p:"
    echo "$bad" | head -5 >&2
  fi
done
# Ollama / AI must NEVER be exposed publicly via Service type
AI_PATHS=(
  "deployment/k3s/rahma/ai"
)
for p in "${AI_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  bad=$(grep -RIn -E "type:[[:space:]]*(LoadBalancer|NodePort)" "$p" 2>/dev/null || true)
  if [[ -n "$bad" ]]; then
    fail "AI workload exposed via LoadBalancer/NodePort in $p:"
    echo "$bad" | head -5 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "data + AI layer services not publicly exposed"

# 4. Privileged / hostNetwork / privilege escalation
DEPLOY_PATHS=(
  "deployment/k3s/backend"
  "deployment/k3s/frontend"
  "deployment/k3s/postgres"
  "deployment/k3s/redis"
  "deployment/k3s/rahma"
)
for p in "${DEPLOY_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  # Only scan YAML/YML files — markdown docs may legitimately mention these flags as "no X:true".
  bad=$(grep -RIn --include='*.yaml' --include='*.yml' -E "(hostNetwork:[[:space:]]*true|privileged:[[:space:]]*true|allowPrivilegeEscalation:[[:space:]]*true)" "$p" 2>/dev/null || true)
  if [[ -n "$bad" ]]; then
    fail "unsafe privilege flag in $p:"
    echo "$bad" | head -10 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "no hostNetwork=true / privileged=true / allowPrivilegeEscalation=true in YAML"

# 5. Firewall lockdown
SCRIPT_PATHS=("scripts" "deployment/k3s/scripts")
for p in "${SCRIPT_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  bad=$(grep -RIn -E "(ufw default deny|iptables -P INPUT DROP|iptables -P OUTPUT DROP)" "$p" 2>/dev/null \
        | grep -vE "verify-rahma-(manifests|scope)\.sh|rahma-k8s-safety-scan\.sh" || true)
  if [[ -n "$bad" ]]; then
    fail "firewall lockdown command found in $p:"
    echo "$bad" | head -5 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "no firewall lockdown commands in scripts"

if [[ $FAIL -ne 0 ]]; then
  echo "[k3s-verify] OVERALL: FAIL" >&2
  exit 1
fi
echo "[k3s-verify] OVERALL: PASS"
exit 0
