$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

git status -sb
git rev-parse HEAD
git diff --stat

if (Test-Path apps/mobile/build/app/outputs/flutter-apk/app-debug.apk) {
  Get-FileHash -Algorithm SHA256 -LiteralPath apps/mobile/build/app/outputs/flutter-apk/app-debug.apk
}
if (Test-Path apps/mobile/build/app/outputs/flutter-apk/app-release.apk) {
  Get-FileHash -Algorithm SHA256 -LiteralPath apps/mobile/build/app/outputs/flutter-apk/app-release.apk
}

Write-Host 'PASS: rahma-release-evidence.ps1'
