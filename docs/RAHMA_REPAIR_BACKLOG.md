# RAHMA REPAIR BACKLOG

## P0: App Stability & Core Wiring

| ID | Feature | Status | Severity | User Impact | Required Fix | Fixed Now |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| B-001 | GPS Native Sync | PARTIAL | P0 | Incorrect prayer times on move | Implement background position sync. | NO |
| B-002 | Azan Scheduling | **PASS_FOUNDATION**| P0 | No prayer notifications | Test on physical device to verify background scheduling. | **FOUNDATION OK**|
| B-003 | Error Boundaries | PARTIAL | P0 | App crashes on API failure | Add robust error handling. | NO |

## P1: Core Islamic Features

| ID | Feature | Status | Severity | User Impact | Required Fix | Fixed Now |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| F-001 | Daily Adhkar | PLACEHOLDER| P1 | Cannot read morning/evening adhkar | Build Adhkar repo and seed data. | NO |
| F-002 | Hadith Feature | PLACEHOLDER| P1 | Cannot read daily Hadith | Build Hadith repo and seed data. | NO |
| F-003 | Qibla Compass | MISSING | P1 | Cannot find Qibla direction | Implement Compass screen. | NO |
| F-004 | Full Quran Corpus| PARTIAL | P1 | Missing Surahs | Ingest full verified 114 Surahs. | NO |

## P2: Important / Compliance

| ID | Feature | Status | Severity | User Impact | Required Fix | Fixed Now |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C-001 | Public Privacy URL| PENDING | P2 | Store rejection | Host `privacy.html` on public domain. | NO |
| C-002 | Push Certificates | PENDING | P2 | No remote push | Configure APNs/FCM production keys. | NO |
| F-005 | Donations | PLACEHOLDER| P2 | Cannot donate | Integrate payment provider. | NO |
