# Rahma — Mobile Release Checklist

## 1. App Store & Google Play Alignment
- [ ] Ensure `RAHMA_GOOGLE_PLAY_COMPLIANCE_CHECKLIST.md` is complete and all boxes are checked.
- [ ] Ensure `RAHMA_APPLE_APP_STORE_COMPLIANCE_CHECKLIST.md` is complete and all boxes are checked.
- [ ] Confirm Privacy Policy URL is live and matches in-app content.
- [ ] Confirm Data Safety labels correctly reflect the `RAHMA_PRIVACY_AND_DATA_SAFETY_MODEL.md`.

## 2. Code & Build Verification
- [x] Ensure no debug logging or console outputs leak secrets or PII.
- [ ] Confirm `flutter build apk` and `flutter build ios` complete without fatal warnings. (Workstation SDK Blocked)
- [x] Verify that `--dart-define=RAHMA_API_BASE` is correctly injected during the CI release build.
- [x] Ensure native permissions (AndroidManifest.xml, Info.plist) are strictly limited to Location and Notifications, with appropriate rationale strings.
- [x] Verify `rahma-security-scan` is PASS and root contamination removed.

## 3. Feature Verification
- [ ] **Offline Mode**: App starts and displays cached content when network is disabled.
- [ ] **Privacy Mode**: Obfuscation toggle functions correctly and hides sensitive text.
- [ ] **UGC Flow**: Submitted questions enter the pending queue and are not visible publicly.
- [ ] **Child Safety**: Game scenarios load correctly without requesting external resources or PII.

## 4. Post-Release
- [ ] Monitor crash reporting (if enabled) for immediate post-launch stability.
- [ ] Ensure admin team is prepared to process the initial influx of UGC moderation requests.
