# Google Play Data Safety Draft

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Official basis: Google requires complete and accurate Data Safety declarations for data collected by the app and SDKs, including data sent off device, SDK collection, encryption in transit, and deletion mechanisms.

| Data type | Collected? | Shared? | Purpose | Required/optional | Encrypted in transit? | Deletion? | Code evidence | Status |
|---|---:|---:|---|---|---|---|---|---|
| Name | No | No | Not used in current mobile flows. | N/A | N/A | N/A | No name field in mobile API client. | PASS |
| Email | Partial/conditional | No third-party sharing found | Support, deletion, auth if enabled. | Optional unless auth is enabled. | Must be HTTPS in production. | Yes, deletion request page exists. | `privacy.html`, auth/support/deletion routes/docs. | PARTIAL |
| User questions/messages | Yes when API configured | No third-party sharing found | Ask Sheikh, RAG answer, moderation, scholar review, audit. | Optional feature. | Must be HTTPS in production. | Yes by request, subject to moderation/audit rules. | `RahmaApiClient.ragQuery`, `submitQuestion`, backend Ask/RAG routes. | PASS_WITH_DISCLOSURE |
| Device identifiers | Conditional | No third-party sharing found | Device registration, security/session, push if enabled. | Optional/conditional. | Must be HTTPS in production. | Yes by request. | `device_info_plus`, `/api/device/register`. | PARTIAL |
| Crash logs | No | No | No crash SDK configured. | N/A | N/A | N/A | `pubspec.yaml` scan found no crash SDK. | PASS |
| Diagnostics | Conditional | No third-party sharing found | App readiness, support, device/app status. | Optional/operational. | Must be HTTPS. | Yes by request where user-linked. | device/status routes, device_info_plus. | PARTIAL |
| App interactions | Conditional | No third-party sharing found | Offline sync, feature status, safety audit. | Optional/operational. | Must be HTTPS. | Yes by request where user-linked. | backend audit tables, RAG audit, sync/status routes. | PARTIAL |
| Location | Yes if user enables | No third-party sharing found | Prayer times, Qibla, mosque/location features. | Optional. | Must be HTTPS if sent to backend. | Yes by disabling/deletion request. | Android/iOS location permissions; geolocator dependency. | PASS_WITH_DISCLOSURE |
| Audio | No user audio collected | No | Local Azan playback only. | N/A | N/A | N/A | audioplayers dependency, local assets. | PASS |
| Photos/media/files | No | No | Not used. | N/A | N/A | N/A | No camera/media picker deps found. | PASS |
| Push notification token | Not currently configured | No | Future push notifications. | Optional if enabled. | Must be HTTPS. | Yes by disabling/deletion request. | `/ready` says push production false; no FCM configured. | PARTIAL |
| Payment/donation data | No current live collection | No | Donation provider disabled. | N/A | N/A | N/A | backend `DONATION_PROVIDER` disabled by default. | PASS_NOW |

Security practices draft:
- Data is not sold.
- Production API must use HTTPS.
- Deletion mechanism exists as web/mobile policy, but final public URL/contact is still required.
- No ads SDK currently detected.

Blockers before Google Play PASS:
- Replace placeholder contact/support email and privacy URL.
- Decide whether target audience includes children; if yes, complete Families compliance. Recommended current listing: general audience, not directed to children, with a children/family educational section.
- Real-device notification testing not complete.
- Azan audio is not production-ready.


