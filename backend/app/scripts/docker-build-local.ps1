# backend/app/scripts/docker-build-local.ps1
# Builds the Sakina backend container image locally. No push.
#requires -Version 7.0
$ErrorActionPreference = 'Stop'

$IMAGE = 'ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local'
$AppDir = (Resolve-Path "$PSScriptRoot/..").Path

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error 'docker not found in PATH.'
  exit 1
}

Write-Host "== Sakina backend: local Docker build ==" -ForegroundColor Cyan
Write-Host "Image: $IMAGE"
Write-Host "Context: $AppDir"

$revision = try { (& git -C $AppDir rev-parse HEAD).Trim() } catch { 'unknown' }

Push-Location $AppDir
try {
  docker build `
    --pull `
    --tag $IMAGE `
    --label 'org.opencontainers.image.title=Sakina Backend' `
    --label 'org.opencontainers.image.source=https://github.com/serverax/rahmah' `
    --label "org.opencontainers.image.revision=$revision" `
    .
  if ($LASTEXITCODE -ne 0) { throw "docker build failed with exit $LASTEXITCODE" }

  $id = (docker image inspect $IMAGE --format '{{.Id}}').Trim()
  Write-Host "Built $IMAGE" -ForegroundColor Green
  Write-Host "Image ID: $id" -ForegroundColor Green
}
finally {
  Pop-Location
}
