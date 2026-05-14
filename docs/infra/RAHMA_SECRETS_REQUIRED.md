# Rahma — Required Secrets (Names Only)

**Date:** 2026-05-14
**Scope:** Mobile-app-only Rahma. Internal-only services.

This file lists the secret **names and keys** the cluster needs. It
NEVER contains values. All values are operator-supplied at
`kubectl create secret` time. The repo only carries `.template.yaml`
files with `REPLACE_ME` placeholders.

## Cluster secrets

| Namespace | Secret name | Keys |
|---|---|---|
| `rahma-data` | `rahma-postgres-secret` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| `rahma-data` | `rahma-redis-secret` | `REDIS_PASSWORD` |
| `rahma-api` | `rahma-api-secrets` | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SHEIKH_HASAN_EMAIL`, `SHEIKH_HASAN_PASSWORD_HASH`, `SHEIKH_ALLOWED_EMAIL_HASHES`, `ADMIN_ALLOWED_EMAIL_HASHES` |
| `rahma-api` (later) | `rahma-oidc-secret` | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` |
| `cert-manager` (operator-owned) | `letsencrypt-prod-account-key` | managed by cert-manager itself |
| `rahma-api` (later, when ingress applied) | `rahma-api-tls` | issued by cert-manager |

## Operator workflow (per secret)

```bash
kubectl -n <ns> create secret generic <name> \
  --from-literal=KEY1="$(openssl rand -base64 24)" \
  --from-literal=KEY2="$(openssl rand -base64 24)" \
  ...
```

For email-hash allow-lists:

```bash
echo -n "sheikh.hasan@example.org" | tr 'A-Z' 'a-z' | sha256sum | awk '{print $1}'
```

The output is a 64-char hex string. Join multiple hashes with `,`.

## What this repo NEVER contains

- Real DB passwords
- Real Redis passwords
- Real JWT / session secrets
- Real OIDC client secrets
- Real ACME account keys
- Real admin / sheikh email addresses
- Real Hetzner / cloud tokens

The CI workflow `rahma-security-scan` enforces this on every push.
