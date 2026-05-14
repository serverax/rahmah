# Rahma — Mobile App Readiness Checklist

**Audience:** operator + mobile build engineer.

## 1. Source

- [ ] `apps/mobile/pubspec.yaml` present and pinned (Flutter SDK ≥ 3.24).
- [ ] `apps/mobile/lib/` source compiles with `flutter analyze`.
- [ ] `flutter test` passes.

## 2. Native shells

- [ ] `flutter create . --platforms=android,ios` run on a workstation with the SDK (NOT committed).
- [ ] Android `applicationId = com.rahma.mobile` (or operator-chosen).
- [ ] iOS bundle id = `com.rahma.mobile` (or operator-chosen).
- [ ] Android `minSdk` ≥ 24, `targetSdk` matches Play requirements.
- [ ] iOS minimum deployment target matches App Store requirements.

## 3. Configuration

- [ ] `RAHMA_API_BASE` injected at build time via `--dart-define` for the chosen flavor (`internal-test` / `staging` / `release`).
- [ ] No hardcoded API hostname in any `.dart` file (`grep -RIn 'http' apps/mobile/lib` shows only `config.dart` reading the dart-define).
- [ ] No placeholder hostname (`api.rahma.example`) in release builds.

## 4. Signing

- [ ] Android keystore generated and stored in CI secret (NOT in repo).
- [ ] iOS provisioning profile + signing cert in CI secret.
- [ ] `.gitignore` excludes `*.jks`, `*.keystore`, `*.mobileprovision`, `*.p8`, `*.p12`, `*.cer`.

## 5. Store metadata

- [ ] Apple Privacy Labels filled (NO collected child data; only email-hash + device-hash for the auth path).
- [ ] Google Data Safety form filled.
- [ ] Content rating questionnaire complete (operator decides Kids / Everyone / 4+).
- [ ] Arabic-first listings (title, subtitle, screenshots).

## 6. Functional gates

- [ ] `RahmaApiClient` refuses calls when `RAHMA_API_BASE` is empty.
- [ ] All 9 screens render with API down (offline-safe placeholder copy).
- [ ] Children's game works fully offline.
- [ ] Donation screen shows "not configured" until provider is set.
- [ ] Ask-Sheikh screen queues drafts locally when network is down.

## 7. Pre-submission tests (operator-driven)

- [ ] Cold-start probe of `/ready` succeeds; mobile renders the
      blocker list in the Settings → About screen for support triage.
- [ ] Submit a question end-to-end on TestFlight Internal track.
- [ ] Send the question through the Sheikh workflow on the live cluster
      (requires OIDC live + DB ready).

## 8. Honesty record

When the operator submits to TestFlight / Play Internal, write
`reports/RAHMA_MOBILE_INTERNAL_TEST_<date>.md` with:
- AAB / IPA file hashes,
- `RAHMA_API_BASE` value used,
- screenshots of the running app,
- TestFlight / Play link.

Until that report exists, **no mobile release claim is made anywhere**.
