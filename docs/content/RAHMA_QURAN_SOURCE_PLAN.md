# Rahma — Quran Source Plan

**Date:** 2026-05-14
**Status:** plan only. NO Quran text is hardcoded in this repo, ever.

## Goal

Surface a small, licensed, accurately-cited Quran corpus in the mobile
app. Source decision is operator-side.

## Operator must decide before ingestion

1. **Canonical text source.** Options the operator might consider:
   - tanzil.net (specific licence terms apply).
   - Quran.com API (specific terms).
   - Operator-licensed Mushaf scan with verified transcription.
2. **Translation source (optional, separate decision).** Mobile MAY
   show an English translation alongside the Arabic. The translation is
   a SEPARATE registry row with its own `license_id`.
3. **Versioning.** A single Mushaf revision per `version_label`. Every
   per-ayah row carries an immutable `content_hash`.

## Per-row fields

```
source_type          = 'quran'
source_name_ar       = canonical Arabic name of the chosen source
source_reference     = e.g. "Al-Fatiha 1:1"  (surah/ayah)
language             = 'ar' or 'en' (translations as separate rows)
license_id           = operator-chosen identifier referring to the
                       license file under data/islamic-sources/licenses/
verification_status  = 'pending_review' on import; flipped to 'approved'
                       only after operator approval
content_hash         = sha-256 of the canonical Arabic text for that ayah
authenticity_note_ar = null (Quran does not need this; Hadith does)
```

## NEVER

- Hardcode any verse in the backend / mobile / docs.
- Ingest a Quran source whose license forbids redistribution.
- Ship a partial Mushaf labelled as "complete Quran".
- Surface translations without their own license row.

## Mobile usage

- `GET /api/quran` returns `configured: false` until at least one Quran
  row reaches `approved`.
- Each public Quran item carries `citation_label_ar` ("Al-Baqarah
  2:255") + `source_name_ar`.
- Mobile renders Arabic with `lang="ar"` + `dir="rtl"` (the existing
  preview pages under `apps/web/public/` model this).

## Next operator step

Pick a candidate source, write its license summary under
`data/islamic-sources/licenses/quran-<source>.md`, then load a small
sample (e.g. Al-Fatiha + last short surahs) as `pending_review` rows.
Promote to `approved` only after manual verification.
