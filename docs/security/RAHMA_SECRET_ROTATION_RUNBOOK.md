# Rahma — Secret Rotation Runbook

**Date:** 2026-05-14
**Audience:** operator.

## What rotates and when

| Secret | Default cadence | Trigger |
|---|---|---|
| `rahma-api-secrets.JWT_SECRET` | every 90 days | calendar OR suspicion of leak |
| `rahma-api-secrets.SESSION_SECRET` | every 90 days | calendar OR suspicion of leak |
| `rahma-api-secrets.API_SIGNING_SECRET` | every 90 days | calendar OR client rotation |
| `rahma-api-secrets.MOBILE_APP_SHARED_SECRET` | every 6 months | calendar OR mobile build refresh |
| `rahma-postgres-secret.POSTGRES_PASSWORD` | every 6 months | calendar OR escalation |
| `rahma-redis-secret.REDIS_PASSWORD` | every 6 months | calendar OR escalation |
| `rahma-api-secrets.ADMIN_*` / `SHEIKH_HASAN_*` | immediately on staff change | personnel rotation |

## Rotation procedure (single secret family)

```bash
# 1. Export new values into the current shell.
#    DO NOT write them to disk. DO NOT paste them into shared chat.
export RAHMA_JWT_SECRET="$(openssl rand -base64 48)"
export RAHMA_API_SIGNING_SECRET="$(openssl rand -base64 48)"
# ... etc.

# 2. Dry-run shape-check.
bash deployment/k3s/scripts/create-rahma-secrets-from-env.sh --dry-run

# 3. Live update.
bash deployment/k3s/scripts/create-rahma-secrets-from-env.sh

# 4. Roll the API so the new env values are in-process.
kubectl -n rahma-api rollout restart deployment/rahma-api
kubectl -n rahma-api rollout status deployment/rahma-api --timeout=120s

# 5. Verify the API is healthy with the new env.
kubectl -n rahma-api run rahma-probe --rm -i --restart=Never \
  --image=alpine/curl:8.10.1 -- \
  curl -sS -m 5 http://rahma-api.rahma-api.svc.cluster.local/ready | head -c 800

# 6. CLEAR the env variables from the current shell.
unset RAHMA_JWT_SECRET RAHMA_API_SIGNING_SECRET
```

## Rotation procedure (Postgres password)

```bash
# 1. New password into env.
export RAHMA_POSTGRES_PASSWORD="$(openssl rand -base64 32)"
export RAHMA_POSTGRES_DB="rahma"
export RAHMA_POSTGRES_USER="rahma_app"

# 2. Update the SQL-side password FIRST (so the new password is valid in pg).
kubectl -n rahma-data exec -it rahma-postgres-0 -- \
  psql -U "$RAHMA_POSTGRES_USER" -d "$RAHMA_POSTGRES_DB" -c \
  "ALTER USER \"$RAHMA_POSTGRES_USER\" WITH PASSWORD '$RAHMA_POSTGRES_PASSWORD';"
# (psql expansion shows the password to the local shell; it is NOT echoed
#  by the script. Use `\set HISTFILE /dev/null` first if you are paranoid.)

# 3. Update the Secret + the DATABASE_URL that depends on it.
export RAHMA_DATABASE_URL="postgres://${RAHMA_POSTGRES_USER}:${RAHMA_POSTGRES_PASSWORD}@rahma-postgres.rahma-data.svc.cluster.local:5432/${RAHMA_POSTGRES_DB}?sslmode=disable"

bash deployment/k3s/scripts/create-rahma-secrets-from-env.sh

# 4. Roll the API to pick up the new DATABASE_URL.
kubectl -n rahma-api rollout restart deployment/rahma-api

# 5. Unset.
unset RAHMA_POSTGRES_PASSWORD RAHMA_POSTGRES_DB RAHMA_POSTGRES_USER RAHMA_DATABASE_URL
```

## Hard rules

- NEVER write secret values to a file in the repo.
- NEVER paste secret values into chat / pastebin / ticket / commit message.
- NEVER use a placeholder (`CHANGE_ME`, `REPLACE_ME`, `PLACEHOLDER`) as a value. The script refuses these.
- NEVER share `MOBILE_APP_SHARED_SECRET` outside the mobile-build CI environment.
- NEVER skip the API rollout after a rotation.
- NEVER store rotation values in shell history beyond the rotation window — `unset` them as soon as the secret is applied.

## What this runbook does NOT do

- Rotate Traefik certificates (operator + cert-manager own those).
- Rotate Hetzner API tokens (operator + cloud provider own those).
- Rotate GitHub PATs (CI / operator own those).
