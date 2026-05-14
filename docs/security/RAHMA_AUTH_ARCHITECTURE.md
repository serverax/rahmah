# Rahma — Auth Architecture

**Date:** 2026-05-14
**Scope:** mobile API + Sheikh / admin sign-in. Public users do NOT
sign in.

## Modes

| `AUTH_MODE` | Behaviour |
|---|---|
| `not_configured` (default) | Backend ships safe; every protected route returns `503 auth_not_configured` |
| `dev_local` | TEST ONLY. Requires `NODE_ENV=test` OR `SAKINA_ALLOW_DEV_AUTH=true`. Reads `x-sakina-test-principal` JSON header. Mobile app never sends this header. |
| `external` | Operator-supplied OIDC provider. Mobile obtains an access token from the IdP and sends `Authorization: Bearer <jwt>` on every request that requires a principal. |

## OIDC contract (when `AUTH_MODE=external`)

Required env vars (none stored in repo):

- `SESSION_SECRET` — ≥32 bytes; signs server-side session ids if used.
- `AUTH_PROVIDER` — safe display name like `oidc-keycloak`.
- `OIDC_ISSUER` — `https://` URL (the discovery doc origin).
- `OIDC_CLIENT_ID` — opaque string.
- `OIDC_CLIENT_SECRET` — operator-supplied; backend uses it for the
  confidential-client refresh flow.
- `SHEIKH_ALLOWED_EMAIL_HASHES` — comma-separated sha-256 hex of the
  emails permitted to authenticate as a `sheikh`.
- `ADMIN_ALLOWED_EMAIL_HASHES` — same shape for `admin`.

## Flow

```
mobile app                       IdP                       Rahma API
──────────                       ──                        ──────────
1. user taps "Sign in as Sheikh"
   → opens OIDC authorize URL
                            ←→ (operator-chosen IdP)
2. IdP redirects with code
3. app exchanges code → access_token (PKCE)
4. app sends Authorization: Bearer <token>
                                                       5. API verifies token via OIDC_ISSUER's JWKS
                                                       6. API extracts `email` claim, computes
                                                          sha256(lower(trim(email)))
                                                       7. API checks the hash against the role
                                                          allow-list and binds req.sakina_principal
                                                       8. Route handler enforces the role gate
```

## Role enforcement

The backend uses `requireAuth([roles])` from
`backend/app/src/auth/auth-middleware.js`. The role list is exhaustive:

- `public_user` (no token; never authenticates)
- `user` (mobile user with login when enabled)
- `sheikh`
- `moderator`
- `content_reviewer`
- `charity_admin`
- `admin`

## Mobile session security

- The access token is held in memory only.
- The refresh token is stored in the device keystore (Android Keystore
  / iOS Keychain) — never in shared preferences / NSUserDefaults
  in plain.
- The mobile client never logs the token.
- On token expiry, the app silently uses the refresh token to obtain a
  new access token. If refresh fails, the app drops the session and
  navigates to `/sheikh/login`.

## Backend safety

- Backend NEVER stores a plaintext password.
- Backend NEVER returns a token in any response.
- Backend never logs tokens.
- Backend never accepts a `password` grant — `POST /api/sheikh/login`
  returns `400 password_grant_not_supported` when `AUTH_MODE=external`.
- Backend rejects tokens whose `iss` doesn't match `OIDC_ISSUER`.
- Backend rejects tokens with expired `exp`.
- Backend rejects tokens for emails not on the role allow-list.

## Audit

Every auth-gated decision (allow / deny / token-rejected / role-denied)
writes a row to `audit_events` (migration 008) with `actor_kind`,
`actor_email_hash`, `event_type`, and `ip_hash`. NO raw email, NO IP
address, NO token contents.
