$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

& ./scripts/security/rahma-secret-scan.sh
& ./scripts/security/rahma-release-security-gate.sh
& ./scripts/security/rahma-k8s-safety-scan.sh

foreach ($pattern in @('IterLaw', 'RightsNow', 'Alaa Beauty', 'OrdinoxAI')) {
  $matches = rg -n --hidden --glob '!**/.git/**' --glob '!**/build/**' --glob '!**/.dart_tool/**' --glob '!**/node_modules/**' $pattern apps/mobile backend deployment scripts docs
  if ($matches) {
    $filtered = $matches | Select-String -NotMatch 'backend/app/src/rag/local-llm|deployment/k3s/rahma/app/50-local-llm-config.yaml|docs/architecture/RAHMA_LOCAL_LLM_RAG_ARCHITECTURE.md'
    if ($filtered) {
      throw "FAIL: forbidden project reference found: $pattern"
    }
  }
}

$trackedApks = git ls-files 'apps/mobile/build/**' '*.apk'
if ($trackedApks) {
  throw 'FAIL: APK build outputs are tracked in git'
}

Write-Host 'PASS: rahma-security-check.ps1'
