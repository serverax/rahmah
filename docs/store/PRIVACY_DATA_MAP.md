# Rahma Privacy Data Map

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Scope: Rahma mobile app, Rahma web pages, and Rahma API.

| Data area | Actual behavior from code | Storage | Store disclosure |
|---|---|---|---|
| User questions/messages | Mobile sends Ask/RAG questions to `/api/ask-sheikh/*` and `/api/rag/query` when `API_BASE_URL` is configured. Backend may store questions for review/audit/public Q&A. | Backend DB when configured; otherwise unavailable/local-only states. | Disclose as user-generated content/messages collected for app functionality, safety, moderation, and support. |
| Name | No mobile field found for name in current app flow. | Not collected in current mobile UI. | No, unless future auth/profile adds it. |
| Email | Support/deletion flows may collect email; auth may require email hashes if enabled. | Backend support/privacy/auth tables when configured. | Disclose if support/account/deletion is enabled in production. |
| Location | Android/iOS permission declared; app uses geolocator for prayer/Qibla features when user enables location. | Current mobile prefs store location toggle; backend prayer calls can receive coordinates. | Disclose approximate/precise location as optional app functionality. |
| Device identifiers | `device_info_plus`, device registration endpoints, and local auth/device flows exist. | Backend if device registration is enabled; local otherwise. | Disclose device/app diagnostics or identifiers if registration/push is enabled. |
| Push token | Push production is not configured now; notification code exists. | Future backend if FCM/APNs enabled. | Mark not collected for current release unless push token registration is enabled. |
| Payment data | Donation provider disabled by default; backend refuses fake success. | None in current release. | Do not disclose payment data unless live provider is enabled. |
| Analytics/crash logs | No Firebase Analytics, Crashlytics, Sentry, Ads SDK, or similar mobile SDK found in `pubspec.yaml`. | Not configured. | Mark not collected. |
| Audio/photos/files | App bundles Azan audio assets and plays local audio. No user media upload found. | App asset only. | No user audio/photos/files collection. |
| Children data | Children feature is educational; no child profile PII should be requested. | Game progress may be local/backend depending feature path. | General audience with parental guidance unless Families target is deliberately selected. |

Known blockers:
- Production support email and privacy URL are placeholders.
- Real-device notification behavior is not verified.
- Azan approved audio is blocked because local asset files are invalid/non-audio.
