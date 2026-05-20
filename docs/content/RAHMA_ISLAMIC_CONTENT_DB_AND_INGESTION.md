# Rahma Islamic Content DB and Ingestion Foundation

## Scope
Rahma uses an offline-first content model. The mobile app remains Flutter-native; WASM is reserved for deterministic engines where it has measurable benefit.

## Source review summary
| Source | Status | Offline bundle | Notes |
|---|---:|---:|---|
| Tanzil Quran Text | approved | yes | CC BY 3.0 plus verbatim/no-modification terms. Display text must not be altered; normalized search text must be stored separately. |
| Quran Foundation / Quran.com APIs | needs_review | no | Good API candidate, but raw content redistribution/offline bundling may require separate written license depending on use. |
| Aladhan API | needs_review | no | Good sync/reference candidate for prayer/Hijri. Local calculations still need deterministic implementation and user adjustment. |
| Hisnul Muslim datasets | needs_review | no | Need exact dataset and license before full adhkar bundling. |
| Hadith datasets | needs_review | no | Need exact source/license/grading policy before bundling. |

## Mobile database strategy
Use SQLite via `sqflite` now. Drift/Isar can be evaluated later if query complexity or code generation benefits justify migration.

## Ingestion phases
1. Validate source registry and license status.
2. Import raw provider data into a staging area.
3. Normalize Arabic/search fields without modifying canonical display text.
4. Validate required attribution and source approval flags.
5. Export a compact mobile seed bundle.
6. Sync incrementally into SQLite and mark stale/cache state.

## WASM opportunities, not implemented yet
- Prayer/Qibla/Hijri deterministic calculations.
- Quran Arabic normalization and offline search indexing.
- Children reward/scoring engine.
- Lightweight deterministic moderation helpers.

WASM should not render UI and should not be used for simple screens.
