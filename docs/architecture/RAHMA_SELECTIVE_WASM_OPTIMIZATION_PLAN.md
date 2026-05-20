# Rahma WASM Selective Optimization Plan

WASM is optional and must be justified by measurable benefit. Flutter remains responsible for UI rendering.

## Candidate modules
- Prayer/Qibla/Hijri deterministic calculation core.
- Quran Arabic normalization and search indexing.
- Children reward/scoring engine.
- Lightweight deterministic moderation and safety filters.

## Non-candidates
- Screen rendering.
- Simple settings screens.
- Basic list/card UI.
- Anything that increases startup time without measurable benefit.

## Gate before implementation
- Dart baseline exists and is tested.
- WASM version has identical outputs for fixtures.
- Performance or battery benefit is measured on device.
