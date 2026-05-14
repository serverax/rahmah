# Sprint 57 — API Client Foundation

**Date:** 2026-05-14

## What ships

- `docs/api/openapi/rahma-mobile-api.yaml` (canonical machine spec).
- `apps/mobile/lib/api/rahma_api_client.dart` — `dart:io` stdlib HTTP client + typed `RahmaApiError`.
- `apps/mobile/test/api_client_test.dart` — refuses calls when `RAHMA_API_BASE` is empty + error shape sanity.
- `docs/api/RAHMA_OPENAPI_CONTRACT_REPORT.md`.

## Honesty record

- No hardcoded URL in the client. The compile-time default for
  `RAHMA_API_BASE` is empty; client refuses to make network calls when
  unconfigured.
- `RahmaApiError.messageAr` is the only user-facing string; machine
  `code` is internal.
- The `dart:io` stdlib HTTP client is intentionally minimal — no
  third-party dependency until the operator picks one
  (`package:http`, `package:dio`, etc.).

## Local check

The Dart test file is committed; running it requires Flutter SDK on
the workstation. The Flutter CI workflow (`rahma-mobile-flutter-ci`)
runs `flutter analyze` + `flutter test` when CI sees a workstation
with the SDK provisioned (`subosito/flutter-action@v2`).

## Operator next steps

- Pick the HTTP package family.
- Pick the OpenAPI codegen tool if typed generation is desired
  (`openapi-generator` Dart, `openapi_dart_generator`, etc.).
- Decide on the `dio` interceptor stack (auth, retry, logging).
