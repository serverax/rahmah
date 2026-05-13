# Rahma — Frontend Arabic-native RTL QA Checklist

Sprint 15 deliverable. Companion to `docs/QA_ARABIC_RTL_CHECKLIST.md` (which is the binding contract). This file captures **what the current frontend actually delivers** so the operator can verify against it.

## What ships in this commit

- `apps/web/public/` — 7 static HTML pages: `index`, `ask`, `answers`, `child`, `sadaqah`, `library`, `privacy`.
- `apps/web/public/assets/styles.css` — Arabic-RTL styles, emerald + gold palette, mobile-first.
- `apps/web/public/assets/app.js` — vanilla JS API client + status renderer.
- `apps/web/server.js` — minimal Node static dev server (no dependencies).
- `apps/web/package.json` — `npm start` boots the dev server on :8080.
- `backend/app/test/frontend-rtl.test.js` — 8 automated assertions that
  enforce `lang="ar" dir="rtl"`, Arabic title, no forbidden English UI words,
  bottom-nav presence, home-card presence, Arabic font stack.

## Framework choice — honest note

The user asked for "preferably Next.js / TypeScript". This sprint ships **vanilla HTML/CSS/JS** instead, because installing a Next.js dependency tree in this turn would be a multi-hundred-MB operation with non-trivial config. The vanilla scaffold:

- Is replaceable: when the operator decides on Next.js or Vite + React, the framework's output goes into the same `apps/web/public/` (or replaces the directory) and the URL paths stay identical.
- Is verifiable: every page is a real file the test suite can read. No build-step magic to hide behind.
- Costs zero npm dependencies: avoids supply-chain risk in a religious app pre-launch.

## Checklist

- [x] Root `<html lang="ar" dir="rtl">` on every page (test enforced).
- [x] Arabic page title on every page (test enforced).
- [x] Arabic font stack in CSS (Noto Naskh Arabic primary).
- [x] No forbidden English UI words (`Home`, `Submit`, `Cancel`, `Loading`, `Welcome`, `Settings`, `Next`, `Back to`, `Login`, `Sign in`) — test enforced.
- [x] Bottom navigation present and Arabic-labelled on every page.
- [x] Six Arabic category cards on the home page (test enforced).
- [x] Visible `<main>` content is ≥85% Arabic by character count (test enforced on home).
- [x] API client returns Arabic safe messages on network failure ("الخدمة غير متاحة حالياً").
- [x] CSS uses `inset-inline-start/end` and `text-align: start` so layout follows direction.
- [x] Forms use `text-align: start` on inputs — they flip correctly in RTL.
- [x] No external CDN scripts. No fonts loaded from external hosts. No tracking.

## NOT covered yet (frontend deferred items)

- Real React/Next.js component model.
- TypeScript.
- Server-side rendering / SSG.
- Auth UI integration (real Sheikh login flow — backend is still 503 `auth_not_configured`).
- Public answer detail page (`/answer.html?slug=…`) — placeholder link only; content endpoint exists but the page is not yet written.
- Children's game interactivity.
- Admin / control-engine dashboard.
- Service-worker / offline support.
- i18n table (Arabic remains the canonical, only-supported language for v1).

## How to view locally

```
node apps/web/server.js
# open http://127.0.0.1:8080/
```

Or, with the backend running on 3000, set:

```
# in apps/web/public/index.html (and others), set:
# <meta name="rahma-api-base" content="http://127.0.0.1:3000" />
```

so the page can call the Fastify backend across origins. Default is same-origin.

## Test command

```
cd backend/app && npm test
# the frontend-rtl tests run as part of the standard suite.
```

## CSS direction-awareness — concrete examples

- Margins use `margin-inline-start/end`, not `margin-left/right`.
- Padding uses `padding-inline-start/end` where direction matters.
- `text-align: start` — text reads from the right in RTL.
- `inset-inline-start/end` on the bottom nav so the nav remains stuck to the document edges in both directions.
- The browser's built-in bidirectional algorithm handles mixed Arabic + Latin (e.g. citation labels like `Al-Baqarah 2:183` inside Arabic body text).

## Mobile-first

- Body type 17 px → 16 px effective on phone after CSS reset.
- Card grid `auto-fit, minmax(180px, 1fr)` collapses cleanly on narrow screens.
- Bottom nav fixed and tap-friendly (≥ 8 px padding).
- No horizontal scroll on viewports ≥ 320 px.

## Accessibility

- Semantic landmarks: `<header>`, `<main>`, `<nav>` with `aria-label`.
- `aria-live="polite"` on dynamic regions (backend status, answers list, privacy text).
- Buttons have visible focus styles (browser default + colour).
- Form labels are programmatically associated with inputs.
- Minimum contrast ≥ AA on body text.

## Reasons certain Latin strings remain

- Image / asset filenames (`/assets/styles.css`, `/assets/app.js`).
- HTTP error codes (`auth_not_configured`, `service_not_configured`) inside JS — these are wire-protocol identifiers, never shown to the user; the JS maps them to Arabic before rendering.
- Domain names (`rahma`, `sakina`) in metadata.
