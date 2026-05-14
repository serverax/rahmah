# Rahma — Live DB Migration Operator Runbook

**Audience:** operator on master-of-brains.

## Two paths

| Path | When | How |
|---|---|---|
| **Job-based (recommended)** | normal cluster ops | `bash deployment/k3s/scripts/run-rahma-db-migrations-job.sh --confirm-run-migrations` |
| **Port-forward + local runner** | debugging or first-time bootstrap | port-forward to rahma-postgres + run `npm run db:migrate` locally (see RAHMA_DB_MIGRATION_RUNBOOK.md) |

## Job-based runbook

### Pre-flight

```bash
# 1. Confirm Rahma-safe kubectl context.
kubectl config current-context

# 2. Confirm rahma-api-secrets exist (DATABASE_URL is read from it).
kubectl -n rahma-api get secret rahma-api-secrets

# 3. Confirm pending migrations are what you expect.
#    (Run this from a workstation with kubectl + port-forward, OR rely on
#     the Job's stdout — it lists applied vs pending before applying.)
ls backend/db/migrations
```

### Dry-run (render-only)

```bash
bash deployment/k3s/scripts/run-rahma-db-migrations-job.sh --dry-run
# Prints the rendered Job manifest to stdout. Does not call kubectl apply.
```

### Live run

```bash
bash deployment/k3s/scripts/run-rahma-db-migrations-job.sh \
  --confirm-run-migrations \
  --image ghcr.io/serverax/rahmah/rahma-api:latest
```

The script:

1. Refuses without `--confirm-run-migrations` (foot-gun guard).
2. Refuses if `rahma-api-secrets` is missing.
3. Refuses a forbidden kubectl context.
4. Applies a one-shot Job named `rahma-db-migrate-<UTC>`.
5. Waits up to 300s for completion (`kubectl wait --for=condition=complete`).
6. Prints the last 200 lines of the Job's logs (the runner is hardened — no DSN echoed).
7. Deletes the Job (or keeps it with `--keep`).

### Verify

```bash
# Inside the cluster (single-shot pod):
kubectl -n rahma-data port-forward svc/rahma-postgres 15432:5432 &
DB_USER=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_USER}'      | base64 -d)
DB_PW=$(kubectl   -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_PASSWORD}'  | base64 -d)
DB_NAME=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_DB}'        | base64 -d)
export DATABASE_URL="postgres://${DB_USER}:${DB_PW}@127.0.0.1:15432/${DB_NAME}?sslmode=disable"
( cd backend/app && npm run db:status )
unset DATABASE_URL DB_USER DB_PW DB_NAME
kill %1
```

`db:status` must show all migrations (001..012 today, more as they
ship) under `applied: [...]` and `pending: []`.

### Honesty record

After a successful run, operator captures the Job's stdout into
`reports/RAHMA_DB_MIGRATIONS_APPLIED_<date>.md`. Until that report
exists in the repo, the "migrations applied" claim is NOT made
anywhere else.

## What the runner refuses

- Live run without `--confirm-run-migrations`.
- Missing `rahma-api-secrets`.
- Forbidden kubectl context.
- Migration file whose sha-256 differs from the applied row's hash
  (drift) — operator authors a new migration; never edits applied rows.

## What the runner NEVER does

- Echoes DSN / passwords / token contents.
- Runs `DROP DATABASE` / `DROP SCHEMA` / `TRUNCATE`.
- Touches firewall / Traefik / cert-manager / NetworkPolicy / SSH.
