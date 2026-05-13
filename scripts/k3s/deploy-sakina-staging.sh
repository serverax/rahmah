#!/usr/bin/env bash
# =============================================================================
# scripts/k3s/deploy-sakina-staging.sh
# -----------------------------------------------------------------------------
# Deploys sakina-islamic-app staging to a K3s cluster.
#
# HARD SAFETY GATES (in order):
#   1. KUBECONFIG / current-context must be set.
#   2. Context name MUST NOT contain: 'aks', 'prod', 'iterlaw'.
#   3. cluster-info must succeed.
#   4. Operator must confirm interactively ("YES I CONFIRM").
#
# This script intentionally has NO `set +e` blocks: any failure aborts.
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

readonly NS="sakina-ai"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly K3S_DIR="${REPO_ROOT}/deployment/k3s"
readonly DB_MIG_DIR="${REPO_ROOT}/backend/db/migrations"
readonly DB_SEED_DIR="${REPO_ROOT}/backend/db/seeds"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

die() { red "FATAL: $*"; exit 1; }

bold "== Sakina K3s staging deploy =="
yellow "Repo root: ${REPO_ROOT}"

# ----- Gate 1: kubectl present ------------------------------------------------
command -v kubectl >/dev/null 2>&1 || die "kubectl not found in PATH."

# ----- Gate 2: context name --------------------------------------------------
CTX="$(kubectl config current-context 2>/dev/null || true)"
if [[ -z "${CTX}" ]]; then
  die "No current kubectl context. Set KUBECONFIG or 'kubectl config use-context <k3s>'."
fi

bold "Current context: ${CTX}"

CTX_LOWER="$(printf '%s' "${CTX}" | tr '[:upper:]' '[:lower:]')"
for forbidden in aks prod iterlaw; do
  if [[ "${CTX_LOWER}" == *"${forbidden}"* ]]; then
    red "BLOCKED: context '${CTX}' contains the forbidden substring '${forbidden}'."
    red "This script refuses to apply to AKS/production/iterlaw contexts."
    red "Switch to your K3s staging context and re-run."
    exit 2
  fi
done
green "Context safety check passed (no aks/prod/iterlaw substring)."

# ----- Gate 3: cluster-info ---------------------------------------------------
bold "Cluster info:"
kubectl cluster-info || die "cluster-info failed."
kubectl get nodes -o wide || die "get nodes failed."

# ----- Gate 4: operator confirmation -----------------------------------------
echo
yellow "About to apply the following to context '${CTX}', namespace '${NS}':"
echo "  - namespaces/sakina-ai-namespace.yaml"
echo "  - postgres/* (statefulset, service, configmap)"
echo "  - secrets/sakina-secrets.yaml  (must be a RENDERED non-template file)"
echo "  - backend/* (deployment, service)"
echo "  - ingress/* (TLS commented unless cert-manager confirmed)"
echo
read -r -p "Type exactly \"YES I CONFIRM\" to proceed: " CONFIRM
[[ "${CONFIRM}" == "YES I CONFIRM" ]] || die "Confirmation not given. Aborting."

# ----- Step 1: namespace ------------------------------------------------------
bold "[1/8] Apply namespace"
kubectl apply -f "${K3S_DIR}/namespaces/sakina-ai-namespace.yaml"
kubectl get ns "${NS}"

# ----- Step 2: secrets sanity (template MUST NOT be applied) -----------------
bold "[2/8] Verify secrets are rendered (NOT the template)"
SECRET_FILE="${K3S_DIR}/secrets/sakina-secrets.yaml"
if [[ ! -f "${SECRET_FILE}" ]]; then
  die "${SECRET_FILE} not present. Render from sakina-secrets.template.yaml via SOPS / sealed-secrets / Vault first."
fi
if grep -q "REPLACE_ME_" "${SECRET_FILE}"; then
  die "${SECRET_FILE} still contains REPLACE_ME_ placeholders. Refusing to apply."
fi
kubectl apply -f "${SECRET_FILE}"

# ----- Step 3: postgres -------------------------------------------------------
bold "[3/8] Apply Postgres (configmap, service, statefulset)"
kubectl apply -f "${K3S_DIR}/postgres/postgres-configmap.yaml"
kubectl apply -f "${K3S_DIR}/postgres/postgres-service.yaml"
kubectl apply -f "${K3S_DIR}/postgres/postgres-statefulset.yaml"

bold "[4/8] Wait for Postgres readiness"
kubectl -n "${NS}" rollout status statefulset/sakina-postgres --timeout=180s

# ----- Step 5: run migrations -------------------------------------------------
bold "[5/8] Apply DB migrations + seeds"
PG_POD="$(kubectl -n "${NS}" get pod -l app.kubernetes.io/name=sakina-postgres \
          -o jsonpath='{.items[0].metadata.name}')"
[[ -n "${PG_POD}" ]] || die "No Postgres pod found."

for f in "${DB_MIG_DIR}"/*.sql; do
  yellow "  applying migration: ${f}"
  kubectl -n "${NS}" exec -i "${PG_POD}" -- \
    psql -v ON_ERROR_STOP=1 -U sakina_app -d sakina_db < "${f}"
done
for f in "${DB_SEED_DIR}"/*.sql; do
  yellow "  applying seed: ${f}"
  kubectl -n "${NS}" exec -i "${PG_POD}" -- \
    psql -v ON_ERROR_STOP=1 -U sakina_app -d sakina_db < "${f}"
done

# ----- Step 6: backend --------------------------------------------------------
bold "[6/8] Apply backend"
kubectl apply -f "${K3S_DIR}/backend/sakina-backend-deployment.yaml"
kubectl apply -f "${K3S_DIR}/backend/sakina-backend-service.yaml"
kubectl -n "${NS}" rollout status deployment/sakina-backend --timeout=180s

# ----- Step 7: ingress --------------------------------------------------------
bold "[7/8] Apply ingress"
kubectl apply -f "${K3S_DIR}/ingress/sakina-backend-ingress.yaml"

# ----- Step 8: smoke tests ----------------------------------------------------
bold "[8/8] Smoke tests"
kubectl -n "${NS}" exec deploy/sakina-backend -- wget -qO- http://localhost:3000/health
echo
kubectl -n "${NS}" exec deploy/sakina-backend -- wget -qO- http://localhost:3000/ready
echo
green "Deploy script finished. Run scripts/k3s/verify-sakina-k3s.sh for the full report."
