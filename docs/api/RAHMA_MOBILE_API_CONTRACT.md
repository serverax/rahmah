# Rahma Mobile API — Contract Overview

**Date:** 2026-05-14
**Scope:** Rahma/Sakina mobile app ONLY (Android + iOS). No public website.
**Base URL:** `https://api.<final-rahma-domain>` (placeholder `api.rahma.example`).

The full machine-readable spec lives at `docs/api/RAHMA_MOBILE_API_OPENAPI.yaml`
(OpenAPI 3.1). This document is the human-readable summary the mobile
team consumes. **Honesty rule: every endpoint listed here is reachable in
the placeholder deployment and returns truthful state (configured / not
configured) — no endpoint returns invented content.**

## High-level surface

| Group | Auth | Mobile use |
|---|---|---|
| `health` / `ready` | none | startup probe |
| `mobile/status` | none | single-call readiness snapshot for the app shell |
| `auth/status` | none | discover whether login is configured |
| `db/status` | none | DBA-level readiness (mobile may surface "service is updating") |
| `rag/status`, `rag/sources/status`, `rag/query` | none | search-with-citation (no answer without citation) |
| `engine/status` | none | confirms deterministic engine, no LLM |
| `privacy/*`, `terms/*` | none | legal screens + privacy requests |
| `library/*` | none | approved Quran/Hadith/Dua/library |
| `public/sheikh-hasan/qa`, `public/answers` | none | published cited Q&A |
| `sheikh/questions` (submit) | none | user submits a question |
| `sheikh/questions/{id}/*` | role=`sheikh` or `admin` | scholar workflow |
| `admin/sheikh/answers/{id}/{approve,reject}` | role=`content_reviewer`, `moderator`, or `admin` | moderation |
| `quran`, `hadith`, `dua` | none | approved-only lists (foundation: empty) |
| `game/status`, `game/progress` | none | children's game (local-first; server is optional backup) |

## Mobile usage notes

### App boot

```http
GET /api/mobile/status
```

The mobile shell should call this exactly once on cold start. It returns:

- `platform: "mobile-only"` (constant)
- `public_ingress_disabled: true` (will flip when the operator confirms the production domain)
- `features.*` flags — the app uses these to show/hide feature tiles
- `database.configured`, `redis.configured`, `wasm.configured` — used to drive a
  "service is being prepared" banner if any are false

The app MUST treat `production_ready: false` from `/ready` as "service is
up but not fully provisioned" — it can still render local content
(children's game progress) but must not pretend network features work.

### Asking a question

```http
POST /api/sheikh/questions
{ "question_ar": "نص السؤال", "language": "ar", "category_ar": "salah", "public_allowed": false }
```

Returns `{ status: "pending_review", question_id, safe_message_ar }`. The
app shows the safe_message_ar string ("تم استلام سؤالك. سيتم مراجعته من
قبل الشيخ بإذن الله.") and stores the `question_id` in local state.

### Polling published answers

```http
GET /api/public/answers
GET /api/public/sheikh-hasan/qa
```

Both return only PUBLISHED + CITED answers. The mobile app must display
the citations alongside the answer — no exceptions.

### Children's game

```http
GET  /api/game/status         — describe modules, no PII
POST /api/game/progress       — opaque counters only; never sends nickname / age / device id
```

Server-side persistence requires opt-in. Until then, progress is local
only and `persisted: false` is returned for every POST.

### Donations (Sprint 43 placeholder)

Provider is `disabled` by default. `POST /api/sadaqah/intent` (existing
route) records an intent only; no card data ever flows through the
backend.

## Error shape (every error)

```json
{
  "ok": false,
  "error": "machine_readable_code",
  "safe_message_ar": "نص ودود للمستخدم"
}
```

Mobile clients SHOULD render `safe_message_ar` and SHOULD NOT show the
raw `error` code to the user.

## What this contract NEVER does

- Returns Quran/Hadith content without a `citation_label`.
- Echoes DSNs, secrets, raw emails, or device identifiers.
- Surfaces an internal-only field (e.g. `assigned_sheikh_id`, `question_hash`).
- Allows a non-`sheikh` / non-`admin` principal to read the pending queue.

## See also

- Auth contract: `RAHMA_AUTH_CONTRACT.md`
- Sheikh workflow: `RAHMA_SHEIKH_WORKFLOW_API.md`
- Children's game: `RAHMA_CHILDREN_GAME_API.md`
- Quran/Hadith/Dua: `RAHMA_QURAN_HADITH_DUA_API.md`
- Machine spec: `RAHMA_MOBILE_API_OPENAPI.yaml`
