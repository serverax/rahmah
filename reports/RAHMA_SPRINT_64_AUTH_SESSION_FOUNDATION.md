# Sprint 64 — Auth + Session Foundation

**Date:** 2026-05-14

## What ships
- `backend/app/src/auth/{password-policy,session-service,device-service,auth-errors}.js`.
- `backend/app/src/routes/auth-session.js` — mounts `/api/auth/session/{start,refresh,logout}` + `/api/device/register`.
- 12 new tests in `sprint-64-auth-session.test.js`.

## Behaviour
- AUTH_MODE not configured → `503 auth_not_configured`.
- AUTH_MODE=external → `400 password_grant_not_supported` (the backend never accepts a password grant).
- `/session/logout` is always idempotent.
- `/device/register` validates platform + 64-hex device_hash + app_version; returns `persisted: false` when DB not configured.
- NO password / token / DSN echoed anywhere (asserted by `auth surface NEVER echoes a candidate password` test).
