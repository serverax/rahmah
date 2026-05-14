# Rahma — Children's Islamic Game: "حديقة الحسنات" (Good Deeds Garden)

**Date:** 2026-05-14
**Scope:** Rahma/Sakina only — child-safe Arabic-first

## Concept

A gentle, education-first Islamic game where a child completes simple
learning tasks (recognising prayer order, matching duas to situations,
recalling short surahs) and earns soft "garden" growth — a tree gains
leaves, a flower opens, a star is awarded. **No gambling mechanics, no
manipulative rewards, no chat, no ads.**

## Game modules

| Module | Arabic title | Description |
|---|---|---|
| 1 | ترتيب الصلاة | Drag-the-step game: order the 5 daily prayers / 5 rakaat positions |
| 2 | خطوات الوضوء | Wudu steps: drag the 6 basic steps into order |
| 3 | الدعاء المناسب | Match dua to situation (entering home, before eating, sleeping…) |
| 4 | السور القصيرة | Tap the correct short surah from a multiple-choice list |
| 5 | الأخلاق الجميلة | Good-manners quiz — kindness, honesty, respect for parents |
| 6 | مهام الرحمة في رمضان | Ramadan kindness tasks (share food, smile, help) |
| 7 | قصص الأنبياء | Simple "who did what" quiz about prophets — sourced facts only |

Each module is a small content set; expansion is operator-controlled via
the source registry.

## Player journey (single screen — no chat, no profile)

1. Child opens `child-game.html` (already present in
   `apps/web/public/`). Arabic-RTL layout, large fonts, high contrast.
2. Picks a module by tapping a tile (icon + Arabic title).
3. Plays 3–7 questions per session.
4. Gentle correct/incorrect feedback in Arabic. Never shaming.
5. On completion, a leaf grows on the tree. Progress saved to
   localStorage as `rahma.child.progress` JSON.
6. No login. No leaderboard. No share button. No external link.

## Server-side support (optional, opt-in only)

The `children_game_progress` table (migration 008) can back the local
state once an auth provider exists. **Until then, all progress is
local-only.** No child PII is ever sent to the server.

## Future expansion

- Audio recitation of short surahs (sourced + reviewed).
- Lottie / Rive small celebration animations.
- Garden growth visualisation upgrade (current is plain SVG).
- Operator-side content authoring tool, gated by `content_reviewer` role.

## Strict rules

- No personal data collection from children.
- No chat / no shared profile / no leaderboard.
- No ads / no in-app purchases / no third-party SDK.
- No external links from inside the game.
- No fear-based or shaming language.
- All Quran/Hadith content shown comes from approved sources only.
- Wali (parent/guardian) can disable the game from the privacy page.
