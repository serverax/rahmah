# Rahma — Mobile Offline-First Design

**Date:** 2026-05-14

## Principles

1. **No bundled fake content.** The app ships with ZERO Quran / Hadith / Dua text. Caches fill from operator-approved server responses only.
2. **Donations are never queued offline.** A payment intent is only meaningful when the network is up and the provider is configured.
3. **Children's game is fully local.** Scenarios + counters live in the device's encrypted hive box.
4. **Drafts before delivery.** A question to Sheikh Hasan is saved as a local draft; the outbound queue flushes when the API is reachable.

## Modules (Sprint 68)

- `apps/mobile/lib/offline/cache_policy.dart` — pure `CachePolicy.evaluate` that decides whether a cached item may still render. Blocks unapproved sources + stale TTL.
- `apps/mobile/lib/offline/sync_status.dart` — `SyncStatus` enum + `isQueueableOffline(kind)` rule (default-deny).

## Server-side hint

`GET /api/mobile/sync/status` returns:

```json
{ "sync_ready": false, "database": {...}, "auth": {...}, "content": {...} }
```

`sync_ready` is true only when the database is configured, auth is
configured, AND at least one approved Islamic source exists. The mobile
client uses this to gate the outbound queue.

## Tests

`apps/mobile/test/offline_policy_test.dart` (6 cases):

- Unapproved source → blocked.
- Stale TTL → blocked.
- Fresh approved source → allowed.
- Donation actions NEVER queueable.
- Question drafts + game progress ARE queueable.
- Unknown kind → default-deny.

`backend/app/test/sprint-68-sync.test.js` — `/api/mobile/sync/status`
returns `sync_ready=false` by default and never leaks the DSN.

## Hard NEVERs

- NEVER bundle Quran / Hadith / Dua text with the app binary.
- NEVER queue a donation as "pending offline".
- NEVER persist auth tokens in unencrypted storage.
- NEVER render a cached item whose `source_approved` flag is missing.
