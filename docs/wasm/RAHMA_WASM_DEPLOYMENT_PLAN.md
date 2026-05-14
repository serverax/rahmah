# Rahma — WASM Deployment Plan

**Date:** 2026-05-14
**Status:** plan. Real runtime images NOT YET BUILT.

## Future image names (placeholders today)

| Module | Future image |
|---|---|
| fatwa-policy-gate | `ghcr.io/serverax/rahmah/rahma-fatwa-policy-gate-wasm:latest` |
| quran-hadith-citation | `ghcr.io/serverax/rahmah/rahma-quran-hadith-citation-wasm:latest` |
| child-safety | `ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest` |
| content-rule-engine | `ghcr.io/serverax/rahmah/rahma-content-rule-engine-wasm:latest` |

The K3s manifests at `deployment/k3s/wasm/rahma-wasm-placeholders.yaml`
already use the correct **service** names that match the live cluster
(`rahma-fatwa-policy-gate-wasm`, etc.). The `image:` field still points
at `nginxinc/nginx-unprivileged:1.27-alpine` because the real runtime
images do not exist yet.

## Build pipeline (planned)

1. `.github/workflows/rahma-wasm-images.yml` runs after
   `rahma-wasm-build.yml` succeeds.
2. For each of the 4 crates:
   - Pull the `.wasm` artefact from the `rahma-wasm-build` upload.
   - Build a small wrapper image (`wasm/<crate>/Dockerfile`).
   - Push to `ghcr.io/serverax/rahmah/rahma-<crate>-wasm:latest` and
     `:sha-<commit>`.

## Rollout (operator-side, after images exist)

Use the existing `deploy-rahma-api-image.sh` as a template. A new
script `deployment/k3s/scripts/deploy-rahma-wasm-image.sh` (NOT WRITTEN
YET) will take `<service-name>` + `<image-ref>` and run
`kubectl set image` against the matching Deployment in `rahma-ai`.

## Honesty record

The `RAHMA_WASM_LIMITATIONS.md` doc remains the source of truth: until
real runtime images are signed AND deployed AND the JS-vs-WASM parity
test suite is green, the WASM modules are foundation-only and the JS
policy implementations remain the enforcing path.

## Forbidden during rollout

- Public exposure of any WASM Service.
- Granting WASI host syscalls beyond default.
- Reading or writing files outside the wrapper's `/tmp`.
- Skipping signature verification on image pull.
