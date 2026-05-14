# Rahma — Content Import Runbook

**Audience:** operator (or content_reviewer role).

## What the pipeline does today

- `backend/app/src/content-import/source-registry.js` — pure validator
  for a candidate source-metadata record.
- `backend/app/src/content-import/import-job.js` — pure orchestrator
  that returns per-record decisions.
- **Decisions are never persisted by these modules.** The host (a
  future operator-side tool or admin route) reads the decisions and
  writes the rows.

## Operator workflow (when an admin tool ships)

1. Operator authors a manifest JSON (see
   `docs/content/examples/source-metadata.example.json`).
2. Operator runs the admin tool's `--dry-run` mode (NOT YET WRITTEN). The
   tool calls `processManifest(manifest, { productionMode: false })` and
   reports per-item decisions.
3. Operator inspects the per-item `decision` (`pending_review` or
   `rejected`) and the `reason` for any rejection.
4. Operator runs the admin tool's `--apply` mode (NOT YET WRITTEN)
   against the live DB; the tool writes a row to
   `islamic_source_versions` (migration 012) with the operator's
   chosen `version_label` and `verification_status = 'pending_review'`.
5. A SECOND operator-side review step flips a row to
   `verification_status = 'approved'`. Approval is NEVER automatic.
6. Approved rows become eligible for retrieval / mobile rendering.

## Hard contracts (enforced by the validator)

| Rule | Failure code |
|---|---|
| `source_type` must be in the controlled enum | `invalid_source_type` |
| `source_name_ar` must be non-empty | `missing_source_name_ar` |
| `source_reference` must be non-empty | `missing_source_reference` |
| `license_id` must be non-empty | `missing_license_id` |
| `language` must be non-empty | `missing_language` |
| `content_hash` must be 64 hex chars | `invalid_content_hash` |
| `verification_status` must NOT be `approved` on inbound | `invalid_inbound_verification_status` |
| Hadith rows must carry `authenticity_note_ar` | `missing_authenticity_note_ar` |
| Manifest with `is_test_fixture: true` is refused in production | `manifest_marked_test_fixture` |
| Per-item `is_test_fixture: true` is refused in production | `test_fixture_forbidden_in_production` |

## NEVER

- Import religious text bodies via this pipeline. Only metadata +
  checksums flow through here. Body storage is via the bulk loader
  (NOT YET WRITTEN) that reads from operator-approved offline files,
  not from the internet.
- Accept an `approved` row at the front door.
- Skip the `pending_review` → `approved` operator step.
- Trust a hash whose source file the operator hasn't verified offline.
