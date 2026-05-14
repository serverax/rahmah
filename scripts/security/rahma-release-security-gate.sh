#!/usr/bin/env bash
# =============================================================================
# rahma-release-security-gate.sh
#
# Aggregates every safety constraint the project relies on before any public
# exposure / cluster rollout. Exit 0 only if ALL checks pass.
#
# This script is the canonical "OK to ship" gate the operator runs on master
# before applying changes that move Rahma closer to production.
# =============================================================================
set -u

FAIL=0
pass() { echo "[release-gate] PASS: $1"; }
fail() { echo "[release-gate] FAIL: $1" >&2; FAIL=1; }

cd "$(dirname "$0")/../.." || exit 1

# 1. Scope guard.
if bash scripts/guard/verify-rahma-scope.sh >/dev/null 2>&1; then
  pass "scope guard"
else
  fail "scope guard"
fi

# 2. K3s manifest verify.
if bash deployment/k3s/scripts/verify-rahma-manifests.sh >/dev/null 2>&1; then
  pass "k3s manifest verify"
else
  fail "k3s manifest verify"
fi

# 3. K8s safety scan.
if bash scripts/security/rahma-k8s-safety-scan.sh >/dev/null 2>&1; then
  pass "k8s safety scan"
else
  fail "k8s safety scan"
fi

# 4. Secret scan.
if bash scripts/security/rahma-secret-scan.sh >/dev/null 2>&1; then
  pass "secret scan"
else
  fail "secret scan"
fi

# 5. No public ingress under deployment/k3s/.
if compgen -G "deployment/k3s/ingress/*.yaml" >/dev/null 2>&1; then
  fail "deployment/k3s/ingress/*.yaml present — public ingress is deferred"
else
  pass "no public ingress in repo"
fi

# 6. No rahma-web / rahma-admin manifests.
if [[ -f deployment/k3s/namespaces/rahma-web.yaml ]] \
   || [[ -f deployment/k3s/namespaces/rahma-admin.yaml ]] \
   || compgen -G "deployment/k3s/frontend/*" >/dev/null 2>&1; then
  fail "rahma-web / rahma-admin manifests present"
else
  pass "no rahma-web / rahma-admin manifests"
fi

# 7. No api.rahma.example / OrdinoxAI domain in active YAML manifests.
BAD_DOM=$(grep -RIn --include='*.yaml' --include='*.yml' \
            -E '(api\.rahma\.example|api\.rahma\.ordinoxai\.com|rahma\.ordinoxai\.com|admin\.rahma\.ordinoxai\.com)' \
            deployment/k3s 2>/dev/null \
          | grep -v 'deployment/k3s/scripts/' || true)
if [[ -n "$BAD_DOM" ]]; then
  fail "forbidden / placeholder domain in deployment/k3s YAML manifests:"
  echo "$BAD_DOM" | head -5 >&2
else
  pass "no forbidden / placeholder domains in deployment/k3s YAML manifests"
fi

# 8. No DEBUG=true in any K3s manifest.
DBG=$(grep -RIn -E '(DEBUG|NODE_ENV)\s*[:=]\s*["'"'"']?\s*(true|development|dev)\s*["'"'"']?\s*$' deployment/k3s 2>/dev/null || true)
if [[ -n "$DBG" ]]; then
  fail "DEBUG/NODE_ENV=development setting found in K3s manifests:"
  echo "$DBG" | head -5 >&2
else
  pass "no DEBUG=true / NODE_ENV=development in K3s manifests"
fi

# 9. No card-data field accepted by backend (literal field-name check).
CARD_HIT=$(grep -RIn -E '\b(pan|card_number|cvv|cvc|track1|track2|iban|bic|swift)\s*[:=]' backend/app/src 2>/dev/null \
            | grep -v 'donations.js' || true)
if [[ -n "$CARD_HIT" ]]; then
  fail "card-data field accepted somewhere other than donations.js (which refuses it):"
  echo "$CARD_HIT" | head -5 >&2
else
  pass "no card-data field accepted in backend/app/src (outside donations.js refusal)"
fi

# 10. No fake Quran/Hadith string in backend/app/src (existing test covers it,
#     but we double-check at the gate level).
FAKE=$(grep -RInE 'بِسْمِ ٱللَّهِ|Al-Fatiha|Al-Baqarah' backend/app/src 2>/dev/null \
        | grep -v test \
        | grep -v '\.md:' || true)
if [[ -n "$FAKE" ]]; then
  fail "Quran/Hadith citation literals found in backend/app/src (outside tests):"
  echo "$FAKE" | head -3 >&2
else
  pass "no Quran/Hadith citation literals in backend/app/src outside tests"
fi

# 11. /ready production_ready is FALSE unless blockers are empty (we can't run
#     the API here; the gate enforces this rule by checking the code path:
#     `if (blockers.length === 0)` must remain present in ready.js).
if grep -q "production_ready = blockers.length === 0" backend/app/src/routes/ready.js; then
  pass "/ready computes production_ready strictly from blockers list"
else
  fail "/ready no longer derives production_ready from blockers — check ready.js"
fi

# 12. No hardcoded private key / token literal in src/.
PK=$(grep -RInE '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' backend/app/src 2>/dev/null || true)
if [[ -n "$PK" ]]; then
  fail "private-key literal found in backend/app/src"
  echo "$PK" | head -3 >&2
else
  pass "no private-key literal in backend/app/src"
fi

echo ""
if [[ $FAIL -ne 0 ]]; then
  echo "==== RELEASE GATE: FAIL ($FAIL check(s)) ====" >&2
  exit 1
fi
echo "==== RELEASE GATE: PASS ===="
exit 0
