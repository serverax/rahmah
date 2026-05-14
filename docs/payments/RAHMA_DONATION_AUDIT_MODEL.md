# Rahma — Donation Audit Model

**Date:** 2026-05-14

## Audit row shape

Every donation lifecycle event writes one row to `donation_audit`
(migration 010):

```sql
id           UUID PK
intent_id    UUID FK -> donation_intents.id
occurred_at  TIMESTAMPTZ
event        TEXT     -- 'intent_created' | 'provider_redirect' | 'provider_callback' | 'webhook_succeeded' | 'webhook_failed' | 'refund_initiated' | 'refund_completed'
metadata_json JSONB   -- redacted; never carries token / card data
```

## Reportable queries (operator dashboard, future)

- Daily intent counts by `cause_id` + `currency`.
- Success vs failure ratio per provider.
- Mean time-to-completion (intent → succeeded).
- Refund rate.

These queries live in the operator's Grafana / Metabase instance, not
in the Rahma repo.

## Privacy

- `email` NEVER stored next to amount. The user's identity comes from
  `user_id` (opaque UUID); the email-hash mapping lives in
  `sakina_users` only.
- IP address NEVER stored in `donation_audit`. Operator's reverse proxy
  / Traefik may log IPs separately under its own retention policy.

## Never

- Store the raw webhook payload.
- Store the provider session id without the matching `intent_id`.
- Allow `donation_audit` rows to be UPDATE-ed (append-only by convention
  + route layer; trigger-level enforcement is a future hardening).
- Expose any field of `donation_audit` to the mobile app. The mobile
  only sees `donation_intents.status`.
