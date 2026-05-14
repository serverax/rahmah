# Rahma — Sheikh Hasan Workflow API

**Date:** 2026-05-14

This is the mobile-facing portion of the Sheikh Hasan Q&A workflow. The
admin paths are exposed via the same API host (no separate admin web
dashboard).

## End-to-end flow

```
mobile user                                    sheikh / admin
─────────────                                  ──────────────
POST /api/sheikh/questions  ──────────►  GET /api/sheikh/questions   (role=sheikh)
                                          │
                                          ▼
                                          POST /api/sheikh/questions/:id/answer
                                              (must include ≥1 citation)
                                          │
                                          ▼
                                          POST /api/sheikh/answers/:id/submit
                                              (moves draft → pending_moderation)
                                          │
                                          ▼  (role=content_reviewer | moderator | admin)
                                          POST /api/admin/sheikh/answers/:id/approve
                                              (requires quran_cited OR hadith_cited)
                                          OR
                                          POST /api/admin/sheikh/answers/:id/reject
                                              (requires reason_ar)
                                          │
                                          ▼  (only on approve)
GET /api/public/sheikh-hasan/qa  ◄────── published_public (with citations attached)
GET /api/public/answers          (mobile alias)
```

## Submit (mobile user, no auth)

```http
POST /api/sheikh/questions
{
  "question_ar": "هل يجوز ...؟",
  "language": "ar",
  "category_ar": "salah",
  "public_allowed": false
}
```

Response:

```json
{
  "ok": true,
  "status": "pending_review",
  "question_id": "<uuid>",
  "safe_message_ar": "تم استلام سؤالك. سيتم مراجعته من قبل الشيخ بإذن الله."
}
```

Errors: `400` invalid body; `503 service_not_configured` when the
sheikh repository isn't wired (DB not yet configured).

## Sheikh queue (role=sheikh|admin)

```http
GET /api/sheikh/questions
Authorization: Bearer <jwt>
```

Returns an array of safe projections — never includes the asker's
identity, only `id`, `language`, `category`, `status`, `created_at`.

## Sheikh answer draft (role=sheikh|admin)

```http
POST /api/sheikh/questions/:id/answer
Authorization: Bearer <jwt>
{
  "answer_ar": "...",
  "publication_mode": "public",
  "citations": [
    { "citation_type": "quran",  "citation_label": "Al-Baqarah 2:185", "citation_text": "..." },
    { "citation_type": "hadith", "citation_label": "Sahih Muslim 1162" }
  ]
}
```

Citation rules (enforced by the policy module):

- empty `citations` → `400 insufficient_citation`
- `scholar_note` alone → `200` but `publication_status: pending_moderation`
- `quran_cited` OR `hadith_cited` → eligible for public path

## Submit for moderation (role=sheikh|admin)

```http
POST /api/sheikh/answers/:id/submit
Authorization: Bearer <jwt>
{ "citation_status": "quran_cited" }
```

Rejected with `400` if `citation_status === "insufficient_citation"`.

## Approve / reject (role=content_reviewer|moderator|admin)

```http
POST /api/admin/sheikh/answers/:id/approve
Authorization: Bearer <jwt>
{ "citation_status": "quran_cited" }
```

`approve` refuses any `citation_status` other than `quran_cited`,
`hadith_cited`, or `quran_and_hadith_cited`.

```http
POST /api/admin/sheikh/answers/:id/reject
Authorization: Bearer <jwt>
{ "reason_ar": "لا توجد مصادر معتمدة" }
```

Always returns `200` (action is recorded; mobile UI shows the
Arabic safe_message).

## Public Q&A (no auth)

```http
GET /api/public/sheikh-hasan/qa
GET /api/public/answers           (mobile-friendly alias)
```

Returns ONLY published answers with their citations attached. Never
returns: user identity, question_hash, assigned_sheikh_id,
moderator notes.

## Hard rules

- No publish without citation.
- No public publish without Quran/Hadith citation.
- No publish without explicit moderator approval.
- No leak of user identity in public output.
- No reading of pending queue without `sheikh` or `admin` role.
- No approval action without `content_reviewer` / `moderator` / `admin`.
