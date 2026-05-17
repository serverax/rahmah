# Rahma — App Store Compliance Requirements

## 1. Overview
Rahma must be designed and built to pass both Google Play Store and Apple App Store reviews. Due to the sensitive nature of Islamic religious content, children's features, and location-based services, compliance cannot be an afterthought.

## 2. Privacy & Data Safety
- **Privacy Policy**: A comprehensive privacy policy must be accessible both within the app and via a public URL provided in the store listings.
- **Data Collection**: The policy must explicitly detail the collection, usage, and sharing (or lack thereof) of user accounts, questions, location data, and notification preferences.
- **Data Safety Declarations**: Accurate declarations must be prepared for both Google Play (Data Safety) and Apple (App Privacy). Falsifying these labels is strictly prohibited.
- **Account Deletion**: A clear, accessible path for users to request account and data deletion must be provided within the app.

## 3. Child Safety
- **Content Suitability**: The children's game (Hasanat scenarios) must contain strictly positive, safe content without political, sectarian, or shaming language.
- **No UGC / Chat**: Children must not have access to free-text user-to-user chat or public profile exposure.
- **No External Links**: The children's section must not contain links to external websites.
- **Data Collection**: No precise location or PII collection is permitted from child users.

## 4. User-Generated Content (UGC)
- **Ask Sheikh Workflow**: Questions submitted to the Sheikh are considered UGC.
- **Moderation**: Strict moderation workflows must be in place. Questions are private by default. Answers must be approved by an administrator before becoming public.
- **Reporting & Blocking**: A clear mechanism for users to report objectionable public content must be implemented, alongside a process for administrators to remove it.

## 5. Religious Content Safety
- **Source Attribution**: All Quranic and Hadith texts must be accurately attributed to verified sources.
- **No AI Fatwas**: The system must never auto-generate religious rulings. All answers must be authored by a qualified human scholar.
- **Citation Gate**: No answer can be published publicly without at least one verified citation from the Quran or Hadith.

## 6. Location & Notifications
- **Location Permission**: GPS access for prayer times and mosque finding must be requested only when the feature is activated. The app must remain functional with manual location entry if permission is denied.
- **Notification Permission**: Azan alerts require explicit permission. Users must be able to configure alerts per prayer (silent, vibration, sound).
- **Transparency**: The privacy policy must disclose the use of location data for these specific features.

## 7. Third-Party APIs
- **Review**: All external APIs (Quran text, prayer times) must be reviewed for licensing and privacy compliance.
- **Fallback**: The app must handle external API failures gracefully without crashing.

## 8. Payments & Donations (Future)
- Any future implementation of donations must comply strictly with Apple's In-App Purchase guidelines and Google Play's Billing policies, particularly regarding charitable contributions.
