# Rahma — Android + iOS Release Plan

**Date:** 2026-05-14
**Status:** PLAN. No mobile source committed; this is the operator-facing checklist.

## Pre-release gates (must all PASS before any store submission)

1. Backend `production_ready: true` from `/ready`.
2. Final API domain confirmed and TLS issued (Let's Encrypt or operator-chosen).
3. Auth provider live (`AUTH_MODE=external`, `OIDC_*` set).
4. Approved Islamic source registry has at least one approved entry.
5. Sheikh repository configured.
6. Privacy + terms + account-deletion + data-export endpoints reachable.
7. WASM modules built and signed.
8. CI green for `rahma-ci`, `rahma-security-scan`, `rahma-k3s-verify`, `rahma-wasm-build`, `backend-image-ci`.
9. Mobile app version bumped, changelog written, store screenshots refreshed.
10. Privacy labels (Apple) + Data Safety form (Google) match what the backend actually does.

## Android (Google Play)

| Item | Owner | Status |
|---|---|---|
| Keystore generated, stored in CI secret | operator | NOT DONE |
| `applicationId` finalised (`com.rahma`) | operator | TBD |
| Min SDK + target SDK | mobile | Flutter default |
| Network security config (`api.<final>` only) | mobile | NOT DONE |
| Adaptive launcher icon | design | NOT DONE |
| Play Store listing (Arabic-first) | content | NOT DONE |
| Data Safety form | privacy | NOT DONE |
| Content rating questionnaire | content | NOT DONE |
| Internal test track | operator | NOT DONE |

Build command (Flutter, once source exists):

```bash
cd apps/mobile
flutter build appbundle --release \
  --dart-define=RAHMA_API_BASE=https://api.<final-rahma-domain>
```

## iOS (App Store)

| Item | Owner | Status |
|---|---|---|
| Apple Developer team ID | operator | TBD |
| Provisioning profile + signing cert in CI | operator | NOT DONE |
| Bundle id `com.rahma.mobile` | operator | TBD |
| ITSAppUsesNonExemptEncryption | mobile | NOT DONE |
| App Privacy answers | privacy | NOT DONE |
| Age rating | content | NOT DONE |
| Arabic-first App Store listing | content | NOT DONE |
| TestFlight internal group | operator | NOT DONE |

Build command (Flutter, once source exists):

```bash
cd apps/mobile
flutter build ipa --release \
  --dart-define=RAHMA_API_BASE=https://api.<final-rahma-domain>
```

## Never list

- Never ship a build that points at `api.rahma.example` (placeholder).
- Never ship before backend `production_ready: true`.
- Never bundle a hardcoded admin or sheikh password.
- Never ship analytics / third-party SDKs without operator sign-off.
- Never ship with the Privacy / Data Safety answers out of sync with the backend.

## Honesty rule

This document is a PLAN, not a release record. The first time a real
release happens, a new report appears at
`reports/RAHMA_MOBILE_RELEASE_<date>_REPORT.md` with:

- Build artefact hashes.
- Store-listing URLs.
- Final pre-release gate evidence (each item from the table above with
  command output).

Until then, **no Android or iOS release is claimed**.
