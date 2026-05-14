# Sprint 51 — API Image Rollout Package

**Date:** 2026-05-14

## What this sprint adds

- `--dry-run` mode in `deployment/k3s/scripts/deploy-rahma-api-image.sh`. Static-only; safe to run anywhere; no kubectl mutation.
- Image-ref shape check (`^ghcr\.io/serverax/rahmah/rahma-api(:[A-Za-z0-9._-]+)?$`).
- Repo-side ingress refusal — script bails if `deployment/k3s/ingress/*.yaml` exists.
- Timestamped local report on successful live rollout (`reports/RAHMA_API_ROLLOUT_<UTC>.md`).
- `docs/infra/RAHMA_API_IMAGE_ROLLOUT_OPERATOR_GUIDE.md` — single operator-facing reference.
- Moved the legacy `deployment/k3s/ingress/sakina-backend-ingress.yaml` (placeholder host) to `docs/future/sakina-backend-ingress.yaml.future`. Rahma carries NO public ingress under `deployment/k3s/` now.

## Dry-run output (this workstation)

```
Target image: ghcr.io/serverax/rahmah/rahma-api:latest
Mode: DRY-RUN (no kubectl mutation)
[deploy] OK: image ref matches expected pattern
[deploy] OK: rahma-api.yaml present in repo
[deploy] OK: no public Rahma ingress in repo
[deploy] OK: DRY-RUN complete — no kubectl mutation performed
==== dry-run validated for image: ghcr.io/serverax/rahmah/rahma-api:latest ====
```

## Live rollout status: **OPERATOR-PENDING**

Local kubectl context: `aks-iterlaw-we-prod` → forbidden by saved
memory rule. Operator runs the live rollout on `master-of-brains`.

## Image to roll

`ghcr.io/serverax/rahmah/rahma-api:latest`
Last known digest (from CI run 25839808824):
`sha256:8e72b24e86597c99870ade24299733b7d3cbfff8d421fe64f66bf62fb0f43ced`

## Honesty record

When the live rollout is executed on master-of-brains, the script
auto-writes `reports/RAHMA_API_ROLLOUT_<UTC>.md` capturing the
internal probe outputs. Until that file appears in the repo, no
"real backend live on cluster" claim is made elsewhere.
