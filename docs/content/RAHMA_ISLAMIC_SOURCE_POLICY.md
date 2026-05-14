# Rahma — Islamic Source Policy

**Date:** 2026-05-14

This document is the operator-facing rule book for what may and may not
enter the Rahma Islamic content pipeline. The codebase enforces it at
three layers:

1. **Database** — `islamic_source_registry` rows must reach
   `verification_status = 'approved'` before `islamic_source_documents`
   or `islamic_source_chunks` referencing them can return from the RAG
   retrieval path (migration 004 + 012).
2. **Backend** — `backend/app/src/rag/answer-gate.js` discards
   candidates whose source / document / chunk status isn't `approved`,
   and refuses any candidate marked `is_test_fixture: true`.
3. **WASM** — `wasm/quran-hadith-citation` reports
   `insufficient_citation` for any payload missing a `citation_type ∈
   {quran, hadith}` AND non-empty `citation_label`; the host backend
   re-verifies that decision against the JS implementation.

## What can enter

Every imported item MUST carry:

| Field | Rule |
|---|---|
| `source_id` | row in `islamic_source_registry`, status `approved` |
| `version_label` | non-empty string ≤ 64 chars |
| `license_id` | non-empty operator-defined identifier ≤ 64 chars |
| `language` | 2–8 chars (default `ar`) |
| `content_hash` | sha-256 of canonical content, 64 hex |
| `citation_label` | non-empty for every chunk |
| `authenticity_note_ar` | required for `hadith` items (e.g. `صحيح / حسن / ضعيف`) |

## What can NEVER enter

- Fabricated Quran / Hadith / Fiqh / Fatwa text.
- Content without a registry row.
- Content whose `verification_status` is not `approved`.
- Content lacking a `citation_label` per row.
- Hadith content with no authenticity grading.
- Content licensed in a way Rahma cannot redistribute.
- Children-bound content asking for personal data, or containing shaming
  / political / sectarian language (gated by `wasm/child-safety`).

## Operator workflow

1. Operator drafts a source manifest (JSON) listing the rows + their
   license info.
2. Operator runs `scripts/rag/validate-source-manifest.js` (already in
   repo) in dry-run mode against the cluster Postgres
   port-forward. The script refuses `--apply` without `DATABASE_URL`.
3. Operator approves rows via a NEW (yet-to-be-written) admin tool
   that flips `verification_status` → `approved`, recording the
   approver's opaque UUID in `approved_by` and the timestamp in
   `approved_at`.
4. Operator runs the import via
   `islamic_content_import_jobs` (migration 012).
5. The mobile app sees only `approved` content via `/api/library/*`
   and `/api/public/answers`.

## Auditing

Every approval and every job event writes a row in
`islamic_content_import_events` (`event_type ∈ {job_started,
item_imported, item_rejected, item_pending_review, job_succeeded,
job_failed, job_cancelled}`). Reviewers query the table directly; the
backend does not expose a public endpoint for it.

## Status today

- Migration 012 ships the version + jobs + events tables.
- The validator script + dry-run mode ship from the earlier sprint.
- The approver admin tool: NOT WRITTEN.
- The import worker: NOT WRITTEN.
- The number of approved sources: **0**.
