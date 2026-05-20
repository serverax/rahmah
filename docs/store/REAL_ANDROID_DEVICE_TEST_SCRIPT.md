# Real Android Device Test Script

Status: `REAL_ANDROID_DEVICE_TEST_NOT_DONE`

Use this checklist on a physical Android phone before Google Play internal testing.

This manual test remains required even though automated CI and release-candidate workflows exist. Do not mark Google Play ready until this checklist is completed on a physical Android phone.

## Test Record

| Field | Value |
|---|---|
| Tester name |  |
| Test date/time |  |
| Device model |  |
| Android version |  |
| APK installed path | `F:\rahma\apps\mobile\build\app\outputs\flutter-apk\app-release.apk` |
| Install method | USB install / manual APK install / other |
| Test account needed? | No unless backend auth is enabled for this build |
| Backend/API URL used |  |
| Network state tested | Wi-Fi / mobile data / offline |
| Screenshot folder |  |

## Install

1. Confirm the APK path exists.
2. Install the release APK on the physical Android phone.
3. Confirm the app name is Rahma / رحمة.
4. Confirm there is no debug banner.

## Network-On Test

1. Connect the phone to the test network.
2. Open the app from a fresh install.
3. Confirm the app starts without crash.
4. Confirm Arabic RTL text is readable and not clipped.
5. Open Home screen.
6. Open Ask Sheikh Hasan screen.
7. Open Sources screen.
8. Open Verified answers screen.
9. Open Children section.
10. Open Settings.
11. Confirm privacy/terms local fallback is available if external URLs are not configured.
12. Confirm support page fallback is available if external URL is not configured.
13. Confirm no broken external link opens.
14. Confirm Azan audio is disabled cleanly and does not expose broken playback.

## Network-Off Test

1. Enable airplane mode or disconnect network.
2. Relaunch the app.
3. Confirm Home screen loads or shows a graceful local/offline state.
4. Confirm Ask Sheikh Hasan does not fake a backend answer.
5. Confirm privacy/terms local fallback remains readable.
6. Confirm support fallback remains readable.
7. Confirm no crash.

## Notification Permission Test

1. Open Settings.
2. Enable notification/prayer reminder toggle.
3. Confirm Android notification permission prompt appears when required.
4. Deny permission and confirm the app shows a graceful message.
5. Re-enable permission from Android settings.
6. Confirm the app detects or handles the permission state.

## Notification Scheduling Test

1. Enable prayer/Azan reminders.
2. Configure a near-term test reminder if available.
3. Lock the phone.
4. Wait for the scheduled time.
5. Confirm the notification appears.
6. Reopen the app from the notification if supported.
7. Force close and reopen the app.
8. Confirm no crash.

## Visual And Navigation Checks

Capture screenshots for:

- Home screen
- Ask Sheikh Hasan screen
- Sources screen
- Verified answers screen
- Children section
- Settings
- Privacy/terms local fallback
- Support fallback
- Notification permission prompt
- Azan audio disabled state

Required confirmations:

- Arabic RTL layout passes.
- No white broken screen.
- No debug banner.
- No placeholder URL is visible.
- No broken external link.
- No fake production claim.
- No crash on startup, navigation, or reopen.

## Final Result

Choose one:

- `PASS_ANDROID_REAL_DEVICE_SMOKE_TEST`
- `PARTIAL_ANDROID_REAL_DEVICE_BLOCKERS`
- `FAIL_ANDROID_REAL_DEVICE_BLOCKERS`

Notes:

```text

```
