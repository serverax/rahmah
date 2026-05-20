#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-deployment/talos/rahma}"
if [ ! -d "$ROOT" ]; then
  echo "FAILED: $ROOT does not exist" >&2
  exit 1
fi

status=0
files=$(find "$ROOT" -maxdepth 1 -type f -name '*.yaml' | sort)

fail() {
  echo "FAILED: $1" >&2
  status=1
}

if grep -RInE 'namespace:\s*(default|iterlaw|ordinox|openclaw)\b' "$ROOT" --include='*.yaml'; then
  fail "forbidden namespace found"
fi

if grep -RInE 'image:\s*[^[:space:]]+:latest\b' "$ROOT" --include='*.yaml'; then
  fail "latest image tag found"
fi

if grep -RInE '(DATABASE_URL|API_KEY|TOKEN|PASSWORD|SECRET):\s*(postgresql://|[A-Za-z0-9+/=]{20,})' "$ROOT" --include='*.yaml'; then
  fail "possible hardcoded secret found"
fi

for required in rahma-web rahma-api rahma-data rahma-ai rahma-monitoring rahma-security; do
  if ! grep -R "name: $required" "$ROOT/namespaces.yaml" >/dev/null; then
    fail "missing namespace $required"
  fi
done

for workload in rahma-web-deployment.yaml rahma-api-deployment.yaml rahma-data-postgres.yaml rahma-redis.yaml; do
  path="$ROOT/$workload"
  [ -f "$path" ] || { fail "missing $workload"; continue; }
  grep -q "resources:" "$path" || fail "$workload missing resources"
  grep -q "requests:" "$path" || fail "$workload missing resource requests"
  grep -q "limits:" "$path" || fail "$workload missing resource limits"
  grep -q "readinessProbe:" "$path" || fail "$workload missing readinessProbe"
  grep -q "livenessProbe:" "$path" || fail "$workload missing livenessProbe"
  grep -q "securityContext:" "$path" || fail "$workload missing securityContext"
  grep -q "runAsNonRoot: true" "$path" || fail "$workload missing runAsNonRoot"
  grep -q "allowPrivilegeEscalation: false" "$path" || fail "$workload missing allowPrivilegeEscalation false"
done

grep -q "template-only" "$ROOT/rahma-ingress-template.yaml" || fail "ingress template not marked template-only"
grep -q "<real-domain>" "$ROOT/rahma-ingress-template.yaml" || fail "ingress template missing real-domain placeholder"
grep -q "template-only" "$ROOT/rahma-cert-manager-template.yaml" || fail "cert-manager template not marked template-only"
grep -q "<admin-email>" "$ROOT/rahma-cert-manager-template.yaml" || fail "cert-manager template missing admin-email placeholder"

for f in $files; do
  echo "checked: $f"
done

if [ "$status" -ne 0 ]; then
  echo "FAILED_TALOS_MANIFEST_POLICY"
  exit "$status"
fi

echo "PASS_TALOS_MANIFEST_POLICY"
