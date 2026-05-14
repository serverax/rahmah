# Rahma — Sheikh Hasan Workflow API v1

**Date:** 2026-05-14
**Status:** service-layer logic shipped; live persistence operator-pending.

## Pipeline

```
user → POST /api/sheikh/questions       (anonymous, foundation)
         ↓
sheikh (role=sheikh) → GET /api/sheikh/questions
         ↓
sheikh → POST /api/sheikh/questions/:id/answer  (must include citation)
         ↓
content_reviewer / moderator / admin → POST /api/admin/sheikh/answers/:id/{approve, reject}
         ↓
public → GET /api/public/sheikh-hasan/qa  (published + cited only)
```

The new v1 service modules (`backend/app/src/services/{sheikh-workflow,citation-policy}-service.js`) enforce these gates:

1. **Auth required.** Every Sheikh route returns `auth_not_configured` until OIDC is wired.
2. **Citation required.** Public answers MUST have ≥1 citation of type `quran` or `hadith`. `scholar_note`-only and `fiqh`-only route through moderation; empty citations are refused outright.
3. **WASM gates.** Publishing requires BOTH `wasm.fatwa_policy_gate.reachable` AND `wasm.child_safety.reachable` to be true. When either is unreachable, publishing is blocked with a specific reason.
4. **Persistence honesty.** When DB is not configured, the service returns `persisted: false` and never fakes a publish.

## Test coverage

`backend/app/test/sprint-65-sheikh-workflow-v1.test.js` — 9 cases:

- listPending refuses without auth
- listPending refuses without repo
- answerDraft refuses empty citation
- answerDraft accepts quran-cited public draft (persisted=false when no DB)
- publish refuses scholar_advice_needs_review
- publish refuses if fatwa-gate unavailable
- publish refuses if child-safety unavailable
- publish accepts with all gates green (persisted=false; repo INSERT not wired)
- publish refuses without auth configured

## Forbidden by design

- No fake Sheikh identity.
- No publish without citation.
- No public publish without `quran_cited` / `hadith_cited` / `quran_and_hadith_cited`.
- No publish if either WASM gate is unreachable.
- No raw email / token / DSN in any error payload.

## Operator-pending

- Mobile OIDC + email-hash allow-lists.
- Repository INSERT / UPDATE wiring (today the service layer returns `persisted: false`).
- Live WASM gate URLs (env vars consumed by `/ready` v2 and the workflow service).
