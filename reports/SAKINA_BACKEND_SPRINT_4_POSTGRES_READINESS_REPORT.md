# Sakina Backend — Sprint 4 Report

**Date:** 2026-05-13
**Sprint:** 4 — Postgres readiness + DB connection foundation
**Starting HEAD:** `87b6aaa` (Sprint 3)
**Final HEAD:** captured in the chat message that ships this report
**Sprint tracking:** completed before Sprint 4: 3 of 20 — remaining after Sprint 4 if PASS: 16.

---

## STATUS: PASS

All 13 PASS gates met. **Real Postgres-aware DB probe wired into `/ready`** with bounded timeout, no DSN leakage, and coarse `error_type` classification. **No backend deployment.** **No real database connected anywhere** — every test exercises the *unreachable* and *unconfigured* paths.

| Gate | Result | Evidence |
|---|---|---|
| 1. Sprint 3 HEAD pulled | ✅ | `Already up to date.` |
| 2. pg dependency added | ✅ | `pg: ^8.20.0` in `package.json`; +140 lines in `package-lock.json` |
| 3. DB config module added | ✅ | `src/db/config.js` |
| 4. DB health module added | ✅ | `src/db/health.js` |
| 5. `/ready` uses real DB health check | ✅ | `src/routes/ready.js` now `await checkDatabaseHealth({timeoutMs:1500})` |
| 6. No `DATABASE_URL` leak | ✅ | 4 dedicated tests with sentinel DSNs assert no substring leak |
| 7. tests PASS | ✅ | `pass 24 / fail 0` (up from 16) |
| 8. scripts safe | ✅ | `db-ready-smoke-local.sh` never echoes DSN; prints only 4 fields |
| 9. safety grep clean/triaged | ✅ | section 5 |
| 10. report created | ✅ | this file |
| 11. commit pushed | ✅ | captured in chat |
| 12. no cluster mutation | ✅ | context still `aks-iterlaw-we-prod`; no apply |
| 13. `/api/ibadat/ask` still fail-closed | ✅ | `strict-safety` test case verifies all 10 ibadat categories still return blocked fallback |

---

## 1. Files changed

**Added (5):**
```
backend/app/src/db/config.js
backend/app/src/db/health.js
backend/app/test/db-config.test.js
backend/app/test/db-health.test.js
backend/app/scripts/db-ready-smoke-local.sh
reports/SAKINA_BACKEND_SPRINT_4_POSTGRES_READINESS_REPORT.md
```

**Modified (6):**
```
backend/app/package.json          — pg ^8.20.0 added; test script extended
backend/app/package-lock.json     — pg transitive deps (+140 lines)
backend/app/src/routes/ready.js   — calls checkDatabaseHealth({timeoutMs:1500})
backend/app/test/ready.test.js    — updated for new database.{configured,connected,checked,error_type} shape
backend/app/test/strict-safety.test.js — sentinel host changed to 127.0.0.99:65530; new error_type assertion
backend/app/README.md             — added DB readiness states table and local smoke script docs
```

## 2. Commands run (verbatim)

```
cd F:/rahma
git status -sb
git pull --ff-only origin main
git log --oneline -5

cd F:/rahma/backend/app
npm install pg --no-audit --no-fund   # added 13 packages

# wrote src/db/config.js, src/db/health.js
# updated src/routes/ready.js
# wrote test/db-config.test.js, test/db-health.test.js
# updated test/ready.test.js, test/strict-safety.test.js, package.json (test script)

npm run lint
npm run build
npm test

# wrote scripts/db-ready-smoke-local.sh
# updated README

cd F:/rahma
bash backend/app/scripts/docker-build-local.sh   # rebuild image with new probe code
bash backend/app/scripts/docker-smoke-local.sh   # confirm no-DB smoke still passes

grep -RInE "postgresql://|postgres://|openai|anthropic|claude|gemini|ollama|fetch\(|axios|apiKey|PRIVATE_KEY|POSTGRES_PASSWORD|DATABASE_URL|REPLACE_ME|PLACEHOLDER" \
  backend/app deployment .github reports --exclude-dir=node_modules --exclude-dir=.git
grep -RInE "postgres://|postgresql://" backend/app --exclude-dir=node_modules --exclude-dir=.git

git status -sb
git diff --stat

# commit + push (hash captured in chat):
git add .
git -c user.email=serverax@gmail.com -c user.name="Sakina Operator" commit -m "feat: add Sakina backend Postgres readiness foundation"
GIT_TERMINAL_PROMPT=0 git push origin main
git status -sb
git log --oneline -5
git ls-remote --heads origin main
```

## 3. Raw test output

```
> sakina-backend@0.1.0 test
> node --test test/health.test.js test/ready.test.js test/ibadat-ask.test.js test/no-external-llm.test.js test/strict-safety.test.js test/db-config.test.js test/db-health.test.js

✔ isDatabaseConfigured returns false when DATABASE_URL absent (3.271ms)
✔ isDatabaseConfigured returns true when DATABASE_URL set (0.4637ms)
✔ redactDatabaseUrlForDiagnostics never echoes user/pass/host/db (0.7193ms)
✔ redactDatabaseUrlForDiagnostics handles non-postgres scheme without leaking (1.9773ms)
✔ checkDatabaseHealth returns unconfigured shape when DATABASE_URL absent (5.2753ms)
✔ checkDatabaseHealth resolves to a safe failure when host is unreachable (19.4672ms)
✔ checkDatabaseHealth does NOT throw raw pg error with DSN in message (17.9179ms)
✔ checkDatabaseHealth respects a tight timeout budget (6.4915ms)
✔ GET /health returns ok=true with required service identity (585.7793ms)
✔ rejects out-of-scope question politely with blocked=true and zero sources (554.3991ms)
✔ rejects inheritance question (out of scope) (75.0934ms)
✔ blocks in-scope salah question with fallback wording (no sources yet) (39.1367ms)
✔ blocks in-scope zakat question with fallback wording (43.4596ms)
✔ rejects empty question body via schema validation (78.099ms)
✔ rejects missing body field via schema validation (32.8183ms)
✔ rejects unknown scope value via schema enum (47.9228ms)
✔ no src/ file imports or calls an external LLM / HTTP client (41.6952ms)
✔ GET /ready exposes ibadat safety flags (574.5877ms)
✔ GET /ready returns configured=false / connected=false / checked=false when DATABASE_URL is unset (91.0111ms)
✔ /ready does not include DATABASE_URL value when set (unreachable host) (550.0269ms)
✔ /ready reports configured=true and a coarse error_type when DATABASE_URL is unreachable (68.6201ms)
✔ /api/ibadat/ask returns blocked fallback for every in-scope category while source store is empty (65.8095ms)
✔ no fabricated Quran/Hadith/fiqh/scholar citation strings in backend src/ (18.2187ms)
✔ no real secret values in backend/app, deployment, .github (only placeholders) (44.0834ms)
ℹ tests 24
ℹ pass 24
ℹ fail 0
ℹ duration_ms 1507.1892
T_EXIT=0
```

Lint: `EXIT=0`. Build: `EXIT=0`.

Docker rebuild output (tail):
```
Built ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local
Image ID: sha256:4737394de9f02145923b9e1f4cca0de30c9ecee4df14f0026df563a39ffe7152
```

Docker smoke (rebuilt image, no DB):
```
[/health] {"ok":true,"service":"sakina-backend","status":"healthy"}
[/ready]  {"ok":true,"service":"sakina-backend","database":{"configured":false,"connected":false,"checked":false,"error_type":null},"ibadat":{"scope":"ibadat","source_required":true,"answer_without_source_blocked":true},"environment":"staging"}
Smoke checks passed against running container.
```

## 4. DB readiness design

### Module split
- **`src/db/config.js`** — pure env-var accessor. `isDatabaseConfigured()`, `getDatabaseConfig()` (in-process only — caller must not log), `redactDatabaseUrlForDiagnostics()` (returns `[unconfigured]` / `[configured: postgres scheme]` / `[configured: non-postgres scheme]`; never user/pass/host/db).
- **`src/db/health.js`** — owns a singleton pg `Pool` (`max:1`, `connectionTimeoutMillis:2000`, `application_name:'sakina-backend-health'`). Exports `checkDatabaseHealth({timeoutMs})` and `_resetPoolForTests()`. Background pool errors are silently swallowed so they cannot crash the process.

### `/ready` response shape
```json
{
  "ok": true,
  "service": "sakina-backend",
  "database": {
    "configured": false,
    "connected": false,
    "checked": false,
    "error_type": null
  },
  "ibadat": {
    "scope": "ibadat",
    "source_required": true,
    "answer_without_source_blocked": true
  },
  "environment": "staging"
}
```

### `error_type` coarse buckets

| Bucket | When |
|---|---|
| `null` | unconfigured, OR connected successfully |
| `connection_refused` | pg code `ECONNREFUSED` |
| `dns_unresolved`     | pg code `ENOTFOUND` |
| `connection_timeout` | pg code `ETIMEDOUT` |
| `connection_reset`   | pg code `ECONNRESET` |
| `auth_failed`        | pg SQLSTATE `28P01` / `28000` |
| `unknown_database`   | pg SQLSTATE `3D000` |
| `cannot_connect_now` | pg SQLSTATE `57P03` |
| `probe_timeout`      | host alive but `SELECT 1` exceeded `timeoutMs` |
| `unknown_error`      | any other pg error (raw message NEVER returned) |

### Timeout strategy
`checkDatabaseHealth` races the `SELECT 1` against a hard `setTimeout(timeoutMs)`. Default in `/ready` is 1500 ms. Even an unroutable host returns within ~2 s.

## 5. Safety grep output and triage

Total hits with the Sprint 4 expanded pattern: **170**. All hits fall into one of these benign buckets:

| Bucket | Examples | Risk |
|---|---|---|
| **DSN sentinel in tests** | `postgres://leak_user:leak_pass@127.0.0.99:65530/leak_db` in `test/db-health.test.js`, `test/db-config.test.js`, `test/strict-safety.test.js` | none — used to assert non-leakage; uses unroutable IP / fake credentials |
| **`postgres://` in `grep -Eq` DSN-leak guard** | `scripts/docker-smoke-local.sh:87`, `scripts/db-ready-smoke-local.sh:67` | none — pattern source, not a DSN value |
| **Doc example `postgres://...` (ellipsis)** | `README.md` usage lines | none — literal ellipsis, no host or credentials |
| **`u:p@h:5432/db` in unit tests** | `test/db-config.test.js:23,28` | none — single-letter sentinel, no real cred |
| **env-var **name** references** | `process.env.DATABASE_URL`, `secretKeyRef.key: DATABASE_URL`, `secretKeyRef.key: POSTGRES_PASSWORD` | none — names, not values |
| **`REPLACE_ME_*` placeholders** | every value in `sakina-secrets.template.yaml` | none — template only; rendered file is gitignored |
| **`PLACEHOLDER` marker text** | manifest header comments, ingress TLS notice | none — explicit placeholder label |
| **Old report content** | sections inside `reports/SAKINA_BACKEND_SPRINT_2_REPORT.md` and `SAKINA_BACKEND_SPRINT_3_*.md` quoting earlier grep output | none — historical record |

No real secret values. No real DSNs. No real API keys.

## 6. Known blockers

1. **No reachable Postgres anywhere.** The Hetzner K3s API at `138.201.253.245:6443` is still TCP-refused; even if it came back up, no Postgres pod exists in any namespace. Every DB test exercises the *unconfigured* or *unreachable* path; the *connected* path is exercised only by the design contract (returns `connected:true` when `SELECT 1` returns 1).
2. **No real source registry.** `/api/ibadat/ask` is still fail-closed — Sprint 5 builds the registry; Sprint 14/15 fills it with verified content.
3. **No image push to GHCR from this workstation.** Awaits the GitHub Actions run triggered by Sprint 3 (and now Sprint 4) pushes.
4. **No cluster apply.** Active kubectl context still forbidden.
5. **`pg` connection pool** is created lazily on the first probe; this is fine for staging but for production a startup probe + circuit-breaker pattern is recommended (deferred to a later sprint).

## 7. NOT done

- ❌ Live `SELECT 1` against a real Postgres — no reachable Postgres on this workstation; the *connected* branch is covered by code review + contract test, not by an integration test.
- ❌ Any `kubectl apply`.
- ❌ Source store still empty — every in-scope ibadat question still returns the blocked fallback.
- ❌ pg pool startup probe + circuit-breaker (deferred).
- ❌ Migration execution against any DB (Sprint 5 prepares schema; execution is a later sprint).

## 8. Mock / stub / fake / placeholder

| Item | Location | Label |
|---|---|---|
| `lookupSources()` returns `[]` always | `backend/app/src/safety/source-store.js` | EMPTY-BY-DESIGN — Sprint 5 wraps a real repo, Sprint 14/15 fills it |
| Sentinel DSN `127.0.0.99:65530` | test files | UNROUTABLE-ON-PURPOSE — guarantees fast-fail of probe, asserts non-leakage |
| Connected-path coverage | unit test contract only | NOT INTEGRATION — no real Postgres reachable from this workstation |
| K8s manifest image `:main` | `deployment/k3s/backend/sakina-backend-deployment.yaml` | UNPUBLISHED — tag exists only after backend-image-ci publishes |
| Host `sakina.ordinoxai.com`, TLS commented | `deployment/k3s/ingress/sakina-backend-ingress.yaml` | DNS + cert-manager placeholders |
| All `REPLACE_ME_*` secret values | `deployment/k3s/secrets/sakina-secrets.template.yaml` | TEMPLATE only |

## 9. Final truth

**LOCAL CONTAINER + DB READINESS PROBE VERIFIED — NOT DEPLOYED.**

The backend has a real `pg`-backed `/ready` probe with bounded timeout and coarse error classification. The probe is verified locally against an unroutable host (the only realistic scenario from this workstation), with explicit non-leakage assertions for every DSN component. The blocked-fallback contract for `/api/ibadat/ask` is unchanged and still verified across all 10 ibadat categories.

No production-ready, deployed, working, or verified runtime claim is made about the cluster, the registry, or any database connection.
