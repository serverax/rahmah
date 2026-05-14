# Rahma — Child Data Protection

**Date:** 2026-05-14

## Hard rules

The app NEVER:

- Collects a child's real name.
- Collects a child's age (only `age_band`: 4-6 / 7-9 / 10-12 / 13+).
- Collects a child's email / phone / address / photo.
- Sends ANY data from the children's section to a third party.
- Allows chat between children.
- Allows children to set a public profile.
- Shows children's-section content to an unlogged-in adult.
- Uses dark-pattern mechanics (limited-time offers, FOMO, grief-bait).

## What IS collected (only with wali consent + opt-in)

- Opaque `user_id` (UUID — never the email).
- `age_band` (one of four).
- `preferred_language` (default `ar`).
- Per-scenario counters: `attempts_count`, `correct_count`,
  `updated_at`.

All stored in `children_game_profiles` + `children_game_events`
(migration 011). NEVER PII.

## Wali toggle (operator + product contract)

The privacy page exposes a switch that disables the children's section
entirely. When disabled, the mobile app:

- Hides the children's-game tile on Home.
- Refuses to render `/game/*` routes.
- Refuses to POST `/api/game/progress`.

The toggle preference is stored encrypted in the device keystore.

## Server-side enforcement

`wasm/child-safety` (and its mirror in `backend/app/src/family/child-safety-policy.js`)
blocks every payload that:

- asks for personal data (Arabic keyword list),
- contains shaming / political / sectarian patterns,
- is empty / has an invalid age band,
- has a topic tag in `SENSITIVE_TOPICS` when the band is 4-6 / 7-9.

`wasm_child_safety_audit` rows store the **hash** of the body, not the
body itself.

## Apple / Google store posture

- iOS Privacy Labels: NO contact info, NO identifiers from children.
- Google Data Safety: NO data collected from children's section.
- Apple's Kids Category: Rahma's children's section is operator-decided;
  if the operator submits to the Kids Category, this doc and the wali
  toggle satisfy the strict 13-and-under rules.
