# Rahma App Store / Google Play Release Readiness

## 1. Compliance Checklist

| Item | Status | Notes |
| :--- | :--- | :--- |
| Privacy Policy (In-App) | PASS | `/api/privacy/status` active + Flutter Settings wired |
| Privacy Policy (Public URL) | PENDING | Plan: Host at `https://rahma.app/privacy` |
| Account Deletion Request | PASS | Flutter UI + `/api/privacy/delete-account-request` + DB persistence |
| Support Contact | PASS | Flutter Support Screen + `/api/privacy/requests` active |
| Child Safety Statement | PASS | `/api/privacy/child-safety` active + Flutter Settings wired |
| Content Moderation | PASS | WASM Rule Engine foundation + Admin Review workflow active |
| Data Collection Disclosure | PASS | Included in Privacy Policy text |
| Push Permission (Native) | PASS | Native permission flow implemented via `NotificationService`. |
| APNs (iOS) | NOT_CONFIGURED | Missing production credentials. |
| FCM (Android) | NOT_CONFIGURED | Missing production credentials. |

## 2. Feature Native Readiness

| Feature | Mobile Native Ready | Verified Content | DB Backed | Status |
| :--- | :--- | :--- | :--- | :--- |
| Prayer Times | PARTIAL (Manual/GPS UI active) | YES | YES | PASS_FOUNDATION |
| Ask Sheikh Hasan | YES (V4 Wired) | YES | YES | PASS_FOUNDATION |
| Quran Reader | YES (List/Ayah Wired) | PARTIAL (Sample Mode) | YES | PASS_FOUNDATION |
| Azan Audio | PARTIAL (Selector Wired) | NO (Pending Review) | YES (Local Pref) | **PARTIAL** |
| Azan Alerts | PENDING (Local Notifications) | YES | YES | **PENDING**|
| Children Game | YES (Wired) | PARTIAL (Needs Review) | YES | PASS_FOUNDATION |
| Islamic Library | YES (Wired) | PARTIAL (Needs Content) | YES | PASS_FOUNDATION |

## 3. Implementation Details
- **Azan Audio**: PARTIAL — selector, metadata, and local preference foundation complete; real preview playback pending approved audio files.
- **Azan Alerts**: PENDING — Blocked by FCM/APNs and native scheduling not configured/tested.

## 4. Platform Status
- **Android**: Foundation complete. Real-device notification behavior validation PENDING.
- **iOS**: Foundation complete. local notification validation PENDING. APNs production certificate PENDING.
- **App Store Readiness**: NOT_READY until privacy URL, notification permissions, production certificates, and real-device tests are complete.
- **Google Play Readiness**: NOT_READY until real-device notification behavior and privacy policy URL are verified.

## 5. Public Policy URL Plan
- **Target URL:** `https://rahma.app/privacy`
- **Hosting:** GitHub Pages or Vercel (Production Ingress)
- **Source:** `docs/compliance/PRIVACY_POLICY_AR.md`

## 6. Pending Integrations
- **Audio CDN:** Required for Quran Audio.
- **Maps API Key:** Required for Mosque Finder.
- **WASM Binary:** Required for target mobile architectures.
- **FCM/APNs Certificates**: Required for remote push notifications.
- **Real Device Validation**: Core for GPS and background scheduling.
