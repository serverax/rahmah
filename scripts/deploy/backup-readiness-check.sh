#!/usr/bin/env bash
# backup-readiness-check.sh — read-only audit of backup readiness for the
# Rahma data tier. Never runs a backup. Never mutates cluster.
set -euo pipefail

cd "$(dirname "$0")/../.."

bash scripts/deploy/verify-rahma-repo.sh
bash scripts/deploy/verify-rahma-cluster.sh

NS_DATA="${RAHMA_NS_DATA:-rahma-data}"

echo "[backup-readiness-check] PVCs in $NS_DATA:"
kubectl -n "$NS_DATA" get pvc -o wide || true

echo "[backup-readiness-check] StatefulSets in $NS_DATA:"
kubectl -n "$NS_DATA" get statefulsets || true

echo "[backup-readiness-check] Services in $NS_DATA (must all be ClusterIP):"
kubectl -n "$NS_DATA" get svc -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.type}{"\n"}{end}' || true

echo "[backup-readiness-check] Looking for a MinIO bucket named rahma-backups (informational only):"
echo "  (this script does not list bucket contents — that's done by an operator-run mc command)"

echo "[backup-readiness-check] Backup documentation present?"
for f in docs/ops/BACKUP_AND_RESTORE_READINESS.md docs/ops/RAHMA_RUNBOOK.md docs/ops/K3S_DEPLOYMENT_VERIFICATION.md; do
  if [[ -f "$f" ]]; then
    echo "  ok: $f"
  else
    echo "  MISSING: $f"
  fi
done

echo "[backup-readiness-check] done. Real backup must be tested with a restore drill before any release."
