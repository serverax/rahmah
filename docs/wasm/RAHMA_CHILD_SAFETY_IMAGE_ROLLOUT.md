# Rahma — child-safety WASM image rollout

**Audience:** operator on master-of-brains.

## Image

`ghcr.io/serverax/rahmah/rahma-child-safety-wasm:latest`

Build pipeline: `.github/workflows/rahma-child-safety-image.yml` —
runs Node tests then builds + pushes the image on every change under
`wasm/child-safety/**`.

## Operator commands

```bash
# 1. Confirm CI built the image for the commit you intend to ship.
gh run list -R serverax/rahmah --workflow rahma-child-safety-image.yml --limit 3

# 2. Static validation (safe anywhere).
bash deployment/k3s/scripts/deploy-rahma-child-safety-runtime.sh --dry-run

# 3. Live rollout (on master-of-brains with Sakina-safe kubeconfig).
bash deployment/k3s/scripts/deploy-rahma-child-safety-runtime.sh
```

The script:

1. Refuses forbidden kubectl contexts.
2. Validates the image ref shape.
3. Applies `deployment/k3s/wasm/rahma-child-safety-runtime.yaml`
   (replaces the placeholder Deployment; **reuses the existing
   `rahma-child-safety-wasm` Service**).
4. Waits up to 180s for rollout.
5. Probes `/health` + `POST /evaluate` from a one-shot pod.
6. Refuses if any Rahma ingress has appeared.

## Honesty contract

- The HTTP contract is identical to the in-process prototype.
- `runtime_mode` field in `/health` distinguishes the running flavour.
- Real wasmtime/wasmedge load remains a later sprint.
- Cluster rollout is OPERATOR-PENDING until the operator captures the
  probe output in `reports/RAHMA_WASM_CHILD_SAFETY_LIVE_<date>.md`.
