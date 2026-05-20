# Final Android Release Verification

Date/time: 2026-05-20 03:18:10 +01:00

Scope: `F:\rahma` only. No publishing and no GitHub push performed.

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

## Verdict

Final Android release verification status: `PARTIAL_GOOGLE_PLAY_BLOCKERS`

The Android release artifacts build successfully and the automated backend, web, mobile, and RAG checks pass. Google Play submission is still blocked by public URL deployment, physical Android smoke testing, final feature graphic verification, and Play Console form submission.

Apple remains `PARTIAL_APPLE_BLOCKERS` because iOS archive/TestFlight/App Store Connect privacy work was not verified in this Windows environment.

## Pipeline Status

Release pipeline files were added:

- `.github/workflows/rahma-ci.yml`
- `.github/workflows/android-release-candidate.yml`
- `.github/workflows/store-readiness-check.yml`
- `.github/workflows/talos-k8s-validate.yml`

The Android release candidate workflow builds APK/AAB artifacts and uploads them to GitHub Actions. It never submits to Google Play automatically.

The store-readiness workflow intentionally reports blockers while `NO_DOMAIN_AVAILABLE`, HTTPS legal URL blockers, real Android device test, and Play Console forms remain open.

## Wrapper Tooling Note

The bare `flutter --version` wrapper command timed out in this PowerShell environment after 30 seconds. Verification was completed with the explicit SDK wrapper path:

```powershell
C:\src\flutter\bin\flutter.bat
C:\src\flutter\bin\dart.bat
```

These explicit wrapper commands completed successfully for clean, pub get, format, analyze, tests, APK build, and AAB build. This is recorded as an environment/tooling caveat, not an app-code failure.

## Mobile Commands

Working directory: `F:\rahma\apps\mobile`

| Command | Result |
|---|---|
| `flutter clean` using `C:\src\flutter\bin\flutter.bat` | PASS. Deleted build outputs and generated Flutter files. |
| `flutter pub get` using `C:\src\flutter\bin\flutter.bat` | PASS. `Got dependencies!`; 32 packages had newer incompatible versions. |
| `dart format --set-exit-if-changed .` using `C:\src\flutter\bin\dart.bat` | PASS after formatting `lib\screens\compliance_info_screen.dart` and `lib\screens\support_screen.dart`; rerun result: `Formatted 58 files (0 changed) in 0.28 seconds.` |
| `flutter analyze` using `C:\src\flutter\bin\flutter.bat` | PASS. `No issues found! (ran in 18.5s)` |
| `flutter test` using `C:\src\flutter\bin\flutter.bat` | PASS. `All tests passed!`; 41 tests. |
| `flutter build apk --release` using `C:\src\flutter\bin\flutter.bat` | PASS. Built `build\app\outputs\flutter-apk\app-release.apk`; Java source/target 8 obsolete warnings only. |
| `flutter build appbundle --release` using `C:\src\flutter\bin\flutter.bat` | PASS. Built `build\app\outputs\bundle\release\app-release.aab`; Java source/target 8 obsolete warnings only. |

## Release Artifacts

| Artifact | Path | Size | Last modified |
|---|---|---:|---|
| Release APK | `F:\rahma\apps\mobile\build\app\outputs\flutter-apk\app-release.apk` | 54,722,159 bytes | 2026-05-20 03:08:21 |
| Release AAB | `F:\rahma\apps\mobile\build\app\outputs\bundle\release\app-release.aab` | 45,155,568 bytes | 2026-05-20 03:09:49 |

## Backend Commands

Working directory: `F:\rahma\backend\app`

| Command | Result |
|---|---|
| `npm test` | PASS. 535 tests, 535 pass, 0 fail, duration about 74.5s on the final rerun. |
| `npm run lint` | PASS with warnings. 0 errors, 31 warnings. Warnings are existing unused-variable warnings and are not release-blocking by themselves. |

## Web Commands

Working directory: `F:\rahma\apps\web`

| Command | Result |
|---|---|
| `npm test` | PASS. 13 tests, 13 pass. |
| `npm run build` | PASS. Static app reports no build step. |

## RAG Verification

Working directory: `F:\rahma`

Command:

```powershell
$env:DATABASE_URL='postgresql://rahma_user@127.0.0.1:55432/rahma'
node scripts/rag/verify-rag-live.js
```

Result: PASS

Summary:

- `db_status=DB_VERIFIED_LIVE`
- `approved_sources=2`
- `documents_indexed=7`
- `chunks_indexed=25`
- `embeddings_indexed=25`
- `citations_indexed=25`
- `rag_ready=true`
- `algorithm_ready=true`
- smoke query returned `safety_status=verified_sources` with Tanzil Quran citations.

## Azan Audio Verification

Command:

```powershell
node scripts/content/verify-azan-audio-assets.js
```

Result: PASS truthful disabled state.

Summary:

- `status=AZAN_AUDIO_DISABLED_FOR_RELEASE`
- `approved_assets=0`
- `verified_approved_assets=0`
- invalid local MP3 files were removed because they were text/HTML, not playable audio.

## Readiness Checks

The app-injection readiness probe returned:

```json
{
  "health": {
    "status": 200,
    "body": {
      "ok": true,
      "service": "rahma-api",
      "legacy_service_name": "sakina-backend",
      "status": "healthy"
    }
  },
  "ready": {
    "status": 200,
    "body": {
      "ok": true,
      "production_ready": false,
      "mobile_store_ready": false,
      "backend_production_ready": false,
      "mobile_store_blockers": [
        "app_store_compliance_not_ready"
      ],
      "rag_ready": true,
      "algorithm_ready": true,
      "azan_audio": {
        "configured": false,
        "production_ready": false,
        "assets_available": false,
        "approved_assets": 0,
        "verified_assets": 0,
        "default_azan_id": "makkah_public_01",
        "blocker": "azan_audio_license_or_hash_incomplete"
      }
    }
  }
}
```

`production_ready=false` is correct. Backend production blockers remain and must not be hidden.

## Public URL Verification

Rahma has no domain yet. The only current public candidate is the cluster control-plane IP.

Temporary legal page URLs for testing only:

- `http://148.251.247.56:30080/privacy.html`
- `http://148.251.247.56:30080/terms.html`
- `http://148.251.247.56:30080/support.html`

These are HTTP/IP-based URLs and are not recommended for final Google Play or Apple App Store submission.

Status:

- `NO_DOMAIN_AVAILABLE`
- `PUBLIC_PRIVACY_POLICY_HTTPS_URL_NOT_AVAILABLE`
- `PUBLIC_SUPPORT_HTTPS_URL_NOT_AVAILABLE`

## Real Android Device Test

Status: `BLOCKER_ANDROID_REAL_DEVICE_NOT_TESTED`

`flutter devices` showed Windows, Chrome, and Edge only. No physical Android phone was available in this environment, so first-launch, notification permission, scheduling, and real-device UI crash checks are not verified.

## Final Decision

Google: `PARTIAL_GOOGLE_PLAY_BLOCKERS`

Apple: `PARTIAL_APPLE_BLOCKERS`

Google Play is not ready for submission until a real HTTPS domain exists, public legal/support URLs resolve, a physical Android smoke test passes, Play Console forms are completed, and final graphics/screenshots are verified. Apple is not ready until a real HTTPS privacy URL exists and iOS archive/TestFlight/App Store Connect privacy work is verified on macOS.
