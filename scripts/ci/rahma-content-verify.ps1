$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

node scripts/content/validate-source-registry.js
node scripts/content/test-unapproved-source-block.js
node scripts/content/build-mobile-offline-export.js
node scripts/content/test-quran-full.js

if (Test-Path backend/app/package.json) {
  Set-Location backend/app
  npm install
  npm test
}

Write-Host 'PASS: rahma-content-verify.ps1'
