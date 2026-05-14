# Rahma — Sheikh Access Model

**Date:** 2026-05-14

## Sheikh = a real scholar on the operator's allow-list

There are no fake Sheikh accounts. There is no "register as a Sheikh"
flow. The operator manually adds the scholar's email-hash to
`SHEIKH_ALLOWED_EMAIL_HASHES` before any sign-in attempt can succeed.

## Sheikh capabilities (per role)

| Capability | sheikh | moderator | content_reviewer | admin |
|---|---|---|---|---|
| View own queue (`GET /api/sheikh/questions`) | ✅ | — | — | ✅ |
| Read a single question (`GET /api/sheikh/questions/:id`) | ✅ | — | — | ✅ |
| Draft an answer (`POST /api/sheikh/questions/:id/answer`) | ✅ | — | — | ✅ |
| Submit for moderation (`POST /api/sheikh/answers/:id/submit`) | ✅ | — | — | ✅ |
| Approve / reject (`POST /api/admin/sheikh/answers/:id/{approve,reject}`) | — | ✅ | ✅ | ✅ |
| List privacy requests (`GET /api/admin/privacy/requests`) | — | — | ✅ | ✅ |
| Complete privacy request (`POST .../complete`) | — | — | ✅ | ✅ |
| Manage charity causes (when wired) | — | — | — | ✅ |

## Onboarding a new Sheikh (operator-side)

1. Operator confirms scholar's identity offline.
2. Operator computes `sha256(lower(trim(email)))`.
3. Operator updates the `SHEIKH_ALLOWED_EMAIL_HASHES` value in the
   `rahma-api-secrets` Kubernetes Secret (no repo edit).
4. Operator rolls the `rahma-api` Deployment so the new env value is
   in-process.
5. Operator records the onboarding in their offline audit log (NOT in
   this repo).
6. Sheikh signs in via OIDC; backend now permits the role.

## Off-boarding

1. Operator removes the email hash from `SHEIKH_ALLOWED_EMAIL_HASHES`.
2. Operator rolls the Deployment.
3. Any cached token the user holds becomes worthless on the next
   request — the backend re-checks the allow-list on every request,
   not just at sign-in.

## What a Sheikh CANNOT do

- Approve their own answers (only `content_reviewer` / `moderator` /
  `admin` can publish).
- Publish without ≥1 Quran / Hadith citation (citation gate refuses).
- See another asker's identity (the projection never exposes
  `user_id`).
- Delete an answer once published (rejection produces a new audit row,
  the original row stays for forensic purposes).

## What an admin CANNOT do (without explicit operator action)

- Bypass the citation gate.
- Bypass the moderation gate.
- Issue a token directly — auth always flows through the OIDC
  provider.
- Delete audit log rows.
