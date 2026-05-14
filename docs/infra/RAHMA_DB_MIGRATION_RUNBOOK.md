# Rahma — DB Migration Runbook

**Date:** 2026-05-14
**Audience:** operator on master-of-brains (or a workstation with kubectl access).

## Migrations on disk

```bash
ls backend/db/migrations
# Expected: 001..011 .sql files (additive, idempotent).
```

The runner script lives at `scripts/db/run-migrations.js`. It applies
every `.sql` under `backend/db/migrations/` in lexical order, records
the sha-256 in `schema_migrations`, and refuses to re-apply if a row
already exists with the same name (idempotent).

## Refusal contract

The runner exits non-zero **without touching the DB** when:

- `DATABASE_URL` is unset.
- `DATABASE_URL` contains `CHANGE_ME` / `REPLACE_ME` / `PLACEHOLDER`.
- A migration file's sha-256 differs from a row already in
  `schema_migrations` (drift) — operator must investigate before
  re-applying.
- A migration fails — the transaction is rolled back; the runner exits
  with the redacted error.

The runner NEVER prints `DATABASE_URL`.

## Apply

```bash
# 1. Connect to the cluster Postgres via port-forward.
kubectl -n rahma-data port-forward svc/rahma-postgres 15432:5432 &

# 2. Build a local DSN from the cluster secret (NEVER paste it into shell history).
DB_USER=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_USER}'      | base64 -d)
DB_PW=$(kubectl   -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_PASSWORD}'  | base64 -d)
DB_NAME=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_DB}'        | base64 -d)

export DATABASE_URL="postgres://${DB_USER}:${DB_PW}@127.0.0.1:15432/${DB_NAME}?sslmode=disable"

# 3. Pre-flight status — confirm what is applied vs pending.
( cd backend/app && npm run db:status )

# 4. Run migrations.
( cd backend/app && npm run db:migrate )

# 5. Re-run status.
( cd backend/app && npm run db:status )

# 6. Clean up.
unset DATABASE_URL DB_USER DB_PW DB_NAME
kill %1
```

## Honesty record

After a successful run, capture the runner's stdout into
`reports/RAHMA_DB_MIGRATIONS_APPLIED_<date>.md` with:

- list of `applied` migrations (from `db:status` after run),
- timestamp,
- cluster context name (must NOT match the forbidden regex).

Until that report exists, **migrations are NOT claimed applied** in any
other doc.

## Drift recovery

If `db:status` reports any filename under `drift`:

1. STOP. Do not re-apply.
2. Inspect the SQL file vs the production migration. If the file was
   edited post-deploy, the safe path is a NEW migration file
   (`NNN_fixup_xyz.sql`) — never edit the existing one.
3. If the production migration was applied incorrectly and must be
   superseded, the operator authors a forward-only fix migration.
   Migrations are **append-only**.

## Rollback policy

There is no automated rollback. Migrations are append-only:

- For schema regret, ship a new migration that reverses the change.
- The runner refuses any SQL containing `DROP DATABASE`, `DROP SCHEMA`,
  or `TRUNCATE` patterns via the standard reviewer-side guard, not via
  this runner. Operator due diligence on the SQL file is required.

## What this runner NEVER does

- Reads or writes config outside `backend/db/migrations/`.
- Drops tables / databases.
- Truncates rows.
- Echoes the DSN, passwords, or query payloads.
- Auto-creates roles or extensions other than `pgcrypto` (already in
  the migration files).
- Runs migrations in parallel (single-stream by design).
