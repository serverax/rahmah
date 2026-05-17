# Rahma — Location and Notifications Implementation Report

## 1. Overview
This report verifies the implementation of native mobile permissions and the corresponding app-level policies for location-based services and Azan notifications.

## 2. Native Permissions

### 2.1 Android (`AndroidManifest.xml`)
- `android.permission.INTERNET`: Enabled for API calls.
- `android.permission.ACCESS_FINE_LOCATION`: Enabled for accurate prayer times/mosque finder.
- `android.permission.ACCESS_COARSE_LOCATION`: Enabled for battery-efficient location.
- `android.permission.POST_NOTIFICATIONS`: Enabled for Android 13+ support (Azan alerts).

### 2.2 iOS (`Info.plist`)
- `NSLocationWhenInUseUsageDescription`: Arabic rationale provided ("نحتاج للوصول إلى موقعك لحساب أوقات الصلاة الدقيقة وعرض المساجد القريبة منك").

## 3. Compliance Rules Verification

| Rule | Status | Implementation |
|---|---|---|
| No GPS on start | **PASS** | Permission requested only via settings or feature entry. |
| Manual fallback | **PASS** | UI supports text-based city/postcode when GPS is denied. |
| No exact GPS storage | **PASS** | Backend uses rounded coordinates for caching; no raw PII stored. |
| Just-in-time requests | **PASS** | Notifications requested only after user toggles Azan alerts. |

## 4. Verdict: **PASS**
Native permissions are correctly configured and aligned with App Store and Google Play privacy requirements.
