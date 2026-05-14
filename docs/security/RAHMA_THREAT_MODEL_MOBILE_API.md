# Rahma — Mobile + API Threat Model (Foundation)

**Date:** 2026-05-14

## STRIDE applied to Rahma surfaces

| Threat | Surface | Mitigation in place |
|---|---|---|
| Spoofing | mobile API | OIDC + bearer-token verification (when operator wires `AUTH_MODE=external`). |
| Tampering | API request body | Fastify schema (`additionalProperties: false`) strips unknown fields; explicit refusal of card-data field names in donations route. |
| Repudiation | privileged actions | `audit_events` + `wasm_*_audit` tables; sha-256 of body + email; never raw. |
| Information disclosure | `/ready` / status | Tests assert no DSN / token / password ever appears in any response. |
| Denial of Service | API | Resource limits per pod; readiness probe; PDB on `rahma-api`. |
| Elevation of privilege | role checks | Allow-list of email-hashes per role; backend re-checks on every request, not just at sign-in. |

## Asset inventory (what we protect)

1. Operator-approved Islamic content (registry + chunks).
2. User-submitted questions + their answer-status history.
3. Sheikh / admin identity hashes.
4. Audit log rows.
5. Donation intent rows (no card data ever).

## Trust boundaries

- Mobile app ↔ API: TLS via cluster ingress (deferred until final
  domain). Until then, mobile builds with empty `RAHMA_API_BASE`
  refuse network calls.
- API ↔ Postgres / Redis: ClusterIP only; no public exposure.
- API ↔ WASM services: ClusterIP only; eventually mTLS once operator
  picks a service-mesh story.
- API ↔ payment provider: provider-hosted; backend never holds card
  data; webhook signature verified.

## Attack surfaces explicitly OUT of scope

- Public web frontend — there is none.
- Public admin dashboard — there is none.
- File-upload endpoint — there is none.
- Chat — there is none.
- Third-party SDK in mobile — none.

## Known limitations

- WASM modules currently run as a JS-port HTTP bridge; wasmtime /
  wasmedge load is a later sprint.
- DB connection pool does not yet implement adaptive backpressure.
- No SIEM integration. The `rahma-security-scan` CronJob runs Trivy
  daily but does not yet ship alerts elsewhere.

## What the operator must complete before public exposure

- Pick a final API domain (NOT `api.rahma.example`, NOT OrdinoxAI).
- DNS + cert-manager + Let's Encrypt ClusterIssuer Ready.
- Move `docs/future/rahma-api-ingress.yaml.future` into
  `deployment/k3s/ingress/` with the real host + ClusterIssuer name.
- Apply the ingress; capture `curl -I https://...` evidence.
- Update the rahma-platform-config ConfigMap with the real
  `PUBLIC_API_URL`.

Until those steps land, **no public API claim is made**.
