# Sprint 53 — Real Secrets Preparation Package

**Date:** 2026-05-14

## What ships

- `deployment/k3s/scripts/create-rahma-secrets-from-env.sh` — env-driven secret creator/updater.
- `docs/security/RAHMA_SECRET_ROTATION_RUNBOOK.md` — calendar + rotation procedure for each secret family.

## Behaviour

- Reads required env vars (13 of them) from the operator's current shell.
- **Refuses** any missing value.
- **Refuses** placeholder strings (`CHANGE_ME`, `REPLACE_ME`, `PLACEHOLDER`).
- Shape-checks values without echoing them.
- Uses `kubectl create secret … --dry-run=client -o yaml | kubectl apply -f -` so the secret is created on first run AND idempotently updated thereafter.
- Verifies the result by **name only** (no value fetch).
- Supports `--dry-run` for static-only validation anywhere.

## Live apply status: **OPERATOR-PENDING**

Local kubectl context is forbidden. Operator runs the live script on
`master-of-brains` with the required env vars set in the current shell.

## Honesty record

- No secret values are written to disk by this script.
- No secret values are echoed by this script.
- The repo continues to carry only `*.template.yaml` files with `REPLACE_ME` placeholders for the same secrets.
- `rahma-security-scan` CI workflow continues to enforce "no real secrets committed".
