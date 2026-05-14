# Rahma — Auth Implementation Foundation

**Date:** 2026-05-14
**Status:** modules shipped; live auth provider OPERATOR-PENDING.

## What ships

| Module | Purpose |
|---|---|
| `backend/app/src/auth/password-policy.js` | length + class + breach-substring rule set. Used only when AUTH_MODE supports a local-password flow (rarely). |
| `backend/app/src/auth/session-service.js` | pure decision helpers for session start / refresh / logout. Returns `auth_not_configured` until OIDC is wired. |
| `backend/app/src/auth/device-service.js` | validates device registration shape; refuses bad platform / hash. |
| `backend/app/src/auth/auth-errors.js` | canonical error shape (`error` code + `safe_message_ar`). |
| `backend/app/src/routes/auth-session.js` | mounts `/api/auth/session/{start,refresh,logout}` + `/api/device/register`. |

## Hard rules

- The backend NEVER accepts a password grant. `POST /api/auth/session/start` returns:
  - `503 auth_not_configured` when `AUTH_MODE != external` or `SESSION_SECRET` is missing
  - `400 password_grant_not_supported` when `AUTH_MODE = external`
- The backend NEVER echoes a candidate password / token. Tested by
  `sprint-64-auth-session.test.js`.
- Refresh-token flow is operator-OIDC dependent. Today `/session/refresh`
  returns `401 session_expired` because no token is present.
- `/session/logout` is always idempotent and returns `200 acknowledged`.
- Device hash MUST be 64 hex chars (sha-256). Raw device IDs NEVER reach the backend.

## Wire OIDC (operator-side, NOT today)

1. Operator picks the IdP (Keycloak / Auth0 / Cognito / Authelia / etc.).
2. Operator sets env vars in `rahma-api-secrets`:
   - `AUTH_MODE=external`
   - `SESSION_SECRET` (≥32 bytes)
   - `OIDC_ISSUER` (`https://…`)
   - `OIDC_CLIENT_ID`
   - `OIDC_CLIENT_SECRET`
   - `SHEIKH_ALLOWED_EMAIL_HASHES` (comma-separated sha-256 hex)
   - `ADMIN_ALLOWED_EMAIL_HASHES`
3. Operator rolls `rahma-api` to pick up the new env.
4. Operator wires the mobile-app OIDC flow (Authorization Code + PKCE).
5. Backend's token-verification middleware (NOT YET WRITTEN) validates
   `iss`, `aud`, `exp`, `email_verified`, then compares the email hash
   against the role allow-list.

## Audit

Every auth-gated decision writes a row to `audit_events` (migration 008)
with: `actor_kind`, `actor_email_hash`, `event_type`,
`metadata_json` (redacted), `ip_hash`. NEVER raw email. NEVER raw token.
