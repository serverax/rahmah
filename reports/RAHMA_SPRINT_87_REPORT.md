# Rahma — Sprint 87 — Mobile App: API Client Hardening — Report

**Date:** 2026-05-17
**Project:** Rahma/Sakina (mobile-only)
**Repo:** `serverax/rahmah` · Branch `main`

## 1. Objective

Implement a robust API client for the Rahma Flutter app with built-in retry logic, timeout handling, and structured error decoding.

## 2. Deliverables

| # | Goal | Status | Evidence |
|---|---|---|---|
| 1 | Add `http` package | **PASS** | `pubspec.yaml` updated |
| 2 | Implement Retry Logic | **PASS** | `_withRetry` wrapper in `rahma_api_client.dart` |
| 3 | Implement Timeout Handling | **PASS** | 10s timeouts enforced on all calls |
| 4 | Refactor to `package:http` | **PASS** | Replaced `dart:io` HttpClient for better robustness |
| 5 | Verify with unit tests | **PASS** | `test/api_client_test.dart` → 2/2 PASS |

## 3. Changes

- **apps/mobile/pubspec.yaml**:
  - Added `http: ^1.2.1`.
- **apps/mobile/lib/api/rahma_api_client.dart**:
  - Refactored to use `http.Client`.
  - Added `_withRetry` helper with exponential backoff (basic) and max 3 attempts.
  - Added 10-second timeout to all GET and POST requests.
  - Improved `_decode` to handle network errors and structured Arabic safe messages.

## 4. Tests Run

```
cd apps/mobile && flutter test test/api_client_test.dart    → 2/2 PASS
```

## 5. Verdict: **PASS**

Sprint 87 is complete. The mobile application now has a production-grade API client capable of surviving transient network issues and providing clear feedback to the user.
