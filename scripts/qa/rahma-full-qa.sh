#!/usr/bin/env bash
# =============================================================================
# rahma-full-qa.sh — single entry point that runs every Rahma guardrail.
#
# Read-only. Exits 1 if any check fails. Designed to be the local mirror of
# what CI runs, so the operator can pre-validate without pushing.
# =============================================================================
set -u

OVERALL=0
section() { echo ""; echo "==== $1 ===="; }
run() {
  local label=$1; shift
  if "$@"; then
    echo "[qa] $label: PASS"
  else
    echo "[qa] $label: FAIL" >&2
    OVERALL=1
  fi
}

section "1. Scope guard"
run "scope-guard" bash scripts/guard/verify-rahma-scope.sh

section "2. K3s manifest verify"
run "k3s-verify" bash deployment/k3s/scripts/verify-rahma-manifests.sh

section "3. K8s safety scan"
run "k8s-safety" bash scripts/security/rahma-k8s-safety-scan.sh

section "4. Secret scan"
run "secret-scan" bash scripts/security/rahma-secret-scan.sh

section "5. Backend lint"
if [[ -f "backend/app/package.json" ]]; then
  ( cd backend/app && npm run lint ) && echo "[qa] backend-lint: PASS" || { echo "[qa] backend-lint: FAIL" >&2; OVERALL=1; }
else
  echo "[qa] backend-lint: SKIPPED (backend/app/package.json missing)"
fi

section "6. Backend build (syntax check)"
if [[ -f "backend/app/package.json" ]]; then
  ( cd backend/app && npm run build ) && echo "[qa] backend-build: PASS" || { echo "[qa] backend-build: FAIL" >&2; OVERALL=1; }
else
  echo "[qa] backend-build: SKIPPED"
fi

section "7. Backend tests"
if [[ -f "backend/app/package.json" ]]; then
  ( cd backend/app && npm test ) && echo "[qa] backend-test: PASS" || { echo "[qa] backend-test: FAIL" >&2; OVERALL=1; }
else
  echo "[qa] backend-test: SKIPPED"
fi

section "8. Web tests"
if [[ -f "apps/web/package.json" ]]; then
  ( cd apps/web && npm test ) && echo "[qa] web-test: PASS" || { echo "[qa] web-test: FAIL" >&2; OVERALL=1; }
else
  echo "[qa] web-test: SKIPPED"
fi

section "9. DB health (DSN never echoed)"
if [[ -f "backend/app/package.json" ]]; then
  ( cd backend/app && npm run db:check ) && echo "[qa] db-check: PASS" || { echo "[qa] db-check: FAIL" >&2; OVERALL=1; }
else
  echo "[qa] db-check: SKIPPED"
fi

echo ""
if [[ $OVERALL -ne 0 ]]; then
  echo "==== rahma-full-qa: OVERALL FAIL ====" >&2
  exit 1
fi
echo "==== rahma-full-qa: OVERALL PASS ===="
exit 0
