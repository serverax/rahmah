# Sprint 49 — Ops Hardening Report

**Date:** 2026-05-14

## What changed this sprint

| File | Change |
|---|---|
| `deployment/k3s/monitoring/rahma-internal-health-check.yaml` | Probes extended: `/health` + `/ready` body capture + TCP probes for Postgres (5432) + Redis (6379) |
| `docs/ops/RAHMA_BACKUP_RESTORE_RUNBOOK.md` | NEW — list/restore/test-restore commands; no DSN echo; honest claim policy |
| `docs/ops/RAHMA_INTERNAL_HEALTHCHECK_RUNBOOK.md` | NEW — triage matrix; honesty rules; never installs Prometheus/Grafana silently |
| `docs/ops/RAHMA_INCIDENT_RESPONSE_RUNBOOK.md` | NEW — 8 likely incidents + step-by-step recovery; hard rules during every incident |

## What did NOT change (intentionally)

- Firewall / UFW / iptables / SSH / K3s service / Traefik / cert-manager / NetworkPolicy — untouched.
- Existing backup retention (14 days rolling) — left as is.
- CronJob schedules (02:15 UTC backup, 03:30 UTC security scan,
  */5 m health check) — left as is.
- Prometheus / Grafana / Alertmanager / Loki — not installed.

## Local checks

- `bash deployment/k3s/scripts/verify-rahma-manifests.sh` → expected PASS.
- `bash scripts/security/rahma-k8s-safety-scan.sh` → expected PASS.

## Operator action remaining

- Re-apply the updated health-check CronJob:
  `kubectl apply -f deployment/k3s/monitoring/rahma-internal-health-check.yaml`
- Re-apply the backup CronJob (no manifest change this sprint, but the
  runbook now exists).

## Honesty statement

These ops doc changes do NOT constitute a "monitoring stack". They are
durable on-call notes that match the cluster state the operator
verified internally. No alerting hook, no third-party dependency, no
firewall / network change.
