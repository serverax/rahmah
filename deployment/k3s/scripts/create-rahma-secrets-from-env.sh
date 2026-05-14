#!/usr/bin/env bash
# =============================================================================
# create-rahma-secrets-from-env.sh
#
# Create / update Rahma Kubernetes Secrets from environment variables.
# NEVER echoes secret values. NEVER persists values to disk. Operator
# runs this with the required env vars set in the current shell.
#
# Secrets created:
#   - rahma-postgres-secret (namespace rahma-data)
#   - rahma-redis-secret    (namespace rahma-data)
#   - rahma-api-secrets     (namespace rahma-api)
#
# Required env vars:
#   RAHMA_DATABASE_URL
#   RAHMA_REDIS_URL
#   RAHMA_JWT_SECRET
#   RAHMA_API_SIGNING_SECRET
#   RAHMA_MOBILE_APP_SHARED_SECRET
#   RAHMA_ADMIN_EMAIL
#   RAHMA_ADMIN_PASSWORD_HASH
#   RAHMA_SHEIKH_HASAN_EMAIL
#   RAHMA_SHEIKH_HASAN_PASSWORD_HASH
#   RAHMA_POSTGRES_DB
#   RAHMA_POSTGRES_USER
#   RAHMA_POSTGRES_PASSWORD
#   RAHMA_REDIS_PASSWORD
#
# Usage:
#   bash create-rahma-secrets-from-env.sh [--dry-run]
# =============================================================================
set -u

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
ok()     { printf "[secrets] OK: %s\n" "$*"; }

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) echo "Usage: $0 [--dry-run]"; exit 0 ;;
    *)         red "Unknown flag: $arg"; exit 1 ;;
  esac
done

REQUIRED_VARS=(
  RAHMA_DATABASE_URL
  RAHMA_REDIS_URL
  RAHMA_JWT_SECRET
  RAHMA_API_SIGNING_SECRET
  RAHMA_MOBILE_APP_SHARED_SECRET
  RAHMA_ADMIN_EMAIL
  RAHMA_ADMIN_PASSWORD_HASH
  RAHMA_SHEIKH_HASAN_EMAIL
  RAHMA_SHEIKH_HASAN_PASSWORD_HASH
  RAHMA_POSTGRES_DB
  RAHMA_POSTGRES_USER
  RAHMA_POSTGRES_PASSWORD
  RAHMA_REDIS_PASSWORD
)

# --- 1. Required vars must exist, must not be CHANGE_ME / placeholder -------
MISSING=()
PLACEHOLDER=()
for v in "${REQUIRED_VARS[@]}"; do
  val=${!v-}
  if [[ -z "$val" ]]; then
    MISSING+=("$v")
  elif [[ "$val" =~ (^|[^A-Z])(CHANGE_ME|REPLACE_ME|PLACEHOLDER)([^A-Z]|$) ]]; then
    PLACEHOLDER+=("$v")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  red "Missing env vars (values intentionally NOT echoed):"
  printf '  - %s\n' "${MISSING[@]}"
  exit 1
fi
if [[ ${#PLACEHOLDER[@]} -gt 0 ]]; then
  red "Env vars contain placeholder text (CHANGE_ME / REPLACE_ME / PLACEHOLDER):"
  printf '  - %s\n' "${PLACEHOLDER[@]}"
  exit 1
fi
ok "all required env vars present and non-placeholder"

# Quick shape checks (no values printed).
[[ "$RAHMA_DATABASE_URL"   =~ ^postgres(ql)?:// ]] || { red "RAHMA_DATABASE_URL must start with postgres://"; exit 1; }
[[ "$RAHMA_REDIS_URL"      =~ ^redis://         ]] || { red "RAHMA_REDIS_URL must start with redis://";       exit 1; }
[[ ${#RAHMA_JWT_SECRET}             -ge 32 ]]      || { red "RAHMA_JWT_SECRET too short (<32 bytes)";          exit 1; }
[[ ${#RAHMA_API_SIGNING_SECRET}     -ge 32 ]]      || { red "RAHMA_API_SIGNING_SECRET too short (<32 bytes)";  exit 1; }
[[ ${#RAHMA_MOBILE_APP_SHARED_SECRET} -ge 32 ]]    || { red "RAHMA_MOBILE_APP_SHARED_SECRET too short (<32 bytes)"; exit 1; }
[[ ${#RAHMA_POSTGRES_PASSWORD}      -ge 16 ]]      || { red "RAHMA_POSTGRES_PASSWORD too short (<16 chars)";   exit 1; }
[[ ${#RAHMA_REDIS_PASSWORD}         -ge 16 ]]      || { red "RAHMA_REDIS_PASSWORD too short (<16 chars)";      exit 1; }
[[ "$RAHMA_ADMIN_EMAIL"          == *@* ]]         || { red "RAHMA_ADMIN_EMAIL must look like an email";       exit 1; }
[[ "$RAHMA_SHEIKH_HASAN_EMAIL"   == *@* ]]         || { red "RAHMA_SHEIKH_HASAN_EMAIL must look like an email";exit 1; }
ok "shape checks passed"

# --- 2. Dry-run exit path ---------------------------------------------------
if [[ $DRY_RUN -eq 1 ]]; then
  ok "DRY-RUN: would create/update these secrets:"
  echo "  rahma-data/rahma-postgres-secret  (keys: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD)"
  echo "  rahma-data/rahma-redis-secret     (keys: REDIS_PASSWORD)"
  echo "  rahma-api/rahma-api-secrets       (keys: DATABASE_URL, REDIS_URL, JWT_SECRET, SESSION_SECRET, API_SIGNING_SECRET, MOBILE_APP_SHARED_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SHEIKH_HASAN_EMAIL, SHEIKH_HASAN_PASSWORD_HASH)"
  green "==== DRY-RUN complete (no kubectl mutation, no value echoed) ===="
  exit 0
fi

# --- 3. Cluster-side gate ---------------------------------------------------
if ! command -v kubectl >/dev/null 2>&1; then red "kubectl not found"; exit 1; fi
CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "$CTX" ]]; then red "no current kubectl context"; exit 1; fi
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ "$CTX" =~ $FORBIDDEN_RE ]]; then red "FORBIDDEN CONTEXT: $CTX"; exit 1; fi
green "Context OK: $CTX"

# --- 4. Apply ---------------------------------------------------------------
yellow "Creating/updating rahma-postgres-secret in rahma-data..."
kubectl -n rahma-data create secret generic rahma-postgres-secret \
  --from-literal=POSTGRES_DB="$RAHMA_POSTGRES_DB" \
  --from-literal=POSTGRES_USER="$RAHMA_POSTGRES_USER" \
  --from-literal=POSTGRES_PASSWORD="$RAHMA_POSTGRES_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

yellow "Creating/updating rahma-redis-secret in rahma-data..."
kubectl -n rahma-data create secret generic rahma-redis-secret \
  --from-literal=REDIS_PASSWORD="$RAHMA_REDIS_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

yellow "Creating/updating rahma-api-secrets in rahma-api..."
kubectl -n rahma-api create secret generic rahma-api-secrets \
  --from-literal=DATABASE_URL="$RAHMA_DATABASE_URL" \
  --from-literal=REDIS_URL="$RAHMA_REDIS_URL" \
  --from-literal=JWT_SECRET="$RAHMA_JWT_SECRET" \
  --from-literal=SESSION_SECRET="$RAHMA_JWT_SECRET" \
  --from-literal=API_SIGNING_SECRET="$RAHMA_API_SIGNING_SECRET" \
  --from-literal=MOBILE_APP_SHARED_SECRET="$RAHMA_MOBILE_APP_SHARED_SECRET" \
  --from-literal=ADMIN_EMAIL="$RAHMA_ADMIN_EMAIL" \
  --from-literal=ADMIN_PASSWORD_HASH="$RAHMA_ADMIN_PASSWORD_HASH" \
  --from-literal=SHEIKH_HASAN_EMAIL="$RAHMA_SHEIKH_HASAN_EMAIL" \
  --from-literal=SHEIKH_HASAN_PASSWORD_HASH="$RAHMA_SHEIKH_HASAN_PASSWORD_HASH" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- 5. Verify by name only (no values fetched) -----------------------------
for nsec in rahma-data/rahma-postgres-secret rahma-data/rahma-redis-secret rahma-api/rahma-api-secrets; do
  NS=${nsec%%/*}; NAME=${nsec##*/}
  if kubectl -n "$NS" get secret "$NAME" >/dev/null 2>&1; then
    ok "secret $NS/$NAME present"
  else
    red "secret $NS/$NAME missing after create"
  fi
done

green "==== secrets create/update complete ===="
green "Reminder: rotate periodically. See RAHMA_SECRET_ROTATION_RUNBOOK.md"
