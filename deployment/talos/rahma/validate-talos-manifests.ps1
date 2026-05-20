param(
  [string]$Root = "deployment/talos/rahma"
)

$ErrorActionPreference = "Stop"
$status = 0

function Fail([string]$Message) {
  Write-Error $Message -ErrorAction Continue
  $script:status = 1
}

if (-not (Test-Path -LiteralPath $Root)) {
  Fail "FAILED: $Root does not exist"
  exit 1
}

$yamlFiles = Get-ChildItem -LiteralPath $Root -Filter *.yaml -File
$allText = ($yamlFiles | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }) -join "`n"

if ($allText -match 'namespace:\s*(default|iterlaw|ordinox|openclaw)\b') {
  Fail "forbidden namespace found"
}

if ($allText -match 'image:\s*\S+:latest\b') {
  Fail "latest image tag found"
}

if ($allText -match '(DATABASE_URL|API_KEY|TOKEN|PASSWORD|SECRET):\s*(postgresql://|[A-Za-z0-9+/=]{20,})') {
  Fail "possible hardcoded secret found"
}

$namespaces = Get-Content -LiteralPath (Join-Path $Root "namespaces.yaml") -Raw
foreach ($name in @("rahma-web", "rahma-api", "rahma-data", "rahma-ai", "rahma-monitoring", "rahma-security")) {
  if ($namespaces -notmatch "name:\s*$name\b") {
    Fail "missing namespace $name"
  }
}

foreach ($workload in @("rahma-web-deployment.yaml", "rahma-api-deployment.yaml", "rahma-data-postgres.yaml", "rahma-redis.yaml")) {
  $path = Join-Path $Root $workload
  if (-not (Test-Path -LiteralPath $path)) {
    Fail "missing $workload"
    continue
  }
  $text = Get-Content -LiteralPath $path -Raw
  foreach ($needle in @("resources:", "requests:", "limits:", "readinessProbe:", "livenessProbe:", "securityContext:", "runAsNonRoot: true", "allowPrivilegeEscalation: false")) {
    if ($text -notmatch [regex]::Escape($needle)) {
      Fail "$workload missing $needle"
    }
  }
}

$ingressTemplate = Get-Content -LiteralPath (Join-Path $Root "rahma-ingress-template.yaml") -Raw
if ($ingressTemplate -notmatch "template-only") { Fail "ingress template not marked template-only" }
if ($ingressTemplate -notmatch "<real-domain>") { Fail "ingress template missing real-domain placeholder" }

$certTemplate = Get-Content -LiteralPath (Join-Path $Root "rahma-cert-manager-template.yaml") -Raw
if ($certTemplate -notmatch "template-only") { Fail "cert-manager template not marked template-only" }
if ($certTemplate -notmatch "<admin-email>") { Fail "cert-manager template missing admin-email placeholder" }

$yamlFiles | ForEach-Object { Write-Output "checked: $($_.FullName)" }

if ($status -ne 0) {
  Write-Output "FAILED_TALOS_MANIFEST_POLICY"
  exit $status
}

Write-Output "PASS_TALOS_MANIFEST_POLICY"
