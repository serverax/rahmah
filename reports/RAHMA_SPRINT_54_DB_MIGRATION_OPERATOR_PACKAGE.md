# Sprint 54 — Live DB Migration Operator Package

**Date:** 2026-05-14

## What ships

- `deployment/k3s/jobs/rahma-db-migrate-job.yaml.template` — one-shot Job manifest with `REPLACE_ME_JOB_NAME` + `REPLACE_ME_IMAGE` placeholders.
- `deployment/k3s/scripts/run-rahma-db-migrations-job.sh` — renders the template, applies the Job, waits for completion, prints logs, deletes the Job.
- `docs/infra/RAHMA_LIVE_DB_MIGRATION_OPERATOR_RUNBOOK.md` — operator runbook.

## Safety properties

- Live run REQUIRES `--confirm-run-migrations` flag (foot-gun guard).
- Refuses forbidden kubectl contexts.
- Refuses without `rahma-api-secrets` Secret present.
- Image defaults to `ghcr.io/serverax/rahmah/rahma-api:latest`.
- Runner inside the Job reads `DATABASE_URL` from the Secret; never echoes it.
- Runner refuses placeholder DSN (`CHANGE_ME` / `REPLACE_ME` / `PLACEHOLDER`).
- Dry-run mode renders the manifest only; no kubectl call.

## Local dry-run output (this workstation)

```
# (first 24 lines of rendered template shown earlier)
apiVersion: batch/v1
kind: Job
metadata:
  name: rahma-db-migrate-<UTC>
  namespace: rahma-api
  ...
```

## Live execution status: **OPERATOR-PENDING**

No DATABASE_URL on this workstation. No Rahma-safe kubectl context.
Operator runs the live job on `master-of-brains`.

## Honesty record

After a successful run, operator writes
`reports/RAHMA_DB_MIGRATIONS_APPLIED_<date>.md`. Until then, no
"migrations applied" claim is made.
