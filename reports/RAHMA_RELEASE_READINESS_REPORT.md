# Rahma/Sakina — Release Readiness Report

**Generated:** 2026-05-13
**Repo:** `serverax/rahmah`
**Local path:** `F:/rahma`
**Scope:** Rahma/Sakina only. IterLaw / OrdinoxAI / RightsNow / Alaa Beauty NOT touched.

## Recommendation

**NOT READY for production. READY for local demo (vanilla HTML frontend + Fastify backend, no DB).**

The repo carries a comprehensive backend + Arabic-RTL static frontend + scripts + tests. Several hard infrastructure dependencies are unconfigured — the recommendation honestly reflects that, not what the code could do if everything were wired.

---

## Snapshot at this report

| Subsystem | State | Evidence |
|---|---|---|
| Local lint / build / test | **PASS — 287/287** | `npm test` in `backend/app`, 9.2 s |
| Latest GitHub Actions on prior HEAD `dc8672c` | **SUCCESS** | `gh run list … --limit 5` |
| Docker daemon (workstation) | **NOT RUNNING** | `docker info` returns connection error |
| Docker build | **NOT RUN** | depends on daemon |
| Container image in GHCR | **NOT VERIFIED** | not probed remotely this turn |
| `DATABASE_URL` | **NOT CONFIGURED** | env unset |
| Postgres reachable | **NO** | depends on `DATABASE_URL` |
| Applied migrations | **0** | depends on DB |
| RAG mode | **`foundation`** | `/api/rag/status` returns it |
| Approved islamic sources | **0** | DB-backed; none indexed |
| `safe_to_answer_from_rag` | **false** | governance-only |
| Sheikh auth | **NOT CONFIGURED** | `sheikh_auth_configured: false` on `/ready` |
| WhatsApp adapter | **`pending_config`** | by design |
| Charity payment provider | **`disabled`** | by design |
| kubectl current-context | **`aks-iterlaw-we-prod`** (forbidden) | `kubectl config current-context` |
| K3s namespace `rahma` | **NOT CREATED** | no apply attempted |
| App-store `submission_ready` | **false** | `/ready.app_store` |
| Frontend framework | **vanilla HTML scaffold** | `apps/web/public/` static |

## Critical blockers (block any deployed claim)

1. **kubectl context forbidden** — `aks-iterlaw-we-prod` is the only configured context. Need an admin kubeconfig for a Sakina-safe K3s cluster.
2. **No admin kubeconfig for any Sakina-safe cluster** (the Hetzner kubeconfig points at a worker IP, not the master; the IP `138.201.253.56` given by an earlier prompt is unreachable on TCP/22 and TCP/6443).
3. **Docker daemon not running** locally → no image build/push; no local end-to-end smoke test as a container.
4. **No real Sheikh authentication adapter** wired. All Sheikh routes return `auth_not_configured` honestly.

## High blockers (block "RAG ACTIVE" / "DB BACKED" claims)

5. **`DATABASE_URL` not set in this environment.** Migration runner refuses to run. The `/ready.database.configured` flag is honestly `false`.
6. **No verified Islamic content seeded.** Migrations exist for `islamic_source_registry` (Sprint 10/Sprint 28 governance) but **0 approved sources**. By policy: no public religious answers can be served. (Licensing review pending.)
7. **pgvector not yet enabled**; embeddings column is JSONB placeholder.
8. **Redis adapter not shipped.** Cache is memory-only; this is documented honestly in `/ready.cache.mode = "memory"`.

## Medium blockers (block "production" claim but not "staging")

9. **Frontend is vanilla HTML scaffold**, not Next.js/React. UI works in a browser via `node apps/web/server.js`; replaceable with a framework in a focused sprint.
10. **WhatsApp adapter** is `pending_config`. No real provider wired.
11. **Charity payment provider** is `disabled`. No fake donation success — confirmed by `provider_status: "disabled"` and the route-level `provider_not_configured` decision.
12. **GitHub Actions remote run** for the very next push will run automatically. Workflow status of *this* commit is unverified until after push.

## Honest "what's already real"

- **Rahma Control Engine** is **REAL** — deterministic rule-based engine with 9 modules, 15 supported events, 11 safety rules. `engine_implemented: true` on `/api/engine/status`.
- **Citation enforcement** is real and test-asserted (publish without citation is blocked at multiple layers).
- **Identity-leak protection** on public Q&A is real and test-asserted (`publicAnswerProjection`).
- **Children's-game safety** is real: 32 scenarios, all Arabic, all child-safe; localStorage-only progress; no PII fields persisted.
- **Library / privacy routes** are wired into the production app.js. Public endpoints reachable.
- **Migration runner** is real (refuses without DATABASE_URL, drift detection, BEGIN/COMMIT, sorted apply).
- **Forbidden-context refusal** in `verify-rahma-cluster.sh` is real (regex + env-gated override).
- **CI fake-claim scanner** runs on every push and excludes only its own pattern definition; latest CI on `dc8672c` was **SUCCESS**.
- **Arabic-native RTL** is real on every page: 7 Sheikh + 3 child + 5 library + 5 compliance + 7 main — all `lang="ar" dir="rtl"` test-enforced; forbidden English UI words rejected.

## Recommendation flow

- **READY FOR LOCAL DEMO** — yes. `node apps/web/server.js` + `npm start` in `backend/app` gives a browsable Arabic-RTL Sakina with truthful subsystem statuses.
- **READY FOR STAGING** — no. Requires: admin kubeconfig for a Sakina-safe cluster, container image build + push, `DATABASE_URL` to a staging Postgres, migrations applied.
- **READY FOR PRODUCTION** — no. Additionally requires: real Sheikh auth adapter, approved Islamic content seeded (licensing review), pgvector + embeddings, real Redis, payment provider (if charity launches), cert-manager TLS, DNS for `sakina.ordinoxai.com`, restore-drill evidence, App Store / Google Play implementation (Sprint 23-style endpoints exist but full submission flows do not).

## Truthful one-line for stakeholders

> Sakina is a working **demo-ready** Arabic-RTL Islamic-assistant scaffold with a real deterministic safety engine. It is **not deployed**, **not DB-backed**, **not authenticated**, **not paid**. The repository is honest about every one of those gaps.
