#!/usr/bin/env bash
# =============================================================================
# run-rahma-db-migrations-job.sh
#
# Render the rahma-db-migrate-job template, apply it, wait for completion,
# print logs, delete the Job. Operator-run on master-of-brains.
#
# Usage:
#   bash run-rahma-db-migrations-job.sh --confirm-run-migrations [--image <ref>] [--keep]
#   bash run-rahma-db-migrations-job.sh --dry-run
#
# Flags:
#   --confirm-run-migrations  required for a live run (foot-gun guard)
#   --image <ref>             override image; default ghcr.io/serverax/rahmah/rahma-api:latest
#   --keep                    keep the Job after success (default: delete)
#   --dry-run                 render the manifest only; print to stdout
# =============================================================================
set -u

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
ok()     { printf "[migrate] OK: %s\n" "$*"; }

CONFIRMED=0
DRY_RUN=0
KEEP=0
IMAGE='ghcr.io/serverax/rahmah/rahma-api:latest'
while [[ $# -gt 0 ]]; do
  case "$1" in
    --confirm-run-migrations) CONFIRMED=1; shift ;;
    --dry-run)                DRY_RUN=1;   shift ;;
    --keep)                   KEEP=1;      shift ;;
    --image)                  IMAGE="$2";  shift 2 ;;
    -h|--help)
      echo "Usage: $0 --confirm-run-migrations [--image <ref>] [--keep]"
      echo "       $0 --dry-run"
      exit 0
      ;;
    *) red "Unknown flag: $1"; exit 1 ;;
  esac
done

cd "$(dirname "$0")/../../.." || exit 1
TEMPLATE='deployment/k3s/jobs/rahma-db-migrate-job.yaml.template'
if [[ ! -f "$TEMPLATE" ]]; then red "missing template: $TEMPLATE"; exit 1; fi
JOB_NAME="rahma-db-migrate-$(date -u +%Y%m%d-%H%M%S)"

RENDERED=$(mktemp)
trap 'rm -f "$RENDERED"' EXIT
sed -e "s|REPLACE_ME_JOB_NAME|${JOB_NAME}|" \
    -e "s|REPLACE_ME_IMAGE|${IMAGE}|" \
    "$TEMPLATE" > "$RENDERED"

if [[ $DRY_RUN -eq 1 ]]; then
  cat "$RENDERED"
  green "==== DRY-RUN render complete (no kubectl apply) ===="
  exit 0
fi

if [[ $CONFIRMED -ne 1 ]]; then
  red "Live run requires --confirm-run-migrations. Refusing."
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then red "kubectl not found"; exit 1; fi
CTX=$(kubectl config current-context 2>/dev/null || true)
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ -z "$CTX" || "$CTX" =~ $FORBIDDEN_RE ]]; then red "FORBIDDEN / unset CONTEXT: $CTX"; exit 1; fi
green "Context OK: $CTX"

# rahma-api-secrets must exist for the job to read DATABASE_URL.
if ! kubectl -n rahma-api get secret rahma-api-secrets >/dev/null 2>&1; then
  red "Secret rahma-api/rahma-api-secrets missing. Run create-rahma-secrets-from-env.sh first."
  exit 1
fi
ok "rahma-api-secrets present"

yellow "Applying Job: $JOB_NAME (image=$IMAGE)"
kubectl apply -f "$RENDERED"

yellow "Waiting for completion..."
if kubectl -n rahma-api wait --for=condition=complete --timeout=300s job/"$JOB_NAME" 2>/dev/null; then
  green "Job completed."
else
  red "Job did not complete within 300s OR failed. Pulling logs..."
fi

yellow "--- logs ---"
kubectl -n rahma-api logs job/"$JOB_NAME" --tail=200 || true
yellow "--- end logs ---"

# Inspect final status.
STATUS=$(kubectl -n rahma-api get job "$JOB_NAME" -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}{" / "}{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null || true)
echo "[migrate] status: complete=$STATUS"

if [[ $KEEP -eq 1 ]]; then
  yellow "Keeping Job $JOB_NAME (per --keep)"
else
  yellow "Deleting Job $JOB_NAME"
  kubectl -n rahma-api delete job "$JOB_NAME" --ignore-not-found
fi

green "==== migration job run complete ===="
