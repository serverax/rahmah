# Rahma — Mobile MVP Shell Report

**Date:** 2026-05-14

## Shape of the MVP shell

- `apps/mobile/lib/main.dart` → `RahmaApp` root widget.
- `apps/mobile/lib/app.dart` → bottom-nav Scaffold with 5 tabs:
  1. الرئيسية → `HomeScreen`
  2. الأذكار والدعاء → `DuaScreen`
  3. اسأل الشيخ → `AskSheikhScreen`
  4. المكتبة → `QuranScreen` (sub-tabs to Hadith / Dua in a future sprint)
  5. الإعدادات → `SettingsScreen`
- `Onboarding`, `HadithScreen`, `ChildrenGameScreen`, `DonationScreen` are reachable via `Navigator.pushNamed` from the relevant tab.

## Themes

- Light + dark, seeded from `#0F766E` (emerald).
- `ThemeMode.system` — follows OS preference.

## RTL

- Default locale `ar`.
- `Directionality(textDirection: TextDirection.rtl)` wraps the
  scaffold for the whole app.

## Config

- `RahmaConfig.apiBase` reads `--dart-define=RAHMA_API_BASE=...` at
  build time. Empty default refuses network.
- `RahmaConfig.buildFlavor` reads `--dart-define=RAHMA_BUILD_FLAVOR=...`
  (default `internal-test`).

## Tests

`apps/mobile/test/app_smoke_test.dart`:
- App boots and renders the bottom-nav with Arabic labels.
- Tapping the second tab swaps the body.

`apps/mobile/test/offline_policy_test.dart`:
- 6 cases for the offline cache policy + queueable rule.

`apps/mobile/test/api_client_test.dart`:
- Client refuses calls when `RAHMA_API_BASE` is empty.

Local Flutter SDK is NOT available on this workstation; CI
(`rahma-mobile-flutter-ci`) runs all three test files on push to
`apps/mobile/**`.

## What this shell does NOT do

- Render Quran / Hadith / Dua text.
- Authenticate against an IdP.
- Process donations.
- Talk to a third-party SDK.
- Reach any host other than `RahmaConfig.apiBase`.

## Operator next steps

- `flutter create .` to materialise `android/` + `ios/`.
- Pick the HTTP client (we use `dart:io` stdlib for the foundation).
- Decide signing / keystore policy.
- Choose the state-management library (Riverpod recommended; not yet
  imported here to keep the foundation small).
