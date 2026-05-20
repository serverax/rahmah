# Apple App Privacy Label Draft

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Official basis: Apple requires privacy details that match app and third-party SDK behavior.

## Data Used To Track Users

Current finding: none found.

Evidence: no ads, advertising ID, analytics, attribution, or cross-app tracking SDK found in `apps/mobile/pubspec.yaml`.

## Data Linked To User

Declare if production backend/auth/support is enabled:
- User Content: questions/messages submitted to Ask Sheikh or RAG.
- Contact Info: email only if support, account, deletion, or authentication asks for it.
- Identifiers: device/app identifier only if device registration/push/session is enabled.
- Location: if the user enables prayer/Qibla location and it is sent to backend.

## Data Not Linked To User

May apply:
- Diagnostics/app interactions if only aggregate and not linkable.
- Feature status telemetry if collected anonymously.

## Data Not Collected

Current app should declare no collection of:
- Purchases/payment card details.
- Contacts.
- Photos/videos.
- Audio recordings.
- Browsing history.
- Advertising ID/tracking data.

Apple blockers:
- iOS build was not verified in this pass.
- Apple signing, archive, TestFlight upload, and App Review metadata not verified.
- Final privacy URL/support URL/contact email are placeholders.


