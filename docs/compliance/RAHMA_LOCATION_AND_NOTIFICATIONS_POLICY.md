# Rahma — Location and Notifications Policy

## 1. Location Services

Rahma utilizes location services strictly to enhance specific religious utilities: Prayer Times and Mosque Finder.

### 1.1 Permission Request Context
- **Just-in-Time**: Location permissions must only be requested when the user actively attempts to use a feature that requires it (e.g., tapping "Find Nearby Mosques" or enabling "Auto-Update Prayer Times").
- **Rationale Disclosure**: Before triggering the OS-level permission prompt, the app must display a custom UI explaining *why* the permission is needed (e.g., "نحتاج لمعرفة موقعك لحساب أوقات الصلاة الدقيقة").
- **App Store Declarations**: The `NSLocationWhenInUseUsageDescription` (iOS) and Android manifest strings must clearly state this purpose.

### 1.2 Data Handling
- **No Persistent Storage**: The backend must never store exact GPS coordinates.
- **Local Fallback**: The app must function normally if permission is denied, providing a manual search/input option for city or postcode.
- **Privacy Policy**: The use of location data must be explicitly declared in the app's privacy policy.

## 2. Push Notifications (Azan)

Rahma utilizes push notifications to deliver Azan alerts and religious reminders.

### 2.1 Permission Request Context
- **User-Initiated**: Notification permissions must only be requested when the user actively turns on an alert feature.
- **Granular Control**: Users must be able to configure alerts on a per-prayer basis (e.g., Fajr vs. Asr).
- **Sound Options**: The app must respect platform conventions and offer options for silent, vibrate, or full Azan audio.

### 2.2 Functional Independence
- **No Forced Opt-In**: Core app functionality (reading the Quran, asking questions) must never be gated behind enabling notifications.
