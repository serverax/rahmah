# Sprint 63 — DB Migration Dry-Run + Seed Discipline

**Date:** 2026-05-14

## What ships

- `scripts/db/run-seeds.js` — seed runner. Refuses placeholder DSN. Refuses destructive SQL before any DB write. Supports `--dry-run`.
- `backend/db/seeds/README.md` + `backend/db/seeds/001_system_roles.sql`.
- `backend/app/package.json` — new `db:seed` script.
- `deployment/k3s/jobs/rahma-db-seed-job.yaml.template` — operator-applied Job template.
- `docs/infra/RAHMA_DB_SEED_RUNBOOK.md`.

Existing migration runner from Sprint 53 already supports refusal of
placeholder DSNs + dry-run via the surrounding tooling; this sprint
adds the **seed** side of the same workflow.

## Local refusal proofs

```
$ cd backend/app && npm run db:seed
[seeds] DATABASE_URL not set — refusing to run.

$ DATABASE_URL=postgres://CHANGE_ME npm run db:seed
[seeds] DATABASE_URL appears to be a placeholder — refusing to run.
```

## Live execution: **OPERATOR-PENDING**

No DATABASE_URL on this workstation. Operator runs `db:seed` via the
Job template on master-of-brains.

## Honesty record

- The seed runner scans EVERY `.sql` file under `backend/db/seeds/` for
  destructive SQL (`DROP TABLE|DATABASE|SCHEMA`, `TRUNCATE`,
  `DELETE FROM`) BEFORE opening a DB connection. Drops the connection
  attempt entirely if any file matches.
- The seed runner NEVER echoes the DSN.
- The only seed shipped is the role catalogue. No fake users, no fake
  religious content, no fake donations.
