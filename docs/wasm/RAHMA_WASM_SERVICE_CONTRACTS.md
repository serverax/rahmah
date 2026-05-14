# Rahma — WASM Service Contracts

**Date:** 2026-05-14

Each contract lists: input schema, output schema, test cases, and
"never" rules.

## 1. `quran-hadith-citation`

### Input

```json
[
  {
    "citation_type": "quran|hadith|fiqh|scholar_note",
    "citation_label": "string, non-empty after trim",
    "citation_text":  "optional",
    "citation_url":   "optional"
  }
]
```

### Output (`Decision`)

```json
{
  "citation_status": "quran_cited | hadith_cited | quran_and_hadith_cited | scholar_advice_needs_review | insufficient_citation",
  "can_publish_public":  true|false,
  "can_publish_private": true|false,
  "reason": "string|null"
}
```

### Test cases (mirror JS exactly)

- `[]` → `insufficient_citation`, both publish flags false.
- `[{quran,Q}]` → `quran_cited`, public+private true.
- `[{hadith,H}]` → `hadith_cited`, public+private true.
- `[{quran,Q},{hadith,H}]` → `quran_and_hadith_cited`.
- `[{fiqh,F}]` → `scholar_advice_needs_review`, public=false.
- `[{scholar_note,N}]` → `scholar_advice_needs_review`, public=false.
- empty `citation_label` row → dropped.
- unknown `citation_type` → dropped.

### Never

- Never auto-promotes scholar-note-only to public.
- Never treats `fiqh` alone as public-publishable.

## 2. `child-safety`

### Input

```json
{
  "body_ar":    "string, non-empty after trim",
  "age_band":   "4-6 | 7-9 | 10-12 | 13+",
  "topic_tags": ["string", ...]
}
```

### Output

```json
{
  "decision": "allow | block",
  "reason":   "string|null",
  "sensitive_topic": "string (only on block-for-topic)"
}
```

### Test cases

- empty body → block / `empty_body`.
- invalid age_band → block / `invalid_age_band`.
- body contains "رقم الجوال" → block / `asks_personal_data`.
- body contains "غبي" → block / `shaming_language`.
- body contains "حزب سياسي" → block / `political_content`.
- body contains "سني خير من شيعي" → block / `sectarian_content`.
- age 7-9 + topic_tags=["death"] → block / `topic_not_for_younger_band`.
- age 13+ + topic_tags=["death"] → allow.

### Never

- Never returns `allow` for content that asks personal data.
- Never sees a child's raw text in any persisted audit row — the
  backend hashes `body_ar` before logging.

## 3. `fatwa-policy-gate`

### Input

```json
{
  "has_scholar_approval": true|false,
  "has_verified_quran_or_hadith_citation": true|false,
  "publication_mode_public": true|false
}
```

### Output

```json
{
  "decision": "allow_publish | block | needs_scholar_review",
  "reason":   "string"
}
```

### Test cases

- public + no approval → block / `public_fatwa_requires_scholar_approval`.
- public + approval + no citation → block / `public_fatwa_requires_quran_or_hadith_citation`.
- public + approval + citation → allow_publish.
- private + citation → allow_publish.
- private + no citation → needs_scholar_review.

### Never

- Never authors a religious ruling.
- Never auto-approves a public fatwa without an explicit operator-stored
  approval record.

## 4. `content-rule-engine`

### Input

```json
{
  "verification_status": "approved | pending_review | rejected | unverified",
  "has_citation":  true|false,
  "is_published":  true|false,
  "is_test_fixture": true|false
}
```

### Output

```json
{
  "show_in_public_list": true|false,
  "citation_required":   true,
  "public_visible":      true|false,
  "private_visible":     true|false,
  "reason":              "string"
}
```

### Test cases

- fixture → never shown in public list.
- non-approved → hidden from public, private visible.
- approved + no citation → blocked entirely.
- approved + published + cited → public + private visible.
- `citation_required` is always `true` — invariant tested across the
  full input space.

### Never

- Never sets `citation_required: false`.
- Never returns `show_in_public_list: true` for a fixture.

## Implementation-vs-contract parity

The Rust crates under `wasm/` are the second implementation of these
contracts. The first is the JS modules under `backend/app/src/`. Both
must agree byte-for-byte for the same input; a parity test suite is
planned for `wasm-policy-parity` (next sprint).

The host loader writes one row per evaluation into the appropriate
`wasm_*_audit` table (migration 009) with the JS result and the WASM
result side by side so any divergence is visible.
