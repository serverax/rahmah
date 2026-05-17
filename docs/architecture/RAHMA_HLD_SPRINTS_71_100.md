# Rahma/Sakina HLD — Sprints 71–100

## 1. Purpose

This HLD defines the high-level design for Rahma/Sakina Sprints 71–100.

The approved roadmap covers:

- Bundle 05: Sprints 71–80 — blocker resolution, release readiness, mobile quality
- Bundle 06: Sprints 81–90 — RAG, algorithmic intelligence, WASM foundations
- Bundle 07: Sprints 91–100 — production hardening, final QA, operator handover

Rahma is a mobile-only Islamic app.

No public website.
No public admin dashboard.
No public ingress unless operator approves.
No fake public domain.
No unrelated project integration.

## 2. Current Verified Position

Documented state from repo evidence (post-Sprint 70):

- Latest verified sprint before this roadmap: Sprint 70
- Bundle: Bundle 04
- Status: PARTIAL (WASM artifacts missing, operator blockers pending)
- Known blockers:
  - cluster rollout operator-pending
  - DB migrations/seeds operator-pending
  - real secrets operator-pending
  - WASM runtime rollout operator-pending
  - mobile native shell initialized but native build is workstation task
  - final API domain/ingress operator decision
  - payment provider operator decision
  - failing tests resolved in Sprint 71

## 3. System Context

Rahma/Sakina is:

- Arabic-first / RTL Islamic mobile app
- backend API for health/readiness, Ask Sheikh Hasan, children game, library, privacy/legal
- optional WASM foundation for deterministic rules (Child Safety, Citation, Fatwa, Rule Engine)
- optional RAG foundation for curated Islamic retrieval
- algorithmic deterministic engine for recommendations and safety checks
- no fake AI fatwa generation
- public content only after review/approval

## 4. High-Level Components

### Mobile App Layer

Responsibilities:
- Arabic RTL mobile-first screens (Flutter)
- Ask Sheikh Hasan flow (User submission)
- children Hasanat game (Scenario engine)
- Islamic library (Curated content)
- privacy/safety screens (Transparency)
- loading/error states (Arabic safe messages)

### Backend API Layer

Responsibilities:
- /health & /ready (Truthful status)
- auth/role gates (JWT + Secure Storage)
- question submission & moderation (Sheikh workflow)
- public approved Q&A (Citations required)
- library & game APIs (Offline-first data)
- safe errors & request validation (No secret leakage)

### Data Layer

Responsibilities:
- PostgreSQL (Users, Questions, Answers, Citations, Audit)
- Redis (Optional caching, memory-fallback)
- SQLite (Mobile offline persistence)

### RAG Foundation

Responsibilities:
- curated Islamic source registry
- retrieval request/response contracts
- citation metadata
- no-answer state
- reviewed-source enforcement

### Algorithmic Engine

Responsibilities:
- deterministic child-safe recommendations
- scenario selection logic
- no sensitive profiling
- transparent reason fields

### WASM Foundation

Responsibilities:
- optional deterministic rule execution (Rust sidecars)
- child safety policy checks
- citation validation checks
- fallback JS path if WASM artifact is unavailable

### Security and Compliance Layer

Responsibilities:
- input validation
- role-based route protection
- secret leakage prevention (Redaction)
- audit logs for sensitive actions

### CI/CD Layer

Responsibilities:
- lint, build, tests (Backend + Mobile)
- Docker builds for WASM sidecars
- GitHub Actions for automation

## 5. High-Level Data Flows

### Flow 1 — Ask Sheikh Hasan
1. User submits question via Mobile App.
2. Backend validates input and queues it as 'submitted'.
3. Sheikh/admin authenticates and drafts an answer.
4. Answer requires valid Citation (Quran/Hadith) via Citation WASM Gate.
5. Moderator approves the answer.
6. Approved answer becomes public.

### Flow 2 — Children Hasanat Game
1. Mobile app requests scenario content (local-first).
2. Scenario engine selects child-safe scenario.
3. User chooses action.
4. Deterministic scoring engine calculates result.
5. Positive learning feedback shown.

### Flow 3 — Islamic Library
1. User browses categories.
2. Only published/reviewed content is visible.
3. Source/citation metadata shown.

### Flow 4 — RAG Retrieval
1. System requests retrieval for a query.
2. Source registry filters to reviewed sources.
3. Retrieval returns source-bound answer candidates with citations.
4. If confidence is weak, returns 'needs review'.

### Flow 5 — WASM Rule Execution
1. Backend calls deterministic rule bridge (HTTP sidecar).
2. If compiled WASM artifact exists, bridge uses WASM runtime.
3. If not, bridge uses JS/TS fallback.
4. Readiness reports WASM status truthfully.

## 6. Trust and Safety Principles

- No fake Islamic answers
- No AI fatwa without Sheikh review
- Public answers require citation
- Children content must be positive and safe
- No shame/guilt manipulation
- No sensitive profiling
- No secret leakage

## 7. Deployment Boundary

- Repo work only; no cluster mutation without approval.
- No production DB mutation.
- K3s manifests reviewed for resource limits and security context.
- Real API domain and payment provider are operator-decided.

## 8. Sprint-to-Architecture Mapping

| Sprint Range | Theme | Components |
|---|---|---|
| 71–80 | blocker resolution and release readiness | backend, mobile, docs, CI |
| 81–90 | RAG, algorithm, WASM foundation | RAG, algorithm engine, WASM, source registry |
| 91–100 | hardening and final release gate | auth, DB, security, Docker, infra review, QA |

## 9. HLD Acceptance Criteria

- All major components and core flows described.
- Deployment boundaries clear.
- Operator-pending tasks separated.
- No fake production claims.
- Maps to Sprints 71–100.
