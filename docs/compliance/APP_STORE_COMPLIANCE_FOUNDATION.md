# App Store / Google Play Compliance — foundation

Sprint 3 deliverable. This file is the **foundation** layer only — it documents what the Sakina/Rahmah app must include before submission to the Apple App Store or Google Play. The actual implementation (privacy / terms pages, account-deletion endpoint, data-export flow, store-listing assets) is **Sprint 11**.

Scope: Rahma/Sakina only.

---

## What this foundation already delivers

- `/ready` exposes an `app_store` block with the foundation-required flags. See `backend/app/src/routes/ready.js`.
- ConfigMap key `APP_STORE_COMPLIANCE_MODE: "true"` flips the flag on for staging. See `deployment/k3s/config/sakina-app-configmap.yaml`.
- Backend-side enforcement of the rules that bind store policies and the religious-safety policy:
  - Content reporting endpoint exists at `POST /api/public/sheikh-hasan/qa/:slug/report`.
  - Moderation gate enforced by `decideModeratorPublish` — public Q&A cannot be published auto-magically.
  - Public Q&A projection strips user identity (`publicAnswerProjection`).
- No public unmoderated chat: the assistant route `/api/ibadat/ask` is fail-closed; the scholar route `/api/sheikh-hasan/ask` stores questions privately by default and never auto-publishes.

## What's NOT done yet (Sprint 11 scope)

- Privacy policy page (web + in-app deep link).
- Terms of service page.
- Account-deletion request flow: in-app button + server endpoint + verification + retention window.
- Data-export ("download my data") endpoint.
- Push-notification consent UI + record-of-consent storage.
- Google Play Data Safety questionnaire content.
- Apple App Privacy Labels content (data types collected / linked-to-user / used for tracking).
- Age & content rating questionnaire.
- Crash-reporting / analytics opt-in toggles (if any analytics are added).
- Subscription / payment flows (if monetisation is added).
- Release checklist: build version pinning, accessibility audit, store screenshots, marketing copy.

---

## Required by Apple App Store

| Requirement | Status (Sprint 3 foundation) |
|---|---|
| Privacy policy URL | NOT DONE — page not built |
| App Privacy Labels content | NOT DONE — questionnaire not filled |
| Sign-in with Apple option (if any third-party sign-in offered) | NOT DONE — no sign-in yet; will apply if/when added |
| Account deletion in-app (Guideline 5.1.1(v)) | NOT DONE — endpoint not implemented |
| User-generated content moderation + reporting (Guideline 1.2) | FOUNDATION CREATED — backend report + moderation endpoints exist |
| Objectionable content filtering | FOUNDATION CREATED — scope classifier + citation gate block out-of-scope answers |
| Push notification consent (UNUserNotificationCenter authorization request copy) | NOT DONE |
| Age rating questionnaire | NOT DONE |

## Required by Google Play

| Requirement | Status (Sprint 3 foundation) |
|---|---|
| Privacy policy URL on store listing | NOT DONE |
| Data Safety questionnaire | NOT DONE |
| Account deletion request (Play Console + in-app) | NOT DONE |
| Content rating (IARC questionnaire) | NOT DONE |
| Permissions justifications | NOT DONE — no Android permissions requested yet |
| User-generated content moderation (UGC policy) | FOUNDATION CREATED |
| No unmoderated chat | ENFORCED — no chat surface exists; scholar Q&A flows through moderation |

## Required by religious-content safety policy

These rules are in addition to store policies — see `docs/AI_FATWA_SAFETY_POLICY_AR.md`.

- No verified source → no answer. **ENFORCED** (Sprint 5 + Sprint 7).
- No citation → no public religious answer. **ENFORCED** (Sprint 7 + Sprint 3 sheikh-answer-policy).
- No fabricated Quran/Hadith/fiqh/fatwa citation. **ENFORCED** (test `no fabricated Quran/Hadith/fiqh/scholar citation strings in backend src/`).
- Sheikh Hasan public answers require Quran/Hadith citation OR moderator approval. **ENFORCED** (Sprint 3 citation-requirement + sheikh-answer-policy).
- User identity hidden from public Q&A. **ENFORCED** (Sprint 3 publicAnswerProjection + tests).

---

## Compliance-relevant routes (current)

- `GET /ready` — exposes `app_store` block.
- `POST /api/public/sheikh-hasan/qa/:slug/report` — content reporting.
- `POST /api/sheikh-hasan/moderation/answers/:id/publish` — moderation gate (placeholder 503 until auth).
- (Future, Sprint 11) `DELETE /api/account` — account deletion request.
- (Future, Sprint 11) `GET /api/account/export` — data export.
- (Future, Sprint 11) `GET /legal/privacy` and `GET /legal/terms` — policy documents.

## When is the app ready for submission?

**NO** at the end of Sprint 3. Submission readiness is Sprint 20. Anything that calls itself "compliant" in any future status report MUST cite the specific endpoint + UI + policy document. This file is a **gap analysis** — not a compliance certificate.
