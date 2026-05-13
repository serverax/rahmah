# Rahma — Ingestion Test Fixtures

**THIS DIRECTORY CONTAINS TEST-FIXTURE CONTENT ONLY. IT IS NOT PRODUCTION-APPROVED RELIGIOUS CONTENT.**

Every file under `data/islamic-sources/fixtures/` is:

1. Marked `is_test_fixture: true` in the manifest.
2. Excluded from real ingestion by the `validate-source-manifest` script when
   the `--production` flag is set.
3. Carries `verification_status: "pending_review"` — never `approved`.
4. Used solely by the Sprint 35 ingestion proof tests to exercise the
   end-to-end ingestion contract.

To request real religious content seeding, an operator must:

- Provide a sourced manifest matching `data/islamic-sources/manifest.example.json`.
- Pass the per-item checklist in `data/islamic-sources/REVIEW_POLICY.md`.
- Approve each row explicitly via the (future) review workflow.

Until then, the RAG layer remains `mode: foundation` and surfaces
`approved_sources: 0`. No fixture content from this directory will ever be
served to the public.
