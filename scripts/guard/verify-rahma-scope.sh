#!/usr/bin/env bash
# =============================================================================
# verify-rahma-scope.sh — strict scope guard for the Rahma/Sakina repo.
#
# This script REFUSES to run unless:
#   1. PWD is the Rahma repo root (contains backend/app/package.json with
#      `"name": "sakina-backend"`).
#   2. `git remote -v` shows serverax/rahmah.
#
# It then audits the repo for forbidden cross-project contamination:
#   - IterLaw / RightsNow / Alaa / alaa.beauty / aks-iterlaw-we-prod
#     anywhere under active deployment paths (deployment/, scripts/,
#     .github/workflows/, backend/app/, apps/web/).
#   - OrdinoxAI references in those same paths, except the explicitly allowed
#     infra domain `ordinoxai.com` (used for rahma.ordinoxai.com etc.).
#   - "fake PASS" language that asserts production readiness or deployment
#     without command evidence.
#
# Output:
#   exit 0 = clean
#   exit 1 = scope violation found
#
# Never runs kubectl. Never touches the cluster.
# =============================================================================
set -u

FAIL=0
pass() { echo "[scope-guard] PASS: $1"; }
fail() { echo "[scope-guard] FAIL: $1" >&2; FAIL=1; }

# ---- 1. Confirm repo identity ------------------------------------------------
if [[ ! -f "backend/app/package.json" ]]; then
  fail "not at Rahma repo root (backend/app/package.json missing)"
  exit 1
fi
if ! grep -q '"name":[[:space:]]*"sakina-backend"' backend/app/package.json; then
  fail "backend/app/package.json does not declare name=sakina-backend"
  exit 1
fi
pass "Rahma repo root detected"

if command -v git >/dev/null 2>&1; then
  if ! git remote -v 2>/dev/null | grep -q 'serverax/rahmah'; then
    fail "git remote does not point to serverax/rahmah"
    exit 1
  fi
  pass "git remote = serverax/rahmah"
else
  fail "git not available"
fi

# ---- 2. Forbidden project names in active paths -----------------------------
SCAN_PATHS=(
  "deployment"
  "scripts"
  ".github/workflows"
  "backend/app/src"
  "backend/app/test"
  "apps/web"
  "docs"
)

# Hard-banned tokens that MUST NEVER appear in scanned paths *as real
# references*. Lines that mention these tokens inside a guardrail / scanner
# / "forbidden" context are allowed (they exist to BLOCK contamination).
HARD_BANS=(
  "IterLaw"
  "iterlaw"
  "aks-iterlaw-we-prod"
  "RightsNow"
  "rightsnow"
  "Alaa Beauty"
  "alaa.beauty"
  "alaabeauty"
)

# A line is treated as a "guardrail mention" (not a violation) when it
# matches any of these markers — meaning the file is explicitly using the
# token to deny / scan for / warn against contamination.
GUARDRAIL_RE='forbid|refuse|FORBID|REFUS|FORBIDDEN_|must not|MUST NOT|NOT target|NOT apply|NOT against|never against|never on|never apply|scan|Scan|deny|DENY|block|BLOCK|guard|Guard|GUARD|disallow|DISALLOW|must_not|safety|grep|Grep|Don.?t|Do not|do not|prevent|Prevent|not a Sakina|NOT a Sakina|REFUSE|cluster matching|context matching|matching aks|matches|aks/prod|substring|production cluster|prod cluster|FORBIDDEN|STOP IMMEDIATELY|stop immediately|\bNEVER\b|\*\*NEVER\*\*|shared with|different master|context check|forbidden context regex|listed in|listed.*scripts/|legitimate scope-boundary|saved memory'

# OrdinoxAI is mostly forbidden, with EXACT exceptions:
#   - "ordinoxai.com" domain references (used for rahma.ordinoxai.com).
#   - The string "OrdinoxAI" inside a memory file under memory/ or a
#     historical report under reports/SAKINA_*.md is allowed (informational).
ORDINOX_TOKEN='OrdinoxAI'

# Explicit allowlist of known scope-boundary files. These files exist to
# DECLARE the contamination boundary (safety comments, scanner workflows,
# tests asserting the boundary). They are exempt from the contamination
# scan; new violations in other files are flagged.
ALLOWED_FILES_RE='(scripts/deploy/verify-rahma-(cluster|repo)\.sh|scripts/k3s/(deploy|delete)-sakina-staging\.sh|deployment/k3s/backend/sakina-backend-deployment\.yaml|deployment/k3s/rahma/00-namespace\.yaml|deployment/k3s/rahma/data/secrets\.example\.yaml|deployment/k3s/README\.SERVER\.md|\.github/workflows/rahma-security-scan\.yml|backend/app/test/sprint-27-db\.test\.js|backend/app/test/sprints-20-24\.test\.js|docs/ops/(DATABASE_LOCAL_VERIFICATION|K3S_DEPLOYMENT_VERIFICATION)\.md|docs/RAHMA_PROJECT_(STATUS|REMAINING_WORK_AND_SPRINT_PLAN)\.md|docs/infra/RAHMA_(K3S_DEPLOYMENT_RUNBOOK|MASTER_ACCESS_RECOVERY|DNS_TLS_CHECKLIST|INFRA_VARIABLES)\.md|reports/RAHMA_BUNDLE_01_)'

for p in "${SCAN_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  for tok in "${HARD_BANS[@]}"; do
    raw=$(grep -RIn --binary-files=without-match "$tok" "$p" 2>/dev/null || true)
    if [[ -z "$raw" ]]; then continue; fi
    bad=$(echo "$raw" \
          | grep -vE "verify-rahma-scope\.sh" \
          | grep -vE "$GUARDRAIL_RE" \
          | grep -vE "$ALLOWED_FILES_RE" \
          | grep -vE "RAHMA_(PROJECT_(REMAINING_WORK|STATUS)|BUNDLE_01|FIX_SPRINT|DEEP_QA|FULL_PROJECT_AUDIT|RELEASE_READINESS|SPRINTS_30_TO_39)" \
          | grep -vE "SAKINA_(K3S_STAGING|SPRINTS_)" || true)
    if [[ -n "$bad" ]]; then
      fail "forbidden token '$tok' found in $p (new contamination):"
      echo "$bad" | head -10 >&2
    fi
  done
done
[[ $FAIL -eq 0 ]] && pass "no forbidden hard-banned tokens in active paths (allowlisted boundary files honoured)"

# OrdinoxAI scan with allow-list: must follow .com (ordinoxai.com) OR appear
# inside a guardrail/scanner context or an allowlisted boundary file.
for p in "${SCAN_PATHS[@]}"; do
  if [[ ! -e "$p" ]]; then continue; fi
  raw=$(grep -RIn --binary-files=without-match "$ORDINOX_TOKEN" "$p" 2>/dev/null || true)
  if [[ -z "$raw" ]]; then continue; fi
  bad=$(echo "$raw" \
        | grep -v "ordinoxai\.com" \
        | grep -vE "verify-rahma-scope\.sh" \
        | grep -vE "$GUARDRAIL_RE" \
        | grep -vE "$ALLOWED_FILES_RE" \
        | grep -vE "ollama\.ordinox-ai\.svc\.cluster\.local" || true)
  if [[ -n "$bad" ]]; then
    fail "OrdinoxAI references outside the allowed contexts in $p:"
    echo "$bad" | head -10 >&2
  fi
done
[[ $FAIL -eq 0 ]] && pass "OrdinoxAI references restricted to ordinoxai.com domain / guardrails / boundary files only"

# ---- 3. Fake-PASS language scan ---------------------------------------------
# Reports must never claim "DEPLOYED" / "PRODUCTION READY" / "LIVE" without
# command evidence. Reports/ paths are scanned more liberally; only blatant
# bare claims are caught here.
FAKE_REPORT_PATTERNS=(
  "production_ready: true"
  "PRODUCTION READY: YES"
  "DEPLOYED SUCCESSFULLY"
  "DNS VERIFIED LIVE"
  "TLS VERIFIED LIVE"
)
if [[ -d "reports" ]]; then
  for pat in "${FAKE_REPORT_PATTERNS[@]}"; do
    hits=$(grep -RIn --binary-files=without-match "$pat" reports 2>/dev/null)
    if [[ -n "$hits" ]]; then
      fail "fake-claim language found in reports/ (pattern: '$pat')"
      echo "$hits" | head -5 >&2
    fi
  done
fi
[[ $FAIL -eq 0 ]] && pass "no obvious fake-PASS language in reports/"

if [[ $FAIL -ne 0 ]]; then
  echo "[scope-guard] OVERALL: FAIL" >&2
  exit 1
fi
echo "[scope-guard] OVERALL: PASS"
exit 0
