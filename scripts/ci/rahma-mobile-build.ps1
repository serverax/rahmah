$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = git rev-parse --show-toplevel
Set-Location "$repoRoot/apps/mobile"

flutter pub get
flutter analyze
flutter test
flutter build apk --debug
flutter build apk --release

Get-FileHash -Algorithm SHA256 -LiteralPath build/app/outputs/flutter-apk/app-debug.apk
Get-FileHash -Algorithm SHA256 -LiteralPath build/app/outputs/flutter-apk/app-release.apk

Write-Host 'PASS: rahma-mobile-build.ps1'
