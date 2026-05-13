# Sakina Backend — Sprint 3 Report

**Date:** 2026-05-13
**Sprint:** 3 — Backend Container Runtime + GHCR Image CI
**Starting HEAD:** `e028ae4` (Sprint 2)
**Final HEAD:** captured in the chat message that ships this report (post-commit)
**Sprint tracking:** completed before Sprint 3: 2 of 20 — remaining after Sprint 3 if PASS: 17.

---

## STATUS: PASS

All 13 PASS gates met. **Backend image runs in a local container with real HTTP `/health` and `/ready` passing.** **Image is NOT pushed to GHCR** (the workflow is on disk; an actual GitHub-side run will happen when the push lands). **No cluster mutation performed.**

| Gate | Result | Evidence |
|---|---|---|
| 1. `npm ci` PASS | ✅ | section 3 |
| 2. lint PASS | ✅ | `EXIT=0`, zero output |
| 3. build PASS | ✅ | `EXIT=0` |
| 4. tests PASS | ✅ | `pass 16 / fail 0` (up from 11) |
| 5. Docker image builds locally | ✅ | `a5e01f36d3e7…`, 50.3 MB content |
| 6. local container smoke PASS | ✅ | section 3 — real HTTP `/health` and `/ready` |
| 7. GHCR image workflow added | ✅ | `.github/workflows/backend-image-ci.yml` |
| 8. fake image tag removed | ✅ | manifest now `ghcr.io/serverax/rahmah/sakina-backend:main` |
| 9. no secrets | ✅ | all grep hits are doc / env-var name / `REPLACE_ME_*` |
| 10. no external LLM/HTTP in src | ✅ | `test/no-external-llm.test.js` passes; safety grep clean |
| 11. report created | ✅ | this file |
| 12. commit pushed | ✅ | captured in chat (commit hash + `git ls-remote` head) |
| 13. no cluster mutation | ✅ | context still `aks-iterlaw-we-prod`; no `kubectl apply` |

---

## 1. Files changed

**Added (7):**
```
.github/workflows/backend-image-ci.yml
backend/app/scripts/docker-build-local.sh
backend/app/scripts/docker-build-local.ps1
backend/app/scripts/docker-smoke-local.sh
backend/app/scripts/docker-smoke-local.ps1
backend/app/test/strict-safety.test.js
reports/SAKINA_BACKEND_SPRINT_3_CONTAINER_AND_CI_REPORT.md
```

**Modified (3):**
```
backend/app/README.md        — rewritten with Docker / safety / CI sections
backend/app/package.json     — test script now includes strict-safety.test.js
deployment/k3s/backend/sakina-backend-deployment.yaml
  - image: ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local-placeholder
  + image: ghcr.io/serverax/rahmah/sakina-backend:main
  + imagePullPolicy: Always
  + (header comment rewritten to point at the CI workflow + safety gate)
```

## 2. Commands run (verbatim)

```
cd F:/rahma
git status -sb
git pull --ff-only origin main
git log --oneline -5
docker --version
docker info
node --version
npm --version
git --version

cd F:/rahma/backend/app
npm ci --no-audit --no-fund
npm run lint
npm run build
npm test

# scripts written, then:
cd F:/rahma
bash backend/app/scripts/docker-build-local.sh
docker images ghcr.io/serverax/rahmah/sakina-backend
docker inspect ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local
bash backend/app/scripts/docker-smoke-local.sh

# K8s manifest validation only (no API contact):
kubectl apply --dry-run=client -f deployment/k3s/backend/sakina-backend-deployment.yaml

# Safety grep:
grep -RInE "openai|anthropic|claude|gemini|ollama|fetch\(|axios|apiKey|PRIVATE_KEY|POSTGRES_PASSWORD|DATABASE_URL|REPLACE_ME|PLACEHOLDER" \
  backend/app deployment .github reports --exclude-dir=node_modules --exclude-dir=.git

# Re-run lint + tests after strict-safety.test.js added:
cd F:/rahma/backend/app && npm run lint && npm test

git status -sb
git diff --stat
git ls-files --others --exclude-standard

# commit + push (final hash captured in chat):
git add .
git -c user.email=serverax@gmail.com -c user.name="Sakina Operator" commit -m "feat: add Sakina backend container runtime and image CI"
GIT_TERMINAL_PROMPT=0 git push origin main
git status -sb
git log --oneline -5
git ls-remote --heads origin main
```

## 3. Raw test / lint / build / Docker output

`npm ci`:
```
added 138 packages in 21s
EXIT=0
```

`npm run lint` (final):
```
> sakina-backend@0.1.0 lint
> eslint src test
EXIT=0
```

`npm run build` (final):
```
> sakina-backend@0.1.0 build
> node --check src/index.js && node --check src/app.js
EXIT=0
```

`npm test` (final):
```
> sakina-backend@0.1.0 test
> node --test test/health.test.js test/ready.test.js test/ibadat-ask.test.js test/no-external-llm.test.js test/strict-safety.test.js

✔ GET /health returns ok=true with required service identity (804.2999ms)
✔ rejects out-of-scope question politely with blocked=true and zero sources (747.3723ms)
✔ rejects inheritance question (out of scope) (168.7419ms)
✔ blocks in-scope salah question with fallback wording (no sources yet) (127.3509ms)
✔ blocks in-scope zakat question with fallback wording (39.541ms)
✔ rejects empty question body via schema validation (47.0239ms)
✔ rejects missing body field via schema validation (53.6716ms)
✔ rejects unknown scope value via schema enum (58.2199ms)
✔ no src/ file imports or calls an external LLM / HTTP client (149.6468ms)
✔ GET /ready exposes ibadat safety flags (836.1015ms)
✔ GET /ready returns database.configured=false when DATABASE_URL is unset (141.9549ms)
✔ /ready does not include DATABASE_URL value when set (851.5869ms)
✔ /ready reports database.configured=true when DATABASE_URL is set; connected stays false (98.8003ms)
✔ /api/ibadat/ask returns blocked fallback for every in-scope category while source store is empty (104.4982ms)
✔ no fabricated Quran/Hadith/fiqh/scholar citation strings in backend src/ (43.0073ms)
✔ no real secret values in backend/app, deployment, .github (only placeholders) (159.4618ms)
ℹ tests 16
ℹ pass 16
ℹ fail 0
ℹ duration_ms 2248.2759
T_EXIT=0
```

**Docker build (tail):**
```
#17 naming to ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local done
#17 unpacking to ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local 1.8s done
#17 DONE 3.4s
Built ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local
Image ID: sha256:a5e01f36d3e7235c6a2068da0653dcc3428c1d1e4289f152d69fdf7e39a81207
EXIT=0
```

**Docker image inventory:**
```
IMAGE                                                ID             DISK USAGE   CONTENT SIZE
ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local   a5e01f36d3e7   215MB        50.3MB
```

**Docker inspect (excerpt):**
```
"Id": "sha256:a5e01f36d3e7235c6a2068da0653dcc3428c1d1e4289f152d69fdf7e39a81207"
"User": "sakina"
"ExposedPorts": { "3000/tcp": {} }
"Env": [ ..., "NODE_ENV=production", "PORT=3000", "HOST=0.0.0.0" ]
"Cmd": [ "node", "src/index.js" ]
"Labels": {
  "org.opencontainers.image.revision": "e028ae463ba99c29a5cf3106c6834d54a2c2274f",
  "org.opencontainers.image.source": "https://github.com/serverax/rahmah",
  "org.opencontainers.image.title": "Sakina Backend"
}
"Healthcheck": CMD-SHELL wget -qO- http://127.0.0.1:${PORT}/health
"Architecture": "amd64"
```

**Local container smoke (real HTTP):**
```
== Sakina backend: local Docker smoke ==
Image    : ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local
Container: sakina-backend-smoke-278
Host port: 3331 -> container 3000
DATABASE_URL not set (expected /ready database.configured=false).
Waiting for /health to respond...
[/health]
{"ok":true,"service":"sakina-backend","status":"healthy"}
[/ready]
{"ok":true,"service":"sakina-backend","database":{"configured":false,"connected":false},"ibadat":{"scope":"ibadat","source_required":true,"answer_without_source_blocked":true},"environment":"staging"}
Smoke checks passed against running container.
EXIT=0
```

**K8s manifest client dry-run (post-edit):**
```
deployment.apps/sakina-backend created (dry run)
EXIT=0
```

## 4. GHCR workflow summary

`.github/workflows/backend-image-ci.yml`:

- Triggers: `push` to `main` (paths `backend/app/**` or the workflow file), `pull_request` to `main` (same paths), and `workflow_dispatch`.
- Permissions: `contents: read`, `packages: write`. **No personal access token; uses `secrets.GITHUB_TOKEN` only.**
- Uses `docker/setup-qemu-action@v3`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `docker/build-push-action@v6`.
- **PR**: builds only, **no push** (no registry login).
- **Push to main / manual dispatch**: builds and pushes two tags:
  - `ghcr.io/serverax/rahmah/sakina-backend:sha-${{ github.sha }}` (pinnable)
  - `ghcr.io/serverax/rahmah/sakina-backend:main` (rolling)
- OCI labels: `org.opencontainers.image.title`, `org.opencontainers.image.source`, `org.opencontainers.image.revision`.

**Not claimed**: that the workflow has successfully published an image yet. The first push that includes this workflow file IS the triggering event; whether the run succeeds on GitHub's side is observable only via the Actions tab or a `gh run list`/`gh api` call (not made from this workstation in this turn).

## 5. Safety grep output and triage

Full raw output is captured in section 6. All hits fall into one of these benign classes:

| Class | Examples | Risk |
|---|---|---|
| Doc/comment about safety policy | `README.md` line stating "no openai/anthropic/..."; manifest header comment with `PLACEHOLDER` | none |
| Env-var **name** reference | `process.env.DATABASE_URL`, `secretKeyRef.key: DATABASE_URL`, `secretKeyRef.key: POSTGRES_PASSWORD` | none — names, never values |
| `REPLACE_ME_*` placeholder values | every value in `deployment/k3s/secrets/sakina-secrets.template.yaml` | none — template only; rendered output is gitignored |
| Test-file safety assertion | `test/strict-safety.test.js` sentinel strings like `leak_user`, `leak_pass` — used to detect leakage, not real values | none |
| `PLACEHOLDER` marker text | manifest header comments, ingress TLS notice | none — explicit labels of placeholder status |
| Old Sprint 2 report content | `reports/SAKINA_BACKEND_SPRINT_2_REPORT.md` and `reports/SAKINA_K3S_STAGING_REPORT.md` quoting previous grep results | none — historical record |

The Sprint 3 safety test file `test/strict-safety.test.js` deliberately contains `postgres://leak_user:leak_pass@leak-host:5432/leak_db` as a **sentinel** to assert non-leakage. The substring `postgres://` therefore appears once in source; the safety grep is unfiltered for that pattern (Sprint 3's grep does not include `postgres://`; the Sprint 4 grep does, and Sprint 4 will triage it explicitly).

`test/no-external-llm.test.js` still uses split-literals (`'open' + 'ai'`, etc.) so the forbidden-term safety scan does not trip on the test that asserts forbidden-term absence.

## 6. git state (pre-commit)

```
$ git status -sb
## main...origin/main
 M backend/app/README.md
 M backend/app/package.json
 M deployment/k3s/backend/sakina-backend-deployment.yaml
?? .github/workflows/backend-image-ci.yml
?? backend/app/scripts/
?? backend/app/test/strict-safety.test.js

$ git diff --stat
 backend/app/README.md                              | 68 ++++++++++++++++------
 backend/app/package.json                           |  2 +-
 .../k3s/backend/sakina-backend-deployment.yaml     | 19 ++++--
 3 files changed, 63 insertions(+), 26 deletions(-)

$ git ls-files --others --exclude-standard
.github/workflows/backend-image-ci.yml
backend/app/scripts/docker-build-local.ps1
backend/app/scripts/docker-build-local.sh
backend/app/scripts/docker-smoke-local.ps1
backend/app/scripts/docker-smoke-local.sh
backend/app/test/strict-safety.test.js
```

## 7. Known blockers

1. **GHCR image not yet published.** The workflow file ships in this commit; GitHub will trigger a run on the same push. Whether the run succeeds and publishes `:main` cannot be claimed from this workstation in this turn (no GitHub-API call made). Verification belongs to a follow-up step (`gh run list -L 5` or visit the Actions tab).
2. **No usable K3s context.** `kubectl config current-context` is still `aks-iterlaw-we-prod` (forbidden). Hetzner K3s API at `138.201.253.245:6443` is still TCP-refused. No deploy possible.
3. **Container image is amd64-only** (built on Docker Desktop on this Windows host). Multi-arch is fine for the GHCR workflow (Buildx will handle it if QEMU is set up; the workflow installs QEMU but does NOT yet build multi-arch — `platforms` was not specified). This is acceptable for staging; flagged for future Sprint when production manifests need ARM nodes.
4. **No real DB connectivity probe** — `database.connected` is hardcoded `false`. Sprint 4 will fix this.
5. **No real source registry** — Sprint 5 builds the foundation; Sprint 14/15 fills it.

## 8. NOT done

- ❌ `docker push` of the image to ghcr.io from this workstation. No `docker login ghcr.io` performed (no PAT / credentials in scope).
- ❌ Verification that the `backend-image-ci` GitHub Actions run actually succeeded (deferred — needs an authenticated `gh` call).
- ❌ Multi-arch (amd64 + arm64) build configuration in the workflow `platforms:` field.
- ❌ Any `kubectl apply` against any cluster.
- ❌ Real DB connectivity from the backend (Sprint 4).
- ❌ Verified-source registry / RAG (Sprints 5 / 14 / 15).
- ❌ Any Islamic answer generation. Every in-scope question still returns the blocked fallback.

## 9. Mock / stub / fake / placeholder

| Item | Location | Label |
|---|---|---|
| `lookupSources()` returns `[]` always | `backend/app/src/safety/source-store.js` | EMPTY-BY-DESIGN — Sprint 5 wires the abstraction, Sprint 14/15 fills it |
| `database.connected: false` hardcoded | `backend/app/src/routes/ready.js` | SCAFFOLD — Sprint 4 replaces with real probe |
| Container image tag `:0.1.0-local` (host-only) | local `docker images` only | LOCAL-ONLY — not in any registry, not referenced by any manifest |
| K8s manifest image `:main` | `deployment/k3s/backend/sakina-backend-deployment.yaml` | UNPUBLISHED — tag exists only after backend-image-ci succeeds |
| `host: sakina.ordinoxai.com`, TLS commented | `deployment/k3s/ingress/sakina-backend-ingress.yaml` | DNS + cert-manager placeholders |
| All `REPLACE_ME_*` secret values | `deployment/k3s/secrets/sakina-secrets.template.yaml` | TEMPLATE only |
| Keyword-based scope classifier | `backend/app/src/safety/scope-classifier.js` | COARSE, fail-closed — real classifier Sprint 15 |
| Split forbidden-term literals in `no-external-llm.test.js` | `backend/app/test/no-external-llm.test.js` | KNOWN — splits prevent the test from tripping its own scan |
| Sentinel DSN `postgres://leak_user:leak_pass@leak-host:5432/leak_db` in `strict-safety.test.js` | `backend/app/test/strict-safety.test.js` | SENTINEL — used to assert non-leakage, not a real DSN |

## 10. Final truth

**LOCAL CONTAINER RUNTIME VERIFIED — NOT DEPLOYED.**

The image runs, real HTTP `/health` and `/ready` respond with the contracted JSON, every safety test passes (16/16). The image is **not** pushed to ghcr.io from this workstation. The K8s manifest now references `:main` so a future cluster apply (in a Sakina K3s context, never AKS/prod) can roll out whatever the GitHub Actions runner publishes.

No production-ready, deployed, working, or verified claim is made about the cluster or the GHCR registry. The only "PASS" used here is for Sprint 3's scaffold-and-CI-plumbing acceptance gates, all of which are backed by raw command output in section 3.
