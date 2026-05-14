# Rahma — Bundle 01 Mobile-Only Correction (Errata)

**Date:** 2026-05-14
**Project:** Rahma/Sakina ONLY
**Scope:** correction applied on top of Bundle 01 (Sprints 31–40).

## Why this correction exists

Bundle 01 (commits `7d5f29c` + `45e4fb3`) shipped a `rahma-web` public
website foundation alongside the mobile API. The operator clarified
**after** Bundle 01 landed:

> Rahma is mobile-app-only. Do not create or expose rahma-web, public
> website, or public admin dashboard.

This errata commit removes the over-built web/admin surface and rewrites
the inventory + ingress to match the correct mobile-only target.

## What changed

### Deleted

- `deployment/k3s/namespaces/rahma-web.yaml` — namespace removed.
- `deployment/k3s/frontend/rahma-web-deployment.yaml` — deployment removed.
- `deployment/k3s/frontend/rahma-web-service.yaml` — service removed.
- `deployment/k3s/frontend/` — directory empty, deleted.
- `deployment/k3s/ingress/rahma-web-ingress.yaml` — ingress removed.
- `apps/web/Dockerfile` — frontend image build removed (apps/web stays
  as an Arabic-RTL developer-preview scaffold; no K3s deployment).
- `apps/web/.dockerignore` — removed for the same reason.

### Modified

- `deployment/k3s/ingress/rahma-api-ingress.yaml` — host changed from
  `api.rahma.ordinoxai.com` to the placeholder `api.rahma.example`;
  ClusterIssuer annotation set to `REPLACE_ME_clusterissuer` so this
  repo never silently binds to an issuer the assistant did not create.
- `deployment/k3s/config/rahma-platform-config.yaml` — dropped
  `PUBLIC_APP_URL` and `ADMIN_URL`; only `PUBLIC_API_URL=https://api.rahma.example`
  remains (placeholder). The duplicate ConfigMap in the `rahma-web`
  namespace has been removed entirely.
- `deployment/k3s/rahma/app/50-backend-ingress.yaml` (legacy) — host
  updated from `sakina.ordinoxai.com` to the same `api.rahma.example`
  placeholder; marked LEGACY (the canonical ingress is
  `deployment/k3s/ingress/rahma-api-ingress.yaml`).
- `deployment/k3s/scripts/verify-rahma-manifests.sh` — `REQUIRED_NS`
  trimmed from 6 to 5 (no `rahma-web`); added an explicit fail-on-exist
  check for `deployment/k3s/namespaces/rahma-web.yaml`.
- `deployment/k3s/cert-manager/README.md` — DNS pre-req updated to a
  single placeholder host; no website references.
- `docs/infra/RAHMA_DNS_TLS_CHECKLIST.md` — single-row DNS table for
  `api.rahma.example` only; removed the web / admin rows; added the
  "do NOT create or surface a public web hostname for Rahma" rule.
- `docs/infra/RAHMA_INFRA_VARIABLES.md` — namespace count = 5; public
  endpoint table = 1 row; image table dropped the `rahma-web` image;
  added an explicit "never modify Traefik / cert-manager / firewall"
  list.
- `docs/infra/RAHMA_K3S_DEPLOYMENT_RUNBOOK.md` — frontend apply step
  removed (now §8 says explicitly "no frontend step"); the public curl
  check is the single `https://api.<final-rahma-domain>/health`; added
  a "hands-off items" section listing the operator-owned cluster
  resources this repo must not modify.
- `SAKINA_PROJECT_STATUS.md` — top-of-file errata note added.
- `SAKINA_PROJECT_MASTER_PLAN.md` — Bundle 01 Sprint 32 / Sprint 35
  rows updated to reflect mobile-only target.

## What stays unchanged

- All backend code (`backend/app/`). The API never depended on the web
  layer.
- All migrations (`backend/db/migrations/001..008`).
- `rahma-api` / `rahma-data` / `rahma-ai` / `rahma-monitoring` /
  `rahma-security` namespaces (5 production namespaces).
- Postgres + Redis manifests at `deployment/k3s/postgres/` and
  `deployment/k3s/redis/`.
- Backend deployment manifests at `deployment/k3s/backend/`.
- `scripts/guard/verify-rahma-scope.sh` (still passes).
- `scripts/security/rahma-{secret,k8s-safety}-scan.sh`.
- `scripts/qa/rahma-full-qa.sh`.
- `apps/web/public/*` HTML pages — kept as a **developer-only** Arabic-RTL
  preview (used by `frontend-rtl.test.js`). Not deployed.
- CI workflows. No Traefik / cert-manager / firewall / SSH config has
  been touched anywhere in the repo.

## Production target (corrected)

| Item | Value |
|---|---|
| Public hostname | `api.<final-rahma-domain>` — placeholder `api.rahma.example` |
| Namespaces | `rahma-api`, `rahma-data`, `rahma-ai`, `rahma-monitoring`, `rahma-security` |
| Public website | **NONE** |
| Public admin dashboard | **NONE** |
| Mobile app talks to | `https://api.<final-rahma-domain>` |

## Honest claims

- No live K8s deployment has been performed.
- No live DNS or TLS has been verified.
- No real secrets are committed.
- `apps/web/` is a developer preview, not a deployed surface.
- Traefik, cert-manager, NetworkPolicy, firewall, UFW, iptables, and SSH
  configuration are all untouched by this correction (and by every
  commit in this repo).

## Verification commands run for this correction

```
bash scripts/guard/verify-rahma-scope.sh                       → OVERALL: PASS
bash deployment/k3s/scripts/verify-rahma-manifests.sh          → OVERALL: PASS
bash scripts/security/rahma-secret-scan.sh                     → OVERALL: PASS
bash scripts/security/rahma-k8s-safety-scan.sh                 → OVERALL: PASS
bash scripts/qa/rahma-full-qa.sh                               → OVERALL: PASS
cd backend/app && npm test                                     → 384/384 PASS
cd apps/web   && npm test                                      → 8/8 PASS
```

(Recorded again post-correction in this commit.)
