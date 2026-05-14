# Rahma — Donation Security Model

**Date:** 2026-05-14

## Card data isolation

Rahma backend NEVER sees:

- Pan / CVV / track data.
- Apple Pay encrypted token.
- Google Pay encrypted token.
- Raw bank account numbers.

The mobile app delegates the payment sheet to the provider SDK. The
provider returns a token / intent id to the mobile, which forwards
only the **non-sensitive intent reference** to Rahma backend.

## What Rahma stores

`donation_intents` (migration 010):

- `user_id` (opaque UUID; null for guests)
- `amount_cents` (BIGINT)
- `currency` (3 chars)
- `cause_id` (string)
- `provider` (`disabled` / `stripe` / `paypal` / `manual_offline`)
- `status` (`intent_recorded` / `provider_disabled` / `provider_pending` / `succeeded` / `failed` / `refunded`)
- `created_at`, `updated_at`

`donation_audit` (migration 010):

- `intent_id` FK
- `event` (state-machine transition)
- `metadata_json` (redacted; never carries token / card data)

## Webhook handling (future)

Stripe webhook URL is private; the backend verifies the
`Stripe-Signature` header against the operator-supplied
`STRIPE_WEBHOOK_SECRET` (NOT in repo). Failed verification → 400.

## NEVER

- Trust the mobile client's "I succeeded" claim alone.
- Store a card token without the provider's signed verification.
- Surface a raw provider error to the user — only the safe Arabic copy
  with the `safe_message_ar` field.
- Log a webhook payload that contains email + amount together
  (privacy minimisation).

## Audit retention

All `donation_audit` rows retained at least 7 years (operator policy)
unless legally required to purge sooner.
