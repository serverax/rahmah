# Sprint 52 — Ops Apply Package

**Date:** 2026-05-14

## What ships

- `deployment/k3s/scripts/apply-rahma-ops-updates.sh` — context-gated, dry-run-capable apply for ConfigMap + 3 CronJobs.
- `docs/ops/RAHMA_OPERATOR_APPLY_OPS_UPDATES.md` — operator runbook.

## Static-mode output (this workstation)

```
[ops-apply] OK: manifest present: deployment/k3s/config/rahma-platform-config.yaml
[ops-apply] OK: manifest present: deployment/k3s/backup/rahma-postgres-backup.yaml
[ops-apply] OK: manifest present: deployment/k3s/monitoring/rahma-internal-health-check.yaml
[ops-apply] OK: manifest present: deployment/k3s/security/rahma-security-scan-placeholder.yaml
[ops-apply] OK: no forbidden / placeholder domains in ops manifests
[ops-apply] OK: no deployment/k3s/ingress/*.yaml present
[ops-apply] OK: no rahma-web / rahma-admin manifests in repo
==== ops-apply DRY-RUN validated ====
```

## Live apply status: **OPERATOR-PENDING**

Local kubectl context is forbidden. Operator runs the live apply on
`master-of-brains`.
