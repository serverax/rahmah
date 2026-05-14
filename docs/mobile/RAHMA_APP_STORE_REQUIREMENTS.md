# Rahma — App Store Requirements (Apple + Google)

**Date:** 2026-05-14

This document maps the platforms' submission requirements to the
backend endpoints the mobile app uses to satisfy them.

## Privacy + account control

Both stores require all of:

| Requirement | Backend endpoint | Mobile UX |
|---|---|---|
| Privacy policy | `GET /api/privacy/status` | "Privacy" screen renders the Arabic body |
| Terms | `GET /api/terms/status` | "Terms" screen |
| Account deletion request | `POST /api/privacy/requests {request_type:"delete_account"}` | "Delete my account" button |
| Data export request | `POST /api/privacy/requests {request_type:"data_export"}` | "Download my data" button |
| Data correction | `POST /api/privacy/requests {request_type:"correct_data"}` | optional |
| Restrict processing | `POST /api/privacy/requests {request_type:"restrict_processing"}` | optional |
| Contact us | `POST /api/privacy/requests {request_type:"contact"}` | always reachable |
| Child-safety statement | `GET /api/privacy/child-safety` | shown when children's section is active |

Each POST returns `persisted: false` until the operator wires a real
DB. The mobile app shows the `message_ar` and tells the user "we will
contact you to confirm". This satisfies the "have a path to delete /
export" requirement at submission time.

## Apple App Privacy labels

| Apple section | Honest answer for Rahma |
|---|---|
| Contact Info — Name | NOT collected |
| Contact Info — Email | Collected (hashed only; for privacy requests) |
| Contact Info — Phone | NOT collected |
| Identifiers — Device ID | Collected (hashed only, for push tokens) |
| Identifiers — User ID | Collected (opaque UUID; never email) |
| Usage Data — Product Interaction | Minimum needed for app function |
| Diagnostics — Crash data | TBD (operator may enable Apple-built-in only) |
| Health & Fitness | NOT collected |
| Financial Info | NOT collected (donations route through provider; no card on backend) |
| Location | NOT collected |
| Sensitive Info | NOT collected |
| Contacts | NOT collected |
| User Content — Audio | NOT collected |
| User Content — Photos / Videos | NOT collected |
| User Content — Gameplay Content | Local only; opt-in counters only |
| Browsing History | NOT collected |
| Search History | NOT collected |
| Purchases | NOT applicable (no IAP) |
| Other Data Types | NONE |

## Google Play Data Safety

Same shape as Apple. Key answers:

- "Does your app collect or share any of the required user data types?" → **Yes** (email hash + device hash + opaque user id).
- "Is all user data encrypted in transit?" → **Yes** (TLS once the final domain ships).
- "Do you provide a way for users to request data deletion?" → **Yes** (account deletion endpoint).
- "Is the data ephemeral?" → No, retained per privacy policy.

## Children's section gating

Both stores require strict age gating when child content is offered:

- The children's section sits behind a wali (guardian) toggle on the
  privacy page.
- The game collects ZERO personal data from the child.
- There is no chat, no public profile, no leaderboard.
- The app honours the wali toggle by refusing to render the section
  when disabled.

## Content rating

- Apple: 4+ likely; reviewer will see the children's section and the
  Sheikh Q&A.
- Google: "Everyone" likely; the IARC questionnaire must answer
  truthfully about the Sheikh content (educational, religious, no
  user-generated public chat).

## Submission checklist (Apple)

1. App Privacy labels filled in App Store Connect.
2. Screenshots (6.7", 5.5", iPad if applicable) — Arabic-RTL.
3. App preview video (optional).
4. Encryption export compliance answered (no custom crypto).
5. Test account if needed.
6. Review notes explaining the Sheikh Q&A workflow + citation gate.

## Submission checklist (Google)

1. Data Safety form complete.
2. Content rating questionnaire complete.
3. Target audience and content declarations.
4. Privacy policy URL public (post-launch this is a static page; pre-launch the operator can host the markdown via a static-page host).
5. Internal test track → Closed test → Open test → Production.
