# Sprint 66 — child-safety runtime image package

**Date:** 2026-05-14

## What ships

- `wasm/child-safety/server/Dockerfile` — multi-stage Node 20-alpine, non-root user `wasm` (UID 10005), HEALTHCHECK against `/health`.
- `.github/workflows/rahma-child-safety-image.yml` — runs `npm test` first, then builds + pushes `ghcr.io/serverax/rahmah/rahma-child-safety-wasm` on push to `main`.
- `deployment/k3s/wasm/rahma-child-safety-runtime.yaml` — real-image Deployment that REPLACES the placeholder; reuses the existing Service name.
- `deployment/k3s/scripts/deploy-rahma-child-safety-runtime.sh` — image-ref shape check, forbidden-context refusal, dry-run support, `/health` + `/evaluate` probe, post-check no ingress.
- `docs/wasm/RAHMA_CHILD_SAFETY_IMAGE_ROLLOUT.md` — operator guide.

## Live cluster rollout status: **OPERATOR-PENDING**

Local kubectl context is forbidden. CI on `main` builds the image; the
operator runs the deploy script on master-of-brains.

## Honesty contract

- The HTTP-bridge implementation continues to run the JS port
  in-process. The future wasmtime/wasmedge swap does not change the
  HTTP contract.
- Image: NOT YET BUILT (CI run pending after push).
- Cluster rollout: NOT YET RUN.
- `/api/quran|hadith|dua` content: unaffected (separate pipeline).
