# Rahma UI/UX Full Review and Redesign Report

Date: 2026-05-19  
Scope: Rahma only, workspace `F:/rahma`. No other project was touched for this UI/UX scope.

## Final UI Status

`PARTIAL_UI_UX_WITH_BLOCKERS`

Reason: The mobile widget/navigation tests and web RTL/public-page tests pass after the UI fixes below, and the Ask/RAG source-card states are now wired. A full `PASS_UI_UX_VERIFIED` is not claimed because automated screenshots were not captured in this environment, `flutter analyze` timed out, and not every mobile/web screen has visual screenshot evidence across device sizes.

## Screenshot Status

Screenshots were attempted only as an availability check. Playwright is not installed in this workspace:

```text
node --input-type=module -e "try { await import('playwright'); ... }"
PLAYWRIGHT_NOT_AVAILABLE
ERR_MODULE_NOT_FOUND
```

No screenshot evidence is claimed. This report uses code review, page inspection, Flutter widget tests, web RTL tests, and local link checks.

## Current UI Status

The current app is Arabic-first and RTL in the tested web public pages and mobile widgets. The visual identity already uses deep green/navy/gold styling through `RahmaColors`, 3D/glass-like cards, Arabic typography, bottom navigation, and premium card components. The redesign work in this pass focused on removing test-looking links, making RAG answers source-driven, showing scholar-review and blocked-prompt states visibly, and keeping Azan status truthful.

The UI is stronger than the previous audit state, but it is not fully proven as a luxury production UI because screenshot-based review across all target devices is still missing.

## Target Vision Comparison

| Requirement | Status | Evidence |
| --- | --- | --- |
| Arabic-first RTL | PASS | Web RTL tests pass; mobile widgets use RTL test wrappers and Arabic labels. |
| Premium Islamic luxury style | PARTIAL | Existing `Rahma3DCard`, premium cards, gold/emerald/navy palette are used, but no screenshot proof. |
| 3D glass cards | PASS | Mobile `Rahma3DCard`/`RahmaPremiumCard`; web `card-3d` and source-card styles. |
| Gold / emerald / deep navy identity | PASS | Existing theme and web CSS variables; verified by code inspection. |
| Calm and trustworthy | PARTIAL | Source/citation warnings improved; full visual proof pending. |
| Family-friendly | PASS | Children game web tests and child-safety public pages pass. |
| Readable for older users | PARTIAL | Larger Arabic text and card spacing exist, but no accessibility/screenshot sweep completed. |
| No fake features | PASS | Broken web links were removed; RAG and Azan states avoid invented claims. |
| Scholar review warnings | PASS | Mobile and web states added/tested. |
| Source/citation cards | PASS | Mobile `RahmaRagAnswerCard`; web `source-card` rendering in Ask page. |

## Screen-by-Screen Result

| Screen | Status | Notes |
| --- | --- | --- |
| Home | PARTIAL | Web home links were fixed to existing pages. Mobile home exists and boots through smoke tests, but no screenshot capture. |
| Ask Sheikh Hasan / RAG chat | PASS | Mobile Ask screen now has approved-source search, citation cards, scholar-review state, blocked-prompt state, empty/error/loading states; web Ask now calls `/api/rag/query`. |
| Quran | PARTIAL | Mobile Quran screens exist; web home now routes Quran to library category instead of a missing page. No screenshot or dedicated Quran visual regression test. |
| Prayer times | PARTIAL | Mobile prayer route exists; web no longer links to nonexistent `prayer.html`. Full prayer screen visual proof remains pending. |
| Azan settings | PARTIAL | UI shows approved audio metadata and playback control. Metadata and hash exist, but real-device playback was not re-run in this UI pass. |
| Children game | PASS | Web child game pages are Arabic RTL; scenario safety tests pass. Mobile children game was not screenshot-tested. |
| Library | PASS | Web library pages pass RTL/public tests and approved-only display tests. Mobile library exists but no screenshot capture. |
| Settings | PASS | Mobile settings test verifies privacy, Azan, and local API state. |
| Privacy / Terms / About | PARTIAL | Privacy/terms/compliance pages pass web RTL checks; `terms.html` was redesigned. A dedicated About screen/page was not separately proven. |
| Error states | PASS | RAG error/refusal cards added for mobile/web; tests cover scholar-review and blocked prompt states. |
| Loading states | PARTIAL | RAG and terms loading states exist; not all screens have screenshot proof. |
| Empty states | PASS | Mobile RAG empty/refusal state is tested; web Ask has insufficient-source fallback. |

## Files Changed in This UI/UX Pass

- `apps/mobile/lib/api/rahma_api_client.dart`
- `apps/mobile/lib/screens/ask_sheikh_screen.dart`
- `apps/mobile/lib/screens/azan_audio_settings_screen.dart`
- `apps/mobile/lib/widgets/rahma_widgets.dart`
- `apps/mobile/test/rahma_widgets_test.dart`
- `apps/mobile/test/ask_sheikh_rag_ui_test.dart`
- `apps/mobile/test/settings_screen_ui_test.dart`
- `apps/mobile/test/azan_audio_test.dart`
- `apps/web/public/index.html`
- `apps/web/public/ask.html`
- `apps/web/public/terms.html`
- `apps/web/public/assets/test-ui.css`
- `docs/RAHMA_UI_UX_FULL_REVIEW_AND_REDESIGN_REPORT.md`

## Redesign/Fix Summary

- Added mobile `ragQuery()` API wrapper for `/api/rag/query`.
- Redesigned Ask Sheikh mobile screen around approved-source lookup before human review submission.
- Added mobile RAG answer card with citation cards and explicit safety states:
  - `verified_sources`
  - `scholar_review_required`
  - `blocked_prompt_injection`
  - insufficient/low-confidence/citation/unapproved/system-error style states
- Added reusable mobile state cards for truthful warning/error/empty states.
- Updated web Ask page to submit to `/api/rag/query`, render cited answers, show source cards, and show scholar-review / blocked-prompt states.
- Fixed web home links that pointed to nonexistent local pages.
- Redesigned web terms page to match the Arabic mobile-style shell and removed English-dominant visible copy that failed the compliance page test.
- Added web source-card CSS for citations and warnings.
- Updated mobile Azan settings UI to show approved source status based on existing metadata and avoid unavailable unapproved choices.

## Azan UI Evidence

Metadata file: `data/islamic-sources/azan-audio-metadata.json`

Approved audio entry:

```text
id=makkah_public_01
approved=true
source=Internet Archive
license=Public Domain Mark 1.0
storage_path=apps/mobile/assets/audio/azan/makkah_azan_public_domain.mp3
file_hash_sha256=0a25886b300943ec0ae211dcd3ccd43dd2035c60030c19c503a17c279e1b71f0
```

Hash verification command:

```text
Get-FileHash -Algorithm SHA256 -LiteralPath F:\rahma\apps\mobile\assets\audio\azan\makkah_azan_public_domain.mp3
SHA256 0A25886B300943EC0AE211DCD3CCD43DD2035C60030C19C503A17C279E1B71F0
```

UI caveat: this pass did not re-run a real Android device playback test. The mobile widget test verifies the approved Azan UI state and playback control presence, not speaker output.

## Commands Run

```text
flutter test test/rahma_widgets_test.dart test/ask_sheikh_rag_ui_test.dart test/settings_screen_ui_test.dart test/azan_audio_test.dart
Result: PASS, 11 tests passed.
```

```text
flutter test
Result: PASS, all mobile tests passed.
```

```text
flutter test test/azan_audio_test.dart
Result: PASS, 2/2 tests passed after the final Azan UI copy adjustment.
```

```text
flutter analyze
Result: TIMEOUT after 603215 ms. Not counted as pass.
```

```text
dart format lib/api/rahma_api_client.dart lib/screens/ask_sheikh_screen.dart lib/screens/azan_audio_settings_screen.dart lib/widgets/rahma_widgets.dart test/rahma_widgets_test.dart test/ask_sheikh_rag_ui_test.dart test/settings_screen_ui_test.dart test/azan_audio_test.dart
Result: TIMEOUT after 301234 ms. Not counted as pass.
```

```text
cd F:/rahma/backend/app
node --test test/frontend-rtl.test.js
Result: PASS, 8/8 tests passed.
```

```text
cd F:/rahma/backend/app
node --test test/sprints-20-24.test.js
Initial result: FAIL on terms.html Arabic-dominant visible-main check.
Final result after terms.html fix: PASS, 27/27 tests passed.
```

```text
node --input-type=module -e "<local .html link scan>"
Result: PASS
{
  "ok": true,
  "checked_files": 26,
  "missing": []
}
```

```text
node --check apps/web/public/assets/app.js
node --check apps/web/public/assets/library.js
node --check apps/web/public/assets/hasanat-game.js
Result: PASS, no syntax errors reported.
```

```text
node --input-type=module -e "try { await import('playwright'); ... }"
Result: PLAYWRIGHT_NOT_AVAILABLE, ERR_MODULE_NOT_FOUND.
```

## Test Coverage Added or Confirmed

- RTL rendering:
  - `backend/app/test/frontend-rtl.test.js`
  - `backend/app/test/sprints-20-24.test.js`
- Navigation/public web pages:
  - Local `.html` link scan passed for 26 top-level web pages.
  - Home page links to existing targets after fix.
- RAG answer cards:
  - `apps/mobile/test/rahma_widgets_test.dart`
- Scholar review warning:
  - `apps/mobile/test/rahma_widgets_test.dart`
  - Web Ask page visual state added.
- Blocked prompt warning:
  - `apps/mobile/test/rahma_widgets_test.dart`
  - Web Ask page visual state added.
- Settings screen:
  - `apps/mobile/test/settings_screen_ui_test.dart`
- Azan settings screen:
  - `apps/mobile/test/azan_audio_test.dart`

## Remaining UI Blockers

- No screenshot capture was possible because Playwright is not installed.
- `flutter analyze` timed out and is not a pass.
- `dart format` timed out and is not a pass.
- Full visual proof across Android, iOS, tablet, desktop web, and narrow mobile web viewports remains pending.
- Quran, prayer, library, children game, and settings screens have partial UI evidence but not full screenshot-based review.
- Real-device Azan playback was not re-run in this UI pass.
- A dedicated About page/screen was not separately proven.

## Final Determination

The UI is materially improved and the critical RAG/safety presentation is now wired into mobile and web. The current evidence supports:

`PARTIAL_UI_UX_WITH_BLOCKERS`

Do not claim `PASS_UI_UX_VERIFIED` until screenshots or equivalent visual evidence are captured across the required screens and the analyzer/formatter blocker is resolved.
