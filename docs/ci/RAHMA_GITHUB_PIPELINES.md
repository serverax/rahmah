# Rahma — GitHub Actions Pipelines

This document explains what each workflow under `.github/workflows/` does, what `PASS` means, and what it does **not** mean.

Scope: Rahma/Sakina (`serverax/rahmah`) only. Pipelines never push to other repos; they never deploy to the operator's server.

## Workflow inventory

| File | Trigger | Purpose |
|---|---|---|
| `rahma-ci.yml` | push to `main`, PR to `main` | npm lint + build + test of the Fastify backend |
| `rahma-security-scan.yml` | push to `main`, PR to `main` | Forbidden-secret grep + cross-project contamination scan |
| `rahma-infra-validate.yml` | push to `main`, PR to `main` | YAML syntax + manifest policy on `deployment/k3s/rahma/**/*.yaml` |
| `rahma-release-readiness.yml` | push to `main`, manual dispatch | Truth-check `/ready` claims and active-doc readiness claims |

**There is no `rahma-deploy.yml`.** Production deployment is not automated. Operator-initiated only.

---

## `rahma-ci.yml`

Runs on every push to `main` and every pull request to `main`.

Steps: checkout → Node 20 → `npm ci` (cached) → `npm run lint` → `npm run build` → `npm test` against `backend/app/`.

Env in CI:
- `SHEIKH_AUTH_REQUIRED=false` — keeps protected routes returning 503 in tests.
- `WHATSAPP_ENABLED=false` — keeps the notifier in `pending_config`.
- `APP_STORE_COMPLIANCE_MODE=true` — exposes the `app_store` block.
- No `DATABASE_URL`, no `REDIS_URL` — fail-closed defaults used.

**PASS means:** the 131 backend tests pass, lint is clean, build is clean.
**PASS does NOT mean:** the app is deployed, Redis/Postgres are configured, Sheikh authentication is wired, or the app is store-submittable.

## `rahma-security-scan.yml`

Two jobs:

1. **secret-scan** — grep for real-secret shapes (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `WHATSAPP_TOKEN`, `AWS_SECRET_ACCESS_KEY`, `MINIO_SECRET`, `BEGIN PRIVATE KEY`, GitHub PAT, AWS key, Slack token), DSN-with-embedded-credentials (`postgres://user:pass@…`), and `password=…` assignments outside the allow-list.
2. **cross-project-scan** — grep active code for `IterLaw`, `RightsNow`, `OrdinoxAI`, `Alaa Beauty`. Mentions are allowed in `reports/`, `docs/`, `SAKINA_PROJECT_*.md`, `deployment/k3s/README.SERVER.md`, and the workflow itself. Everywhere else is a hard fail.

Findings print file paths and a redacted indicator — **the matched value is never echoed.**

## `rahma-infra-validate.yml`

YAML syntax validation across `deployment/k3s/rahma/**/*.yaml` plus manifest policy:

- Rejects `Service.type: NodePort` / `LoadBalancer`.
- Rejects `hostNetwork: true`.
- Rejects `ClusterRole` / `ClusterRoleBinding`.
- Rejects namespaces outside the `rahma-{app,data,security,monitoring}` allow-list.
- Rejects any `Secret` whose name doesn't include `EXAMPLE` AND any Secret whose `stringData` values aren't `REPLACE_ME` / `CHANGE_ME` / `PLACEHOLDER`.

**Apply is never run.** This is validation only.

## `rahma-release-readiness.yml`

Truth-checks. Boots the backend in the CI runner, hits `/ready`, and asserts:

- `app_store.submission_ready` must NOT be `true`.
- `cache.mode` must be `memory` (no Redis adapter shipped yet).
- `ask_sheikh_hasan.sheikh_auth_configured` must be `false`.
- `ask_sheikh_hasan.whatsapp_configured` must be `false`.

Also greps active code (`backend/`, `deployment/`, `.github/`) for forbidden claim phrases: `production-ready`, `deployed and running`, `live in production`, `app-store ready`.

**PASS means:** no false readiness claim has leaked into the codebase.
**PASS does NOT mean:** the app is ready to ship.

## Future workflows (not created)

- `rahma-deploy-staging.yml` — push image + apply manifests against the Sakina staging K3s context. Requires operator-provided kubeconfig secret and an actual staging cluster. Not created in this sprint.
- `rahma-deploy-production.yml` — manual-dispatch only with required approvals. Not created in this sprint.

Both will be added only after the operator (a) provides an admin kubeconfig for a Sakina-safe cluster, and (b) explicitly approves automated apply.
