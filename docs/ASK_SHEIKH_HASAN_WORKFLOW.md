# Ask Sheikh Hasan — V4 Bilingual Workflow

## 1. Overview
The Ask Sheikh Hasan workflow is a high-integrity process for religious guidance. It ensures every question is answered by a qualified scholar, backed by authentic citations, and reviewed by an administrator before public release.

## 2. Process Flow
1. **Submission**: Users submit questions (Arabic/English) via the mobile app. Questions are private by default.
2. **Sheikh Review**: Sheikh Hasan logs into his dashboard to see pending questions.
3. **Answering**: The Sheikh drafts an answer and attaches at least one verified citation (Quran/Hadith).
4. **Admin Approval**: An administrator reviews the answer and the citations.
5. **Publishing**: If approved, the answer is published and becomes visible in the public library.

## 3. Database Schema
- `ask_sheikh_categories`: Managed categories for questions.
- `ask_sheikh_questions`: Stores user questions with bilingual support.
- `ask_sheikh_answers`: Stores scholar answers.
- `ask_sheikh_answer_citations`: Authenticates answers with primary sources.
- `ask_sheikh_audit_events`: Tracks all lifecycle actions for transparency.

## 4. API Endpoints
- `POST /api/ask-sheikh/questions`: Public submission.
- `GET /api/ask-sheikh/public`: Public list of answers.
- `GET /api/ask-sheikh/dashboard/questions`: Sheikh's queue.
- `POST /api/ask-sheikh/dashboard/answers`: Sheikh's answer submission.
- `GET /api/ask-sheikh/admin/pending-answers`: Admin's review queue.
- `POST /api/ask-sheikh/admin/answers/:id/approve`: Admin approval.

## 5. Trust & Safety
- **No AI Generation**: All religious answers are authored by humans.
- **Citation Gated**: No public answer without a Quran or Hadith reference.
- **Bilingual Integrity**: Arabic and English content are authored separately; no automatic translation.
- **Audit Trail**: Every status change is recorded with the actor's identity.

## 6. Verification
Full regression tests in `backend/app/test/ask-sheikh-v4.test.js` verify the end-to-end workflow from submission to publication.
