# Rahma — Children's Game Safety

**Date:** 2026-05-14

## Non-negotiable safety rules

1. **No personal data from the child.** No real name, no email, no
   phone, no address, no photo, no location.
2. **No chat with other users.** Ever.
3. **No public profile.** No leaderboard. No share buttons. No social
   integrations.
4. **Progress is local-first.** Stored in `localStorage` under a single
   namespaced key (`rahma.child.progress`). Server backup is opt-in and
   stores only opaque user_id + scenario counters.
5. **No external links.** The game never opens a URL outside Rahma.
6. **No ads, no IAP, no third-party SDK.** Bundle size and network
   surface are minimised.
7. **Wali (guardian) toggle.** The privacy page exposes a switch to
   disable the children's section entirely; the game then refuses to
   load.
8. **No shaming or fear language.** All feedback in Arabic uses
   encouragement only: "أحسنت", "حاول مرة أخرى بإذن الله", "ممتاز".
9. **No religious content without a verified source.** All Quran /
   Hadith / dua snippets in the game come from approved entries in the
   Islamic source registry. Pending or rejected sources are excluded.
10. **No video / audio uploads from the child.** No microphone access.

## Code review checklist (every PR touching the children's path)

- [ ] No new external `<script src=>` or `<link href=>` referencing
      non-Rahma origins.
- [ ] No `fetch` / `XMLHttpRequest` to non-Rahma origins.
- [ ] No `localStorage.setItem` that contains anything more than
      counters / scenario id / timestamp.
- [ ] Content used by the game comes from a categorised source under
      `data/islamic-sources/` with an approved status (or, in test mode,
      from `data/islamic-sources/fixtures/`).
- [ ] Arabic strings are present (no English-only flash text).
- [ ] No `confirm()` / `alert()` that could be used to coerce input.
- [ ] No analytics / tracking call.

## What the server does NOT see

- Child's name, age, gender, location.
- Device identifiers.
- Free-text input.

## What the server may see (only with guardian opt-in)

- An opaque `user_id` UUID — *not* the email, *not* a device ID.
- The `scenario_id` (e.g., `salah-order-1`).
- `attempts_count` and `correct_count`.
- `updated_at` timestamp.

## Audit

Any addition or removal of children's content is recorded via the
`audit_events` table (migration 008) with `target_kind: children_game`.
Reviewers see WHO changed WHAT, never WHO PLAYED.
