# Sakina K3s Staging Report

**Generated:** 2026-05-13
**Project:** `sakina-islamic-app`
**Target runtime:** self-hosted **K3s** on user-owned Hetzner / dedicated servers
**Author:** Claude Code (evidence-only mode)

---

## STATUS: PARTIAL — FILES ONLY

No `kubectl apply` was executed against any cluster. No namespace exists in any reachable cluster. No pods, PVCs, services, or ingresses were created. Only local repository artifacts were written, validated with `kubectl apply --dry-run=client` (no API call), and committed to git.

---

## 1. Git commit

A single foundational commit was created **after** this report was written; the commit hash is captured in the chat output that accompanies this file (and can be re-derived with `git -C F:/rahma log --oneline -1` against the committed state). The commit message is:

```
chore: add Sakina local K3s staging foundation
```

This commit includes every file in the file inventory below. No secret values, no API keys, no tokens were committed (verified via `rg` patterns; see section 14).

## 2. Git status

Captured BEFORE the first commit:

```
## No commits yet on main
?? .gitignore
?? README.md
?? ai-rag/
?? assets/
?? backend/
?? database/
?? deployment/
?? design/
?? docs/
?? github/
?? mobile-app/
?? scripts/
```

`reports/` is empty until this file is written, then it becomes tracked in the same commit as everything else.

`.claude/` is intentionally excluded by `.gitignore` (workstation-only Claude Code metadata).

## 3. Files changed (full inventory)

All paths relative to repo root `F:\rahma`:

```
.gitignore
README.md
ai-rag/README.md
assets/README.md
backend/README.md
backend/db/migrations/001_sakina_foundation.sql
backend/db/seeds/001_ibadat_categories.sql
database/README.md
deployment/README.md
deployment/k3s/backend/sakina-backend-deployment.yaml
deployment/k3s/backend/sakina-backend-service.yaml
deployment/k3s/ingress/sakina-backend-ingress.yaml
deployment/k3s/namespaces/sakina-ai-namespace.yaml
deployment/k3s/postgres/postgres-configmap.yaml
deployment/k3s/postgres/postgres-pvc.yaml
deployment/k3s/postgres/postgres-service.yaml
deployment/k3s/postgres/postgres-statefulset.yaml
deployment/k3s/secrets/sakina-secrets.template.yaml
design/README.md
docs/AI_FATWA_SAFETY_POLICY_AR.md
docs/CLAUDE_CODE_SPRINTS_AR.md
docs/DATABASE_DESIGN_AR.md
docs/PRODUCT_REQUIREMENTS_AR.md
docs/ROADMAP_AR.md
docs/UX_UI_DESIGN_AR.md
github/GIT_BRANCH_STRATEGY_AR.md
github/PULL_REQUEST_TEMPLATE.md
mobile-app/README.md
reports/SAKINA_K3S_STAGING_REPORT.md
scripts/k3s/delete-sakina-staging.sh
scripts/k3s/deploy-sakina-staging.sh
scripts/k3s/verify-sakina-k3s.sh
```

## 4. Commands executed

Read-only / local-only commands run during this work (verbatim, in execution order — some `echo` framing dropped for brevity):

```
kubectl version --client
kubectl config current-context
kubectl config get-contexts
kubectl get nodes
kubectl get storageclass
docker info --format '{{.ServerVersion}} / {{.OperatingSystem}}'
git --version ; node --version ; python --version ; flutter --version ; dart --version ; psql --version
git -C F:/rahma init
git -C F:/rahma branch -M main
mkdir -p (folder skeleton listed below)
ls -la (every k3s subdir to prove empty/populated state)

KUBECONFIG="$HOME/.kube/config-hetzner" kubectl version --request-timeout=10s
KUBECONFIG="$HOME/.kube/config-hetzner" kubectl cluster-info --request-timeout=10s
KUBECONFIG="$HOME/.kube/config-hetzner" kubectl get nodes -o wide --request-timeout=10s
KUBECONFIG="$HOME/.kube/config-hetzner" kubectl get storageclass --request-timeout=10s

kubectl apply --dry-run=client -f deployment/k3s/namespaces/sakina-ai-namespace.yaml
kubectl apply --dry-run=client -f deployment/k3s/postgres/
kubectl apply --dry-run=client -f deployment/k3s/backend/
kubectl apply --dry-run=client -f deployment/k3s/ingress/
kubectl apply --dry-run=client -f deployment/k3s/secrets/sakina-secrets.template.yaml

git -C F:/rahma check-ignore -v deployment/k3s/secrets/sakina-secrets.template.yaml
git -C F:/rahma status --untracked-files=all -s
rg "BEGIN [A-Z ]+PRIVATE KEY|-----BEGIN|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|sk-[0-9A-Za-z]{32,}|xox[bp]-" F:/rahma
```

**Zero mutating kubectl commands ran.** No `apply` without `--dry-run=client`, no `create`, no `delete`, no `patch`, no `exec` in any cluster.

## 5. Namespace status

```
$ kubectl get ns sakina-ai
Error from server (NotFound): namespaces "sakina-ai" not found
```

The namespace **does not exist in any reachable cluster**. The only configured kubectl context is `aks-iterlaw-we-prod` (Azure AKS production cluster for a different project, deliberately off-limits per HARD RULES). A second kubeconfig file exists at `~/.kube/config-hetzner` pointing to a Hetzner K3s endpoint, but its API server is unreachable from this workstation (see section 12 *Known blockers*).

## 6. Pods status

```
$ kubectl get all -n sakina-ai
No resources found in sakina-ai namespace.
```

No pods. No deployments. No statefulsets.

## 7. PVC status

```
$ kubectl get pvc -n sakina-ai
No resources found in sakina-ai namespace.
```

No PVCs. The Postgres StatefulSet would create one via `volumeClaimTemplates` once applied to a real K3s context.

## 8. Database status

Not deployed. Migration `001_sakina_foundation.sql` and seed `001_ibadat_categories.sql` exist locally but have not been executed against any database. The migration defines 20 tables and a `DEFERRABLE CONSTRAINT TRIGGER ibadat_answer_requires_source_ai` that enforces: **no `ibadat_answers` row with `blocked = FALSE` may exist without at least one linked `ibadat_answer_sources` row**.

## 9. Backend `/health` output

Not executed. No backend pod exists.

## 10. Backend `/ready` output

Not executed. No backend pod exists.

## 11. Ingress status

```
$ kubectl get ingress -n sakina-ai
No resources found in sakina-ai namespace.
```

Manifest `deployment/k3s/ingress/sakina-backend-ingress.yaml` exists locally with host `sakina.ordinoxai.com` and route `/api → sakina-backend:3000`. The TLS section is commented out — to be enabled only after cert-manager presence is confirmed on the target K3s cluster.

## 12. Known blockers

1. **No usable kubectl context.** The only active context (`aks-iterlaw-we-prod`) is an Azure AKS production cluster belonging to a different project; HARD RULES forbid any apply to it.
2. **Hetzner K3s API server unreachable.** `~/.kube/config-hetzner` exists with context `default` pointing to `https://138.201.253.245:6443`, but TCP connection is actively refused (`connectex: No connection could be made because the target machine actively refused it`). Possible causes: K3s server is down, firewall rule, IP changed, or workstation egress blocked.
3. **No container image yet for sakina-backend.** The deployment references `ghcr.io/REPLACE-ME/sakina-backend:0.0.0-PLACEHOLDER` — an intentionally non-existent image. The deployment will not pull until an operator-built image is pushed and the manifest is updated.
4. **No cert-manager confirmation.** TLS on the ingress remains commented out; cannot be enabled until cert-manager + a ClusterIssuer are confirmed on the target K3s cluster.
5. **No rendered secrets file.** Only the template exists. A rendered `deployment/k3s/secrets/sakina-secrets.yaml` (excluded by `.gitignore`) must be produced via SOPS / sealed-secrets / Vault before the deploy script will proceed (the deploy script aborts if `REPLACE_ME_` remains in the rendered file).

## 13. NOT done

- ❌ Namespace creation in a real K3s cluster.
- ❌ Postgres StatefulSet rollout.
- ❌ PVC binding.
- ❌ Backend Deployment rollout.
- ❌ Ingress admission by Traefik.
- ❌ Database migration execution.
- ❌ Seed loading.
- ❌ `/health` and `/ready` smoke tests.
- ❌ TLS certificate provisioning.
- ❌ Image build + push for `sakina-backend`.
- ❌ Secret rendering from secret store.
- ❌ Any Sprint 2..20 work from `docs/CLAUDE_CODE_SPRINTS_AR.md`.

## 14. Mock / stub / fake / placeholder components

Every placeholder is labelled in-file and listed here:

| File | What is placeholder | Why |
|---|---|---|
| `deployment/k3s/backend/sakina-backend-deployment.yaml` | `image: ghcr.io/REPLACE-ME/sakina-backend:0.0.0-PLACEHOLDER` | No real backend image exists yet. Deployment will fail to pull until updated. |
| `deployment/k3s/ingress/sakina-backend-ingress.yaml` | Host `sakina.ordinoxai.com`; TLS block commented out | DNS not configured; cert-manager presence not confirmed. |
| `deployment/k3s/secrets/sakina-secrets.template.yaml` | All values (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `OLLAMA_BASE_URL`) | Template file. Real values must come from the operator's secret store. |
| `deployment/k3s/postgres/postgres-pvc.yaml` | Whole file labelled `ALTERNATIVE / PLACEHOLDER` | StatefulSet creates its own PVC via `volumeClaimTemplates`; this standalone PVC is provided only for non-StatefulSet deployments. |
| `docs/CLAUDE_CODE_SPRINTS_AR.md` references | `assets/animations/tasbih.riv`, `assets/audio/adhan_*.mp3`, `database/quran/quran.sqlite`, `database/quran/tafsir_muyassar.sqlite`, all `mobile-app/lib/...`, `backend/app/...`, `ai-rag/...` paths | Planned filenames for future sprints, not yet produced. |
| `docs/UX_UI_DESIGN_AR.md` reference | `design/figma/islamic-ai-mobile-app.fig` | Placeholder for the Figma file (not yet produced). |
| `backend/db/migrations/001_sakina_foundation.sql` | `CREATE EXTENSION IF NOT EXISTS vector` line is commented out | Not enabled until pgvector is required by Sprint 14 (knowledge base). |

**No fake secret values are committed.** All placeholders use the explicit `REPLACE_ME_*` prefix. Secret scan results:

```
$ rg "BEGIN [A-Z ]+PRIVATE KEY|-----BEGIN|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|sk-[0-9A-Za-z]{32,}|xox[bp]-" F:/rahma
No matches found
```

## What would unblock deployment

1. Restore K3s API reachability on `~/.kube/config-hetzner` (or provide an alternative K3s kubeconfig). Verify with `kubectl cluster-info` against that kubeconfig.
2. Confirm the context returned by `kubectl config current-context` does NOT contain `aks`, `prod`, or `iterlaw` (the deploy script enforces this gate).
3. Build and push a `sakina-backend` container image; update the deployment image tag.
4. Render `deployment/k3s/secrets/sakina-secrets.yaml` (excluded by `.gitignore`) from the operator's secret store.
5. Run `scripts/k3s/deploy-sakina-staging.sh` and capture the verify script output for the next iteration of this report.

---

## Truthful claims

- ✅ No production database touched.
- ✅ No mutating `kubectl` command executed.
- ✅ No external LLM call made.
- ✅ No secret values printed or committed.
- ✅ Azure / AKS is **not** the active runtime target. Target is self-hosted K3s.
- ✅ Sakina active K3s namespace is `sakina-ai` (staging-first).
- ✅ Canonical names preserved: **IterLaw** (UK employment-law AI), **OrdinoxAI** (platform brain). No use of "RightsNow". No invented namespaces.
- ✅ Every file listed in section 3 exists on disk and was validated with `kubectl apply --dry-run=client` (client-only, no API contact).

## Final truth

**FILES ONLY** — and committed to git. Nothing deployed.
