#!/usr/bin/env bash
# check-rahma-health.sh — read-only health probe against a deployed Rahma stack.
# Uses kubectl port-forward to hit /health, /ready, /api/rag/status,
# /api/engine/status from the operator workstation. Never mutates cluster.
set -euo pipefail

cd "$(dirname "$0")/../.."

NS="${RAHMA_NS:-rahma-app}"
SVC="${RAHMA_SVC:-rahma-backend}"
PORT="${RAHMA_PORT:-3000}"
LOCAL="${RAHMA_LOCAL:-18080}"

bash scripts/deploy/verify-rahma-repo.sh
bash scripts/deploy/verify-rahma-cluster.sh

echo "[check-rahma-health] starting port-forward $NS/$SVC :$PORT → 127.0.0.1:$LOCAL"
kubectl port-forward -n "$NS" "svc/$SVC" "$LOCAL:$PORT" >/tmp/rahma-pf.log 2>&1 &
PF_PID=$!
trap 'kill $PF_PID 2>/dev/null || true' EXIT
sleep 3

probe() {
  local path="$1"
  printf "%-30s" "$path"
  if RESP=$(curl -sfS --max-time 5 "http://127.0.0.1:$LOCAL$path" 2>&1); then
    # Print only the first 400 chars; never echo full secrets.
    echo "OK  $(echo "$RESP" | head -c 400)"
  else
    echo "FAIL"
  fi
}

probe /health
probe /ready
probe /api/rag/status
probe /api/engine/status
probe /api/sadaqah/transparency

echo "[check-rahma-health] done"
