# Google Play Acceptance Audit

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Date: 2026-05-20

Official references reviewed:
- Google Play App Content and review preparation: https://support.google.com/googleplay/android-developer/answer/9859455
- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play Developer Program Policies index: https://support.google.com/googleplay/android-developer/answer/16329168

| Policy area | Requirement | Rahma current evidence | Status | File or command evidence | Required fix if not PASS |
|---|---|---|---|---|---|
| App category | Accurate category. | Islamic education/prayer app. | PASS | listing draft. | None. |
| Target audience | Accurate audience; children policy if directed to children. | Children section exists, but app should be general audience. | PARTIAL | children audit. | Confirm Play target audience form. |
| Children/family risk | No child PII, ads controlled. | No ads SDK; child PII gates tested. | PARTIAL | backend/mobile tests. | Real-device flow and Play form not done. |
| Religious content wording | No official authority claim. | Drafts say educational/not fatwa. | PASS | privacy/terms/listing. | None. |
| AI religious disclaimer | Must not present AI as final fatwa. | Added disclaimer and RAG safety states. | PASS | terms/privacy; RAG tests. | Keep visible in store and app. |
| UGC risk | Moderation/reporting for user questions/public Q&A. | Backend moderation/report routes exist and tests pass. | PASS | backend tests 535 pass. | None. |
| Privacy policy URL | Public HTTPS URL required. | File exists, but Rahma has no domain. Temporary HTTP/IP plan only. | PARTIAL | `apps/web/public/privacy.html`; `docs/store/CLUSTER_ONLY_PUBLIC_URL_PLAN.md`. | Add real HTTPS domain before final submission. |
| Data Safety | Must match real behavior and SDKs. | Draft created. | PARTIAL | data safety draft. | Complete Play Console form. |
| Account deletion | Required if accounts exist. | Deletion page/docs exist; auth not production configured. | PARTIAL | account deletion page/docs. | Final URL/contact. |
| Permissions | Justify internet, location, notifications, exact alarm. | Audit created; exact alarm may be scrutinized. | PARTIAL | manifest and permissions audit. | Consider removing exact alarm if not essential. |
| Notifications | Permission and disclosure required. | Code requests Android notification/exact alarm permission. | PARTIAL | notification tests; no real device. | Real-device test. |
| Internet/network | API calls only when configured. | `API_BASE_URL` default empty; legacy `RAHMA_API_BASE` remains backward compatible. | PASS | mobile config/API client. | Use verified HTTPS API URL before production. |
| Audio/media | Must not use unlicensed/nonworking asset. | Azan asset is invalid HTML; playback blocked. | FAIL | hash/header check; metadata updated. | Replace with licensed playable audio. |
| Location | Optional location disclosure. | geolocator and permissions present. | PASS_WITH_DISCLOSURE | manifest/Info.plist. | Keep prominent in-app purpose. |
| Device ID/analytics/crash | Must disclose SDK collection. | device_info_plus present; no analytics/crash SDK. | PARTIAL | SDK audit. | Disclose diagnostics if sent. |
| Ads | Accurate ads status. | No ads SDK found. | PASS | SDK audit. | Do not add ads before updating forms. |
| Donations/payments | Avoid misleading charity/payment claims. | Provider disabled; no payment SDK. | PASS_NOW | `/ready`, donation audit. | Keep disabled or complete provider/legal review. |
| External links | Must be safe and accurate. | Support/privacy/source links exist; placeholders remain. | PARTIAL | web pages. | Replace placeholders. |
| Medical/legal/financial claims | Avoid advice claims. | Disclaimers added. | PASS | terms/listing. | None. |
| Misleading claims | No "official/certified/complete" claim found in listing draft. | RAG reports approved-source counts only. | PASS | reports/tests. | Keep. |
| Copyright/licensing | Quran/source attribution exists; Azan invalid. | RAG verified; audio blocked. | PARTIAL | RAG live, Azan audit. | Replace audio asset. |
| Source attribution | Citation cards and registry present. | RAG live verified with citations. | PASS | RAG script/API smoke. | None. |
| Scholar review flow | Sensitive fiqh routes to review. | RAG tests pass. | PASS | query tests. | None. |

Google verdict: `PARTIAL_GOOGLE_PLAY_BLOCKERS`.
