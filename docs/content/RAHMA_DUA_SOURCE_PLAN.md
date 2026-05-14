# Rahma — Dua Source Plan

**Date:** 2026-05-14
**Status:** plan only. No Du'a content is hardcoded.

## Goal

Surface a small, sourced Du'a collection (الأذكار + الأدعية المأثورة).

## Operator must decide before ingestion

1. **Source compilation.** E.g. Hisn al-Muslim, Sahifa al-Sajjadiyya (if
   the operator's audience includes Shia readers), or operator-curated
   collections from primary sources.
2. **Categorisation.** Standard buckets:
   - أذكار الصباح / المساء
   - أدعية الصلاة (before, during, after)
   - أدعية المسجد / الخروج / الدخول
   - أدعية الطعام والشراب
   - أدعية المرض / الموت
   - أدعية أخرى مأثورة

## Per-row fields

```
source_type           = 'dua' or 'azkar'
source_name_ar        = canonical name (e.g. "حصن المسلم")
source_reference      = book + section or page (e.g. "حصن المسلم / أذكار الصباح")
language              = 'ar' (translations as separate rows)
license_id            = operator-chosen license identifier
verification_status   = 'pending_review' until operator approval
content_hash          = sha-256 of canonical Arabic text
authenticity_note_ar  = REQUIRED when the dua is attributed to the
                        Prophet ﷺ (the underlying hadith's grading);
                        null for non-prophetic personal supplications
```

## NEVER

- Surface a "Prophetic" du'a without its underlying hadith citation +
  grading.
- Surface a du'a whose source the operator cannot point to.

## Mobile usage

- `GET /api/dua` returns `configured: false` until ≥1 approved row.
- Each row carries `citation_label_ar` + `source_name_ar`.
- For prophetic du'as, the underlying hadith's grading badge must
  render.

## Next operator step

Start with حصن المسلم (or operator-equivalent), document its license,
ingest a small approved subset.
