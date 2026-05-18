# RAHMA END-TO-END USER JOURNEYS

This document defines the critical user journeys and assesses their current implementation status against the High Level Design.

## 1. New user opens app first time
- **Goal**: App launches smoothly in Arabic RTL and shows initial onboarding or home screen.
- **Expected Steps**: Launch -> Load preferences -> Connect API -> Show Home.
- **Required Mobile Screens**: `app.dart`, `HomeScreen`.
- **Required Backend Routes**: `/health`, `/ready`, `/api/mobile/status`.
- **Current Status**: **PASS**. The app boots, connects to the API, and renders the RTL interface.
- **Test Required**: `app_smoke_test.dart` passes.

## 2. User sees today’s prayer times
- **Goal**: Home screen displays accurate prayer countdown based on location.
- **Expected Steps**: Read location -> Call API -> Render countdown.
- **Required Mobile Screens**: `HomeScreen`.
- **Required Backend Routes**: `/api/prayer-times`.
- **Current Status**: **PASS_FOUNDATION**. Renders correctly, but only with manual/fallback coordinates.
- **Where it breaks**: Lacks automatic background GPS sync.

## 3. User allows GPS and prayer times update
- **Goal**: App requests location permission, gets coordinates, updates times.
- **Required Mobile Screens**: `LocationService`, permission prompt.
- **Current Status**: **PARTIAL**. `LocationService` implemented using `geolocator`, but home screen auto-refresh on movement is missing.
- **Where it breaks**: Native Android/iOS permission flows require real device testing.

## 4. User enables Azan alert
- **Goal**: User toggles Azan alert; app schedules local notifications.
- **Required Mobile Screens**: `SettingsScreen`.
- **Current Status**: **PENDING**. UI toggle exists but does not schedule anything.
- **Where it breaks**: Missing `flutter_local_notifications` implementation.

## 5. User selects and previews Azan audio
- **Goal**: User selects an approved Azan sound and hears a preview.
- **Required Mobile Screens**: `AzanAudioSettingsScreen`.
- **Required Backend Routes**: `/api/azan-audio/options`.
- **Current Status**: **PASS**. 1 Public Domain asset is verified and plays via `audioplayers`.

## 6. User receives Azan notification at prayer time
- **Goal**: Device plays sound and shows push notification at the exact prayer time.
- **Current Status**: **PENDING**. 
- **Where it breaks**: No background execution logic implemented.

## 7. User opens Qibla compass
- **Goal**: App uses magnetometer to point to Makkah.
- **Current Status**: **FAIL/MISSING**. Feature entirely absent from mobile app.

## 8. User reads Quran
- **Goal**: Browse Surahs, read Ayahs, see verified source.
- **Required Mobile Screens**: `QuranScreen`, `QuranReaderScreen`.
- **Required Backend Routes**: `/api/quran/surahs`.
- **Current Status**: **PASS_FOUNDATION**. UI and backend wired, but stuck in Sample Mode.
- **Where it breaks**: Needs full 114 Surah ingestion.

## 9. User reads daily adhkar
- **Goal**: Open screen, read morning/evening dua, mark complete.
- **Required Mobile Screens**: `DuaScreen`.
- **Current Status**: **PLACEHOLDER_ONLY**. Screen exists but says "Not available".

## 10. User asks Sheikh Hasan a question
- **Goal**: Submit question securely to the moderation queue.
- **Required Mobile Screens**: `AskSheikhScreen`.
- **Required Backend Routes**: `/api/ask-sheikh/questions`.
- **Current Status**: **PASS_FOUNDATION**. Form submits and backend stores in DB correctly.

## 11. Sheikh logs in and answers
- **Goal**: Sheikh securely authenticates and provides cited answers.
- **Required Mobile Screens**: N/A (Web/Admin interface expected, or dedicated mobile view).
- **Required Backend Routes**: `/api/auth/session/start`, `/api/sheikh/questions/:id/answer`.
- **Current Status**: **NOT_CONNECTED**. Mobile app lacks a login screen. Backend auth is present.

## 12. User reads public answer
- **Goal**: Browse approved Q&A.
- **Required Mobile Screens**: `AskSheikhScreen` (List view).
- **Required Backend Routes**: `/api/ask-sheikh/public`.
- **Current Status**: **PASS_FOUNDATION**. Wired, but list will be empty until admin approves questions.

## 13. Child plays Islamic game and score is saved
- **Goal**: Filter scenarios by age, answer questions, track Hasanat.
- **Required Mobile Screens**: `ChildrenGameScreen`.
- **Required Backend Routes**: `/api/mobile/game/status`, `/api/mobile/game/progress`.
- **Current Status**: **PASS_FOUNDATION**. Flow is wired, but scenario volume is low.

## 14. User browses library article
- **Goal**: Search categories, read verified articles, view citations.
- **Required Mobile Screens**: `LibraryScreen`, `LibraryDetailScreen`.
- **Required Backend Routes**: `/api/library/items`.
- **Current Status**: **PASS_FOUNDATION**. Flow is wired, but article volume is low.

## 15. User uses app while backend is offline
- **Goal**: App gracefully degrades without crashing.
- **Current Status**: **PARTIAL**. `SyncManager` exists, but comprehensive error boundaries are missing in API client.

## 16. User denies location permission
- **Goal**: App falls back to manual location input.
- **Current Status**: **PASS**. `LocationService` falls back to `makkah` or user-provided manual coordinates.

## 17. User denies notification permission
- **Goal**: Azan toggles are disabled with a clear message.
- **Current Status**: **PENDING**. Notification permission handling not implemented.

## 18. Admin reviews/moderates answer
- **Goal**: Admin approves Sheikh answer for public display.
- **Required Backend Routes**: `/api/admin/sheikh/answers/:id/approve`.
- **Current Status**: **PASS_FOUNDATION** (Backend only). No mobile admin UI exists.

## 19. App readiness/status page reflects true feature state
- **Goal**: `/ready` and test UI show honest status.
- **Current Status**: **PASS**. Status JSON and `/ready` route updated to strictly reflect blockers.

## 20. App is prepared for Google Play / Apple App Store review
- **Goal**: Compliant with store guidelines (Privacy, data collection, permissions).
- **Current Status**: **FAIL/PENDING**. Missing hosted public privacy URL and active push certificates.
