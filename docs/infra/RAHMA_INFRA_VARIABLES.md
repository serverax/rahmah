# Rahma — Infrastructure Variable Inventory

**Date:** 2026-05-14
**Scope:** Rahma/Sakina only — never includes real secret values.

## Namespaces

| Name | Purpose |
|---|---|
| `rahma-web` | Public web frontend (Arabic-RTL static + minimal Node server) |
| `rahma-api` | Backend Fastify API (`sakina-backend` image) |
| `rahma-data` | PostgreSQL + Redis StatefulSets (internal only) |
| `rahma-ai` | AI worker pods (Ollama draft, embeddings worker, WASM policy worker) — internal only |
| `rahma-monitoring` | Prometheus / Loki / Grafana when added |
| `rahma-security` | Falco / runtime-security workloads when added |

## Public domains (Cloudflare → cluster ingress)

| Host | Target service | Notes |
|---|---|---|
| `rahma.ordinoxai.com` | `rahma-web.rahma-web.svc.cluster.local:80` | public web |
| `api.rahma.ordinoxai.com` | `rahma-api.rahma-api.svc.cluster.local:80` | public API |
| `admin.rahma.ordinoxai.com` | (admin service when split out) | admin only, auth-gated |
| `ai.rahma.ordinoxai.com` | NOT public | DO NOT expose Ollama publicly |

## Internal service DNS

| Service | DNS | Port |
|---|---|---|
| Postgres | `rahma-postgres.rahma-data.svc.cluster.local` | 5432 |
| Redis | `rahma-redis.rahma-data.svc.cluster.local` | 6379 |
| Backend API | `rahma-api.rahma-api.svc.cluster.local` | 80 → 3000 |
| Frontend | `rahma-web.rahma-web.svc.cluster.local` | 80 → 8080 |
| AI gateway (shared, NOT touched) | `ollama.ordinox-ai.svc.cluster.local` | 11434 |

## Expected ConfigMap

| Name | Namespaces | Contents |
|---|---|---|
| `rahma-platform-config` | `rahma-api`, `rahma-web` | `APP_*`, `PUBLIC_*_URL`, feature flags |

## Expected Secret names (NEVER committed, applied via `kubectl create secret`)

| Name | Namespace | Keys |
|---|---|---|
| `rahma-api-secrets` | `rahma-api` | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SESSION_SECRET`, `SHEIKH_ALLOWED_EMAIL_HASHES`, `ADMIN_ALLOWED_EMAIL_HASHES`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SHEIKH_HASAN_EMAIL`, `SHEIKH_HASAN_PASSWORD_HASH` |
| `rahma-postgres-secret` | `rahma-data` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| `rahma-redis-secret` | `rahma-data` | `REDIS_PASSWORD` |
| `letsencrypt-prod-account-key` | `cert-manager` | ACME account key (managed by cert-manager itself) |
| `rahma-web-tls` | `rahma-web` | issued by cert-manager |
| `rahma-api-tls` | `rahma-api` | issued by cert-manager |

## Container images

| Image | Source |
|---|---|
| `ghcr.io/serverax/rahmah/sakina-backend:main` | `.github/workflows/backend-image-ci.yml` on push to main |
| `ghcr.io/serverax/rahmah/rahma-web:main` | (workflow not yet wired — Sprint 41 candidate) |
| `postgres:16.4-alpine` | upstream |
| `redis:7.4-alpine` | upstream |

## Environment-flag matrix (operator-controlled at apply time)

| Variable | Default | Purpose |
|---|---|---|
| `AUTH_MODE` | `not_configured` | one of: `not_configured` / `dev_local` / `external` |
| `AUTH_PROVIDER` | unset | safe display name (e.g. `oidc-keycloak`) |
| `OIDC_ISSUER` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` | unset | real OIDC config (secrets only) |
| `SCHOLAR_ANSWER_CITATION_REQUIRED` | `true` | refuse public Sheikh answer without citation |
| `PUBLIC_ANSWER_MODERATION_REQUIRED` | `true` | require admin/reviewer approval |
| `APP_STORE_COMPLIANCE_MODE` | `true` | enforce account-deletion / data-export / reporting paths |
| `ASK_SHEIKH_HASAN_ENABLED` | `true` | feature flag for the workflow |
| `PUBLIC_SHEIKH_QA_ENABLED` | `true` | public read-only Q&A |
| `LIBRARY_ENABLED` | `true` | Islamic library section |

## NEVER stored in this repo

- Real DB passwords
- Real JWT / session secrets
- Real OIDC client secrets
- Real ACME account keys
- Real email addresses for admin/sheikh
- Real kubeconfigs / SSH keys / Hetzner API tokens
- Real WhatsApp / payment provider tokens
