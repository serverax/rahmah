# child-safety

Deterministic WASM gate that decides whether a piece of child-bound
content is safe to show. Mirror of
`backend/app/src/family/child-safety-policy.js`.

## Logic

Input: `{ body_ar, age_band, topic_tags }`.

Hard blocks (independent of age):

- empty body
- invalid age band (must be `4-6` | `7-9` | `10-12` | `13+`)
- body contains Arabic PII keywords (phone, address, password, …)
- body contains Arabic shaming patterns (غبي / أحمق / فاشل)
- political content patterns
- sectarian content patterns

Age-band gating: bands `4-6` and `7-9` reject any item tagged with a
sensitive topic (`death`, `fitan`, `punishment`, `jihad`,
`detailed_aqidah_dispute`, `detailed_fiqh_dispute`).

Output: `{ decision: "allow"|"block", reason, sensitive_topic? }`.

## Schemas

- `input.schema.json`
- `output.schema.json`

## Tests

`cargo test -p child-safety --release` runs 9 cases covering empty body,
invalid age, PII, shaming, political, sectarian, sensitive topic
age-gating, older-age allow, and safe content allow.
