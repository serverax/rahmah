# backend/app/scripts/docker-smoke-local.ps1
# Runs the LOCAL Sakina backend container and probes /health + /ready.
# Optional: set $env:DATABASE_URL before running; the script will forward it
# but NEVER print the value, and asserts /ready does not leak a DSN.
#requires -Version 7.0
$ErrorActionPreference = 'Stop'

$IMAGE         = 'ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local'
$CONTAINER     = "sakina-backend-smoke-$([Guid]::NewGuid().ToString('N').Substring(0,8))"
$HOST_PORT     = if ($env:SAKINA_SMOKE_PORT) { [int]$env:SAKINA_SMOKE_PORT } else { 3331 }
$CONTAINER_PORT= 3000

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error 'docker not found in PATH.'; exit 1
}

# Confirm image exists locally
docker image inspect $IMAGE *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Image $IMAGE not present locally. Run docker-build-local.ps1 first."
  exit 1
}

$cleanup = {
  docker rm -f $script:CONTAINER *> $null 2>&1
}
trap { & $cleanup; throw }

Write-Host "== Sakina backend: local Docker smoke ==" -ForegroundColor Cyan
Write-Host "Image    : $IMAGE"
Write-Host "Container: $CONTAINER"
Write-Host "Host port: $HOST_PORT -> container $CONTAINER_PORT"

$envArgs = @()
if ($env:DATABASE_URL) {
  Write-Host 'DATABASE_URL is set; forwarding to container (value not printed).' -ForegroundColor Yellow
  $envArgs += @('-e', "DATABASE_URL=$($env:DATABASE_URL)")
} else {
  Write-Host 'DATABASE_URL not set (expected /ready database.configured=false).'
}

docker run -d --name $CONTAINER -p "$HOST_PORT`:$CONTAINER_PORT" -e NODE_ENV=staging @envArgs $IMAGE *> $null
if ($LASTEXITCODE -ne 0) { & $cleanup; throw 'docker run failed' }

try {
  Write-Host 'Waiting for /health to respond...' -ForegroundColor Yellow
  $healthBody = $null
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $healthBody = Invoke-RestMethod -Uri "http://127.0.0.1:$HOST_PORT/health" -TimeoutSec 2 -ErrorAction Stop
      break
    } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $healthBody) { throw '/health did not respond within timeout' }

  Write-Host '[/health]' -ForegroundColor Cyan
  $healthBody | ConvertTo-Json -Compress | Write-Host
  if (-not $healthBody.ok)                        { throw '/health did not contain ok:true' }
  if ($healthBody.status -ne 'healthy')           { throw '/health did not contain status:healthy' }

  Write-Host '[/ready]' -ForegroundColor Cyan
  $readyBody = Invoke-RestMethod -Uri "http://127.0.0.1:$HOST_PORT/ready" -TimeoutSec 5
  $readyJson = $readyBody | ConvertTo-Json -Compress
  Write-Host $readyJson

  if (-not $readyBody.ok)                                      { throw '/ready did not contain ok:true' }
  if ($readyBody.ibadat.scope -ne 'ibadat')                    { throw '/ready missing ibadat scope' }
  if (-not $readyBody.ibadat.source_required)                  { throw '/ready missing source_required' }
  if (-not $readyBody.ibadat.answer_without_source_blocked)    { throw '/ready missing answer_without_source_blocked' }
  if ($readyJson -match 'postgres(ql)?://')                    { throw '/ready leaked a DSN substring' }

  if ($env:DATABASE_URL) {
    if (-not $readyBody.database.configured) { throw '/ready expected database.configured=true when DATABASE_URL is set' }
  } else {
    if ($readyBody.database.configured)      { throw '/ready expected database.configured=false when DATABASE_URL not set' }
  }

  Write-Host 'Smoke checks passed against running container.' -ForegroundColor Green
}
finally {
  & $cleanup
}
