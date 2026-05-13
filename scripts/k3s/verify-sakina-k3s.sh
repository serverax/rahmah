#!/usr/bin/env bash
# =============================================================================
# scripts/k3s/verify-sakina-k3s.sh
# -----------------------------------------------------------------------------
# Read-only verification of the Sakina staging deployment.
# Safe to run against any context — performs no mutations.
# Pastes raw outputs so the operator can copy them into the report.
# =============================================================================
set -uo pipefail
IFS=$'\n\t'

readonly NS="sakina-ai"

hr() { printf '\n===== %s =====\n' "$*"; }

hr "kubectl config current-context"
kubectl config current-context || true

hr "kubectl get nodes -o wide"
kubectl get nodes -o wide || true

hr "kubectl get storageclass"
kubectl get storageclass || true

hr "kubectl get ns ${NS}"
kubectl get ns "${NS}" || true

hr "kubectl get all -n ${NS}"
kubectl get all -n "${NS}" || true

hr "kubectl get pvc -n ${NS}"
kubectl get pvc -n "${NS}" || true

hr "kubectl get ingress -n ${NS}"
kubectl get ingress -n "${NS}" || true

hr "kubectl get secrets -n ${NS}"
kubectl get secrets -n "${NS}" || true

hr "kubectl describe statefulset/sakina-postgres -n ${NS}"
kubectl describe statefulset/sakina-postgres -n "${NS}" 2>&1 || true

hr "kubectl logs -n ${NS} deploy/sakina-backend --tail=100"
kubectl logs -n "${NS}" deploy/sakina-backend --tail=100 2>&1 || true

hr "Backend /health"
kubectl exec -n "${NS}" deploy/sakina-backend -- wget -qO- http://localhost:3000/health 2>&1 || true

hr "Backend /ready"
kubectl exec -n "${NS}" deploy/sakina-backend -- wget -qO- http://localhost:3000/ready 2>&1 || true

echo
echo "Verification finished. No resources were modified."
