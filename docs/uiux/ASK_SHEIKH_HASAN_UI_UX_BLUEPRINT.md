# Ask Sheikh Hasan — UI/UX Blueprint

Sprint 6 deliverable. Scope: Rahma/Sakina only. This document is a **blueprint** — no production frontend code exists in `F:/rahma` yet. UI/UX implementation belongs to a later sprint after the mobile/web frontend is bootstrapped.

## Design language

- **Style**: luxury Islamic glassmorphism. Frosted cards over a soft gradient backdrop.
- **Palette**:
  - Emerald primary `#0F766E` (deep) / `#10B981` (bright)
  - Gold accent `#D4AF37`
  - Ivory background `#FFFBF5`
  - Muted ink `#1F2A37`
  - Status colours: pending `#F59E0B`, published `#10B981`, blocked `#E11D48`, moderation `#6366F1`
- **Typography**: Latin sans (Inter / system-ui); Arabic uses Noto Naskh Arabic at +2pt. Minimum body 16px on phone, 18px on tablet.
- **Iconography**: rounded, 1.5px stroke, light gold tint for badges, emerald for active states.
- **Motion**: 180ms ease-out for primary transitions; spring on the assistant orb only. No motion on text-heavy editor screens.
- **3D**: a low-poly Islamic-star **assistant orb** appears on the user landing screen; disabled on low-tier devices and inside the Sheikh editor.
- **Accessibility**: AAA contrast on text, focus order strictly top-down, keyboard-navigable forms, screen-reader labels on every interactive element, large-text mode (≥125%) keeps layout intact.
- **RTL Arabic**: every screen has a tested mirrored layout. Citation badges flip side; question/answer text uses the user's selected language.

## Status chip palette

- `pending_review` — amber chip, "Pending review".
- `assigned_to_sheikh` — indigo chip, "With Sheikh Hasan".
- `draft_answered` — slate chip, "Draft saved".
- `pending_moderation` — purple chip, "In moderation".
- `published_public` — emerald chip, "Published".
- `answered_private` — teal chip, "Answered (private)".
- `rejected` — rose chip, "Not accepted".
- `archived` — grey chip, "Archived".

Citation badges:

- **Quran** — emerald with `Q` glyph and verse-shape outline.
- **Hadith** — gold with `H` glyph and book-shape outline.
- **Fiqh** — slate with `F` glyph and balance-shape outline.
- **Scholar note** — indigo with `S` glyph and quill outline. Triggers `scholar_advice_needs_review` if standalone.

---

## Screens

### 1. User — Ask Sheikh Hasan landing

- Hero: assistant orb (3D, optional), heading "اسأل الشيخ حسن / Ask Sheikh Hasan".
- Subheading explains scholar-reviewed, cited answers.
- Primary CTA: "Submit a question" → Screen 2.
- Secondary link: "Browse published Q&A" → Screen 5.
- "How it works" 3-step strip (submit → scholar reviews → published with citations).

### 2. User — Submit question form

- Language toggle (English / Arabic), default by device locale.
- Category selector chip group: `salah`, `zakat`, `fasting`, `family`, `dua`, `quran`, `hadith`, `general`.
- Multi-line question input, max 1000 characters, live count.
- "Make answer public when ready" toggle, default **off** (private). When off, the public Q&A pathway is disabled for this question.
- "Submit" button — disabled until question ≥ 5 characters and category chosen.
- Submission feedback card: status chip `pending_review` and an explainer about typical response time + that Sheikh Hasan may decline.

### 3. User — My questions / status

- List of the user's own questions (private).
- Each row: short hash-prefixed reference, category, language, status chip, submitted-at relative time.
- Tap row → Screen 4.
- Empty state: respectful guidance to start with Screen 2.

### 4. User — Answer detail

- Question text (the user can read their own question).
- Sheikh Hasan's answer (when status ∈ {`answered_private`, `published_public`}).
- Citations panel below the answer (one citation card per citation).
- Public visibility note: "Your name is never shown publicly. Question content may appear in the Public Q&A library if you allowed it."
- "Report a typo / issue" link (creates a content report).

### 5. Public — Published Q&A library

- Search bar (full-text on title + summary), category filter chips, language filter chips.
- List of public Q&A cards — title, category chip, language chip, citation-badge row, published date.
- Tap card → Screen 6.
- No private user fields visible anywhere.

### 6. Public — Q&A detail with citations

- Hero title (Q&A title from `sakina_public_qa.title`).
- Q section: the question (already anonymised) and category/language chips.
- A section: Sheikh Hasan's answer text.
- **Citations panel**: 1+ cards. Each citation card displays:
  - Type badge (Quran / Hadith / Fiqh / Scholar note).
  - Citation label (e.g., "Surah Al-Baqarah 2:183").
  - Optional citation text (rendered as quoted block; never inserted by the AI — only operator-entered scholar references).
  - Optional citation URL (external; opens with confirmation).
  - Verification status badge (`verified` / `pending`).
- "Report this answer" button at the bottom (Screen 6.1 dialog).

### 6.1. Public — Report dialog

- Reason picker (preset list + free-text "Other").
- Submit → confirmation toast. The dialog never reveals scholar/user identity.

### 7. Sheikh Hasan — Login

- Email + password (real auth wired later). Until auth is configured, the dashboard route returns 503; login screen shows "Authentication is not yet configured for this build" with operator instructions.
- Single-tap "Sign in with provider" placeholder (OIDC, later).

### 8. Sheikh Hasan — Dashboard

- KPI cards: pending count, in-moderation count, published-this-week count, reported-this-week count.
- Shortcut to "Pending queue" → Screen 9.
- "My published answers" link → Screen 11.

### 9. Sheikh Hasan — Pending question queue

- Filter row: language, category, status.
- List of questions assigned to Sheikh Hasan (status ∈ {`assigned_to_sheikh`, `draft_answered`}).
- Each row: short ref, category chip, language chip, age, "Open" button.
- Empty state: "No pending questions. ﷺ Take a moment of dhikr."

### 10. Sheikh Hasan — Answer editor

Layout, left → right on LTR (mirrored on Arabic):

- **Question panel** (read-only): the original question text + category/language.
- **Answer editor** (rich text minimal — bold, headings, lists; **no** raw HTML pasting; no image upload in v1).
- **Citation entry panel** (Screen 11 below) docked on the right (or bottom on phone).
- **Action bar**: "Save draft", "Preview", "Publish (private)", "Submit to moderation".
- Inline guards: cannot click "Submit to moderation" or "Publish (public)" if the citation list is empty.
- Word/character counter on the answer.
- "Reject question" with reason picker (spam, off-topic, harmful, duplicate).

### 11. Sheikh Hasan — Citation entry panel

- "Add citation" button → opens citation form:
  - Type picker (Quran / Hadith / Fiqh / Scholar note).
  - Label (required, e.g., "Surah Al-Baqarah 2:183" or "Sahih Muslim 1162").
  - Optional citation text (max 600 chars).
  - Optional citation URL (validated http/https).
  - Verification status: defaults to `pending`, moderator may flip to `verified`.
- Citations list with edit/delete on each row.
- Computed banner: derived `citation_status` shown live (e.g., "Quran + Hadith cited" or "Scholar note only — moderation required").

### 12. Sheikh Hasan — Draft preview

- Read-only render of the answer + citations exactly as the public Q&A page will render.
- Shows what will be visible publicly vs hidden (user identity always hidden).
- "Edit" and "Publish" buttons at the bottom.

### 13. Sheikh Hasan — Publish confirmation

- Modal explaining the publication pathway:
  - If citation_status ∈ {`quran_cited`, `hadith_cited`, `quran_and_hadith_cited`} → goes to **moderation** by default (moderator approves before public).
  - If citation_status = `scholar_advice_needs_review` → goes to **moderation** with a stricter note.
  - If publication_mode = `private` → goes directly to `answered_private` and is **not** added to the public library.
- Final confirm button + cancel.

### 14. Moderator — Review queue

- List of answers with `publication_status = pending_moderation`.
- Each row: short ref, category, language, scholar (Sheikh Hasan), citation summary, submitted date.
- Tap row → moderator review screen (same layout as Screen 12 plus moderator action bar).
- Moderator actions: **Approve** (publishes), **Reject** (back to scholar), **Hide** (locks public visibility), **Request changes** (with comment).

### 15. Moderator — Reported content

- List of reports from `sakina_content_reports`, grouped by target.
- Each row: reason, status (`open` / `reviewed` / `dismissed` / `actioned`), age.
- Moderator actions: **Dismiss**, **Hide answer**, **Reach out to scholar**.

### 16. Admin — Sheikh user management

- List of users with role = `sheikh` or higher.
- Admin actions: invite (creates pending user), disable, change role.
- Profile editor for Sheikh public profile (name, bio, languages).

---

## User journeys (text diagrams)

### User journey

```
Open app
  → Tap "Ask Sheikh Hasan"
  → Enter question, choose category + language
  → Toggle public sharing (optional)
  → Submit
  → Status: pending_review
  → (later) sheikh writes answer
  → Receive notification (in-app)
  → Open "My questions"
  → See status: answered_private or published_public
  → Read answer + citations
```

### Sheikh journey

```
Open app
  → Sign in (when auth is configured)
  → Dashboard
  → Open pending queue
  → Pick a question
  → Write answer
  → Add citations (Quran / Hadith / Fiqh / Scholar note)
  → Preview
  → Save draft / submit to moderation / publish privately
  → If public path: wait for moderator
```

### Public journey

```
Open app (no sign-in required)
  → Public Q&A library
  → Filter by category / language
  → Search
  → Open an answer
  → Read answer + citations
  → (optional) share link
  → (optional) report content
```

### Moderator journey

```
Open app
  → Sign in
  → Moderation queue
  → Open an answer
  → Verify citations
  → Approve / Reject / Request changes
  → (separately) handle reports queue
```

---

## Validation messages

These short messages are surfaced near the offending field, never as a modal:

- Empty question → "Please write your question."
- Question > 1000 chars → "Please keep your question under 1000 characters."
- Missing category → "Please select a category."
- Sheikh: empty answer → "Please write an answer before saving."
- Sheikh: publish without citation → "Add at least one Quran, Hadith, or fiqh citation before publishing."
- Sheikh: scholar-note-only publish → "Scholar notes alone require moderator review. Submit to moderation instead."
- Moderator: approve with `insufficient_citation` → "Cannot publish without a valid citation."
- Public report submitted → "Thank you. Our team will review this content."

## Public / private visibility rules

- Public Q&A pages **never** show:
  - User email / email hash / display name.
  - User ID.
  - Question hash.
  - Question body if the user did not enable public sharing AND the moderator has not approved an anonymised public version.
- Public Q&A pages **always** show:
  - Sheikh Hasan public name and language list.
  - Question title and category (from `sakina_public_qa.title`).
  - Answer body and citations.
  - Published date.

## Citation display rules

- Always render the citation list under the answer, in the order entered.
- Always show the type badge.
- Always show the citation label.
- Show citation text only if the scholar provided it AND verification_status is `verified` or `pending` (never if `rejected`).
- Always show verification badge (`verified` shown as a check, `pending` shown as a small clock, `rejected` citations are not rendered publicly).
- External URL opens with a confirmation dialog explaining "this link leaves the app".

## Mobile-first behaviour

- Single column on phones < 720 wide.
- Two columns on tablets.
- Three columns on desktop (library only — editor stays single column).
- Bottom navigation tabs: Home, Ask, Library, Profile.
- Sheikh editor uses a tabbed bottom sheet on phone (Question | Editor | Citations | Preview).

## Component plan

Listed for the future frontend implementation sprint. **None of these exist as code yet.**

User-facing:

- `AskSheikhHasanHome`
- `SubmitSheikhQuestionForm`
- `MySheikhQuestionsList`
- `SheikhAnswerDetail`
- `CitationCard`
- `QuestionStatusBadge`

Sheikh-facing:

- `SheikhLogin`
- `SheikhDashboard`
- `PendingQuestionQueue`
- `SheikhAnswerEditor`
- `CitationEntryPanel`
- `AnswerPreview`
- `PublishAnswerDialog`

Public:

- `PublicSheikhQAList`
- `PublicSheikhQADetail`
- `PublicCitationPanel`
- `ReportPublicAnswerForm`

Admin:

- `SheikhUserManagement`
- `PublicAnswerModerationQueue`
- `ReportedContentQueue`

## Implementation status

- UI/UX blueprint — **CREATED** (this file).
- Component code — **NOT DONE** (no frontend code in `F:/rahma`).
- Backend foundation for these UIs — **CREATED** (Sprint 6 modules + routes).
- Real Sheikh authentication wiring — **NOT DONE**.
- Real moderator UI — **NOT DONE**.
- Public Q&A web page — **NOT DONE**.
