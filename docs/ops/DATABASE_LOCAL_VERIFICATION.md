# Database — Local Verification

How to run a real Postgres locally for the Rahma backend and verify migrations + health. **Do NOT point this at a production database.**

## 1. Start local Postgres (one-time)

Set a password in your shell, then bring the container up:

```
cd deployment/local
POSTGRES_PASSWORD="$(openssl rand -base64 32)" \
  docker compose -f docker-compose.postgres.yml up -d
```

The container listens on `127.0.0.1:5433` so it does not clash with any local Postgres.

If Docker daemon is not running, this step is **BLOCKED — DOCKER NOT RUNNING**. Start Docker Desktop (or your daemon of choice) first.

## 2. Export DATABASE_URL

```
export DATABASE_URL="postgresql://rahma_user:${POSTGRES_PASSWORD}@127.0.0.1:5433/rahma"
```

Do **not** put real passwords in a tracked `.env` file. The `.env.example` in the repo carries `CHANGE_ME` placeholders only.

## 3. Run migrations

```
cd backend/app
npm run db:migrate
```

The runner refuses to start without `DATABASE_URL`. It applies every `*.sql` file under `backend/db/migrations/` in lexical order. Each file's content is hashed; re-applying an already-applied file with different content is detected as **DRIFT** and refused.

Expected summary on success:

```
[migrations] applied 001_sakina_foundation.sql
[migrations] applied 002_verified_islamic_sources.sql
[migrations] applied 003_ask_sheikh_hasan_public_qa.sql
[migrations] applied 004_islamic_rag_foundation.sql
[migrations] applied 005_family_child_safety.sql
[migrations] applied 006_charity_campaigns.sql
[migrations] applied 007_privacy_requests.sql
[migrations] summary:
  total:   7
  applied: 7
  skipped: 0
  errors:  0
```

The runner never echoes `DATABASE_URL`. Errors are printed as `redacted` — diagnose with `psql` separately.

## 4. Health probe

```
npm run db:check
```

Prints a single JSON line, for example:

```
{"configured":true,"reachable":true,"migrations_table_exists":true,"applied_migrations_count":7,"public_safe_status":"reachable_with_migrations"}
```

The script never echoes `DATABASE_URL`.

## 5. Backend `/api/db/status` and `/ready`

Start the backend pointed at the same DB:

```
DATABASE_URL=... npm start
```

Then probe:

```
curl -sS http://127.0.0.1:3000/api/db/status
curl -sS http://127.0.0.1:3000/ready
```

`/api/db/status` returns the same shape as `db:check` plus `last_error_redacted`. `/ready` continues to surface `database.configured`, `database.connected`, and the higher-level subsystem blocks.

Neither endpoint contains `DATABASE_URL` substrings. Tests assert this explicitly.

## 6. Reset the dev DB (destructive — local only)

```
cd deployment/local
docker compose -f docker-compose.postgres.yml down -v
```

The `-v` drops the volume. Bring it back up to start from an empty DB.

**Never run this against a remote / production DB.**

## 7. Common situations

- `[migrations] DATABASE_URL not set — refusing to run.` → step 2 was skipped.
- `[migrations] DRIFT: <file> applied with different content hash` → you edited a migration that was already applied. Revert the file, or apply a new follow-on migration that supersedes the change.
- `[db-status] configured:true reachable:false` → the env is set but the network is not. Check the container is running (`docker ps`), the port is bound, and the password matches.
- `applied_migrations_count: 0` after a successful migrate → you reset the volume between migrate and check. Re-run migrate.

## 8. Honest rules

- This document covers **local** verification only.
- Real production deployment is operator-driven against a Sakina-safe K3s cluster (separate runbook).
- Do not use any cluster matching `aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty`.
- No test data shipped here represents real religious content. Verified Islamic content seeding is a separate (licensing-reviewed) sprint.
