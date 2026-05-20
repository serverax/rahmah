# Rahma local stack (Postgres + pgvector + Redis)

## Start

```powershell
cd F:/rahma/deployment/local
$env:RAHMA_POSTGRES_PASSWORD = "rahma_local_dev_only"
docker compose -f docker-compose.rahma-stack.yml up -d
```

Wait until healthy:

```powershell
docker compose -f docker-compose.rahma-stack.yml ps
```

## Environment

```powershell
$env:DATABASE_URL = "postgresql://rahma_user:rahma_local_dev_only@127.0.0.1:5435/rahma"
$env:REDIS_URL = "redis://127.0.0.1:6381/0"
$env:RAG_VECTOR_SEARCH = "true"
# Production WASM (start bridges: scripts/wasm/start-local-bridges.ps1)
$env:WASM_RUNTIME_MODE = "required"
$env:WASM_FATWA_POLICY_GATE_URL = "http://127.0.0.1:8091"
$env:WASM_QURAN_HADITH_CITATION_URL = "http://127.0.0.1:8092"
$env:WASM_CHILD_SAFETY_URL = "http://127.0.0.1:8093"
$env:WASM_CONTENT_RULE_ENGINE_URL = "http://127.0.0.1:8094"

# Foundation-only (NOT production_ready):
# $env:WASM_RUNTIME_MODE = "disabled"
# $env:WASM_DISABLE_APPROVED = "true"
$env:AUTH_MODE = "dev_local"
$env:SAKINA_ALLOW_DEV_AUTH = "true"
$env:APP_STORE_COMPLIANCE_STATUS = "approved"
```

## Verify

```powershell
cd F:/rahma
node scripts/db/run-migrations.js
node scripts/rag/seed-approved-sources.js
node scripts/rag/ingest-approved-content.js
node scripts/rag/verify-rag-live.js
node scripts/db/verify-complete-schema.js
```

Ports: **5435** (Postgres/pgvector), **6381** (Redis). Do not use port **3010** for Rahma API.
