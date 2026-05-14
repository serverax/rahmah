# Rahma — Quran / Hadith / Dua API

**Date:** 2026-05-14

These endpoints surface APPROVED religious content only. Until the
operator approves licensed sources and runs the ingestion pipeline,
they return `configured: false` and an empty `items` array. **Rahma
NEVER serves invented religious content from these endpoints.**

## Endpoints

### `GET /api/quran`

```json
{
  "ok": true,
  "configured": false,
  "items": [],
  "message_ar": "القرآن غير مهيأ بعد — قاعدة البيانات غير مفعلة."
}
```

When configured + approved sources exist, items are projections from
`islamic_source_documents` joined to approved entries in
`islamic_source_registry`. Each item carries:

```json
{
  "id": "<uuid>",
  "title_ar": "...",
  "category": "quran",
  "language": "ar",
  "version": "<source-version>",
  "citation_label_ar": "Al-Baqarah 2:255",
  "source_name_ar": "...",
  "published_at": "<iso>"
}
```

### `GET /api/hadith`

Same shape, `category: "hadith"`. Each Hadith entry MUST carry an
`authenticity_note_ar` field (`صحيح / حسن / ضعيف` or equivalent) in the
underlying registry record. Weak Hadiths are not approved for public
ruling content per `data/islamic-sources/REVIEW_POLICY.md`.

### `GET /api/dua`

Same shape, `category: "dua"`. Each entry MUST have a
`source_reference` (e.g. `حصن المسلم — أدعية المنزل`).

## Hard rules

- No Quran/Hadith/Dua content is hardcoded in the backend source tree.
- No entry without an approved source row is ever returned.
- Fixture rows (`is_test_fixture: true`) are NEVER surfaced — the
  `content-rule-engine` WASM gate enforces this and the JS projection
  function (`_libraryDocProjectionForTest`) mirrors it.
- `complete_database` is reported as `false` everywhere — Rahma never
  claims to be the canonical / complete Quran or Hadith corpus.

## Search

```http
GET /api/library/search?q=الصلاة
```

Searches only the approved-source projection. Foundation mode returns
`items: []` and `configured: false`.

## Counts

```http
GET /api/library/sources/status
GET /api/rag/sources/status
```

Both surface `approved_sources`, `pending_review_sources`,
`unverified_sources`, `blocked_sources`. `complete_database` always
`false`.

## When the mobile app should refuse to display

If any item returned lacks `citation_label_ar`, the mobile app MUST
discard it and log a client-side warning. This is defense-in-depth on top
of the server's projection.
