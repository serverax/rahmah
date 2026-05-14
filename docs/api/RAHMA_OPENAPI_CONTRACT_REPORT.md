# Rahma — OpenAPI Contract Report

**Date:** 2026-05-14

## Canonical paths

- Machine spec: `docs/api/openapi/rahma-mobile-api.yaml` (Sprint 57).
- Earlier copy: `docs/api/RAHMA_MOBILE_API_OPENAPI.yaml` (kept for compatibility).

Both files have identical content today.

## Endpoints in scope for mobile

```
GET  /health
GET  /ready
GET  /api/mobile/status
GET  /api/auth/status
GET  /api/db/status
GET  /api/rag/status
GET  /api/rag/sources/status
POST /api/rag/query
GET  /api/engine/status
GET  /api/privacy/status
GET  /api/privacy/child-safety
POST /api/privacy/requests
POST /api/privacy/delete-account-request
POST /api/privacy/data-export-request
GET  /api/admin/privacy/requests           (admin / reviewer)
POST /api/admin/privacy/requests/:id/complete
GET  /api/terms/status
GET  /api/library/status
GET  /api/library/categories
GET  /api/library/items
GET  /api/library/documents
GET  /api/library/search
GET  /api/library/sources/status
GET  /api/public/sheikh-hasan/qa
GET  /api/public/answers
POST /api/sheikh/login
POST /api/sheikh/questions
GET  /api/sheikh/questions                 (sheikh / admin)
GET  /api/sheikh/questions/:id             (sheikh / admin)
POST /api/sheikh/questions/:id/answer      (sheikh / admin)
POST /api/sheikh/answers/:id/submit        (sheikh / admin)
POST /api/admin/sheikh/answers/:id/approve (content_reviewer | moderator | admin)
POST /api/admin/sheikh/answers/:id/reject  (content_reviewer | moderator | admin)
GET  /api/quran
GET  /api/hadith
GET  /api/dua
GET  /api/game/status
POST /api/game/progress
POST /api/donations/intent
GET  /api/donations/status/:id
GET  /api/content/sources
GET  /api/content/sources/status
```

## Mobile-side client

`apps/mobile/lib/api/rahma_api_client.dart` is the minimal Dart client.
Uses `dart:io` stdlib (no third-party HTTP dep yet). Operator may swap
to `package:dio` after the dependency policy is set.

Client refuses every call when `RAHMA_API_BASE` is empty
(compile-time default) and raises a typed `RahmaApiError` with
`code` + `safe_message_ar`.

## Honesty rules baked into the client

- No hardcoded base URL anywhere in `lib/`.
- No default fallback to `api.rahma.example` or any OrdinoxAI domain.
- Always surfaces `safe_message_ar` to the UI; the machine `error` code
  is only for app-side branching, never shown to the user.
- Refuses 4xx / 5xx by raising `RahmaApiError`.
- NEVER logs the request body of `/api/sheikh/questions` (PII).
- NEVER caches a response in plain on disk; caching uses the encrypted
  hive boxes documented in `RAHMA_MOBILE_OFFLINE_STRATEGY.md`.
