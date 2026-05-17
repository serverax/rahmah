# Rahma — Google Play Compliance Checklist

## Pre-Release Preparation
- [ ] **Privacy Policy URL**: A valid, publicly accessible URL hosting the comprehensive privacy policy is available.
- [ ] **In-App Privacy Policy**: The privacy policy is easily accessible from within the app (e.g., in Settings or a dedicated Privacy screen).
- [ ] **Data Safety Form**: The Data Safety section in the Google Play Console has been accurately completed, detailing:
  - Account data collection.
  - Location data usage (approximate vs. precise).
  - UGC (questions submitted) handling.
  - Deletion mechanisms.
- [ ] **Target Audience and Content**: The target audience has been declared. Given the children's game, the app must comply with Google Play's Families policy.
- [ ] **App Metadata**: Title, short description, and full description are accurate and do not make unverified claims.
- [ ] **Screenshots/Graphics**: Store assets reflect the actual UI, including RTL layout.

## App Functionality
- [ ] **Location Permissions**: The app only requests location access when the user explicitly engages with prayer times or mosque finding. A clear, in-app rationale is provided before the system prompt.
- [ ] **Notification Permissions**: Push notification requests are contextual (e.g., when setting up Azan alerts) and explain their purpose.
- [ ] **UGC Moderation**: The "Ask Sheikh" feature defaults to private. Publicly visible answers have passed through admin approval. A reporting mechanism exists for any public UGC.
- [ ] **Child Safety**: The children's section contains no external links, no chat functionality, and collects no PII or location data.
- [ ] **Account Deletion**: A prominent option to request account and data deletion is present in the app.
