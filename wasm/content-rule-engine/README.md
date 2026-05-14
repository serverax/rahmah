# content-rule-engine

Deterministic WASM rule engine that decides per-item visibility flags
for the mobile app. **Foundation only.** Always sets `citation_required: true`.

## Logic

Input — flags supplied by the host:

| field | meaning |
|---|---|
| `verification_status` | one of `approved` / `pending_review` / `rejected` / `unverified` |
| `has_citation` | item carries a non-empty citation_label + recognised source_type |
| `is_published` | item is published and not retracted |
| `is_test_fixture` | item is a fixture / test row |

Output:

| field | meaning |
|---|---|
| `show_in_public_list` | item appears in the public mobile feed |
| `citation_required` | always `true` (invariant) |
| `public_visible` | mobile public surface may render this item |
| `private_visible` | mobile private surface may render this item |
| `reason` | machine-readable reason string |

Rules:

- fixture → never public.
- not approved → public hidden, private visible.
- missing citation → blocked everywhere.
- not published → private only.
- approved + published + cited → both surfaces.

## Schemas

- `input.schema.json`
- `output.schema.json`

## Tests

`cargo test -p content-rule-engine --release` runs 4 cases plus an
exhaustive invariant test that `citation_required` is true across the
full input space.
