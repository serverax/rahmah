# Rahma/Sakina — Arabic-native RTL QA checklist

Sprint 4 deliverable (canonical numbering of 2026-05-13 prompt). Scope: Rahma/Sakina only. This checklist is the contract that any future frontend must satisfy. **The repo currently has no frontend code** — the checklist is the binding spec the operator will hold the frontend team to.

## Non-negotiable rules

1. **Arabic is the canonical UI language.** UI labels, error messages, empty states, onboarding, push-notification copy, and store-listing text are written *originally* in Arabic. They are not translations of English source strings.
2. **Document direction is RTL.** Root element: `<html lang="ar" dir="rtl">`. Native HTML logical properties (`margin-inline-start`, `text-align: start`) are used so layout follows direction automatically.
3. **No English-first key naming.** If i18n is added later, keys may stay English (`question.submit`), but the *primary* value is the Arabic string. English values (when added) are derived translations, not the source.
4. **Tone is warm, simple, family- and child-friendly, and respectful.** No slang. No alarming language. No emoji unless explicitly approved.
5. **No Latin-numeral mixing in user-facing labels** unless the original term requires it (e.g. a Quran reference `2:183`).
6. **Arabic numerals** (٠١٢٣٤٥٦٧٨٩) acceptable for body text; Arabic-Indic vs Hindu-Arabic choice locked per release. Default: Hindu-Arabic for technical, Arabic for verse references.

## Layout checklist (for every screen)

- [ ] Container uses `dir="rtl"` (inherited from root or set locally).
- [ ] Primary action button is right-aligned (start side in RTL).
- [ ] Back-arrow icon points **right** (mirrored from LTR convention).
- [ ] Drawer / side menu opens from the **right**.
- [ ] Bottom tab bar order reads right-to-left.
- [ ] Forms: labels above inputs; inputs use `text-align: start`; placeholders in Arabic.
- [ ] Tooltips, popovers, modals open in the correct RTL direction.
- [ ] Skeleton loaders use the same alignment as content they replace.

## Typography

- [ ] Primary Arabic font: `Noto Naskh Arabic` or `IBM Plex Sans Arabic`. Latin fallback: `Inter`.
- [ ] Minimum body size: 16 px on phone, 18 px on tablet.
- [ ] Line-height ≥ 1.7 for Arabic body (descenders need more breathing room).
- [ ] Letter-spacing: 0. Do not tighten Arabic.
- [ ] Numerals: Arabic-Indic vs Hindu-Arabic decision documented per surface.

## Bidirectional content (mixed Arabic + Latin)

- [ ] Inline Latin tokens (URLs, code) use `<bdi>` or `unicode-bidi: isolate`.
- [ ] Quran citation labels (e.g. "Al-Baqarah 2:183") preserve their LTR run inside Arabic body.
- [ ] Form inputs that accept emails / URLs are explicitly `dir="ltr"` to preserve user intent.

## Required app-shell screens (all Arabic)

These are the seven shell screens Sprint 4 calls out. Each must exist in the frontend as a route or component file when the frontend lands.

- الصفحة الرئيسية (Home)
- القائمة الرئيسية (Main menu)
- شريط تنقل سفلي للموبايل (Mobile bottom nav)
- شاشة الترحيب (Welcome)
- شاشة الخطأ (Error)
- شاشة التحميل (Loading)
- حالة فارغة بدون محتوى (Empty state)

## Forbidden English placeholder strings in user-facing UI

The CI security scan + this manual review reject any of the following appearing as a literal user-facing string in frontend source (when the frontend lands):

- "Home" → use "الرئيسية"
- "Submit" → use "إرسال"
- "Cancel" → use "إلغاء"
- "Loading" → use "جارٍ التحميل"
- "Error" → use "حدث خطأ"
- "Welcome" → use "مرحباً بك" or "أهلاً بك"
- "Settings" → use "الإعدادات"
- "Next" → use "التالي"
- "Back" → use "رجوع"
- "Yes/No" → use "نعم/لا"
- "Sign in" → use "تسجيل الدخول"

Allowed: technical names that are also brand names (`GitHub`, `Cloudflare`), code identifiers, file paths.

## Backend Arabic-first surfaces (already shipped)

- `backend/app/src/routes/ibadat.js` — `BLOCKED_BODY.answer` and `OUT_OF_SCOPE_BODY.answer` are Arabic strings rendering to the user.
- `backend/app/src/sheikh/sheikh-question-repository.js` — error codes are English (`service_not_configured`, `not_found`) by design (machine-readable); the user-facing wrapper translates these into Arabic in the frontend.
- `docs/uiux/ASK_SHEIKH_HASAN_UI_UX_BLUEPRINT.md` — every validation/empty-state string spec'd in Arabic.

## Backend Arabic search

Run this scan periodically to ensure no English UI strings have been added to `backend/app/src/routes/`:

```
grep -RInE '"[A-Z][a-z][a-z]+( [A-Z]?[a-z]+)*"' backend/app/src/routes
```

Filter out: HTTP method names, `Set-Cookie`, header values, etc. Anything that looks like user-facing English must be reviewed.

## Mobile platform notes

- iOS: `Bundle Localizations` must include `ar` and only `ar` for v1. Fall back to system default for any string not localised.
- Android: `res/values-ar/strings.xml` is canonical. `res/values/strings.xml` is *populated* from Arabic translations (or only contains English-source dev placeholders that must never reach a release build).
- Push notification copy: Arabic only. Localised remote-config strings if any.

## Accessibility (parallel to RTL)

- [ ] `aria-label` values are Arabic.
- [ ] Touch targets ≥ 44 × 44 pt.
- [ ] AAA contrast on body text.
- [ ] Screen-reader (VoiceOver / TalkBack) tested in Arabic.
- [ ] Dynamic Type / Font Scaling honoured.

## QA evidence required at each release

- Screen recording (or set of screenshots) of every shell screen.
- Screen recording of the Sheikh Hasan submission flow in Arabic.
- Screen recording of the public Q&A library in Arabic.
- A list of every string with file path + Arabic source value.
- An automated test that asserts `dir="rtl"` and `lang="ar"` on the root document.

---

### Current status (2026-05-13)

- **Frontend code: NOT STARTED.** No React/Vue/Next/React-Native source in `F:/rahma`. This checklist binds the future frontend team.
- **Backend Arabic responses: shipped** for `ibadat` (blocked/out-of-scope wording).
- **Blueprint:** `docs/uiux/ASK_SHEIKH_HASAN_UI_UX_BLUEPRINT.md` (16 screens, RTL behaviour documented).
- **CI scan:** `rahma-security-scan.yml` will flag forbidden contamination, but not yet enforce the English-string list — that requires a frontend directory to scan against.
