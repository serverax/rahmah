#!/usr/bin/env bash
# =============================================================================
# rahma-secret-scan.sh — block obvious committed secrets in Rahma repo.
#
# Reads-only. Exits 1 if any banned pattern is found in tracked files
# outside known-template paths.
# =============================================================================
set -u

FAIL=0
pass() { echo "[secret-scan] PASS: $1"; }
fail() { echo "[secret-scan] FAIL: $1" >&2; FAIL=1; }

# Templates are allowed to contain REPLACE_ME / CHANGE_ME / PLACEHOLDER /
# example. These are exempt from secret-scan.
TEMPLATE_PATH_RE='(\.example|template|TEMPLATE|placeholder|PLACEHOLDER)'

# Patterns that, when seen in non-template files, indicate a real committed secret.
declare -a PATTERNS=(
  'aws[_-]?secret[_-]?access[_-]?key'
  'AWS_SECRET_ACCESS_KEY=[^R][^E]'
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
  'hcloud_token=[a-zA-Z0-9_\-]{20,}'
  'HETZNER_TOKEN=[a-zA-Z0-9_\-]{20,}'
  'apikey=[a-zA-Z0-9_\-]{20,}'
  'api_key=[a-zA-Z0-9_\-]{20,}'
  'API_KEY=[a-zA-Z0-9_\-]{20,}'
  'sk_live_[a-zA-Z0-9]{20,}'
  'sk-[a-zA-Z0-9]{32,}'                # OpenAI-style keys
)

# Specific banned environment-variable-with-real-value patterns
declare -a ENV_PATTERNS=(
  'DATABASE_URL=postgres://[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]{6,}'
  'REDIS_URL=redis://:[a-zA-Z0-9_-]{6,}'
  'JWT_SECRET=[a-zA-Z0-9_\-+/=]{16,}'
  'SESSION_SECRET=[a-zA-Z0-9_\-+/=]{16,}'
  'POSTGRES_PASSWORD=[a-zA-Z0-9_-]{8,}'
  'REDIS_PASSWORD=[a-zA-Z0-9_-]{8,}'
)

SCAN_PATHS=("backend" "deployment" "apps" "scripts" ".github")

for path in "${SCAN_PATHS[@]}"; do
  if [[ ! -e "$path" ]]; then continue; fi
  for pat in "${PATTERNS[@]}"; do
    hits=$(grep -RIEn --binary-files=without-match "$pat" "$path" 2>/dev/null \
           | grep -vE "$TEMPLATE_PATH_RE" \
           | grep -vE "rahma-secret-scan\.sh|verify-rahma-(scope|manifests)\.sh|rahma-k8s-safety-scan\.sh" \
           | grep -vE "REPLACE_ME|CHANGE_ME|sk-[a-zA-Z0-9]{32,}.*example" || true)
    if [[ -n "$hits" ]]; then
      fail "credential-like pattern in $path: $pat"
      echo "$hits" | head -5 >&2
    fi
  done
  for pat in "${ENV_PATTERNS[@]}"; do
    hits=$(grep -RIEn --binary-files=without-match "$pat" "$path" 2>/dev/null \
           | grep -vE "$TEMPLATE_PATH_RE" \
           | grep -vE "rahma-secret-scan\.sh|verify-rahma-(scope|manifests)\.sh|rahma-k8s-safety-scan\.sh" \
           | grep -vE "REPLACE_ME|CHANGE_ME|leak_user|leak_pass|leak_db|sprint31|sprint38|test_fixture|TEST FIXTURE" || true)
    if [[ -n "$hits" ]]; then
      fail "env credential in $path: $pat"
      echo "$hits" | head -5 >&2
    fi
  done
done

# Block committed kubeconfigs / SSH keys / .env files
declare -a BANNED_FILES=(
  '\.env$'
  '\.env\.local$'
  '\.env\.prod'
  'kubeconfig$'
  '\.kubeconfig$'
  'id_rsa$'
  'id_ed25519$'
  'hetzner\.yml$'
)
TRACKED=$(git ls-files 2>/dev/null || true)
for bp in "${BANNED_FILES[@]}"; do
  hits=$(echo "$TRACKED" | grep -E "$bp" || true)
  if [[ -n "$hits" ]]; then
    fail "banned file committed: pattern '$bp'"
    echo "$hits" | head -3 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "no banned files (kubeconfig / id_rsa / .env / hcloud) tracked"

if [[ $FAIL -ne 0 ]]; then
  echo "[secret-scan] OVERALL: FAIL" >&2
  exit 1
fi
echo "[secret-scan] OVERALL: PASS"
exit 0
