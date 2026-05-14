# Rahma — Mobile App Architecture

**Date:** 2026-05-14
**Status:** architecture spec; no source yet.

## Top-level shape

```
┌────────────────────────── mobile app shell (Flutter) ────────────────────────┐
│                                                                              │
│  ┌──────────┐    ┌────────────┐    ┌────────────┐    ┌────────────────────┐ │
│  │ navigation│   │  feature   │   │  feature   │    │  shared widgets    │ │
│  │  (router) │   │  modules   │   │  modules   │    │  (RTL, theme, …)   │ │
│  └──────────┘    └────────────┘    └────────────┘    └────────────────────┘ │
│        │              │                 │                       │           │
│        ▼              ▼                 ▼                       ▼           │
│  ┌──────────────────────────── state (riverpod-style) ──────────────────┐  │
│  │ - boot state            (one-shot /ready snapshot)                     │  │
│  │ - feature flags         (from /ready / /api/mobile/status)             │  │
│  │ - session state         (auth token; opaque, never persisted in plain)│  │
│  │ - content cache         (approved-only)                                │  │
│  │ - children's game state (local-first; only counters)                   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│        │                                                                     │
│        ▼                                                                     │
│  ┌──────────────────────────── api/ + storage/ ────────────────────────────┐  │
│  │ api client (typed; generated from OpenAPI)                              │  │
│  │ storage (hive / isar) for offline reads + children's-game progress     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ (single HTTPS endpoint, mobile-only)
                       api.<final-rahma-domain>
```

## Layers

### `app/`
- `RahmaApp` root widget.
- `MaterialApp.router` with `goRouter`.
- `Directionality(textDirection: TextDirection.rtl)` wrapping the
  scaffold; Arabic locale by default, English secondary.

### `config/`
- `RAHMA_API_BASE` injected via `--dart-define=RAHMA_API_BASE=...`.
- No domain baked into source. Default value at compile time MUST be
  `''` (empty string) → app refuses to start without the operator
  setting the value.

### `api/`
- Typed client generated from `docs/api/RAHMA_MOBILE_API_OPENAPI.yaml`.
- Reuses error shape `{ ok: false, error, safe_message_ar }` — mobile
  renders `safe_message_ar` and never the machine-readable error code.

### `state/`
- `BootController` calls `GET /ready` on cold start; caches the
  blockers + feature flags.
- `FeatureFlags` reads from the boot snapshot; gates UI surfaces
  (children's game, donations, Sheikh login).
- `SessionController` only present when `auth.configured == true` from
  the boot snapshot.

### `features/`
- `home/`
- `quran/`, `hadith/`, `dua/`
- `ask_sheikh_hasan/`
- `public_answers/`
- `children_game/`
- `donations/`
- `settings/`
- `account_session/`

### `storage/`
- `hive` boxes for:
  - cached approved library entries (TTL 24h),
  - children's-game progress (counters only, no PII).
- All boxes encrypted at rest with a key derived from the device
  keystore (Android Keystore / iOS Keychain).

## Networking

- HTTPS only. The single host is `api.<final-rahma-domain>`. No other
  origins.
- No third-party SDKs.
- No analytics.
- No advertising.
- The HTTP client refuses non-2xx without surfacing a
  user-actionable `safe_message_ar`.

## Build-time toggles

- `RAHMA_API_BASE` — required.
- `RAHMA_BUILD_FLAVOR` — `internal-test` | `staging` | `release`. Used
  only to color the splash badge so testers never confuse builds.

## Offline behaviour

- The children's game is fully local. No network required.
- Quran / Hadith / Dua: cache approved entries for offline read; refuse
  to render any cached entry whose `citation_label_ar` is missing on
  re-read (defense in depth against the cache being tampered with).
- Sheikh-Hasan submission: if offline, the app queues the question
  locally and shows "سيتم الإرسال عند توفر اتصال". It never silently
  drops.

## What this architecture deliberately omits

- Push notifications until the operator wires APNs/FCM.
- Live chat. There is no chat anywhere in the app.
- Social-graph features. There is no "follow", no "share to feed",
  no leaderboard.
