# Rahma — Auth Contract (Mobile)

**Date:** 2026-05-14

Rahma uses an env-driven, fail-closed auth model. The backend never
fabricates a session. The mobile app discovers the current state via
`GET /api/auth/status`.

## Modes

| `AUTH_MODE` | Behaviour |
|---|---|
| `not_configured` (default) | every protected route returns `503 auth_not_configured` |
| `dev_local` | TEST-ONLY. Reads an `x-sakina-test-principal` JSON header. Active only when `NODE_ENV=test` or `SAKINA_ALLOW_DEV_AUTH=true`. The mobile app never sends this header. |
| `external` | Operator-supplied OIDC. Requires `SESSION_SECRET`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`. Mobile app obtains a JWT from the OIDC provider and sends it as `Authorization: Bearer <jwt>`. |

## Roles

| Role | What it can do |
|---|---|
| `public_user` (no token) | read public endpoints, submit a question, get game status |
| `user` | future — authenticated mobile user features |
| `sheikh` | view pending queue, draft + submit answers (with citation) |
| `moderator` | moderate sheikh submissions |
| `content_reviewer` | approve/reject sheikh answers; review privacy requests |
| `charity_admin` | (future) manage donation causes |
| `admin` | superset |

Role assignment happens at the OIDC provider; the backend maintains
allow-lists of sha-256 email hashes per role.

## Status response (no secrets)

```http
GET /api/auth/status
```

```json
{
  "ok": true,
  "auth_configured": false,
  "mode": "not_configured",
  "provider": null,
  "sheikh_login_enabled": false,
  "admin_login_enabled": false,
  "roles_supported": ["public_user","user","sheikh","moderator","content_reviewer","charity_admin","admin"],
  "oidc": {
    "issuer_configured": false,
    "client_id_configured": false,
    "client_secret_configured": false
  },
  "safe_message_ar": "تسجيل دخول الشيخ غير مفعل بعد"
}
```

`provider` is a safe display name like `oidc-keycloak` — operator chooses
it via `AUTH_PROVIDER`. NO secret is ever included here.

## Mobile sign-in flow (when AUTH_MODE=external)

1. Mobile app opens `OIDC_ISSUER` discovery URL.
2. User authenticates with the IdP.
3. App receives an ID token + access token from the IdP.
4. App sends `Authorization: Bearer <access_token>` to Rahma API.
5. API verifies the token using the OIDC issuer's JWKS.
6. API computes `sha256(lower(trim(email)))` from the token's `email` claim.
7. API checks the email hash against the role allow-list (`SHEIKH_ALLOWED_EMAIL_HASHES`, `ADMIN_ALLOWED_EMAIL_HASHES`).
8. If allowed, the request proceeds; otherwise 403.

## Error codes

| Code | Meaning | Mobile UX |
|---|---|---|
| `503 auth_not_configured` | server has no auth wired | show "feature being prepared" banner |
| `401 unauthenticated` | missing / invalid token | redirect to sign-in |
| `403 forbidden` | token valid but wrong role | "you don't have access to this section" |

## What we NEVER do

- Store a plaintext password.
- Echo a token, password, or DSN in any response.
- Trust a `Bearer` token whose issuer doesn't match `OIDC_ISSUER`.
- Auto-promote a role.
- Hardcode an admin password.
