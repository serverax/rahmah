# Rahma Donation And Charity Policy Audit

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

| Area | Evidence | Status | Required action |
|---|---|---|---|
| Donation/payment provider | Backend defaults to disabled; `/ready` reports `donations_provider_not_configured`. | PASS_NOW | Keep payment buttons disabled in production unless provider is configured. |
| Mobile payment SDK | No Stripe/PayPal mobile SDK found. | PASS | No in-app payment disclosure needed for current disabled state. |
| Fake payment success | Backend tests assert no fake success. | PASS | Keep tests. |
| Charity/legal entity wording | No verified charity registration evidence found. | PARTIAL | Do not claim official charity/fundraising status. |
| External payment/link risk | Web has sadaqah page; provider disabled. | PARTIAL | Ensure disabled UI states are clear before store submission. |
| Apple IAP risk | Donations/charity can trigger App Review scrutiny. | PARTIAL_APPLE | If enabled later, verify Apple charity/fundraising rules before release. |

Current store wording:
- Use "Donation features are not active in this release" unless a lawful configured provider and review evidence are present.
