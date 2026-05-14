# fatwa-policy-gate

Deterministic WASM policy gate that decides whether a Sheikh Hasan
answer may be published publicly. **Foundation only** — does not author
religious rulings. See `RAHMA_WASM_LIMITATIONS.md`.

## Logic

Input — JSON object with three booleans:

| field | meaning |
|---|---|
| `has_scholar_approval` | a `content_reviewer`/`admin` row exists for this answer in the audit log |
| `has_verified_quran_or_hadith_citation` | ≥1 citation has type ∈ {quran, hadith} AND a non-empty label |
| `publication_mode_public` | the request is for public publication (not private) |

Output:

| decision | when |
|---|---|
| `allow_publish` | public path: approval + citation present; private path: citation present |
| `block` | public path: missing approval, OR missing citation |
| `needs_scholar_review` | private path without a Quran/Hadith citation |

## Build

```bash
cargo test -p fatwa-policy-gate --release
cargo build -p fatwa-policy-gate --release --target wasm32-unknown-unknown
```

## Limitations

- Does not retrieve, generate, or validate religious content.
- Does not know whether the "scholar approval" or the "citation" are
  themselves valid. The host (backend) supplies those booleans after
  its own checks.

## Tests

`cargo test -p fatwa-policy-gate --release` runs 5 cases:
public-without-approval, public-without-citation, public-with-both,
private-with-citation, private-without-citation.

## Schemas

- `input.schema.json` — JSON Schema for the input.
- `output.schema.json` — JSON Schema for the output.
