# Sakina — Cache & Performance Architecture

Sprint 8 deliverable. Scope: Rahma/Sakina only. This document defines what the Sakina backend caches, what it must never cache, and how the cache behaves when Redis is unavailable.

## Goals

- Reduce read load on Postgres for the **public** Q&A surface and the readiness probe.
- Stay correct and **fail-safe** when Redis is not available — never crash on a cache miss or a Redis outage.
- Never cache anything that would weaken the religious-safety contract or expose a private user.

## What gets cached

| Namespace | Use | TTL | Source of truth |
|---|---|---|---|
| `sakina:public_qa:list:<lang>:<cat>` | List of live public Q&A entries | 60s | `sakina_public_qa` (only `is_live = TRUE`) |
| `sakina:public_qa:detail:<slug>` | Single live Q&A with citations | 120s | Same, joined with answer + citations |
| `sakina:question_status:<id>` | Coarse status projection only | 15s | `sakina_user_questions` projection |
| `sakina:ready:health` | Tiny readiness snapshot | 5s | `/ready` upstream probes (used to smooth bursts) |

Keys are namespaced with the `sakina:` prefix. Other applications sharing a Redis instance see only Sakina's prefix.

## What must NEVER be cached

- User email, email hash, or any string that could re-identify a user.
- Phone numbers, WhatsApp recipient IDs, or any provider tokens.
- JWTs, session IDs, OAuth state tokens, or any auth header content.
- DSN strings, `DATABASE_URL`, `REDIS_URL`, or anything that resembles a credential.
- **Uncited Sheikh answers.** A public Q&A row without at least one citation MUST NOT be cached and MUST NOT be returned by the public route.
- **Pending, rejected, draft, private, or moderation-required answers.** Only `publication_status = published_public` AND `is_live = TRUE` may be cached.
- Internal moderator notes, audit log entries, internal IDs that have not been projected for public consumption.
- Raw question text (only the projected status fields, never `question_text` or `question_hash`).

## Cache modes

The cache module supports two modes:

- **`memory`** — in-process LRU map. Always available. Default when `REDIS_URL` is unset.
- **`redis`** — declared mode when the operator wires a real Redis client (future sprint). Today the actual Redis adapter is **not yet implemented**. Even with `REDIS_URL` set, the backend will report `mode: memory` and `redis_url_configured: true` until the Redis client is added.

When the Redis adapter ships:

- The backend tries Redis first.
- On any error (connection refused, timeout, parse error), the call **silently falls back to memory mode for that one operation** — the backend never crashes, never logs the URL, never echoes the error verbatim. A coarse `redis_error_type` is recorded for `/ready`.

## Cache invalidation

- Public Q&A list/detail are invalidated when:
  - A new public Q&A row is published (moderator approves a citation-valid answer).
  - A moderator hides / unpublishes an entry.
  - A content report is actioned (`hide`).
- Question status is invalidated when:
  - The question status enum transitions.
  - The assigned sheikh changes.

For Sprint 8 the cache uses **short TTLs** as the primary invalidation mechanism (60–120 s). Explicit invalidation hooks are added in Sprint 9 when persistence end-to-end is wired.

## Cache surface (API)

```js
// backend/app/src/cache/index.js
const cache = getCache();           // returns module-level cache instance
await cache.get(key);               // returns value or null
await cache.set(key, value, ttlMs); // best-effort; safe on failure
await cache.del(key);               // best-effort; safe on failure
cache.mode;                          // "memory" (today)
cache.configured;                    // boolean — true iff cache is functional
```

Reads always succeed and return `null` if the value is absent. Writes are best-effort — a write failure must never propagate as a 500. Keys are validated against the `SAFE_KEY_REGEX` (no spaces, no control chars, no PII shapes); attempting to set a value at a forbidden key path is a no-op.

## Public Q&A cache rules (Sprint 8 contract)

Before writing a row to `sakina:public_qa:detail:<slug>`:

1. The row must include a non-empty `citations` array.
2. Each citation must have `citation_type ∈ {quran, hadith, fiqh, scholar_note}` AND a non-empty `citation_label`.
3. The row must be the projected shape (no `user_id`, no `email_hash`, no `question_hash`, no `sheikh_user_id`).

If any of these fail, the wrapper **returns the row to the caller but does not cache it**.

For list responses, the wrapper caches the projected list only when EVERY entry has `is_live: true` and a `category` + `language` consistent with the query parameters.

## Question status cache rules

Before writing to `sakina:question_status:<id>`:

- The value must be the coarse projection only: `{ question_id, status, language, category, created_at, updated_at }`.
- The value must not contain `question_text`, `question_hash`, `assigned_sheikh_id`, or `email_hash`.

## /ready cache block

`/ready.cache` exposes:

```json
{
  "configured": true,
  "mode": "memory",
  "redis_url_configured": false,
  "external_network_required": false,
  "safe_fallback_enabled": true
}
```

`mode` reports the *active* mode. `redis_url_configured` reports whether the operator has set `REDIS_URL` (the value itself is never echoed). `external_network_required` is `false` in memory mode and remains `false` if a future Redis adapter is added to the same cluster (in-cluster service DNS; no public network).

## Redis unavailable fallback

- If `REDIS_URL` is unset → memory mode silently. `/ready.cache.mode = "memory"`.
- If `REDIS_URL` is set but the redis client cannot be loaded (Sprint 8 default) → memory mode silently. `/ready.cache.mode = "memory"`, `redis_url_configured: true`. **No error to the user.**
- If a future Redis adapter ships and Redis is configured but the cluster is unreachable → memory mode for that operation. `/ready.cache.mode = "memory"`, `redis_url_configured: true`, plus an internal counter that future monitoring can read. The user-facing response is unchanged.

## Security and privacy rules

- Cache module never logs values.
- Cache module never logs keys that may contain PII.
- The redactor used by `/ready` for the DSN is reused for `REDIS_URL` — the URL itself is never echoed.
- Cache module imports zero HTTP clients (`fetch`, `axios`) and zero LLM SDKs (`openai`, `anthropic`, `gemini`, `ollama`) — enforced by `test/no-external-llm.test.js`.

## Future K3s deployment notes

When the operator adds Redis to the Sakina K3s deployment:

- Redis runs in `sakina-data` namespace.
- Service is **ClusterIP only** — no NodePort, no LoadBalancer, no Ingress.
- `REDIS_URL` is sourced from `sakina-secrets` (template placeholder only in repo).
- A `requirepass` is set on Redis to a value generated at deploy time and stored only in the cluster Secret.
- A separate Redis instance (different DB number or different StatefulSet) MUST be used if any other app is later co-tenanted on the same cluster.
