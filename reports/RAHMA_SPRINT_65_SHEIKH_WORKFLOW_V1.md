# Sprint 65 — Sheikh Workflow v1

**Date:** 2026-05-14

## What ships
- `backend/app/src/services/{sheikh-workflow,citation-policy}-service.js`.
- 9 new tests in `sprint-65-sheikh-workflow-v1.test.js`.

## Decisions enforced
- `listPending`: auth required + repo configured.
- `answerDraft`: insufficient citation refused. quran-cited public draft without DB → `persisted: false` + `database_not_configured`.
- `publish`: refuses `scholar_advice_needs_review`. Refuses if fatwa-gate or child-safety WASM is unreachable. When all gates green, returns `persisted: false` because the repo INSERT is not yet wired.

## No fake approvals
- The service NEVER auto-promotes an answer to `published_public` without explicit gates.
- No fake Sheikh identity. No fake citation_status promotion.
