# Sprint 68 — Offline + Sync Foundation

**Date:** 2026-05-14

## What ships
- `apps/mobile/lib/offline/{cache_policy,sync_status}.dart` — pure offline policy + sync enum + queueable rule (default-deny).
- `apps/mobile/test/offline_policy_test.dart` — 6 tests.
- `backend/app/src/routes/mobile-sync.js` — `GET /api/mobile/sync/status` (single-call sync-ready snapshot).
- `backend/app/test/sprint-68-sync.test.js` — 2 tests (default not-ready + no DSN leak).
- `docs/mobile/RAHMA_OFFLINE_FIRST_DESIGN.md`.
- `docs/mobile/RAHMA_SYNC_CONFLICT_POLICY.md`.

## Hard rules
- Unapproved sources NEVER render.
- Stale (>24h) caches NEVER render until refresh.
- Donation actions NEVER queueable offline.
- Question drafts + game progress ARE queueable.
- Server is source of truth for everything except local game progress.
