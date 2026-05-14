# Rahma — Mobile Session Security

**Date:** 2026-05-14

## Token handling

| Token | Location on device | TTL |
|---|---|---|
| Access token | in memory only | ≤ 60 min |
| Refresh token | OS keystore (Android Keystore / iOS Keychain) | operator-chosen at IdP |
| Session id (optional, if backend issues one) | OS keystore | shorter than refresh token |

## Mobile rules

1. NEVER write a token to a plain file or shared preferences.
2. NEVER log a token. Logging libraries are configured to refuse
   `Authorization` headers and any string field named
   `*_token`, `password`, `secret`.
3. NEVER include a token in error messages shown to the user.
4. Refresh in a single background coroutine; refuse parallel refresh
   attempts.
5. On refresh failure → drop session → navigate to sign-in.
6. On 401 from API → drop session.
7. On 403 → keep session; render "permission denied" Arabic copy.

## Device registration (when enabled)

- Mobile app computes `sha256(<device_id>)` where `<device_id>` is the
  OS-provided identifier (Android: `ANDROID_ID`, iOS: `identifierForVendor`).
- It sends the hash to `POST /api/devices/register` (planned route).
  Server stores only the hash, not the raw id.

## App lock (optional, operator-decided)

- Biometric or PIN lock after 5 minutes of background.
- Local-only; the lock state does not surface to the backend.

## Logout

- The "Sign out" affordance clears the in-memory access token AND
  drops the refresh token from the keystore.
- The app does NOT contact the backend on sign-out — the next API
  request will simply 401 and the user will re-authenticate.

## Backend safety

The backend re-checks the role allow-list **on every request**, not
just at sign-in. This means:

- Removing an email hash from `SHEIKH_ALLOWED_EMAIL_HASHES` takes
  effect on the next request after the Deployment rolls.
- A leaked token cannot be used to escalate after the operator removes
  the email hash.

## Audit

Every sign-in success, sign-in failure, role-deny, and silent
token-refresh-fail writes a row to `audit_events` with:

- `actor_kind`: one of `public_user`, `authenticated_user`, `sheikh`,
  `moderator`, `content_reviewer`, `charity_admin`, `admin`, `system`.
- `actor_email_hash`: sha-256 of the email claim (never the raw email).
- `event_type`: `auth.signin_success` / `auth.signin_failure` /
  `auth.role_denied` / `auth.token_refresh_failed`.
- `ip_hash`: sha-256 of the client IP (never raw IP).
- `metadata_json`: redacted (no tokens, no DSNs).

## NEVER

- Store a token in localStorage / SharedPreferences / UserDefaults.
- Cache a token in disk encryption that uses an app-side key alone (the
  keystore-backed approach is required).
- Forward a token to any third-party SDK.
- Send a token to any host other than the configured `RAHMA_API_BASE`.
