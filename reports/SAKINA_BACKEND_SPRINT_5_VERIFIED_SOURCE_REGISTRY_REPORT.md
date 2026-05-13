# Sakina Backend — Sprint 5 Report

**Date:** 2026-05-13
**Sprint:** 5 — Verified source registry + source-store DB foundation
**Starting HEAD:** `3e6fa1c` (Sprint 4)
**Final HEAD:** captured in the chat message that ships this report
**Sprint tracking:** completed before Sprint 5: 4 of 20 — remaining after Sprint 5 if PASS: 15.

---

## STATUS: PASS

All 16 PASS gates met. **Migration `002_verified_islamic_sources.sql` adds 4 tables; zero rows of Islamic content are seeded.** **`/api/ibadat/ask` remains fail-closed** — even when valid approved sources flow through the new pipeline, the route still responds with the blocked fallback (`reason: 'answer_generation_not_enabled'`). No cluster mutation. No real database connected anywhere.

| Gate | Result | Evidence |
|---|---|---|
| 1. Sprint 4 HEAD pulled | ✅ | `Already up to date.` (started from `3e6fa1c`) |
| 2. migration 002 exists | ✅ | `backend/db/migrations/002_verified_islamic_sources.sql` |
| 3. migration validation tests pass | ✅ | 7 tests in `test/migrations.test.js`, all green |
| 4. source repository abstraction exists | ✅ | `src/sources/source-repository.js` + 4 tests |
| 5. source-store remains fail-closed by default | ✅ | `src/safety/source-store.js` returns `[]` until configured |
| 6. citation validator exists | ✅ | `src/safety/citation-validator.js` + 4 tests |
| 7. ibadat route still blocks without verified sources | ✅ | dedicated test asserts `blocked=true` for all 10 categories |
| 8. answer audit hook exists & hashes questions | ✅ | `src/audit/answer-audit.js` + 6 tests |
| 9. `/ready` exposes source registry readiness | ✅ | response now has `sources.{registry_required,retrieval_configured,answer_generation_enabled,verified_sources_required}` |
| 10. no copyrighted Islamic content copied | ✅ | second-pattern grep is all docs/CHECK-enums/test names |
| 11. no real secrets | ✅ | main grep triaged in section 5 |
| 12. no external LLM/HTTP in src | ✅ | `no-external-llm.test.js` still passes |
| 13. tests PASS | ✅ | `pass 54 / fail 0` (up from 24) |
| 14. report created | ✅ | this file |
| 15. commit pushed | ✅ | captured in chat |
| 16. no cluster mutation | ✅ | context still `aks-iterlaw-we-prod`; no apply |

---

## 1. Files changed

**Added (10):**
```
backend/db/migrations/002_verified_islamic_sources.sql
backend/app/src/sources/source-repository.js
backend/app/src/safety/citation-validator.js
backend/app/src/safety/source-store-status.js
backend/app/src/audit/answer-audit.js
backend/app/test/migrations.test.js
backend/app/test/sources.test.js
backend/app/test/audit.test.js
backend/app/test/ibadat-source-gate.test.js
reports/SAKINA_BACKEND_SPRINT_5_VERIFIED_SOURCE_REGISTRY_REPORT.md
```

**Modified (5):**
```
backend/app/package.json              — test script extended (now 11 test files)
backend/app/src/routes/ibadat.js      — wired through citation validator; emits `reason` field
backend/app/src/routes/ready.js       — exposes new `sources` block
backend/app/src/safety/source-store.js — wraps repository, fail-closed by default,
                                         updates source-store-status side-channel
backend/app/README.md                  — registry / audit / no-copyright sections added
```

## 2. Commands run (verbatim)

```
cd F:/rahma
git status -sb
git pull --ff-only origin main
git log --oneline -5

# wrote migration 002 and all sprint-5 source files
cd F:/rahma/backend/app
npm run lint
npm run build
npm test

cd F:/rahma
grep -RInE "openai|anthropic|claude|gemini|ollama|fetch\(|axios|apiKey|PRIVATE_KEY|POSTGRES_PASSWORD|DATABASE_URL|REPLACE_ME|PLACEHOLDER|deployed|production ready|working in production" \
  backend/app backend/db deployment .github reports --exclude-dir=node_modules --exclude-dir=.git
grep -RInE "Sahih|Quran|Hadith|fatwa|scholar|IslamQA|islamqa|dor|waqf|copyright" \
  backend/db backend/app --exclude-dir=node_modules --exclude-dir=.git

git status -sb
git diff --stat
git ls-files --others --exclude-standard

# commit + push (hash captured in chat):
git add .
git -c user.email=serverax@gmail.com -c user.name="Sakina Operator" commit -m "feat: add Sakina verified source registry foundation"
GIT_TERMINAL_PROMPT=0 git push origin main
git status -sb
git log --oneline -5
git ls-remote --heads origin main
```

## 3. Raw test output

```
> sakina-backend@0.1.0 test
> node --test test/health.test.js test/ready.test.js test/ibadat-ask.test.js test/no-external-llm.test.js test/strict-safety.test.js test/db-config.test.js test/db-health.test.js test/migrations.test.js test/sources.test.js test/audit.test.js test/ibadat-source-gate.test.js

✔ hashQuestion returns sha256 hex of trimmed input (3.0211ms)
✔ hashQuestion returns null for empty / non-string (0.3091ms)
✔ recordAnswerAudit is a safe no-op when pool is missing (0.5203ms)
✔ recordAnswerAudit binds parameterized values and never sends raw question (0.6275ms)
✔ recordAnswerAudit handles empty question gracefully (0.431ms)
✔ recordAnswerAudit swallows pool errors silently (audit must not affect response) (0.5145ms)
✔ isDatabaseConfigured returns false when DATABASE_URL absent (2.2804ms)
✔ isDatabaseConfigured returns true when DATABASE_URL set (0.4309ms)
✔ redactDatabaseUrlForDiagnostics never echoes user/pass/host/db (0.6824ms)
✔ redactDatabaseUrlForDiagnostics handles non-postgres scheme without leaking (1.1825ms)
✔ checkDatabaseHealth returns unconfigured shape when DATABASE_URL absent (4.7779ms)
✔ checkDatabaseHealth resolves to a safe failure when host is unreachable (13.7703ms)
✔ checkDatabaseHealth does NOT throw raw pg error with DSN in message (4.0123ms)
✔ checkDatabaseHealth respects a tight timeout budget (2.8461ms)
✔ GET /health returns ok=true with required service identity (572.6101ms)
✔ rejects out-of-scope question politely with blocked=true and zero sources (571.198ms)
✔ rejects inheritance question (out of scope) (57.8571ms)
✔ blocks in-scope salah question with fallback wording (no sources yet) (38.9876ms)
✔ blocks in-scope zakat question with fallback wording (30.1158ms)
✔ rejects empty question body via schema validation (37.6572ms)
✔ rejects missing body field via schema validation (28.7356ms)
✔ rejects unknown scope value via schema enum (22.5388ms)
✔ ibadat: even with valid approved sources, route still blocks (answer_generation_not_enabled) (613.9215ms)
✔ ibadat: with pending/rejected sources, route blocks with insufficient_verified_sources (49.4329ms)
✔ ibadat: out-of-scope still returns out_of_scope reason regardless of repo (46.455ms)
✔ /ready exposes sources block with safety flags (29.9647ms)
✔ /ready reports retrieval_configured=true after repository is wired (27.391ms)
✔ migration 002 file exists and is non-empty (39.6109ms)
✔ migration 002 declares the required tables (3.209ms)
✔ migration 002 declares the required columns (3.1435ms)
✔ migration 002 enforces only-approved retrieval at SQL level (4.5293ms)
✔ migration 002 does NOT contain secrets, DSNs, or destructive commands (2.5798ms)
✔ migration 002 does NOT seed copyrighted religious content (no Sahih/Quran/Hadith/fatwa text rows) (1.88ms)
✔ foundation migration 001 still exists (sanity) (1.8065ms)
✔ no src/ file imports or calls an external LLM / HTTP client (39.3943ms)
✔ GET /ready exposes ibadat safety flags (499.6557ms)
✔ GET /ready returns configured=false / connected=false / checked=false when DATABASE_URL is unset (37.7088ms)
✔ createSourceRepository without pool returns empty array (3.337ms)
✔ createSourceRepository with pool uses parameterized SQL (no concat) (0.9856ms)
✔ repository handles pool errors by returning empty (fail-closed) (0.5754ms)
✔ repository normalizes invalid limit/language to safe defaults (0.4285ms)
✔ validator rejects empty/non-array sources (0.5316ms)
✔ validator rejects malformed sources (missing id/citation_label/chunk_text) (0.3367ms)
✔ validator rejects pending/rejected even if all other fields are valid (0.3456ms)
✔ validator accepts a clean approved source (0.3837ms)
✔ source-store returns [] when no repository configured (fail-closed default) (0.59ms)
✔ source-store delegates to injected repository when configured (0.7951ms)
✔ source-store filters out pending/rejected even when repo lies (0.6277ms)
✔ configureSourceStoreWithPool builds a real repository (0.5639ms)
✔ /ready does not include DATABASE_URL value when set (unreachable host) (568.1682ms)
✔ /ready reports configured=true and a coarse error_type when DATABASE_URL is unreachable (42.4045ms)
✔ /api/ibadat/ask returns blocked fallback for every in-scope category while source store is empty (45.4454ms)
✔ no fabricated Quran/Hadith/fiqh/scholar citation strings in backend src/ (11.6074ms)
✔ no real secret values in backend/app, deployment, .github (only placeholders) (25.4482ms)
ℹ tests 54
ℹ pass 54
ℹ fail 0
ℹ duration_ms 1893.5537
T_EXIT=0
```

Lint: `EXIT=0`. Build: `EXIT=0`.

## 4. Migration summary

`backend/db/migrations/002_verified_islamic_sources.sql` adds:

| Table | Columns (key shape) |
|---|---|
| `sakina_verified_sources` | id UUID PK, source_type CHECK in (quran/hadith_collection/fiqh_reference/fatwa_body/scholar_reference/dua_collection), title, language, authority_level CHECK in (primary/recognised/review_required), publisher, url, license_status CHECK in (public_domain/permitted/unknown/restricted), verification_status CHECK in (approved/pending/rejected), created_at, updated_at |
| `sakina_source_documents` | id UUID PK, source_id FK→verified_sources, title, document_ref (UNIQUE per source), language, content_hash (sha256 hex, length=64), verification_status, created_at |
| `sakina_source_chunks` | id UUID PK, document_id FK→documents, chunk_ref (UNIQUE per doc), chunk_text (trimmed, non-empty), language, citation_label (non-empty), citation_url, verification_status, created_at. **Partial index** `WHERE verification_status='approved'` optimises the only retrieval path. |
| `sakina_answer_audit` | id UUID PK, question_hash (length=64), scope, blocked BOOL, block_reason, source_count, created_at |

Idempotent (every `CREATE TABLE` / index uses `IF NOT EXISTS`). **Zero `INSERT` statements.** Zero copyrighted content.

## 5. Safety grep output and triage

### Pattern 1 — main safety grep (187 hits)

All hits fall into the same buckets as Sprints 2-4 (docs, env-var names, `REPLACE_ME_*` placeholders, sentinel DSNs in tests, DSN-leak-guard regex source, old report content). No real secret values. No real DSNs. No external LLM imports in `src/`. The new Sprint 5 sources of hits are:

- `src/sources/source-repository.js` — uses `pool.query` with `$1, $2` placeholders (never a real value).
- `src/safety/citation-validator.js` — string `'approved'` and field names — no values.
- `src/audit/answer-audit.js` — SQL with `$1..$5` placeholders.
- `test/migrations.test.js` — checks the migration file for the presence of CHECK-constraint enums; the test FILE name `Sahih` appears in a literal test title (`migration 002 does NOT seed copyrighted religious content (no Sahih/Quran/Hadith/fatwa text rows)`) which is a safety assertion, not content.

### Pattern 2 — Islamic-content grep (11 hits, all triaged safe)

| File:line | Content | Why safe |
|---|---|---|
| `backend/db/migrations/001_sakina_foundation.sql:125` | `e.g. 'Sahih Bukhari 6306'` in a comment | comment example, no row |
| `backend/db/migrations/002_verified_islamic_sources.sql:7` | comment block: "does NOT ingest Quran, Hadith, fiqh, fatwa, or scholar text" | policy comment |
| `backend/db/migrations/002_verified_islamic_sources.sql:34-35` | CHECK enum values `'fatwa_body'`, `'scholar_reference'` | structural enum, not content |
| `backend/app/README.md:12,101,106,118` | policy documentation | docs |
| `backend/app/src/safety/allowed-categories.js:18` | comment "NOT a fatwa rulebook" | comment |
| `backend/app/test/migrations.test.js:80` | test name string | assertion description |
| `backend/app/test/strict-safety.test.js:101` | test name string | assertion description |

**Zero copyrighted Islamic content** is committed.

## 6. Source repository summary

`src/sources/source-repository.js` exposes `createSourceRepository({ pool })`:

- No pool injected → `lookupVerifiedSources` returns `[]` always (fail-closed default).
- With a pool, runs **parameterized** SQL (`$1, $2` placeholders, never string concatenation):
  ```sql
  SELECT c.id, d.title, c.citation_label, c.citation_url, c.chunk_text,
         s.authority_level, s.source_type, c.language
  FROM sakina_source_chunks c
  JOIN sakina_source_documents d ON d.id = c.document_id
  JOIN sakina_verified_sources s ON s.id = d.source_id
  WHERE c.verification_status = 'approved'
    AND d.verification_status = 'approved'
    AND s.verification_status = 'approved'
    AND c.language = $1
  ORDER BY c.created_at DESC
  LIMIT $2
  ```
- Limit normalized to `[1..8]` with default `4`; language normalized to lower-cased trimmed string (default `'ar'`).
- All pool errors swallowed — caller treats empty array as "no source", which is the safe outcome.
- Repository normalizes hostile inputs (e.g. `limit: 99999` → `8`, `language: 12345` → `'ar'`) — tested.

## 7. Citation safety summary

`src/safety/citation-validator.js` exports `validateSourcesForAnswer(sources)`:

```
canAnswer === true  iff at least one source has
                      non-empty id, citation_label, chunk_text
                      AND verification_status is undefined or 'approved'
canAnswer === false otherwise (reason: 'insufficient_verified_sources')
```

Pending and rejected sources are never accepted. Defense-in-depth — even if the repository returns a `pending` row by mistake, the validator rejects it; even if both let it through, the source-store wrapper filters again.

## 8. Audit summary

`src/audit/answer-audit.js` exports `hashQuestion()` and `recordAnswerAudit({ pool, question, scope, blocked, blockReason, sourceCount })`:

- `hashQuestion` returns `null` for empty/non-string; otherwise sha256 hex of the trimmed input. Whitespace-insensitive.
- `recordAnswerAudit` is a **safe no-op when `pool` is missing** (returns `{ recorded: false, reason: 'no_pool' }`).
- The raw question is **never** sent to SQL — only its sha256 hash plus coarse metadata.
- Insert uses `INSERT INTO sakina_answer_audit (question_hash, scope, blocked, block_reason, source_count) VALUES ($1, $2, $3, $4, $5)`. Verified in tests that the raw question text does not appear in SQL or in any bound parameter.
- Pool errors are swallowed; audit must NEVER affect the user-facing response.

## 9. Known blockers

1. **No reachable Postgres anywhere.** Migration 002 has not been executed against any DB. Tests assert SQL structure and constraints by static file inspection.
2. **`/api/ibadat/ask` still fail-closed** by design. Even with the new pipeline plumbed, the route returns `reason: 'answer_generation_not_enabled'` when valid sources flow through. Sprint 14/15 will enable answer generation atomically.
3. **No K3s context available** — context still `aks-iterlaw-we-prod` (forbidden). Hetzner K3s API still TCP-refused.
4. **No image push to GHCR from this workstation.**
5. **Source store has no live repository wired in `src/index.js`** — by design for Sprint 5 (foundation-only). A future sprint will wire `configureSourceStoreWithPool({ pool: <real pg pool> })` once a DB is reachable.

## 10. NOT done

- ❌ Running migration 002 against any database (no DB reachable).
- ❌ Wiring a real pg pool into `configureSourceStoreWithPool` from `src/index.js`.
- ❌ Ingesting any Islamic content into the registry (deferred to a license-reviewed sprint).
- ❌ Answer generation — explicitly disabled.
- ❌ Any `kubectl apply`.
- ❌ `docker push` of any image to GHCR from this workstation.

## 11. Mock / stub / fake / placeholder

| Item | Location | Label |
|---|---|---|
| Source store wired but uninjected | `src/safety/source-store.js` | FAIL-CLOSED-BY-DESIGN — default returns `[]` |
| Sprint 5 ibadat route ignores valid sources | `src/routes/ibadat.js` | INTENTIONAL — `reason: 'answer_generation_not_enabled'` until later sprint |
| `sources.retrieval_configured` reads side-channel flag, not a real DB ping | `src/safety/source-store-status.js` | DESIGN-CHOICE — DB reachability lives in `database.connected` |
| K8s manifest image `:main` | `deployment/k3s/backend/sakina-backend-deployment.yaml` | UNPUBLISHED — tag exists only after backend-image-ci publishes |
| `host: sakina.ordinoxai.com`, TLS commented | `deployment/k3s/ingress/sakina-backend-ingress.yaml` | DNS + cert-manager placeholders |
| All `REPLACE_ME_*` secret values | `deployment/k3s/secrets/sakina-secrets.template.yaml` | TEMPLATE only |
| Migration 002 `INSERT` count | `backend/db/migrations/002_verified_islamic_sources.sql` | ZERO rows — by design |

## 12. Final truth

**SOURCE REGISTRY FOUNDATION + CITATION GATE VERIFIED — NOT DEPLOYED, NO LIVE DATABASE, NO RELIGIOUS CONTENT INGESTED.**

The full retrieval / validation / audit pipeline is wired and tested (54/54 cases). Answer generation is deliberately disabled. Migration 002 is committed but has not run anywhere. No production-ready, deployed, working, or verified runtime claim is made about cluster, database, or registry.
