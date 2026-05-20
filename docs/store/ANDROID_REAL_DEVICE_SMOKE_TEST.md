# Android Real Device Smoke Test

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Status: `BLOCKER_ANDROID_REAL_DEVICE_NOT_TESTED`

No physical Android device was detected in this environment. `flutter devices` showed only Windows, Chrome, and Edge.

## Required Test Record

| Field | Value |
|---|---|
| Device model | NOT_TESTED |
| Android version | NOT_TESTED |
| APK path installed | `F:\rahma\apps\mobile\build\app\outputs\flutter-apk\app-release.apk` |
| Test date/time | NOT_TESTED |
| Result | `BLOCKER_ANDROID_REAL_DEVICE_NOT_TESTED` |
| Screenshots path | `docs/screenshots/rahma-ui-ux/` existing web/mobile-widget screenshots only; no physical-device screenshots captured. |

## Required Manual Checks

| Check | Status |
|---|---|
| Fresh install | NOT_TESTED |
| App opens | NOT_TESTED |
| Arabic RTL layout | NOT_TESTED_ON_DEVICE |
| English layout if bilingual exists | NOT_TESTED_ON_DEVICE |
| Home navigation | NOT_TESTED_ON_DEVICE |
| Ask Sheikh Hasan screen | NOT_TESTED_ON_DEVICE |
| Sources screen | NOT_TESTED_ON_DEVICE |
| Verified answers screen | NOT_TESTED_ON_DEVICE |
| Children section | NOT_TESTED_ON_DEVICE |
| Settings | NOT_TESTED_ON_DEVICE |
| Privacy and terms pages | NOT_TESTED_ON_DEVICE |
| Offline/no internet behaviour | NOT_TESTED_ON_DEVICE |
| Backend unavailable behaviour | NOT_TESTED_ON_DEVICE |
| Notification permission flow | NOT_TESTED_ON_DEVICE |
| Azan notification scheduling | NOT_TESTED_ON_DEVICE |
| Audio playback if enabled | DISABLED_FOR_RELEASE |
| No crash on app start | NOT_TESTED_ON_DEVICE |
| No debug banners | NOT_TESTED_ON_DEVICE |
| No placeholder text visible | NOT_TESTED_ON_DEVICE |
| No broken external links | NOT_TESTED_ON_DEVICE |

## Command Evidence

```text
Found 3 connected devices:
  Windows (desktop)
  Chrome (web)
  Edge (web)
```
