# Rahma — Infrastructure Variable Inventory (Mobile-App Only)

**Date:** 2026-05-14
**Scope:** Rahma/Sakina only — mobile-app target. No public website, no admin dashboard.
Never includes real secret values.

## Namespaces (5 total)

| Name | Purpose |
|---|---|
| `rahma-api` | Backend Fastify API serving the mobile app (`sakina-backend` image) |
| `rahma-data` | PostgreSQL + Redis StatefulSets (internal only) |
| `rahma-ai` | WASM / AI / RAG worker pods (Ollama draft, embeddings worker, WASM policy worker) — internal only |
| `rahma-monitoring` | Future monitoring stack (Prometheus / Loki / Grafana) |
| `rahma-security` | Future security workloads (Falco templates etc.) |

**No `rahma-web` namespace.** Rahma is mobile-only.

## Public endpoint (single)

| Host | Target service | Notes |
|---|---|---|
| `api.<final-rahma-domain>` (placeholder: `api.rahma.example`) | `rahma-api.rahma-api.svc.cluster.local:80` | the ONLY public endpoint |

No web / admin / ai public hosts exist. The mobile app talks to the API
host directly.

## Internal service DNS

| Service | DNS | Port |
|---|---|---|
| Postgres | `rahma-postgres.rahma-data.svc.cluster.local` | 5432 |
| Redis | `rahma-redis.rahma-data.svc.cluster.local` | 6379 |
| Backend API (internal) | `rahma-api.rahma-api.svc.cluster.local` | 80 → 3000 |
| AI gateway (shared, NOT touched) | `ollama.ordinox-ai.svc.cluster.local` | 11434 |

## Expected ConfigMap

| Name | Namespaces | Contents |
|---|---|---|
| `rahma-platform-config` | `rahma-api` | `APP_*`, `PUBLIC_API_URL`, feature flags |

## Expected Secret names (NEVER committed, applied via `kubectl create secret`)

| Name | Namespace | Keys |
|---|---|---|
| `rahma-api-secrets` | `rahma-api` | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SESSION_SECRET`, `SHEIKH_ALLOWED_EMAIL_HASHES`, `ADMIN_ALLOWED_EMAIL_HASHES`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SHEIKH_HASAN_EMAIL`, `SHEIKH_HASAN_PASSWORD_HASH` |
| `rahma-postgres-secret` | `rahma-data` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| `rahma-redis-secret` | `rahma-data` | `REDIS_PASSWORD` |
| `rahma-api-tls` | `rahma-api` | issued by cert-manager (operator-chosen ClusterIssuer) |
| ClusterIssuer account key | `cert-manager` | managed by cert-manager itself — **operator-owned, do not touch from this repo** |

## Container images

| Image | Source |
|---|---|
| `ghcr.io/serverax/rahmah/sakina-backend:main` | `.github/workflows/backend-image-ci.yml` on push to main |
| `postgres:16.4-alpine` | upstream |
| `redis:7.4-alpine` | upstream |

No `rahma-web` image is built or deployed. `apps/web/` exists as a
developer-only Arabic-RTL preview scaffold; it is NOT a deployed
artefact.

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
| `PUBLIC_SHEIKH_QA_ENABLED` | `true` | public read-only Q&A (served via mobile API only) |
| `LIBRARY_ENABLED` | `true` | Islamic library section |

## NEVER stored in this repo

- Real DB passwords
- Real JWT / session secrets
- Real OIDC client secrets
- Real ACME account keys
- Real email addresses for admin/sheikh
- Real kubeconfigs / SSH keys / Hetzner API tokens
- Real WhatsApp / payment provider tokens

## NEVER modified from this repo

- Traefik configuration
- cert-manager core install
- NetworkPolicy resources owned by another tenant
- Firewall / UFW / iptables rules
- SSH server configuration on any node
