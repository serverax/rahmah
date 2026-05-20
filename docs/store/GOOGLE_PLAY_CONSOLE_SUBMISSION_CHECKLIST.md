# Google Play Console Submission Checklist

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

| Field | Final answer |
|---|---|
| App name | Rahma / رحمة |
| Package name | `com.serverax.rahma.rahma` |
| Short description | Arabic-first Islamic learning, Quran references, prayer tools, and reviewed answers with source citations. |
| Full description | See `docs/store/GOOGLE_PLAY_LISTING_DRAFT.md`. |
| Category | Education |
| Target audience | General audience. Not directed primarily to children; includes supervised family learning content. |
| Content rating notes | Religious educational content; user-submitted questions; moderated public Q&A; no violence/adult/gambling. |
| Data Safety | Use `docs/store/GOOGLE_PLAY_DATA_SAFETY_DRAFT.md`. |
| Privacy policy URL | NOT READY: no HTTPS domain. Temporary cluster test only: `http://148.251.247.56:30080/privacy.html` |
| Terms URL | NOT READY: no HTTPS domain. Temporary cluster test only: `http://148.251.247.56:30080/terms.html` |
| Support URL | NOT READY: no HTTPS domain. Temporary cluster test only: `http://148.251.247.56:30080/support.html` |
| Contact email | `support@ordinoxai.com` |
| Ads | No ads SDK found; answer No unless ads are added. |
| In-app purchases | No. Donation/payment provider disabled. |
| Donations | No active donation flow in this release. Do not claim active donations. |
| Account creation | Auth not configured for production; answer based on release build behavior. If accounts are enabled, account deletion URL is required. |
| Account deletion URL | Use support/deletion web flow if accounts are enabled. |
| Sensitive permissions | Location optional for prayer/Qibla; notifications for reminders; exact alarm only if retained for prayer scheduling. |
| Notifications | Local notification code exists; real-device test still required before marketing notification claims. |
| Children/family declaration | General audience; children feature educational; no child PII; parental supervision wording included. |
| Religious/AI disclaimer | Rahma is educational, not a formal fatwa authority; sensitive issues require qualified scholar review. |
| Screenshot list | Home, Ask Sheikh, cited answer, scholar review, blocked prompt, Quran/library, prayer/settings, children, privacy/terms. |
| Feature graphic status | BLOCKER: final feature graphic not verified in this pass. |

## Current Console Blockers

- `NO_DOMAIN_AVAILABLE`
- `PUBLIC_PRIVACY_POLICY_HTTPS_URL_NOT_AVAILABLE`
- `PUBLIC_SUPPORT_HTTPS_URL_NOT_AVAILABLE`
- Physical Android device smoke test not done.
- Final feature graphic not verified.
- Play Console forms not submitted.
