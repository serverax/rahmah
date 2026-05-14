# Rahma — Mobile Screen Map

**Date:** 2026-05-14

## Route → screen map

| Route | Screen | Auth |
|---|---|---|
| `/onboarding` | three-step intro (App identity → language pick → wali toggle) | none |
| `/language` | Arabic / English picker (one-time + reachable from settings) | none |
| `/home` | tab host: Home / Library / Ask / Game / Settings | none |
| `/quran` | approved Quran items (empty until DB seeded) | none |
| `/quran/:id` | single item detail with citation | none |
| `/hadith` | approved Hadith items + grading badge | none |
| `/hadith/:id` | item detail | none |
| `/dua` | approved Du'a list, grouped by category | none |
| `/dua/:id` | detail | none |
| `/ask` | submit a question to Sheikh Hasan | none |
| `/ask/:id` | track status of a previously-submitted question | none |
| `/answers` | public list of published cited answers | none |
| `/answers/:id` | single answer + citations | none |
| `/game` | children's game tile picker | none (wali toggle gates) |
| `/game/:scenarioId` | scenario player | none |
| `/game/progress` | local-first counters | none |
| `/donations` | causes + intent flow (provider-disabled by default) | none |
| `/donations/:intentId` | intent status | none |
| `/settings` | language, wali toggle, theme, about | none |
| `/settings/privacy` | privacy notice + request flow | none |
| `/settings/account` | account-deletion + data-export request | none |
| `/settings/contact` | contact form | none |
| `/sheikh/login` | scholar sign-in entry point (OIDC redirect) | sheikh / admin |
| `/sheikh/queue` | pending question queue | sheikh / admin |
| `/sheikh/queue/:id` | answer editor | sheikh / admin |

## Bottom navigation (5 items, Arabic labels)

| Index | Label | Route |
|---|---|---|
| 1 | الرئيسية | `/home` |
| 2 | الأذكار والدعاء | `/dua` |
| 3 | اسأل الشيخ | `/ask` |
| 4 | المكتبة | `/quran` (with sub-tabs to Hadith / Library) |
| 5 | الإعدادات | `/settings` |

The children's game tile lives on `/home` rather than in the bottom nav
to keep it discoverable by the wali but not the primary path.

## Sheikh-side UI

The Sheikh dashboard surfaces are reachable from the same mobile app —
**there is no separate admin website**. They appear only when the
authenticated user has role `sheikh` / `moderator` / `content_reviewer` /
`admin`. The app:

1. Renders the regular mobile UI by default.
2. After OIDC sign-in, queries `/api/auth/status` for the role.
3. Adds the `/sheikh/queue` entry to a hidden tab if role allows.

## Children's section gating

`/game` is hidden when the operator has disabled
`ENABLE_CHILDREN_ISLAMIC_GAME` in the cluster ConfigMap. The wali toggle
on `/onboarding` and `/settings` also disables it client-side; the
toggle preference is stored encrypted in the device keystore.

## What the app NEVER shows

- A "register / login with password" form. Auth flow is OIDC redirect
  only.
- A chat screen.
- A leaderboard.
- A social feed.
- Ads.
- A "share this answer" button that posts to a third-party network.
  (Native OS share-sheet is fine.)
- A debug screen that shows secrets / DSNs.
