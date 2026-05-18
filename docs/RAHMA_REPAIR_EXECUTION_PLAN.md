# RAHMA REPAIR EXECUTION PLAN

This plan prioritises repairs to transition Rahma from a functional foundation to a production-ready mobile app.

## P0 — Core App Usability & Native Wiring

| ID | Feature | Current Status | Target Status | Required Fix | Files to Change | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| P0-01 | Background GPS Sync | PARTIAL | PASS | Implement native background location sync via `geolocator`. | `apps/mobile/lib/services/location_service.dart`, `apps/mobile/lib/screens/home_screen.dart` | Location updates automatically when moving; Prayer times refresh. |
| P0-02 | Native Azan Scheduling | PENDING | PASS | Integrate `flutter_local_notifications` for local alerts. | `apps/mobile/pubspec.yaml`, `apps/mobile/lib/services/notification_service.dart` (new) | App schedules notifications based on fetched prayer times. Alert fires at the exact time. |
| P0-03 | Error Boundaries | PARTIAL | PASS | Add global error catchers and graceful degradation in `RahmaApiClient`. | `apps/mobile/lib/api/rahma_api_client.dart`, `apps/mobile/lib/app.dart` | Network failure shows safe Arabic error, does not crash app. |

## P1 — Core Islamic Mobile Features

| ID | Feature | Current Status | Target Status | Required Fix | Files to Change | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| P1-01 | Qibla Compass | FAIL/MISSING | PASS | Implement Qibla using magnetometer sensors. | `apps/mobile/lib/screens/qibla_screen.dart` (new), `pubspec.yaml` | Arrow points to Makkah based on current GPS and device orientation. |
| P1-02 | Full Quran Corpus | PASS_FOUNDATION | PASS | Ingest full 114 Surahs into the database. | `backend/db/seeds/quran_seed.sql` (new) | Sample Mode warning removed. All Surahs readable. |
| P1-03 | Daily Adhkar Data | PLACEHOLDER_ONLY | PASS | Seed morning/evening Adhkar and wire to UI. | `backend/db/seeds/adhkar_seed.sql`, `apps/mobile/lib/screens/dua_screen.dart` | Adhkar screen displays real data from API. |
| P1-04 | Hadith Data | PLACEHOLDER_ONLY | PASS | Seed authenticated Hadith and wire to UI. | `backend/db/seeds/hadith_seed.sql`, `apps/mobile/lib/screens/hadith_screen.dart` | Hadith screen displays real data from API. |

## P2 — Content and Engagement

| ID | Feature | Current Status | Target Status | Required Fix | Files to Change | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| P2-01 | Children Game Volume | PASS_FOUNDATION | PASS | Add 100+ approved scenarios to DB. | `backend/db/seeds/game_seed.sql` | Users can play extended sessions without repeating content immediately. |
| P2-02 | Library Volume | PASS_FOUNDATION | PASS | Ingest approved Islamic articles. | `backend/db/seeds/library_seed.sql` | Categories contain multiple readable articles. |
| P2-03 | Offline Caching | PARTIAL | PASS | Persist API responses to local SQLite via `SyncManager`. | `apps/mobile/lib/offline/sync_manager.dart` | Reading Quran and Library works without internet connection. |

## P3 — Release Hardening & Compliance

| ID | Feature | Current Status | Target Status | Required Fix | Files to Change | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| P3-01 | Public Privacy URL | PENDING | PASS | Host `privacy.html` on public domain. | Vercel/GitHub Pages config | `https://rahma.app/privacy` is reachable. |
| P3-02 | Push Certificates | PENDING | PASS | Configure FCM and APNs credentials in backend. | `.env`, Firebase Console, Apple Developer Portal | Remote push notifications successfully delivered. |
| P3-03 | Sheikh Mobile Login | NOT_CONNECTED | PASS | Add Sheikh login screen and moderation UI to mobile app. | `apps/mobile/lib/screens/sheikh_login_screen.dart` | Sheikh can login and answer questions from phone. |
