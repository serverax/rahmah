# Sprint 67 — Flutter MVP Shell

**Date:** 2026-05-14

## What ships
- `apps/mobile/lib/app.dart` — bottom-nav shell with 5 tabs (Arabic labels), light/dark themes via `ThemeMode.system`.
- `apps/mobile/lib/nav/bottom_nav.dart` — single source for the nav strip.
- `apps/mobile/lib/theme/rahma_theme.dart` — Material 3 themes.
- `apps/mobile/test/app_smoke_test.dart` — 2 widget tests (boots + tab swap).
- Existing 9 screens kept; integrated under tabs.

## Behaviour
- Default locale `ar`, default direction `rtl`.
- All screens render even with `RAHMA_API_BASE=""`. Network-bound copy says "الخدمة غير مهيأة بعد".
- No hardcoded API domain. No Quran/Hadith text in source. No payment processing.

## Tests
Local: NOT run (no Flutter SDK on this workstation). CI workflow
`rahma-mobile-flutter-ci` runs `flutter analyze` + `flutter test` on
push to `apps/mobile/**`.
