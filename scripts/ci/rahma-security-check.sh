#!/usr/bin/env bash
set -euo pipefail

trap 'echo "FAIL: rahma-security-check.sh" >&2' ERR

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"

./scripts/security/rahma-secret-scan.sh
./scripts/security/rahma-release-security-gate.sh
./scripts/security/rahma-k8s-safety-scan.sh

for pattern in 'IterLaw' 'RightsNow' 'Alaa Beauty' 'OrdinoxAI'; do
  if rg -n --hidden --glob '!**/.git/**' --glob '!**/build/**' --glob '!**/.dart_tool/**' --glob '!**/node_modules/**' \
    "${pattern}" apps/mobile backend deployment scripts docs \
    | rg -v 'backend/app/src/rag/local-llm|deployment/k3s/rahma/app/50-local-llm-config.yaml|docs/architecture/RAHMA_LOCAL_LLM_RAG_ARCHITECTURE.md' ; then
    echo "FAIL: forbidden project reference found: ${pattern}" >&2
    exit 1
  fi
done

if git ls-files 'apps/mobile/build/**' '*.apk' | grep -q '.'; then
  echo 'FAIL: APK build outputs are tracked in git' >&2
  exit 1
fi

echo "PASS: rahma-security-check.sh"
