# Rahma / Sakina — Remaining Work & Sprint Plan

**Date:** 2026-05-14
**Project:** Rahma/Sakina only

Total production-MVP roadmap: **44 sprints**.

## Bundle map

| Bundle | Sprints | Status |
|---|---|---|
| Foundation | 1–8 | DONE (committed in earlier sprints) |
| Engine + safety + RAG governance | 9–14 | DONE |
| UI / family / charity / hardening | 15–24 | DONE (foundation level) |
| Routes + RAG governance + readiness | 25–29 | DONE |
| **Production foundation bundle** | **30–39** | **CURRENT (this bundle)** |
| Cluster + release + mobile + payments + audit | 40–44 | REMAINING |

## Sprint 30–39 — Production foundation (this bundle)

| # | Goal |
|---|---|
| 30 | Truth reconciliation + roadmap lock |
| 31 | Real DB connection foundation (no fake connected) |
| 32 | Auth provider + RBAC roles + tests |
| 33 | Sheikh Hasan workflow (questions, answers, moderation, publish) |
| 34 | Approved Islamic source registry governance |
| 35 | Ingestion proof framework (fixture, never full Quran/Hadith) |
| 36 | RAG retrieval + citation enforcement (no citation → no answer) |
| 37 | Islamic library content + search + versioning |
| 38 | Privacy / data rights model + admin moderation |
| 39 | Docker build + image hardening + secret scan |

## Sprint 40–44 — After this bundle

| # | Goal |
|---|---|
| 40 | Correct Rahma K3s namespace + safe cluster context |
| 41 | K3s deployment + ingress + TLS + live runtime checks |
| 42 | Arabic mobile / PWA UI hardening |
| 43 | Charity / payment provider integration |
| 44 | Final production-readiness audit |

## Hard constraints (apply to every sprint)

1. **Never fake** — no PASS without command output.
2. **Never deploy to prod** — `aks-iterlaw-we-prod` is forbidden. If it is current context, stop and surface.
3. **Never claim production_ready** unless `/ready.production_ready=true` is observed.
4. **No external LLM** — Rahma Control Engine is deterministic rules.
5. **No fabricated Quran/Hadith** — source registry must approve before retrieval.
6. **No real secrets in repo** — env-driven only.
7. **Rahma/Sakina only** — IterLaw / OrdinoxAI / RightsNow / Alaa Beauty untouched.

## Operator unblockers (gating the next 5 sprints)

| Blocker | Unblocks |
|---|---|
| Docker Desktop running | 39 image build, 41 image publish |
| Sakina-safe kubeconfig | 40 namespace, 41 deploy |
| `DATABASE_URL` to real Postgres | 31 connect, 33/34/37/38 persist |
| OIDC / external auth credentials | 32 live login |
| Source licensing approval | 35/36 production content |
| DNS + TLS target | 41 ingress |
| Payment provider chosen | 43 charity live |
