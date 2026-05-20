# Apple App Store Acceptance Audit

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Official references reviewed:
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/

| Area | Requirement | Rahma current evidence | Status | Required fix |
|---|---|---|---|---|
| iOS project | Buildable iOS app for review. | iOS project files exist. | PARTIAL | Run iOS build/archive on macOS. |
| App Review metadata | Complete, accurate metadata. | Listing draft exists. | PARTIAL | Fill real support/privacy URLs and screenshots. |
| Privacy Nutrition Label | Accurate data disclosures. | Draft created. | PARTIAL | Submit in App Store Connect after final backend config. |
| AI/religious content | Avoid final fatwa/unsupported advice. | Disclaimers and scholar-review gates exist. | PASS | Keep visible. |
| UGC/moderation | Report/block/moderation for public Q&A. | Backend workflows/tests exist. | PASS | Provide reviewer notes if needed. |
| Donation/fundraising | Must comply with Apple rules. | Donations disabled. | PASS_NOW | Do not enable without Apple charity/payment review. |
| In-app purchase risk | Digital goods/payment claims. | No IAP or payment SDK found. | PASS | Keep disabled. |
| External payment/link risk | Avoid unsupported external payment. | Donation provider disabled. | PASS_NOW | Remove/disable active payment links until reviewed. |
| Children/audience | Children feature must not collect child PII. | Family learning exists; child safety tests pass. | PARTIAL | Decide age rating and complete App Store audience details. |
| Login/account deletion | Deletion required if accounts exist. | Account deletion page/draft exists; auth not production configured. | PARTIAL | Final URL/contact. |
| Notification permission wording | Clear purpose strings needed. | Android code done; iOS permission text not fully audited for notifications. | PARTIAL | Add/verify iOS notification prompt copy during build. |
| Data collection/sharing | Must match privacy label. | Draft created; no ads/analytics SDK. | PARTIAL | Verify on device and backend production config. |
| Third-party SDKs | SDK privacy impact reviewed. | SDK audit created. | PASS_WITH_DISCLOSURE | Keep updated. |
| Copyright/source licensing | Religious sources cited; audio blocked. | Azan invalid asset blocked. | PARTIAL | Replace audio before enabling. |

Apple verdict: `PARTIAL_APPLE_BLOCKERS`.
