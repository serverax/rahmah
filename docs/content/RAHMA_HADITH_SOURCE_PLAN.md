# Rahma — Hadith Source Plan

**Date:** 2026-05-14
**Status:** plan only. NO Hadith text is hardcoded in this repo, ever.

## Goal

Surface a small, accurately-graded Hadith corpus in the mobile app.
Source decision is operator-side. **No fake Hadith. No fake grading.**

## Operator must decide before ingestion

1. **Source corpus.** E.g. Sahih al-Bukhari, Sahih Muslim, Sunan
   Abu Dawud, etc. Each corpus is a separate `islamic_source_registry`
   row.
2. **Grading source.** The authenticity rating (`صحيح / حسن / ضعيف`)
   MUST come from a recognised hadith scholar. Operator records the
   grading source as `metadata_json.grading_authority` on each item.
3. **Translation policy.** Translations live in separate rows.

## Per-row fields

```
source_type            = 'hadith'
source_name_ar         = canonical name (e.g. "صحيح البخاري")
source_reference       = e.g. "Sahih Bukhari 6018" (book/number)
language               = 'ar' or 'en' (separate rows)
license_id             = operator-chosen license identifier
verification_status    = 'pending_review' on import; only 'approved'
                         after operator + scholar sign-off
content_hash           = sha-256 of canonical Arabic text
authenticity_note_ar   = REQUIRED: 'صحيح' | 'حسن' | 'ضعيف' | 'موضوع'
                         (operator-decided)
```

## Public-publication rules

- **`صحيح` (sahih)**: eligible for public Q&A as a citation in Sheikh
  Hasan answers.
- **`حسن` (hasan)**: eligible for public Q&A.
- **`ضعيف` (da'if)**: NOT eligible for public ruling content. May appear
  in moral-guidance contexts only if the answer surfaces the grading
  prominently.
- **`موضوع` (mawdu', fabricated)**: NEVER eligible for any Rahma
  surface. Operator must mark `verification_status = 'rejected'`.

## NEVER

- Surface a Hadith without `authenticity_note_ar`.
- Ship a Hadith without its grading source documented in
  `metadata_json.grading_authority`.
- Ingest Hadith content from a source that grades by guesswork.
- Use Hadith content to justify a public Sheikh answer if grading is
  missing.

## Mobile usage

- `GET /api/hadith` returns `configured: false` until at least one
  Hadith row reaches `approved`.
- Public Hadith items render the grading badge alongside the text.

## Next operator step

Pick a starting corpus (typically Bukhari + Muslim), record their
licenses under `data/islamic-sources/licenses/hadith-<corpus>.md`,
and ingest a small approved subset for testing the citation path.
