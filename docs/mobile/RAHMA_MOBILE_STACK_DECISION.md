# Rahma — Mobile Stack Decision

**Date:** 2026-05-14
**Status:** recommendation. No mobile source committed yet.

## Recommendation: **Flutter**

Repository does not yet contain a mobile app. There is no existing
React Native / Expo / native code to follow.

### Why Flutter

- Single Dart codebase compiles to both Android (Gradle) and iOS (Xcode).
- First-class Arabic-RTL support via `flutter_localizations` +
  `Directionality(textDirection: TextDirection.rtl, ...)`.
- Material 3 + Cupertino widget sets out of the box.
- Native compile path → reliable performance for the Quran reader,
  audio (when added), and the children's game animations.
- Strong offline / cached-bundle story (the children's game is
  local-first; Flutter's `path_provider` + `hive`/`isar` covers it).

### What's deliberately not chosen

- **React Native (Expo).** Possible alternative if the operator has a
  JS team. RTL works but bidi edge cases bite more often than in
  Flutter. Native module fragmentation cost is real.
- **Native (Kotlin + Swift).** Best per-platform UX. Doubles the code.
  Not justified for a v1 mobile app.

## Repo layout (when source lands)

```
apps/mobile/
  pubspec.yaml
  android/           (created by `flutter create`)
  ios/               (created by `flutter create`)
  lib/
    main.dart
    app.dart
    config/          (RAHMA_API_BASE comes from --dart-define)
    api/             (typed client for the OpenAPI contract)
    ui/
    state/
    storage/
  test/
```

## Decision the operator must confirm

- Flutter version (3.24+ recommended).
- Org id for Android (`com.rahma.mobile`).
- Bundle id for iOS (`com.rahma.mobile`).
- Apple Developer team id.
- A signing-keystore secret strategy for CI.

## What ships NOT yet (operator unblocks)

- Mobile source.
- `.github/workflows/rahma-mobile-ci.yml` — path-guarded; runs Flutter
  pipeline when `apps/mobile/pubspec.yaml` exists.
- Real Android keystore / iOS provisioning profile.
- Store listings (Arabic-RTL primary).

Until the operator confirms the framework and seeds the project, this
doc is the canonical "we recommend Flutter" record.
