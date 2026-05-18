# GEMINI FULL CODE REVIEW REPORT

## 1. Project Structure Summary
Rahma is a monorepo consisting of:
- **apps/mobile**: Flutter mobile application.
- **apps/web**: Vanilla JS/HTML web test UI and static asset server.
- **backend/app**: Node.js (Fastify) API backend with PostgreSQL support.
- **wasm**: Rust-based safety and rule modules (Binary build BLOCKED).
- **data/islamic-sources**: Verified content metadata and registries.

## 2. Key Modules
- **RahmaApiClient (Mobile)**: Handles communication with backend, including V4 workflow support.
- **Prayer Engine (Backend)**: Trigonometric calculation service for multi-method prayer times.
- **Sheikh Question Repository (Backend)**: Implements submission -> answer -> approval lifecycle.
- **LocationService (Mobile)**: Integrates `geolocator` with manual fallback support.

## 3. Detected Broken / Incomplete Areas
- **Native Scheduling**: The app lacks `flutter_local_notifications` logic to trigger Azan sounds at calculated prayer times.
- **RAG Production Deployment**: While code exists, no production vector DB instance is configured.
- **Content Gaps**: Adhkar, Hadith, and Qibla features are currently placeholders or missing from the mobile UI.

## 4. Test Coverage Summary
- **Backend**: 473 tests passing (`node --test`). Covers migrations, routes, safety gates, and repository persistence.
- **Mobile**: 19 tests passing (`flutter test`). Covers smoke tests, RTL rendering, and screen structure.
- **Overall**: 492 PASS. However, tests primarily verify foundational logic and UI structure rather than end-to-end device behavior.

## 5. Repair Backlog Highlights
- **P0**: Native Azan scheduling.
- **P0**: Background GPS sync.
- **P1**: Full Quran corpus ingestion.
- **P1**: Daily Adhkar/Hadith repository + UI wiring.
