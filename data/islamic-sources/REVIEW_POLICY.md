# Rahma — Islamic Source Review Policy

This is the operator-side gate between **pending_review** and **approved**.
Sources that don't satisfy every rule stay in pending_review and are never
shown as public religious guidance.

## Reviewer requirements

- The reviewer is a recognised scholar OR an authorised editor with a
  documented chain of accountability.
- Reviewer identity is stored as a sha-256 hash of the reviewer's email
  (column `reviewer_email_hash`). The raw email is never persisted.

## Per-item checklist (must all be true to mark `approved`)

1. `source_type` is in the controlled enum: `quran`, `hadith`, `dua`, `azkar`,
   `seerah`, `fiqh_note`, `sheikh_answer`, `child_content`.
2. `source_name_ar` is a real, recognised source name (no fabricated names).
3. `source_reference` is non-empty AND specific (e.g., `Al-Baqarah 2:183`,
   `Sahih Muslim 1162` — not `general` / `internet`).
4. `language: ar` AND the body fields contain Arabic characters.
5. The source's licence allows Sakina's use (public-domain, permitted, or
   explicit licence on file).
6. For `hadith`, the authenticity grading is recorded (`صحيح / حسن / ضعيف`
   or equivalent) in `authenticity_note_ar`. Weak Hadiths are not approved
   for public ruling content, only for moral guidance with disclosure.
7. For `child_content`, the child-safety policy from
   `backend/app/src/family/child-safety-policy.js` returns `decision: allow`.
8. No fabricated Quran/Hadith/fiqh string. The exact text must originate
   from the cited primary source.

## Rejected categories (never approve)

- Political/sectarian content.
- Health, legal, or financial advice.
- Content asking children for personal data.
- Content with shaming or fear-based language for children.
- Content whose source cannot be verified.

## Audit

Every approval/rejection writes an `islamic_source_review_status` row
(migration 004). The row carries `reviewer_user_id` (UUID of the reviewer
account, distinct from email hash), `decision`, and an optional Arabic
`note_ar`.

## Re-review window

`approved` items more than 180 days old are flagged by the freshness
checker (`backend/app/src/engine/freshness-checker.js`) for periodic
re-review. Operator-initiated.
