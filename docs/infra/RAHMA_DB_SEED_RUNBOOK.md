# Rahma — DB Seed Runbook

**Date:** 2026-05-14

## What seeds are allowed

See `backend/db/seeds/README.md`. Today the only seed is:

- `001_system_roles.sql` — the canonical role catalogue (mirrors `backend/app/src/auth/roles.js`).

NEVER:
- Fake users / Sheikh profiles.
- Religious content (Quran / Hadith / Dua text).
- Donation rows.
- Approved Islamic source rows (those must go through the operator-side
  approval flow).

## Apply locally (port-forward path)

```bash
kubectl -n rahma-data port-forward svc/rahma-postgres 15432:5432 &
DB_USER=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_USER}'     | base64 -d)
DB_PW=$(kubectl   -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d)
DB_NAME=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_DB}'        | base64 -d)
export DATABASE_URL="postgres://${DB_USER}:${DB_PW}@127.0.0.1:15432/${DB_NAME}?sslmode=disable"

# Migration runner first; seeds run on a migrated schema.
( cd backend/app && npm run db:migrate )

# Dry-run scans seed files for destructive SQL; no DB writes.
( cd backend/app && npm run db:seed -- --dry-run )

# Apply.
( cd backend/app && npm run db:seed )

unset DATABASE_URL DB_USER DB_PW DB_NAME
kill %1
```

## Apply via cluster Job (recommended for production)

```bash
# Render the template and apply.
JOB_NAME="rahma-db-seed-$(date -u +%Y%m%d-%H%M%S)"
sed -e "s|REPLACE_ME_JOB_NAME|$JOB_NAME|" \
    -e "s|REPLACE_ME_IMAGE|ghcr.io/serverax/rahmah/rahma-api:latest|" \
    deployment/k3s/jobs/rahma-db-seed-job.yaml.template \
  | kubectl apply -f -
kubectl -n rahma-api wait --for=condition=complete --timeout=120s job/$JOB_NAME
kubectl -n rahma-api logs job/$JOB_NAME --tail=200
kubectl -n rahma-api delete job $JOB_NAME --ignore-not-found
```

## Refusal contract

`run-seeds.js` refuses to run when:

- `DATABASE_URL` is unset.
- `DATABASE_URL` contains `CHANGE_ME` / `REPLACE_ME` / `PLACEHOLDER`.
- ANY `.sql` file in `backend/db/seeds/` contains a destructive
  statement: `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`,
  or `DELETE FROM`. The check runs BEFORE any DB write.

The runner NEVER echoes the DSN.

## Honesty record

After a successful seed run, capture the runner's stdout into
`reports/RAHMA_DB_SEEDS_APPLIED_<date>.md`. Until that report exists,
the "seeds applied" claim is NOT made anywhere else.
