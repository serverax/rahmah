# Rahma / Sakina — Project Status

**Date:** 2026-05-14
**Project:** Rahma/Sakina Islamic app
**Repo:** `serverax/rahmah`
**Local path:** `F:/rahma`
**Branch:** `main`

Authoritative source of truth for what is real vs. what is foundation-only.
**Production readiness: FALSE** — proven by `/ready.production_ready=false` plus the blockers array.

## Scope lock

This document covers Rahma/Sakina only.
NOT covered: IterLaw, OrdinoxAI, RightsNow, Alaa Beauty.

## Live endpoint truth (probed via `app.inject`)

| Endpoint | Status | Truth |
|---|---|---|
| `GET /health` | 200 | `{ok:true, service:'sakina-backend'}` |
| `GET /ready` | 200 | `production_ready:false`, 5 blockers |
| `GET /api/auth/status` | 200 | `auth_configured:false, mode:'not_configured'` |
| `GET /api/db/status` | 200 | `database_configured:false` |
| `GET /api/rag/status` | 200 | `mode:'foundation', approved_sources:0` |
| `GET /api/engine/status` | 200 | `engine_implemented:true, mode:'deterministic_rules'` |
| `GET /api/privacy/status` | 200 | reachable |
| `GET /api/terms/status` | 200 | reachable |
| `GET /api/public/sheikh-hasan/qa` | 200 | `items:[], configured:false` |

## Subsystem reality

| Subsystem | Status | Detail |
|---|---|---|
| Repo scope | PASS | clean main, no contamination |
| Build | PASS | `npm run build` exit 0 |
| Backend tests | PASS | 384/384 at HEAD `6c1802a` (with Sprints 30–39 layered on top) |
| Web tests | PASS | 8/8 |
| Arabic RTL | PARTIAL | enforced by tests; vanilla HTML (no Next.js yet) |
| Auth | FOUNDATION ONLY | env-driven; default `not_configured`; RBAC middleware ships |
| DB | TOOLING ONLY | migrations 001-007 exist; no `DATABASE_URL` |
| Ready | PASS | honest blockers contract |
| RAG | FOUNDATION ONLY | governance + ingestion controller + retrieval shipped; no approved content |
| Sheikh Hasan | PARTIAL | repo + audit + citation gate; live workflow + login pending |
| Islamic library | PARTIAL | routes + categories; no approved content seeded |
| Children's game | PASS | 32 child-safe Arabic scenarios; localStorage-only |
| Rahma Control Engine | PASS | 9 modules, deterministic rules, no LLM |
| Privacy / data rights | PARTIAL | routes reachable; `persisted:false` when DB missing |
| Charity | PARTIAL | provider disabled by default |
| Security | PASS | no DSN/secret leak; no LLM imports; CI scanners green |
| Docker | BLOCKED | daemon not running locally |
| K3s | BLOCKED | `aks-iterlaw-we-prod` is current context — forbidden by safety rule |
| Mobile / PWA | PARTIAL | RTL pages only; no installable manifest yet |
| Production release | NOT READY | `production_ready:false` |

## Operator blockers (cannot be resolved by the assistant)

1. Start Docker Desktop locally → unblocks `docker build` and image-publish probe.
2. Provide Sakina-safe admin kubeconfig (not `aks-iterlaw-we-prod`) → unblocks `kubectl` work.
3. Provide `DATABASE_URL` → unblocks real DB connection + migration apply.
4. Provide real auth provider credentials (OIDC issuer/client/secret) → unblocks live login.
5. Approve Islamic source licensing decision → unblocks real content ingestion.
6. Confirm DNS / TLS for `sakina.*` → unblocks ingress apply.
7. Choose payment / charity provider → unblocks live donation flow.

## Roadmap pointer

See [`RAHMA_PROJECT_REMAINING_WORK_AND_SPRINT_PLAN.md`](./RAHMA_PROJECT_REMAINING_WORK_AND_SPRINT_PLAN.md) for the 44-sprint production-MVP plan.

Current bundle: **Sprints 30–39** (in progress).
Remaining after this bundle: **Sprints 40–44**.
