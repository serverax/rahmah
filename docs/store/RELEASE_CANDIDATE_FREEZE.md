# Rahma Release Candidate Freeze

Date: 2026-05-20

## Release Candidate Status

`CODE_RELEASE_CANDIDATE_STATUS: ANDROID_RELEASE_CANDIDATE_BUILT_AND_AUTOMATED_TESTED`

`STORE_SUBMISSION_STATUS: BLOCKED_BY_DOMAIN_HTTPS_AND_MANUAL_STORE_STEPS`

## Pipeline And Talos Status

GitHub Actions added for CI, Android release candidate artifact builds, store-readiness blocker checks, and Talos/Kubernetes manifest validation:

- `.github/workflows/rahma-ci.yml`
- `.github/workflows/android-release-candidate.yml`
- `.github/workflows/store-readiness-check.yml`
- `.github/workflows/talos-k8s-validate.yml`

Talos/Kubernetes manifests are separated under:

- `deployment/talos/rahma/`

They are not deployed. They are validated with client dry-run and local manifest policy checks.

## Current Artifacts

| Artifact | Path | Size |
|---|---|---:|
| APK | `F:\rahma\apps\mobile\build\app\outputs\flutter-apk\app-release.apk` | 54,722,159 bytes |
| AAB | `F:\rahma\apps\mobile\build\app\outputs\bundle\release\app-release.aab` | 45,155,568 bytes |

## Test Status

Automated verification recorded in `docs/store/FINAL_ANDROID_RELEASE_VERIFICATION.md`:

- Flutter analyze: PASS
- Flutter tests: PASS
- Backend tests: PASS
- Backend lint: PASS with warnings
- Web tests/build: PASS
- RAG live verification: PASS
- APK release build: PASS
- AAB release build: PASS

Manual/store blockers remain:

- `NO_DOMAIN_AVAILABLE`
- `PUBLIC_PRIVACY_POLICY_HTTPS_URL_NOT_AVAILABLE`
- `PUBLIC_SUPPORT_HTTPS_URL_NOT_AVAILABLE`
- `REAL_ANDROID_DEVICE_TEST_NOT_DONE`
- `PLAY_CONSOLE_FORMS_NOT_SUBMITTED`
- Apple: `IOS_ARCHIVE_NOT_VERIFIED`, `TESTFLIGHT_NOT_VERIFIED`, `APP_STORE_CONNECT_PRIVACY_NOT_COMPLETED`

## Freeze Rule

Do not change app features before internal testing unless a release blocker is found.

What must not change before internal testing:

- Islamic answer/RAG behavior
- Citation safety behavior
- Scholar-review gate behavior
- Mobile navigation structure
- Store privacy/data collection behavior
- Android package id
- Version metadata unless intentionally cutting a new release candidate
- Signing configuration
- Azan audio disabled state, unless a licensed asset is added and fully verified

What can still change:

- Domain URL config
- Legal/support URL config
- Play Console metadata
- Screenshots
- Store listing copy
- Licensed Azan audio, if added later with license proof, hash, and real-device playback verification

## Decision

This is a code release candidate for local/internal verification, not a store-ready submission package.
