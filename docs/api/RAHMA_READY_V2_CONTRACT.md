# Rahma — /ready v2 Contract

**Date:** 2026-05-14
**Endpoint:** `GET /ready`
**Schema version:** `2` (returned as `readiness_schema_version: "2"`)

## What changed vs v1

| Field | v1 | v2 |
|---|---|---|
| `readiness_schema_version` | absent | `"2"` |
| `public_ingress` | `"disabled"` string | string PLUS `public_ingress_state: { disabled, status }` |
| `wasm` | `{ configured, modules[] }` | adds 4 per-module sub-objects: `fatwa_policy_gate`, `quran_hadith_citation`, `child_safety`, `content_rule_engine` |
| `islamic_sources` | absent | `{ configured, approved_sources }` |
| `donations` | absent | `{ configured, provider }` |
| `blockers` | 8 codes | adds `donations_provider_not_configured` |

## Full v2 shape (key fields)

```json
{
  "ok": true,
  "readiness_schema_version": "2",
  "service": "rahma-api",
  "legacy_service_name": "sakina-backend",
  "platform": "mobile-only",
  "public_ingress": "disabled",
  "public_ingress_state": { "disabled": true, "status": "disabled" },
  "version": "0.1.0",
  "git_commit": null,
  "production_ready": false,
  "blockers": [
    "auth_not_configured",
    "database_not_configured",
    "redis_not_configured",
    "wasm_not_configured",
    "rag_foundation_only",
    "sheikh_repository_not_configured",
    "no_approved_islamic_sources",
    "donations_provider_not_configured"
  ],
  "database": { "configured": false, "connected": false, "..." },
  "redis":   { "configured": false, "reachable": null },
  "wasm": {
    "configured": false,
    "modules": [ "..." ],
    "fatwa_policy_gate":     { "configured": false, "reachable": null },
    "quran_hadith_citation": { "configured": false, "reachable": null },
    "child_safety":          { "configured": false, "reachable": null },
    "content_rule_engine":   { "configured": false, "reachable": null }
  },
  "islamic_sources": { "configured": false, "approved_sources": 0 },
  "donations":       { "configured": false, "provider": "disabled" }
}
```

## Mobile client contract

- The mobile app MUST read `readiness_schema_version`. Unknown
  versions are forward-compatible: ignore fields you don't recognize.
- `production_ready: false` is the ONLY indicator that the operator
  has not yet wired all subsystems. The mobile app MUST treat any
  `false` here as "service being prepared" — never render network
  features that depend on a blocker'd subsystem.
- `reachable: null` for redis / wasm modules means **probe not
  implemented yet**. It is NOT a "reachable" claim.
- `donations.configured` reflects `DONATION_PROVIDER` env on the
  cluster ConfigMap or Secret. When `false`, the donations screen
  shows the "service غير مفعّلة بعد" copy.

## NEVER leaks (asserted by `sprint-62-ready-v2.test.js`)

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- Any OIDC client secret
- Any DSN host / username / password

## Mobile usage notes

- Call `/ready` on cold start. Cache the snapshot for 5 minutes; refresh on pull-to-refresh.
- Treat `wasm.<module>.reachable === null` as "do not assume the gate is operative". Defer Sheikh-publish flows when this is null.
- Treat `donations.configured === false` as "hide the donation tile".
