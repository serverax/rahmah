# Rahma — Donation Provider Decision

**Date:** 2026-05-14
**Status:** plan. Provider remains **disabled** by default until operator picks one.

## Options compared

| Provider | Card data ever in our backend? | Apple Pay / Google Pay | Recurring donations | Fees | Notes |
|---|---|---|---|---|---|
| **Stripe (recommended)** | No (Stripe-hosted Elements) | Yes via Stripe | Yes | ~2.9% + $0.30 + Apple/Google fee | Mature SDKs, strong webhook story |
| PayPal / Braintree | No | Yes (Braintree) | Yes | ~2.9% + $0.30 | Multi-region; UX friction |
| Apple Pay only / Google Pay only | No | Yes | Limited | Apple/Google rates | Forces native flow; cross-platform pain |
| Direct charity gateway (e.g. JustGiving / Sadaqa-specific provider) | depends | depends | depends | varies | Operator must confirm SAR/AED handling |

## Recommendation: **Stripe**

- Backend never sees card data. Mobile uses Stripe's PaymentSheet
  (Android: PaymentSheetActivity; iOS: STPPaymentSheet). Backend gets
  a `PaymentIntent` ID + a webhook on success.
- Apple Pay + Google Pay flow through Stripe's PaymentSheet without
  extra integration code.
- Strong audit trail on Stripe's side; we mirror only the intent +
  result rows into `donation_intents` / `donation_audit`.

## Hard rules (independent of provider choice)

- Card / bank / account / token data NEVER passes through Rahma backend.
- Provider stays `DONATION_PROVIDER=disabled` until operator pushes a
  Secret update with the real provider value.
- Mobile screen shows "خدمة التبرع غير مفعّلة بعد" while provider is
  disabled.
- Every donation intent — recorded or not — surfaces `persisted: false`
  until the repository INSERT lands (operator-side decision).

## Operator action to wire Stripe

1. Sign up Stripe account with proper org (not personal).
2. Create restricted API keys: `sk_test_*` for staging, `sk_live_*` for production. Store ONLY in `rahma-api-secrets` (`STRIPE_SECRET_KEY` key).
3. Set `DONATION_PROVIDER=stripe` in `rahma-api-secrets` (or as a non-secret env via ConfigMap if the operator prefers).
4. Set the webhook URL once the public ingress is live (NOT today). Until then donations remain disabled.
5. Configure Stripe Connect or Stripe-direct-charge model (operator-decided).
6. Add a Stripe MobilePaymentSheet integration in the Flutter app. NOT done today.

## What this repo does NEVER

- Store full card numbers / CVV / track-2 data.
- Implement PCI-DSS scope expansion via custom card forms.
- Save Stripe customer ids next to email plain — only the hash.
- Trust the mobile client's "succeeded" claim — always verify via Stripe
  webhook.
