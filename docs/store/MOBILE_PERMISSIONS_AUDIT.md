# Rahma Mobile Permissions Audit

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

| Platform | Permission/key | Why needed | User-facing feature | Store disclosure needed? | Can remove? | Status |
|---|---|---|---|---|---|---|
| Android | `INTERNET` | API, RAG, readiness, content/sources. | Ask Sheikh, RAG, library/status, backend sync. | Yes, network usage. | No for backend-connected release. | PASS |
| Android | `ACCESS_FINE_LOCATION` | Precise prayer/Qibla calculation when enabled. | Prayer times, Qibla. | Yes, location optional. | Maybe, if only manual city/offline calculation is shipped. | PARTIAL |
| Android | `ACCESS_COARSE_LOCATION` | Approximate prayer/Qibla calculation. | Prayer times, Qibla. | Yes, location optional. | Maybe. | PASS |
| Android | `POST_NOTIFICATIONS` | Android 13+ prayer/Azan alerts. | Notifications. | Yes, notification permission. | No if alerts are shipped. | PARTIAL_REAL_DEVICE_NOT_VERIFIED |
| Android | `SCHEDULE_EXACT_ALARM` | Exact prayer/Azan scheduling. | Azan/prayer alerts. | Yes, exact alarm justification. | Maybe if inexact scheduling is acceptable. | PARTIAL_POLICY_RISK |
| iOS | `NSLocationWhenInUseUsageDescription` | Prayer/Qibla location. | Prayer times/Qibla. | Yes. | Maybe. | PARTIAL_IOS_NOT_BUILT |

Plugin evidence:
- `geolocator`: location.
- `flutter_local_notifications` and `timezone`: local scheduling.
- `audioplayers`: local Azan preview.
- `device_info_plus`: diagnostics/device registration.
- `local_auth` and `flutter_secure_storage`: auth/session/security support.

Removals recommended before store submission:
- If exact alarms are not essential, consider removing `SCHEDULE_EXACT_ALARM` to reduce Google Play policy risk.
- Keep location optional and explain it before requesting permission.
