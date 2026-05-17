# Rahma — Apple App Store Compliance Checklist

## Pre-Release Preparation
- [ ] **Privacy Policy URL**: A valid, publicly accessible URL is provided in App Store Connect.
- [ ] **App Privacy Labels**: Accurate privacy labels have been submitted in App Store Connect:
  - Identify what data is linked to the user (e.g., account info, submitted questions).
  - Declare location data usage.
  - Declare that tracking (ATT) is NOT used.
- [ ] **App Metadata**: Title, subtitle, description, and keywords are accurate and appropriate.
- [ ] **Age Rating**: The age rating questionnaire has been completed accurately, reflecting the presence of religious content and user-generated questions.
- [ ] **Screenshots**: Provided screenshots accurately reflect the app in use on appropriate devices.

## App Functionality
- [ ] **App Tracking Transparency (ATT)**: The app does not track users across other companies' apps and websites, so ATT prompts are not required or implemented.
- [ ] **Location Services**: The `NSLocationWhenInUseUsageDescription` in `Info.plist` clearly explains *why* the app needs location access (e.g., "To calculate accurate local prayer times and find nearby mosques"). Access is only requested when these features are accessed.
- [ ] **Push Notifications**: Notifications are only requested when the user actively attempts to configure Azan or app alerts.
- [ ] **User-Generated Content (UGC)**:
  - A method exists to filter objectionable material from being posted (Admin approval gate).
  - A mechanism exists to report offensive content and timely responses.
  - A mechanism exists to block abusive users.
  - End User License Agreement (EULA) requires users to agree not to post objectionable content.
- [ ] **Child Safety / Kids Category**: If targeting the Kids category, the app strictly adheres to guideline 1.3 (no external links, no purchasing without parental gates, strict privacy).
- [ ] **Account Deletion**: Guideline 5.1.1(v) is met: users can initiate account deletion from within the app.
