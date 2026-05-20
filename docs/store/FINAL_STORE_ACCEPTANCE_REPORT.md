# Rahma Final Store Acceptance Report

Date/time: 2026-05-20 03:18:10 +01:00

Scope: `F:\rahma` only. No other project touched. No store publishing performed. No GitHub push performed.

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

## Executive Verdict

| Store | Verdict | Reason |
|---|---|---|
| Google Play | `PARTIAL_GOOGLE_PLAY_BLOCKERS` | Android APK/AAB build and automated tests pass, but Google Play submission is still blocked by no domain, no public HTTPS privacy/support URLs, physical Android device smoke testing, and Play Console form submission. |
| Apple App Store | `PARTIAL_APPLE_BLOCKERS` | No domain/HTTPS privacy URL exists, and iOS archive/TestFlight/App Store Connect privacy labels were not verified in this Windows environment. |

This report does not claim store approval. Only Google or Apple can approve the app after submission.

## Release Candidate Separation

`CODE_RELEASE_CANDIDATE_STATUS: ANDROID_RELEASE_CANDIDATE_BUILT_AND_AUTOMATED_TESTED`

The Android code release candidate exists and has automated verification evidence. The current APK and AAB are listed below.

`STORE_SUBMISSION_STATUS: BLOCKED_BY_DOMAIN_HTTPS_AND_MANUAL_STORE_STEPS`

Store submission is blocked by domain/HTTPS requirements, real-device testing, and manual Play/App Store console steps. These are separate from the built Android code artifact status.

## Changed Files

Primary store-readiness changes in this pass:

- `apps/web/public/privacy.html`
- `apps/web/public/terms.html`
- `apps/web/public/support.html`
- `apps/web/public/contact.html`
- `apps/web/public/account-deletion.html`
- `apps/web/public/data-export.html`
- `apps/mobile/assets/legal/privacy.md`
- `apps/mobile/assets/legal/terms.md`
- `apps/mobile/lib/config.dart`
- `apps/mobile/lib/screens/support_screen.dart`
- `apps/mobile/lib/screens/compliance_info_screen.dart`
- `apps/mobile/pubspec.yaml`
- `backend/app/src/routes/ready.js`
- `backend/app/src/infra/azan-probe.js`
- `backend/app/test/azan-audio.test.js`
- `backend/app/test/azan-production-gates.test.js`
- `data/islamic-sources/azan-audio-metadata.json`
- `scripts/content/verify-azan-audio-assets.js`
- `docs/store/AZAN_AUDIO_LICENSE_AND_VERIFICATION.md`
- `docs/store/ANDROID_REAL_DEVICE_SMOKE_TEST.md`
- `docs/store/PRODUCTION_READY_BLOCKERS.md`
- `docs/store/GOOGLE_PLAY_CONSOLE_SUBMISSION_CHECKLIST.md`
- `docs/store/FINAL_ANDROID_RELEASE_VERIFICATION.md`
- `docs/store/FINAL_STORE_ACCEPTANCE_REPORT.md`
- `docs/store/CLUSTER_ONLY_PUBLIC_URL_PLAN.md`
- `docs/store/REAL_ANDROID_DEVICE_TEST_SCRIPT.md`
- `docs/store/RELEASE_CANDIDATE_FREEZE.md`
- `docs/store/google-play-internal-testing-package/README.md`
- `docs/store/google-play-internal-testing-package/app-description.md`
- `docs/store/google-play-internal-testing-package/short-description.txt`
- `docs/store/google-play-internal-testing-package/full-description.md`
- `docs/store/google-play-internal-testing-package/data-safety-answers.md`
- `docs/store/google-play-internal-testing-package/app-content-answers.md`
- `docs/store/google-play-internal-testing-package/content-rating-notes.md`
- `docs/store/google-play-internal-testing-package/target-audience-notes.md`
- `docs/store/google-play-internal-testing-package/privacy-policy-url-placeholder.txt`
- `docs/store/google-play-internal-testing-package/support-url-placeholder.txt`
- `docs/store/google-play-internal-testing-package/release-notes-internal-test.md`
- `docs/store/google-play-internal-testing-package/screenshot-checklist.md`
- `deployment/k3s/rahma-legal-pages/namespace.yaml`
- `deployment/k3s/rahma-legal-pages/configmap-legal-pages.yaml`
- `deployment/k3s/rahma-legal-pages/deployment.yaml`
- `deployment/k3s/rahma-legal-pages/service.yaml`
- `deployment/k3s/rahma-legal-pages/nodeport.yaml`
- `deployment/k3s/rahma-legal-pages/ingress-domain-template.yaml`
- `deployment/k3s/rahma-legal-pages/cert-manager-template.yaml`
- `deployment/k3s/rahma-legal-pages/DNS_SETUP_GUIDE.md`
- `deployment/k3s/rahma-legal-pages/README.md`

Invalid local Azan audio files were removed:

- `apps/mobile/assets/audio/azan/beautiful_adhan_cc0.mp3`
- `apps/mobile/assets/audio/azan/makkah_azan_public_domain.mp3`

The wider worktree contains many existing Rahma changes from previous phases. Use `git status --short` for the full list.

## Fixed Blockers

| Blocker | Result |
|---|---|
| Placeholder contact email in active store/legal files | Replaced with `support@ordinoxai.com`. |
| Fake domain URLs in store drafts | Removed. Store docs now use `NO_DOMAIN_AVAILABLE=true` and temporary HTTP/IP testing URLs only. |
| Cluster-only legal pages plan | Added NodePort K3s manifests for `/privacy.html`, `/terms.html`, and `/support.html` on the real cluster candidate IP. |
| Domain-ready legal pages templates | Added ingress and cert-manager templates plus DNS setup guide for a future real domain. |
| Google Play internal testing package | Added draft Play Console metadata, data safety notes, content rating notes, URL placeholders, release notes, and screenshot checklist. |
| Release candidate freeze | Added `docs/store/RELEASE_CANDIDATE_FREEZE.md` to prevent feature churn before internal testing. |
| Real-device test script | Added `docs/store/REAL_ANDROID_DEVICE_TEST_SCRIPT.md`. |
| GitHub release pipelines | Added CI, Android release candidate, store-readiness blocker, and Talos validation workflows. |
| Talos/Kubernetes separation | Added `deployment/talos/rahma/` with Rahma-only namespaces and validation scripts. |
| Mobile URL configuration | Added `API_BASE_URL`, `PRIVACY_URL`, `TERMS_URL`, and `SUPPORT_URL` build values with empty defaults. External legal links remain disabled unless configured. |
| Privacy/terms overclaim risk | Policies now disclose backend question processing, optional location, notifications, diagnostics/device info, deletion requests, children supervision, and Islamic/AI limitations. |
| Broken Azan audio files | Removed invalid text/HTML files, disabled Azan audio for release, and added a verification script. |
| `/ready` production ambiguity | `/ready` now distinguishes `mobile_store_ready`, `backend_production_ready`, and full `production_ready`. Full production remains false. |

## Remaining Google Play Blockers

| Blocker | Status | Required fix |
|---|---|---|
| `NO_DOMAIN_AVAILABLE` | BLOCKER | Add a real domain for Rahma. Current public candidate server is `148.251.247.56`. |
| `PUBLIC_PRIVACY_POLICY_HTTPS_URL_NOT_AVAILABLE` | BLOCKER | Serve privacy policy on a verified HTTPS domain. Temporary testing only: `http://148.251.247.56:30080/privacy.html`. |
| `PUBLIC_SUPPORT_HTTPS_URL_NOT_AVAILABLE` | BLOCKER | Serve support page on a verified HTTPS domain. Temporary testing only: `http://148.251.247.56:30080/support.html`. |
| `REAL_ANDROID_DEVICE_TEST_NOT_DONE` | BLOCKER | Install the release APK on a real Android phone and complete `docs/store/ANDROID_REAL_DEVICE_SMOKE_TEST.md`. |
| `PLAY_CONSOLE_FORMS_NOT_SUBMITTED` | BLOCKER | Submit App Content, Data Safety, content rating, and target audience forms using the prepared drafts. |
| Azan audio playback | DISABLED | Acceptable only if store listing does not claim audio playback. Add licensed playable audio and real-device playback proof before enabling. |

## Remaining Apple Blockers

| Blocker | Status | Required fix |
|---|---|---|
| `NO_DOMAIN_AVAILABLE` | BLOCKER | Add a real domain for Rahma. |
| `APPLE_PRIVACY_POLICY_HTTPS_URL_NOT_AVAILABLE` | BLOCKER | Serve privacy policy on a verified HTTPS domain. Temporary HTTP/IP URLs are not sufficient for final review. |
| `IOS_ARCHIVE_NOT_VERIFIED` | BLOCKER | Build/archive on macOS with Apple signing. |
| `TESTFLIGHT_NOT_VERIFIED` | BLOCKER | Upload to App Store Connect/TestFlight. |
| `APP_STORE_CONNECT_PRIVACY_NOT_COMPLETED` | BLOCKER | Submit labels using `docs/store/APPLE_PRIVACY_LABEL_DRAFT.md`. |
| iOS real-device review not performed | BLOCKER | Test on real iPhone/iPad. |

## Exact Test Results

| Area | Command | Result |
|---|---|---|
| Mobile | `flutter clean` via `C:\src\flutter\bin\flutter.bat` | PASS |
| Mobile | `flutter pub get` via `C:\src\flutter\bin\flutter.bat` | PASS, `Got dependencies!` |
| Mobile | `dart format --set-exit-if-changed .` via `C:\src\flutter\bin\dart.bat` | PASS after formatting two files; rerun: `Formatted 58 files (0 changed) in 0.28 seconds.` |
| Mobile | `flutter analyze` via `C:\src\flutter\bin\flutter.bat` | PASS, `No issues found! (ran in 18.5s)` |
| Mobile config follow-up | `flutter analyze` after adding `API_BASE_URL`, `PRIVACY_URL`, `TERMS_URL`, `SUPPORT_URL` | PASS, `No issues found! (ran in 19.5s)` |
| Mobile | `flutter test` via `C:\src\flutter\bin\flutter.bat` | PASS, 41 tests |
| Mobile | `flutter build apk --release` via `C:\src\flutter\bin\flutter.bat` | PASS, Java source/target 8 obsolete warnings only |
| Mobile | `flutter build appbundle --release` via `C:\src\flutter\bin\flutter.bat` | PASS, Java source/target 8 obsolete warnings only |
| Backend | `npm test` in `backend/app` | PASS, 535 tests, 535 pass |
| Backend | `npm run lint` in `backend/app` | PASS, 0 errors, 31 warnings |
| Web | `npm test` in `apps/web` | PASS, 13 tests |
| Web | `npm run build` in `apps/web` | PASS, static app no build step |
| RAG | `node scripts/rag/verify-rag-live.js` with local `DATABASE_URL` | PASS, approved_sources=2, documents=7, chunks=25, embeddings=25, citations=25, `rag_ready=true`, `algorithm_ready=true` |
| Azan audio | `node scripts/content/verify-azan-audio-assets.js` | PASS truthful disabled state: `AZAN_AUDIO_DISABLED_FOR_RELEASE` |

Wrapper caveat: the bare `flutter --version` command timed out after 30 seconds in this PowerShell environment. The explicit SDK wrappers under `C:\src\flutter\bin\` completed the full release verification.

## Release Artifacts

| Artifact | Path | Size |
|---|---|---:|
| APK | `F:\rahma\apps\mobile\build\app\outputs\flutter-apk\app-release.apk` | 54,722,159 bytes |
| AAB | `F:\rahma\apps\mobile\build\app\outputs\bundle\release\app-release.aab` | 45,155,568 bytes |

## Readiness Evidence

`/health` app-injection result:

```json
{
  "status": 200,
  "body": {
    "ok": true,
    "service": "rahma-api",
    "legacy_service_name": "sakina-backend",
    "status": "healthy"
  }
}
```

`/ready` app-injection summary:

```json
{
  "status": 200,
  "production_ready": false,
  "mobile_store_ready": false,
  "backend_production_ready": false,
  "mobile_store_blockers": [
    "app_store_compliance_not_ready"
  ],
  "rag_ready": true,
  "algorithm_ready": true,
  "azan_audio": {
    "production_ready": false,
    "approved_assets": 0,
    "verified_assets": 0,
    "blocker": "azan_audio_license_or_hash_incomplete"
  }
}
```

This is truthful. `production_ready` must not be set to true while backend production blockers remain.

## Policy Documents

Created or updated:

- `docs/store/GOOGLE_PLAY_ACCEPTANCE_AUDIT.md`
- `docs/store/APPLE_APP_STORE_ACCEPTANCE_AUDIT.md`
- `docs/store/GOOGLE_PLAY_DATA_SAFETY_DRAFT.md`
- `docs/store/APPLE_PRIVACY_LABEL_DRAFT.md`
- `docs/store/PRIVACY_DATA_MAP.md`
- `docs/store/MOBILE_PERMISSIONS_AUDIT.md`
- `docs/store/SDK_PRIVACY_AUDIT.md`
- `docs/store/CHILDREN_AND_FAMILY_POLICY_AUDIT.md`
- `docs/store/DONATION_AND_CHARITY_POLICY_AUDIT.md`
- `docs/store/GOOGLE_PLAY_LISTING_DRAFT.md`
- `docs/store/APPLE_APP_STORE_LISTING_DRAFT.md`
- `docs/store/GOOGLE_PLAY_CONSOLE_SUBMISSION_CHECKLIST.md`

## Final Honest Verdict

Google Play: `PARTIAL_GOOGLE_PLAY_BLOCKERS`

Apple App Store: `PARTIAL_APPLE_BLOCKERS`

Rahma has working Android release APK/AAB artifacts and passing automated verification, but it is not ready for Google Play submission until a real HTTPS domain exists, public privacy/support URLs are available, a real Android device smoke test is completed, and Play Console forms are submitted. Apple remains partial until a real HTTPS privacy URL exists and iOS build/archive/TestFlight/App Store Connect privacy work are verified.
