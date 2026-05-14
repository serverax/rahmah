# Rahma — Database Seeds

This directory holds SAFE non-religious seeds the operator may apply to a
fresh Rahma Postgres after migrations have run.

## What is allowed

- System roles (`roles` table) — fixed catalogue.
- System flags / feature toggles that have a single canonical value.
- Operator-defined license-id rows pointing to license files under
  `data/islamic-sources/licenses/`.

## What is NEVER allowed

- Fake users.
- Fake Sheikh / admin profiles.
- Fake Quran / Hadith / Dua content.
- Fake donations / payment intents.
- Fake content review queue entries.
- Any row in `islamic_source_*` tables with `verification_status = 'approved'`.

## File naming

`NNN_short_description.sql` where `NNN` is the next sequential prefix.
Seeds run in lexical order. Each file should:

- be idempotent (`ON CONFLICT (...) DO NOTHING` or upsert).
- contain only `INSERT` statements (never `DELETE`, `DROP`, `TRUNCATE`).
- be operator-reviewed before being checked in.

## Apply

```bash
( cd backend/app && npm run db:seed )
```

The runner refuses to apply if `DATABASE_URL` is missing or contains a
placeholder string.
