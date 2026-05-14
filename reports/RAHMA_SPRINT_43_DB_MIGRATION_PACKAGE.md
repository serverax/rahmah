# Sprint 43 — DB Migration Package

**Date:** 2026-05-14
**Status:** code shipped; **live migration execution is OPERATOR-PENDING** (no real `DATABASE_URL` available on this workstation).

## What this sprint delivers

- `scripts/db/run-migrations.js` — already existed; **hardened** to refuse `CHANGE_ME` / `REPLACE_ME` / `PLACEHOLDER` DSNs.
- `scripts/db/db-status.js` — NEW: lists applied / pending / drift / missing_files in a single JSON line. Never echoes the DSN.
- `backend/app/package.json` — new npm script `db:status`.
- `docs/infra/RAHMA_DB_MIGRATION_RUNBOOK.md` — exact operator command sequence.
- This report.

## Migrations on disk

| File | Provides |
|---|---|
| `001_sakina_foundation.sql` | base tables (users, prayer_times, etc.) |
| `002_verified_islamic_sources.sql` | first source registry |
| `003_ask_sheikh_hasan_public_qa.sql` | sheikh users, profiles, questions, answers, citations, public Q&A, audit log |
| `004_islamic_rag_foundation.sql` | islamic source registry + documents + chunks + ingestion jobs |
| `005_family_child_safety.sql` | family + child safety |
| `006_charity_campaigns.sql` | sadaqah campaigns |
| `007_privacy_requests.sql` | privacy_requests |
| `008_rahma_infra_alignment.sql` | audit_events + children_game_progress |
| `009_rahma_wasm_audit.sql` | wasm_*_audit (4 tables) |
| `010_rahma_mobile_alignment.sql` | mobile_sessions, device_registrations, push_notification_tokens, donation_intents, donation_audit |
| `011_rahma_roles_and_game_events.sql` | roles, user_roles, children_game_profiles, children_game_events |

## Local checks (no DB required)

```bash
$ cd backend/app && npm run db:status
{"configured":false,"reachable":false,"migrations_table_exists":false,"applied":[],"pending":[],"drift":[],"missing_files":[]}

$ node ../../scripts/db/run-migrations.js
[migrations] DATABASE_URL not set — refusing to run.

$ DATABASE_URL=postgres://CHANGE_ME node ../../scripts/db/run-migrations.js
[migrations] DATABASE_URL appears to be a placeholder — refusing to run.
```

All three printouts are captured directly from the test runs — no
fabricated output.

## What runs in CI

`rahma-backend-ci` runs `npm test` which includes the migration shape
tests (`migrations.test.js`, `ready-blockers.test.js`, `db-tooling.test.js`,
`sprint-31-db-foundation.test.js`). No live DB is used.

## Operator execution plan

See `docs/infra/RAHMA_DB_MIGRATION_RUNBOOK.md` for the canonical
command sequence (port-forward → set `DATABASE_URL` from secret → run
`npm run db:status` then `npm run db:migrate` → re-status).

After execution the operator (or assistant on a Rahma-safe context)
writes `reports/RAHMA_DB_MIGRATIONS_APPLIED_<date>.md` with:

- the list of newly applied migrations,
- the captured stdout from `db:status` after the run,
- the cluster context name (must NOT match the forbidden regex),
- timestamp.

## Final status: PARTIAL

Live execution = **OPERATOR-PENDING**. Code path is complete and
exercised by tests + local refusal checks.
