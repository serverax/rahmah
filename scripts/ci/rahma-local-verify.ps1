$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

Write-Host "PASS: repo root $repoRoot"
git status -sb

node scripts/content/validate-source-registry.js
node scripts/content/test-unapproved-source-block.js
node scripts/content/build-mobile-offline-export.js
node scripts/content/test-quran-full.js

Set-Location apps/mobile
flutter pub get
flutter analyze
flutter test

Write-Host 'PASS: rahma-local-verify.ps1'
