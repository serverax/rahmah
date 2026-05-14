# quran-hadith-citation

Deterministic WASM citation-gate that decides whether a list of citations
is sufficient to allow public / private publication of a Sheikh Hasan
answer. Byte-for-byte mirror of
`backend/app/src/sheikh/citation-requirement.js`.

## Logic

Input: array of citation rows (`citation_type`, `citation_label`,
optional `citation_text` + `citation_url`).

Output `citation_status` is one of:

| status | when |
|---|---|
| `quran_and_hadith_cited` | both quran and hadith present |
| `quran_cited` | quran present (hadith may be absent) |
| `hadith_cited` | hadith present (quran absent) |
| `scholar_advice_needs_review` | only fiqh OR only scholar_note |
| `insufficient_citation` | empty list / no allowed types |

`can_publish_public` is true ONLY for `*_cited` statuses;
`scholar_advice_needs_review` and `insufficient_citation` route through
moderator review.

## Schemas

- `input.schema.json`
- `output.schema.json`

## Tests

`cargo test -p quran-hadith-citation --release` runs 8 cases plus the
JS-mirror constant check.
