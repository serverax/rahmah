# Rahma — `/ready` Contract

**Date:** 2026-05-14
**Endpoint:** `GET /ready`
**Audience:** mobile app + cluster probes + operator dashboards.

`/ready` is the single source of truth for "is the API fit to serve?".
It is **always reachable** when the process is up, but the body carries
the honest blocker list. Mobile must NOT treat `production_ready: true`
as implicit — every field is explicit.

## Shape

```json
{
  "ok": true,
  "service": "rahma-api",
  "legacy_service_name": "sakina-backend",
  "platform": "mobile-only",
  "public_ingress": "disabled",
  "version": "0.1.0",
  "git_commit": "abc1234...",
  "production_ready": false,
  "blockers": [ "auth_not_configured", "database_not_configured", "..." ],
  "database": {
    "configured": false,
    "connected": false,
    "checked": false,
    "error_type": null,
    "migration_table_exists": false,
    "applied_migrations_count": 0,
    "pending_migrations_count": null
  },
  "redis":   { "configured": false, "reachable": null },
  "wasm":    {
    "configured": false,
    "modules": [
      { "name": "fatwa-policy-gate",      "configured": false, "reachable": null },
      { "name": "quran-hadith-citation",  "configured": false, "reachable": null },
      { "name": "child-safety",           "configured": false, "reachable": null },
      { "name": "content-rule-engine",    "configured": false, "reachable": null }
    ]
  },
  "auth":   { "configured": false, "mode": "not_configured" },
  "rag":    { "mode": "foundation", "approved_sources": 0, ... },
  "...": "see backend source for the full set"
}
```

## Field rules

| Field | Source | Rule |
|---|---|---|
| `service` | constant | `"rahma-api"` |
| `legacy_service_name` | constant | `"sakina-backend"` (the older identifier for historical compatibility) |
| `platform` | constant | `"mobile-only"` |
| `public_ingress` | constant | `"disabled"` until operator applies the parked ingress |
| `version` | `APP_VERSION` env | safe display string, defaults `"0.1.0"` |
| `git_commit` | `GIT_COMMIT` or `GITHUB_SHA` | accepted only if it matches `^[a-f0-9]{7,40}$`; otherwise `null` |
| `database.configured` | `Boolean(process.env.DATABASE_URL)` | the URL itself is NEVER echoed |
| `database.connected` | tiny `SELECT 1` probe, 1.5s timeout | `false` on timeout / unreachable; the error is reduced to a coarse `error_type` |
| `redis.configured` | `Boolean(process.env.REDIS_URL)` | URL never echoed |
| `redis.reachable` | not implemented yet | `null` (not lying with true/false) |
| `wasm.modules[].configured` | env var per module | URLs never echoed |
| `wasm.modules[].reachable` | not implemented yet | `null` |
| `production_ready` | derived | `true` only when blockers array is empty |
| `blockers` | derived list | one of: `auth_not_configured`, `database_not_configured`, `database_not_connected`, `redis_not_configured`, `wasm_not_configured`, `rag_foundation_only`, `sheikh_repository_not_configured`, `no_approved_islamic_sources` |

## NEVER leaked

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- OIDC client secret
- Any DSN, password, or hash

Tests in `backend/app/test/sprint-42-ready-hardening.test.js` assert
this with deliberately distinctive leak markers in the env vars.

## Mobile usage

- On cold start, the mobile app fetches `/ready` once.
- If `production_ready: false`, show a soft "service is being prepared"
  banner. Mobile MAY still render local-only features (children's game).
- If `blockers` contains `auth_not_configured`, hide the
  Sheikh-login button.
- If `blockers` contains `no_approved_islamic_sources`, hide the Quran /
  Hadith / Dua tiles' "browse" affordance (the catalogues are empty).
- Always render the `version` + `git_commit` (when present) in the
  "About" screen footer for support triage.

## Operator usage

- Cluster readiness probe (`readinessProbe.httpGet.path: /ready`) keeps
  the pod out of the Service until `/ready` returns 200 — which it does
  even when blockers are present. The blocker array drives human
  attention, not pod scheduling.
- An operator dashboard SHOULD render the blocker list as a checklist.

## Versioning

This contract may add new fields. It will not remove or rename existing
fields without a major bump. The mobile client should ignore unknown
fields.
