# Rahma SDK Privacy Audit

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

| Dependency/SDK | Data risk | Evidence | Status |
|---|---|---|---|
| `http` | Sends API requests when configured. | `RahmaApiClient` uses build-time `API_BASE_URL`; default empty. Legacy `RAHMA_API_BASE` remains backward compatible. | PASS_WITH_DISCLOSURE |
| `sqflite`, `path`, `shared_preferences` | Local storage. | Offline/cache/settings code. | PASS |
| `flutter_secure_storage`, `local_auth` | Secure storage/biometric auth support. | `pubspec.yaml`; auth tests. | PASS_WITH_DISCLOSURE_IF_ENABLED |
| `device_info_plus` | Device/app diagnostics may identify device. | Dependency and device manager tests. | PARTIAL_DISCLOSE_IF_SENT |
| `geolocator` | Precise/approximate location. | Location service and permissions. | PASS_WITH_DISCLOSURE |
| `audioplayers` | Local asset playback. | Azan UI. | PARTIAL_AUDIO_ASSET_BLOCKED |
| `flutter_local_notifications`, `timezone` | Local notification scheduling; no push token by itself. | Notification service. | PARTIAL_REAL_DEVICE_NOT_VERIFIED |
| Ads SDK | Not found. | `pubspec.yaml` and source scan. | PASS |
| Firebase Analytics/Crashlytics | Not found. | Source/dependency scan. | PASS |
| Sentry | Not configured as SDK. | Only appears inside invalid downloaded Azan HTML asset. | PASS_AFTER_ASSET_BLOCK |
| Stripe/PayPal SDK in mobile | Not found. | Donation routes backend only; provider disabled. | PASS |

Backend-facing SDK note:
- Backend uses Fastify/PostgreSQL and internal services. No external LLM SDK or public AI provider dependency was found in the enforced backend tests.
