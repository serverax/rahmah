# Rahma Azan Real Android Device Readiness

## Current truth
- Local Azan UI and audio selection exist.
- Bundled audio files are present under `apps/mobile/assets/audio/azan/`.
- Final production approval still requires license evidence, checksum record, and real Android notification playback testing.

## Required manual Android tests
Run on a physical Android device, not emulator-only:

1. Install debug APK.
2. Open Rahma and grant notification permission.
3. Select each approved Azan audio and confirm preview plays.
4. Schedule a near-future Azan test while the app is open.
5. Repeat while app is backgrounded.
6. Repeat after swiping/killing the app.
7. Repeat with phone locked.
8. Test notification permission denied path.
9. Test battery optimisation unrestricted/restricted.
10. Test Do Not Disturb on/off.
11. Reboot phone and confirm scheduled notification behaviour.
12. Record Android version, OEM, battery policy, and observed result.

## Android limitations
Exact alarms and background execution are device/OEM dependent. Do not claim final PASS until the above matrix succeeds on at least one target Android device and ideally two OEMs.
