# Rahma — Mobile State Management

**Date:** 2026-05-14

## Approach: Riverpod (recommended)

Riverpod (Flutter ecosystem) keeps boot state, feature flags, session
state, and content caches in a single tree with explicit dependencies.
Pure functions, easy to test, no global mutable state.

## State containers

```
BootSnapshot
  ├── /ready response (cached)
  ├── /api/mobile/status response (cached)
  └── computed:
       - production_ready
       - blockers (list)
       - feature flags
       - auth configured?

FeatureFlags     ← derived from BootSnapshot.features
SessionController  (only if auth.configured)
LibraryController  (Quran / Hadith / Dua paginated)
SheikhAskController
PublicAnswersController
ChildrenGameController  (local-first, hive-backed)
DonationsController
PrivacyController
SettingsController
```

## Persistence rules

| Box (hive) | Contents | Encryption |
|---|---|---|
| `boot_cache` | last /ready + /api/mobile/status JSON | encrypted |
| `library_cache` | approved items with TTL 24h | encrypted |
| `children_game_progress` | scenario_id, attempts, correct, updated_at | encrypted |
| `settings` | language, wali_toggle_on, theme | encrypted |

NEVER persisted in plain or unencrypted form:

- Any JWT / access token.
- Any refresh token.
- Any password (the app never asks for a password).
- Any email except a sha-256 hash if needed for privacy requests.
- Any analytics identifier.

## Refresh policy

- `BootSnapshot` refreshes on app foreground + on pull-to-refresh on
  Home + after sign-in.
- `LibraryController` refreshes per category with a 24h TTL; user
  pull-to-refresh forces immediate refresh.
- `SheikhAskController` polls submitted-question status only when the
  user opens the `/ask/:id` screen.

## Offline fallback

- If `BootSnapshot` cache is stale and the network is unreachable, the
  app shows the cached version with a small "you're offline" banner.
- Children's game works fully offline — no banner.
- Sheikh-Hasan submit queues locally; the next foreground with network
  flushes the queue.
