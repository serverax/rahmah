# RAHMA MOBILE APP — HIGH LEVEL DESIGN (HLD)

## 1. Product Purpose
Rahma is a comprehensive, Arabic-first Islamic mobile application designed to serve the daily spiritual and educational needs of Muslims. Built with an uncompromising focus on content authenticity and family safety, it provides:
- Accurate, multi-method **Prayer Times** and native **Azan Audio / Alerts**.
- An offline-capable **Qibla Direction** compass.
- A verified **Quran Reader** with bookmarking and progress tracking.
- Verified **Daily Adhkar** and **Hadith** collections.
- **Ask Sheikh Hasan**: A secure, moderated workflow for submitting Islamic questions and receiving cited answers.
- A public database of **Approved Islamic Q&A**.
- An **Islamic Library** containing curated, safe articles.
- A **Children’s Islamic Learning Game** featuring safe, reviewed scenarios and score tracking.
- Comprehensive user settings, privacy transparency, and app-store compliance.

*Core Principle: Honesty. If a feature or dependency (like push notifications or content) is unconfigured or missing, the app must display a clear, truthful status message, rather than faking success.*

## 2. Target Users
- **Public Mobile User**: The primary audience. Reads content, checks prayer times, plays the game, and submits questions.
- **Registered User (Optional)**: Users who create an account to sync preferences across devices (if implemented).
- **Sheikh Hasan / Scholar**: Answers user questions via a secure portal, attaching required citations.
- **Admin / Moderator**: Reviews content (including Sheikh answers and children's games) before it goes public.
- **Child / Parent-Assisted Child**: Uses the safe, gamified learning modules.
- **Backend Operator**: Manages configuration, API keys, and content ingestion.

## 3. Target Platforms
- **Mobile Frontend**: Flutter (Android and iOS).
- **Backend API**: Node.js (Fastify) serving strict JSON contracts.
- **Web / Test UI**: A Vanilla JS/HTML interface used *exclusively* for developer testing and status monitoring, not the public product.

## 4. Architecture Overview

### Mobile App (Flutter)
- **UI/UX**: Strictly Arabic RTL, using Material 3 and custom Islamic styling (`RahmaTheme`).
- **State & Preferences**: Uses `SharedPreferences` for local-first storage (e.g., location, Azan selection).
- **Network**: `RahmaApiClient` handles REST communication with the Fastify backend.
- **Native Integrations**:
  - `geolocator` for GPS permissions and prayer calculations.
  - `audioplayers` for Azan preview.
  - `flutter_local_notifications` (Planned) for Azan alerts.
  - Compass/Sensor plugins (Planned) for Qibla.

### Backend (Node.js/Fastify)
- **API Surface**: Provides safe, schema-validated routes under `/api`.
- **System Routes**: `/health` and `/ready` provide truthful diagnostic data without leaking secrets (e.g., `DATABASE_URL`).
- **Domain Services**: Dedicated repositories (`quran-repository`, `game-repository`, `sheikh-question-repository`, etc.) handle business logic.

### Database (PostgreSQL)
- **Data Integrity**: Enforces relationships and validation via constraints and migrations.
- **Key Tables**: `users`, `ask_sheikh_questions`, `ask_sheikh_answers`, `quran_surahs`, `quran_ayahs`, `children_scenarios`, `children_progress`, `sakina_source_documents`, `privacy_requests`, `user_notifications`.

### Storage & Assets
- **Local Assets**: Approved Azan audio files (`.mp3`), bundled directly in the Flutter app or fetched from an approved CDN.
- **Islamic Content**: Managed via backend ingestion scripts.

### Security
- **Authentication**: JWT/Session based for Admin/Sheikh routes. Public routes are open but read-only.
- **Secrets**: Strictly managed via `.env`; never committed to Git.
- **Safety Gates**: All religious answers and public content must pass strict citation and moderation gates before visibility.

## 5. Main Data Flows

**A. Mobile App Startup**
- App boots -> Loads local preferences (SharedPreferences) -> Fetches `/api/mobile/status` (or relies on cache) -> Renders Home Screen.

**B. User Opens Home Screen**
- Reads location (GPS/Stored/Fallback) -> Calls `/api/prayer-times` -> Displays next prayer countdown and daily Islamic content.

**C. User Requests Prayer Times**
- Triggers Geolocator -> Obtains Lat/Lng -> Calls `/api/prayer-times` -> Updates local cache and UI.

**D. User Enables Azan Alerts**
- Toggles setting in UI -> Requests native notification permissions -> Schedules local notifications based on cached prayer times.

**E. User Previews/Selects Azan Audio**
- Opens Settings -> Fetches `/api/azan-audio/options` -> Selects audio -> Previews via `audioplayers` -> Saves selection to `SharedPreferences`.

**F. User Opens Qibla**
- Opens Qibla Screen -> Reads device magnetometer and GPS -> Calculates bearing to Makkah -> Displays compass UI.

**G. User Reads Quran**
- Opens Quran Screen -> Fetches `/api/quran/surahs` -> Selects Surah -> Fetches `/api/quran/surahs/:id` -> Renders Ayahs.

**H. User Reads Daily Adhkar**
- Opens Adhkar Screen -> Fetches `/api/adhkar` (or local cache) -> Displays categories and items.

**I. User Asks Sheikh Hasan a Question**
- Opens Ask Screen -> Fills form -> POST `/api/ask-sheikh/questions` -> Receives confirmation -> Route stores in DB with `status='submitted'`.

**J. Sheikh Logs In and Answers**
- Sheikh authenticates -> Fetches `/api/sheikh/questions` -> Selects question -> POST `/api/sheikh/questions/:id/answer` with required citations.

**K. Answer Becomes Public After Approval**
- Admin authenticates -> POST `/api/admin/sheikh/answers/:id/approve` -> DB sets `public_visible=TRUE` -> Answer appears in `/api/ask-sheikh/public`.

**L. User Plays Children Islamic Game**
- Selects Age Group -> Fetches `/api/mobile/game/status` -> Plays scenario -> POST `/api/mobile/game/progress` -> Progress synced to DB.

**M. User Opens Library/Article**
- Fetches `/api/library/categories` and `/api/library/items` -> Selects item -> Fetches details -> Displays content and verified citations.

**N. App Handles Backend Offline**
- API calls fail gracefully -> UI displays local cache or "Service Unavailable" messages without crashing.

**O. App Handles Missing Permission**
- GPS/Notification denied -> App falls back to manual input or disables feature -> UI shows explicit warning.

**P. App Handles Missing Database/RAG/Content**
- Backend endpoints return `configured: false` or `status: PENDING` -> Mobile UI displays truthful "Not Available" or "Sample Mode" messaging.

## 6. Status Rules

To ensure strict reality tracking, the following labels are used across all reports and audits:

- **PASS**: Works end-to-end for a real user and is proven by code/tests/runtime.
- **PASS_FOUNDATION**: Backend/schema/UI foundation exists, but full real-world behaviour (e.g., native sync, full content) is incomplete.
- **PARTIAL**: Some of the real journey works, but an important part is missing or requires manual intervention.
- **FAIL**: Broken, crashes, or unusable.
- **MOCK_ONLY**: Works only with fake/sample/mock data.
- **PLACEHOLDER_ONLY**: Screen or route exists but does not perform the real function (e.g., "Coming Soon").
- **NOT_CONNECTED**: Frontend exists but backend/data/native path is missing.
- **PENDING**: Not implemented yet, or blocked by external dependencies.
