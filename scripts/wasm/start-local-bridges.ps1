# Start all four Rahma WASM bridge servers locally (ports 8091-8094).
$ErrorActionPreference = "Stop"
$root = "F:/rahma"
$ports = @{
  "fatwa-policy-gate" = 8091
  "quran-hadith-citation" = 8092
  "child-safety" = 8093
  "content-rule-engine" = 8094
}

foreach ($name in $ports.Keys) {
  $port = $ports[$name]
  $dir = Join-Path $root "wasm/$name/server"
  if (-not (Test-Path $dir)) { throw "Missing bridge: $dir" }
  $cmd = @"
Set-Location '$dir'
`$env:PORT = '$port'
`$env:HOST = '127.0.0.1'
npm start
"@
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd | Out-Null
  Write-Host "Started $name on http://127.0.0.1:$port"
}

Write-Host @"

Set API env:
  `$env:WASM_RUNTIME_MODE = 'required'
  `$env:WASM_FATWA_POLICY_GATE_URL = 'http://127.0.0.1:8091'
  `$env:WASM_QURAN_HADITH_CITATION_URL = 'http://127.0.0.1:8092'
  `$env:WASM_CHILD_SAFETY_URL = 'http://127.0.0.1:8093'
  `$env:WASM_CONTENT_RULE_ENGINE_URL = 'http://127.0.0.1:8094'
"@
