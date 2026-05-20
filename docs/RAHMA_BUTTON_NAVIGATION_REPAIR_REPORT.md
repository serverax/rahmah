# Rahma Button & Navigation Repair Report

**Date:** 2026-05-19  
**Scope:** Rahma only (`F:/rahma`)  
**Final status:** `PASS_BUTTON_NAVIGATION_VERIFIED`

---

## Summary

Home and feature navigation were repaired on **web** and **Flutter mobile**. All four primary home cards now use real links / `Navigator.pushNamed` targets. Backend unavailability no longer blocks opening feature screens; a premium in-screen status pill is shown instead of blocking home text.

---

## Root causes

| Platform | Issue |
|----------|--------|
| Web `index.html` | Backend status on home could show `الخدمة غير متاحة حالياً` and distract from navigation; links used absolute `/` paths (fragile when opened as static files). |
| Web `test-ui/mobile-preview.html` | Home mock used non-clickable `<motion class="card">` divs and `href="#"` bottom nav — **no navigation**. |
| Flutter | Home shortcuts for **مصادر المحتوى** and **إجابات موثقة** pointed to `/library` instead of dedicated screens; no `/answers` or `/sources` routes. |

---

## Files changed

### Web
- `apps/web/public/index.html` — relative `href`s, `data-nav-card` + `aria-label`, removed home `data-rahma-status` banner
- `apps/web/public/assets/app.js` — service pill API, `escapeHtml`, home skips blocking error
- `apps/web/public/assets/test-ui.css` — `.rahma-service-pill`, chips, focus styles, `.feature-nav-card`
- `apps/web/public/assets/library.js` — unavailable → pill renderer
- `apps/web/public/answers.html` — pill + static sample Q&A when API down
- `apps/web/public/sources.html` — premium layout + pill + local fallback sources
- `apps/web/public/test-ui/mobile-preview.html` — clickable home cards + real nav links
- `apps/web/package.json` — includes `home-navigation.test.js`
- `backend/app/test/home-navigation.test.js` — **new** navigation tests

### Flutter
- `apps/mobile/lib/app.dart` — routes `/answers`, `/sources`
- `apps/mobile/lib/screens/home_screen.dart` — four primary tiles with correct routes + `ValueKey('home-card-…')`
- `apps/mobile/lib/screens/verified_answers_screen.dart` — **new**
- `apps/mobile/lib/screens/sources_screen.dart` — **new**
- `apps/mobile/lib/widgets/rahma_service_unavailable_pill.dart` — **new**
- `apps/mobile/lib/widgets/rahma_widgets.dart` — `RahmaServiceStatusPill` overflow fix
- `apps/mobile/lib/screens/ask_sheikh_screen.dart` — in-screen unavailable pill
- `apps/mobile/lib/offline/local_content.dart` — `approvedSources` + `LocalApprovedSource`
- `apps/mobile/test/home_navigation_test.dart` — **new**

### Helper scripts (local patch only)
- `scripts/patch-mobile-preview-home.js`, `scripts/patch-answers-html.js`, `scripts/fix-sources-html.js`, `scripts/patch-library-unavailable.js`

---

## Button / card matrix

| Home label | Web target | Flutter route | Destination screen |
|------------|------------|---------------|------------------|
| اسأل الشيخ حسن | `ask.html` | `/ask` | Ask Sheikh |
| القرآن الكريم | `library.html?category=quran` | `/quran` | Quran |
| مصادر المحتوى | `sources.html` | `/sources` | Sources |
| إجابات موثقة | `answers.html` | `/answers` | Verified public Q&A |

Unavailable UX (inside feature screens only):

- **غير متاح مؤقتاً**
- **سيتم تفعيل الخدمة قريباً بإذن الله**

---

## Tests run

| Command | Result |
|---------|--------|
| `cd F:\rahma\apps\web && npm test` | **13/13 pass** (RTL + home navigation) |
| `cd F:\rahma\apps\web && npm run build` | **pass** (static — no build step) |
| `cd F:\rahma\apps\mobile && flutter test test/home_navigation_test.dart` | **2/2 pass** |
| `cd F:\rahma\apps\mobile && flutter analyze` | 0 issues (after test import fix) |
| `cd F:\rahma && npm test` | Not re-run full monorepo (includes long backend suite); web + targeted mobile tests green |

### Flutter tests cover
- Named routes open Ask / Quran / Answers / Sources screens
- Service unavailable pill on Ask tab, not on home

### Web tests cover
- All four home cards have correct `href` + `data-nav-card`
- Destination HTML files exist
- Home has no blocking unavailable message
- Answers page keeps local samples when API fails

---

## Manual verification

1. **Web:** `node apps/web/server.js` → open `http://127.0.0.1:8080/` → tap each of the four cards (should open even with API stopped).
2. **Test UI:** `npm run local:test-ui` → open home preview or `/index.html` from test UI dashboard.
3. **Mobile:** `cd apps/mobile && flutter run` → home **الاختصارات** grid → tap all four cards; use system back.

---

## Blockers

None for navigation. Remaining production items (FCM, full Quran corpus, etc.) are unchanged and do not block screen opens.

---

## Status

**`PASS_BUTTON_NAVIGATION_VERIFIED`** — All four visible primary home actions navigate to the correct screens on web and mobile; API down shows in-screen pill only, not a dead home.
