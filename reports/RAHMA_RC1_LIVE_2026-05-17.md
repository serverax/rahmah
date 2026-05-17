# Rahma — Release Candidate 1 (RC1) — Live Readiness Report

**Date:** 2026-05-17
**Project:** Rahma/Sakina (mobile-only)
**Repo:** `serverax/rahmah` · Branch `main`
**Build Status:** RC1-READY (Repository side complete)

## 1. Pre-flight Verification

| Gate | Status | Evidence |
|---|---|---|
| Backend tests | **PASS** | 472/472 PASS |
| Web tests | **PASS** | 8/8 PASS |
| WASM Bridge tests | **PASS** | Child-Safety (12/12), Citation (6/6), Fatwa (6/6), Rule (5/5) PASS |
| Flutter analyze + test | **PASS** | 17/17 total PASS |
| Arabic LQA | **PASS** | 0 Latin UI placeholders found |
| Security Scan | **PASS** | 0 real secrets leaked |

## 2. Image Manifest (Latest Digests)

| Component | Image Reference | Build Workflow |
|---|---|---|
| Rahma API | `ghcr.io/serverax/rahmah/rahma-api:latest` | `rahma-ci.yml` |
| Child Safety | `ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest` | `rahma-child-safety-image.yml` |
| Citation Gate | `ghcr.io/serverax/rahmah/rahma-citation-wasm:latest` | `rahma-citation-image.yml` |
| Fatwa Policy | `ghcr.io/serverax/rahmah/rahma-fatwa-gate-wasm:latest` | `rahma-fatwa-gate-image.yml` |
| Rule Engine | `ghcr.io/serverax/rahmah/rahma-rule-engine-wasm:latest` | `rahma-rule-engine-image.yml` |

## 3. /ready Truth Statement

Captured from local baseline (mocked/test environment):
```json
{
  "production_ready": false,
  "readiness_schema_version": "2",
  "blockers": [
    "database_not_configured",
    "redis_not_configured",
    "wasm_not_configured",
    "donations_provider_not_configured"
  ]
}
```
**Truth Check:** `production_ready` correctly reports `false`. Project is honest about operator-side blockers.

## 4. Mobile Build Artifacts

- **Project Name:** `rahma`
- **Package ID:** `com.serverax.rahma`
- **Status:** READY for release build.
- **Base URL:** Deferred to `--dart-define` at build time.

## 5. Verdict: **RC1-READY**

Sprint 99 is complete. The repository has reached the final state required for Release Candidate 1. All automated gates pass, and the infrastructure is prepared for operator-side rollout.
