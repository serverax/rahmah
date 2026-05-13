# Sakina Sprint 8 — Redis / Cache / Performance Layer

**Generated:** 2026-05-13
**Project:** Rahma/Sakina (`F:/rahma`, `serverax/rahmah`, branch `main`)
**Author:** Claude Code (evidence-only mode)
**Scope:** Rahma/Sakina only. IterLaw / RightsNow / OrdinoxAI / Alaa NOT touched.

## STATUS: PASS — cache foundation. **Redis is NOT deployed and not connected.**

The backend now has a cache abstraction with a safe in-memory backend, strict cache-policy guards, and a `/ready.cache` block. **No Redis client package is installed; even with `REDIS_URL` set, the cache reports `mode: "memory"` and the URL value is never echoed.** This sprint adds 28 cache tests; total backend test count is 131/131 green.

## Files added / modified

**Created:**

```
docs/architecture/SAKINA_CACHE_AND_PERFORMANCE_ARCHITECTURE.md
backend/app/src/cache/memory-cache.js
backend/app/src/cache/cache-policy.js
backend/app/src/cache/index.js
backend/app/test/cache.test.js
reports/SAKINA_SPRINT_8_REDIS_CACHE_PERFORMANCE_REPORT.md   (this file)
```

**Modified:**

```
backend/app/src/app.js                        (no change required — routes already registered)
backend/app/src/routes/public-qa.js           (cache wrappers on /qa and /qa/:slug)
backend/app/src/routes/ask-sheikh-hasan.js    (cache wrapper on /questions/:id/status)
backend/app/src/routes/ready.js               (adds cache block via cacheStatusForReady)
backend/app/package.json                      (test runner picks up test/cache.test.js)
```

## Cache design

- **Modes:** `memory` (today, always available), `redis` (future — when a real Redis client lands).
- **Namespaces:** `sakina:public_qa:list:<lang>:<cat>`, `sakina:public_qa:detail:<slug>`, `sakina:question_status:<id>`, `sakina:ready:health`.
- **TTLs:** list 60s, detail 120s, status 15s (defaults; per-call override allowed).
- **Eviction:** insertion-ordered LRU at hard cap (default 2000 entries).
- **Policy module (`cache-policy.js`):**
  - `isAllowedKey` — key must match `^[a-z0-9:_-]{1,128}$` AND start with one of the 4 allowed namespace prefixes.
  - `isCacheableValue` — object must not contain any forbidden field name (`email_hash`, `phone`, `password`, `token`, `database_url`, `redis_url`, `question_text`, `user_id`, `sheikh_user_id`, `assigned_sheikh_id`, …) at shallow OR 1-level-deep.
  - `isCacheablePublicQARow` — row must have at least one citation with a recognised `citation_type` AND a non-empty `citation_label`.
  - `isCacheablePublicQAListEntry` — entry must have `slug`, `title`, `language`.
  - `isCacheableQuestionStatus` — projection must contain ONLY `question_id`, `status`, `language`, `category`, `created_at`, `updated_at`.

Every write goes through these gates; a failed gate is a silent no-op (no exception, no log of the value).

## Route integration

- `GET /api/public/sheikh-hasan/qa` — caches the list result when every entry passes `isCacheablePublicQAListEntry`. Response shape adds `cached: boolean`.
- `GET /api/public/sheikh-hasan/qa/:slug` — caches the projected detail row only when it carries at least one citation. Response shape adds `cached: boolean`.
- `GET /api/sheikh-hasan/questions/:id/status` — caches the coarse projection only.

Uncited answers reach the user (still a 200 response), but they are **never written into the cache**. Tests assert both directions: the response is correct AND the cache is empty.

## /ready cache block

```json
"cache": {
  "configured": true,
  "mode": "memory",
  "redis_url_configured": false,
  "external_network_required": false,
  "safe_fallback_enabled": true
}
```

`redis_url_configured` flips to `true` if the operator sets `REDIS_URL`, but `mode` remains `memory` and the URL value is never echoed. A dedicated test sets `REDIS_URL=redis://leak_user:leak_pass@127.0.0.99:6379/0`, calls `/ready`, and asserts none of the substrings appears anywhere in the body.

## Test output (raw tail)

```
$ cd F:/rahma/backend/app && npm run lint
> sakina-backend@0.1.0 lint
> eslint src test
[clean]

$ npm run build
> sakina-backend@0.1.0 build
> node --check src/index.js && node --check src/app.js
[ok]

$ npm test
...
ℹ tests 131
ℹ suites 0
ℹ pass 131
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2207.1207
```

28 new cache tests added; nothing previously passing broke.

## Security scan

- Cache module: no `fetch(`, no `axios`, no `openai`/`anthropic`/`gemini`/`ollama` substrings — verified by the existing `test/no-external-llm.test.js` which scanned the new `src/cache/` files.
- `REDIS_URL` value never appears in `/ready` (asserted by `cache.test.js`).
- No real secret committed: `test/strict-safety.test.js` still passes.
- No phone number / WhatsApp token / private key shapes introduced.

## What is real

- In-process memory cache with TTL + bounded size + best-effort fail-safe semantics.
- Strict per-namespace key validation.
- Per-shape value validation (public Q&A row, list entry, status projection).
- Cache wrapper on three public-facing read endpoints.
- `/ready.cache` block with honest mode reporting.
- 28 dedicated tests.

## What is placeholder

- Redis adapter. No `redis` / `ioredis` package in `package.json`. Even with `REDIS_URL` set, the active mode is `memory`. This is by design — adding a network client is a separate sprint with explicit operator approval.
- Cache invalidation hooks for moderator publish / hide. TTLs handle eventual consistency in Sprint 8; explicit `cache.del` calls land when the moderator persist path ships in Sprint 9.

## Remaining work

- Add a Redis client to dependencies (Sprint 8 follow-on, requires operator approval).
- Wire `cache.del` on moderator publish/hide once those routes persist (Sprint 9).
- Deploy Redis to a real K3s `sakina-data` namespace (Sprint 13).
- Add `cache_hit_rate` to `/ready` once a real adapter ships (Sprint 19 monitoring).

## Runtime truth

- K3s deployed: **NO**
- Cluster mutated: **NO** (kubectl context still `aks-iterlaw-we-prod`; read-only ops only)
- Backend running: **NO** (no pod, no local long-lived process)
- Postgres running: **NO**
- Redis running: **NO**
- External LLM added: **NO**
- External HTTP added: **NO**
