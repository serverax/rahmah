# Sakina/Rahmah Master Plan

This is the long-running plan document for the Sakina/Rahmah Islamic assistant app. Scope: **Rahma/Sakina only**. Repo: `serverax/rahmah`. Local: `F:/rahma`. Branch: `main`. IterLaw is a separate project at `C:/Users/kalsh/projects/iterlaw` and is **out of scope** for every plan item here.

## Bundle 01 (Sprints 31–40) — current bundle

This bundle is the **infrastructure foundation** layered on top of the Sprints 30–39 production-foundation work. It produces:

| # | Goal |
|---|---|
| 31 | Repository scope guard + status docs |
| 32 | K3s namespaces (rahma-api / rahma-data / rahma-ai / rahma-monitoring / rahma-security — mobile-only, no rahma-web) + ConfigMap + secret template |
| 33 | PostgreSQL + Redis internal-only data layer |
| 34 | Backend API deployment manifests with strict securityContext |
| 35 | (REVISED: mobile-only) `apps/web/` retained as Arabic-RTL developer preview ONLY; no K3s frontend deployment |
| 36 | Ingress + TLS (cert-manager) + DNS readiness docs |
| 37 | Ask Sheikh Hasan admin workflow recap + verification |
| 38 | Children's Islamic game foundation + safety docs |
| 39 | CI/CD + QA + security guardrail scripts |
| 40 | Deployment runbook + bundle closeout + push |

After Bundle 01: Sprints 41–44 remain (live cluster deployment, mobile/PWA hardening, payments, final readiness audit).

---

Historical content (Sprint 3 baseline) preserved below:

---


## 1. Vision

Sakina/Rahmah is an Islamic assistant application with three pillars:

1. **Verified, cited answers only.** The assistant never generates a religious answer without a verified citation. Source library is curated and licensed before ingestion.
2. **Scholar-reviewed Q&A.** Real scholar (Sheikh Hasan) answers user questions; answers are cited and moderated before becoming public.
3. **Public cited knowledge library.** Users can browse a moderated Q&A library. Private user identity is never exposed.

The app targets App Store + Google Play release with full compliance (privacy policy, data deletion, content reporting, moderation, age rating, no public unmoderated chat). UI is luxury Islamic glassmorphism — emerald/gold accents, RTL Arabic support, mobile-first, accessible.

## 2. Product Modules

1. **Ask Sakina AI** — verified-source-gated assistant for `ibadat` scope (purity, prayer, fasting, zakat, hajj, umrah, adhkar, Quran, naafil, Ramadan).
2. **Ask Sheikh Hasan** — real-scholar Q&A workflow (this sprint's foundation).
3. **Public cited Q&A** — moderated, citation-gated public library.
4. **Quran / Dua learning** — read/listen with verified text + audio (later sprint).
5. **Prayer / Zakat / Fasting guidance** — verified-source content (later sprint).
6. **User question history** — private list of own questions + statuses.
7. **Scholar / admin dashboard** — Sheikh Hasan + moderator + admin UIs.
8. **Moderation / reporting** — content reports, hide/unhide, audit log.
9. **Verified Islamic source library** — primary/recognised sources with provenance and license status.
10. **App-store compliance / data privacy** — privacy policy, terms, deletion, reporting.

## 3. Technology Architecture

### Backend

- Node.js 20 + Fastify 5 (ESM modules).
- PostgreSQL 16.
- pgvector (later — enabled when ingestion begins).
- Redis (later — caching + worker queue).
- Hybrid search (keyword + vector + metadata filter + RRF + reranker) — Sprint 15+.
- Citation validator (already in `src/safety/`).
- Answer audit (already in `src/audit/`).
- Worker queue (later — pg-boss or BullMQ).

### Infrastructure

- K3s on self-hosted Hetzner / dedicated hardware (not managed cloud).
- Traefik (already on the OrdinoxAI shared cluster; if Sakina lands there, reuse; if separate, install fresh).
- cert-manager for TLS (verify presence on target cluster before enabling TLS section of ingress).
- GHCR for container images.
- Kubernetes `Secret` objects for runtime config; templates only in repo.
- PVC storage backed by `local-path` (default K3s) or block storage (operator's choice).
- Internal-only services for Postgres and Redis; no NodePort.

### Frontend / mobile (planned)

- Mobile-first; the prime target is iOS + Android.
- React (Next.js or React Native — final decision pending; React Native more likely for store distribution).
- Tailwind CSS.
- `shadcn/ui` primitives.
- Framer Motion for fluid micro-interactions.
- Three.js + React Three Fiber + Drei for the optional 3D assistant orb on landing.
- Lottie / Rive for tasbih animation, prayer step transitions.
- Full RTL Arabic support and accessibility (large text, high contrast, screen-reader labels).

## 4. Answer Architecture (Ask Sakina AI)

```
user question
  → scope classifier (ibadat-only allowed today)
  → category routing (salah / zakat / fasting / hajj / umrah / adhkar / quran / hadith / naafil / ramadan)
  → verified source retrieval (hybrid: BM25 + dense + metadata; Sprint 15+)
  → reranker (Sprint 16)
  → citation validator (all citations must be approved + non-empty)
  → answer generation, source-gated and constrained (Sprint 14+ ONLY)
  → answer audit (hash-only)
  → cited response back to user (or blocked fallback with `insufficient_verified_sources`)
```

Generation is **off** until Sprint 14. The current contract returns the blocked fallback for every in-scope question.

## 5. Ask Sheikh Hasan Architecture

```
user question
  → /api/sheikh-hasan/ask (validates body, hashes, persists private+pending)
  → notification to Sheikh (WhatsApp adapter, PENDING_CONFIG by default — no real HTTP yet)
  → Sheikh authenticates (real auth NOT YET wired — placeholder 503)
  → /api/sheikh-hasan/sheikh/questions (queue)
  → Sheikh writes draft answer + citations
  → /api/sheikh-hasan/sheikh/questions/:id/answer
       - citation_requirement evaluates:
           quran  → quran_cited
           hadith → hadith_cited
           both   → quran_and_hadith_cited
           scholar_note only → scholar_advice_needs_review
           none → insufficient_citation (publish refused)
       - publication_mode = "private" → answered_private
       - publication_mode = "public" → pending_moderation
  → /api/sheikh-hasan/moderation/answers/:id/publish (moderator/admin only)
       - creates sakina_public_qa row with is_live=true
  → /api/public/sheikh-hasan/qa (list)
  → /api/public/sheikh-hasan/qa/:slug (detail with citations; no user identity)
  → /api/public/sheikh-hasan/qa/:slug/report (content report)
```

Every step is parameterized SQL (no raw concatenation), no external HTTP, no LLM.

## 6. Database Plan

Migrations live in `backend/db/migrations/`. The current set:

- `001_sakina_foundation.sql` — foundational tables (Sprint 2).
- `002_verified_islamic_sources.sql` — source registry (Sprint 5).
- `003_ask_sheikh_hasan_public_qa.sql` — Sheikh Hasan + public Q&A (Sprint 6, this sprint).

Tables added in 003:

- `sakina_users` — user + sheikh + moderator + admin records (email hash only; no password yet).
- `sakina_sheikh_profiles` — public-facing scholar profile.
- `sakina_user_questions` — submitted questions, status machine.
- `sakina_sheikh_answers` — answers with citation_status + publication_status.
- `sakina_sheikh_answer_citations` — citations linked to answers.
- `sakina_public_qa` — published Q&A index (live entries).
- `sakina_content_reports` — content reports against questions/answers/public_qa.
- `sakina_sheikh_audit_log` — append-only audit log of scholar/admin actions.

Future migrations (not yet written) will add:

- `sakina_source_embeddings` (pgvector).
- `sakina_citation_registry` (canonical citation labels).
- `sakina_source_ingestion_jobs`.
- `sakina_scholar_review_queue` (extension of audit log).
- `sakina_topic_taxonomy`.
- `sakina_fatwa_policy_rules`.

Every migration must:

- Be idempotent (`IF NOT EXISTS`).
- Use CHECK constraints to encode safety rules at the database layer.
- Avoid `INSERT` of religious content.
- Never contain DSNs, real secrets, `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, or `DELETE FROM sakina_*`.

## 7. K3s Deployment Plan

Current single namespace: `sakina-ai` (from earlier sprints). Future target multi-namespace:

- `sakina-app` — backend Deployment + Service.
- `sakina-data` — Postgres StatefulSet + PVC + Service (ClusterIP).
- `sakina-workers` — ingestion / RAG indexing workloads.
- `sakina-ingress` — Traefik / cert-manager bindings (only if Sakina runs on a dedicated cluster).
- `sakina-monitoring` — observability stack.

Rules:

- Postgres never has a public NodePort or LoadBalancer.
- Redis never has a public NodePort or LoadBalancer.
- All sensitive env from `Secret` (template only in repo; rendered file `*.rendered.yaml` is gitignored).
- All workloads non-root, with `readOnlyRootFilesystem`, `runAsNonRoot`, `allowPrivilegeEscalation: false`, `automountServiceAccountToken: false` unless required.
- Resource `requests`/`limits` on every container.
- Liveness + readiness probes on every Deployment.
- No mutation of `aks-iterlaw-we-prod` cluster, ever.

## 8. App Store / Google Play Plan

Target features required before submission:

- Privacy policy page (web + in-app link).
- Terms of service page.
- Account deletion request (in-app button + server-side workflow).
- Data export / deletion ("download my data", "delete my account").
- Content reporting on every public Q&A entry (CREATED at API level).
- Moderation queue (CREATED at API level; UI pending).
- No public unmoderated chat anywhere.
- Safe religious content policy (existing `docs/AI_FATWA_SAFETY_POLICY_AR.md`).
- Push notification consent (deferred; no notifications wired today).
- Google Play Data Safety form content.
- Apple App Privacy Labels content.
- Age / content rating.
- Final release checklist (build version, accessibility audit, store screenshots).

## 9. Luxury 3D UI Plan

- Luxury Islamic glassmorphism — frosted cards, soft shadows.
- Accent palette: emerald (`#0F766E` / `#10B981`) + gold (`#D4AF37`) + ivory background.
- 3D assistant orb on landing (Three.js / R3F), low-poly + soft glow, optional based on device tier.
- Citation cards with type badge (Quran / Hadith / Fiqh / Scholar note).
- Sheikh Hasan dashboard: pending queue → editor → preview → publish dialog.
- Public Q&A library: filter by category + language, search, share, report.
- Prayer cards, Quran cards, Dua cards (later sprints).
- Mobile-first bottom navigation; tabs: Home, Ask, Library, Profile.
- RTL Arabic toggle + full bidi support throughout.
- Accessibility: minimum 16px body, AAA contrast, semantic structure, focus order.
- Performance budget: 3D off on low-tier devices; key flows must work without 3D enabled.

## 10. Rahma/Sakina Sprint Roadmap (canonical)

Each sprint produces a report under `reports/` with command-output evidence per `[[feedback-reporting-evidence]]`. This roadmap is the **canonical** numbering for the Sakina/Rahmah project. Numbers are non-overlapping and do not correspond to any other project.

| Sprint | Focus | Status |
|---|---|---|
| 1 | K3s foundation files | COMPLETE (commit `4a024fb`) — manifests only, never applied |
| 2 | Backend scaffold + safety gates | COMPLETE (commit `e028ae4`) |
| **3** | **Project status + master plan + app-store compliance foundation + Ask Sheikh Hasan foundation** | **COMPLETE** (commits `e27b984`, `dd3a73d`, plus the closeout audit commit for this sprint) |
| 4 | Container runtime + GHCR image CI | COMPLETE (commit `87b6aaa`) — image CI workflow exists; image not yet published to GHCR |
| 5 | Postgres readiness + DB connection | COMPLETE (commit `3e6fa1c`) — manifests + backend probe exist; Postgres never deployed |
| 6 | Verified Islamic source registry | COMPLETE (commit `3d8a701`) — schema only |
| 7 | Citation validator + answer audit | COMPLETE (shipped inside Sprints 2/6: `src/safety/citation-validator.js`, `src/audit/answer-audit.js`, tests `audit.test.js`, `ibadat-source-gate.test.js`) |
| 8 | Redis / cache / performance layer | NOT STARTED |
| 9 | Ask Sheikh Hasan backend workflow (deeper: real auth, real moderation persistence, real notifications) | NOT STARTED — Sprint 3 laid the foundation only |
| 10 | Public cited Q&A (deeper: real admin UI, search, indexing, share/SEO) | NOT STARTED — Sprint 3 laid the foundation only |
| 11 | Apple / Google compliance implementation (privacy page, terms, deletion endpoint, data export, age rating, store-listing content) | NOT STARTED — Sprint 3 laid the foundation (`docs/compliance/APP_STORE_COMPLIANCE_FOUNDATION.md` + `/ready.app_store`) |
| 12 | Luxury 3D mobile UI foundation | NOT STARTED — blueprint only (`docs/uiux/ASK_SHEIKH_HASAN_UI_UX_BLUEPRINT.md`) |
| 13 | Real K3s server deployment | NOT STARTED — blockers documented in `deployment/k3s/README.SERVER.md` |
| 14 | Islamic source ingestion worker | NOT STARTED |
| 15 | Hybrid RAG retrieval | NOT STARTED |
| 16 | Reranking + citation scoring | NOT STARTED |
| 17 | Sheikh / admin dashboard | NOT STARTED |
| 18 | Security hardening | NOT STARTED |
| 19 | Monitoring / observability | NOT STARTED |
| 20 | Store release readiness | NOT STARTED |

Sprint count remaining after Sprint 3 PASS: **17** (Sprints 4–20).

## 11. Non-Negotiable Safety Rules

- No fake PASS. No success claim without command-output evidence.
- No fake deployment. No "deployed" word unless backed by `kubectl rollout status` output.
- No real secrets in git. Templates only; rendered files gitignored.
- No fabricated Islamic citations. Citation strings live in the database; tests guard against fabricated strings in `src/`.
- No public answer without citation OR moderator approval (scholar_advice path).
- No wrong cluster mutation. Never apply to `aks-iterlaw-we-prod`.
- No IterLaw work in this repo. Rahma/Sakina only.
- No external LLM in the request path. No `openai`/`anthropic`/`gemini`/`ollama` imports in `src/`. Enforced by `test/no-external-llm.test.js`.
- No raw user-question text stored — only a sha-256 hash for audit.
- No raw email stored unless an auth provider is wired and approved — only `email_hash` until then.
