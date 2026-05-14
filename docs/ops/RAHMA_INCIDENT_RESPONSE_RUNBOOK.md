# Rahma — Incident Response Runbook

**Date:** 2026-05-14
**Audience:** operator on master-of-brains.

This runbook covers the most likely Rahma-side incidents. None of the
steps below modify firewall / UFW / iptables / SSH / K3s service /
Traefik / cert-manager / NetworkPolicy. If the incident demands such
changes, escalate offline to the cluster owner.

## 1. `rahma-api` Deployment is in CrashLoopBackOff

```bash
kubectl -n rahma-api get pods
kubectl -n rahma-api logs deploy/rahma-api --tail=100
kubectl -n rahma-api describe deploy rahma-api | tail -60
```

Common causes + fixes:

- **Missing `rahma-api-secrets`** → recreate the Secret via the
  operator runbook; then `kubectl -n rahma-api rollout restart deployment/rahma-api`.
- **DATABASE_URL unreachable** → check Postgres pod status; if
  Postgres is down, fix Postgres first (the API stays up but blockers
  list grows).
- **Image pull error** → check `imagePullSecrets`; the rahma-api image
  is on public GHCR so no secret should be needed.

Rollback to the previous revision:

```bash
kubectl -n rahma-api rollout undo deployment/rahma-api
kubectl -n rahma-api rollout status deployment/rahma-api --timeout=60s
```

## 2. `rahma-postgres` StatefulSet pod not Ready

```bash
kubectl -n rahma-data describe statefulset rahma-postgres
kubectl -n rahma-data logs pod/rahma-postgres-0 --tail=100
```

If the pod is healthy but PVC is full:

- Add to `kubectl -n rahma-data get pvc` to check usage.
- Operator decides: expand the PVC, archive backups, or compact data.

NEVER `kubectl delete statefulset rahma-postgres --cascade=foreground`
in a panic — the volume retention policy dictates whether the PVC is
preserved. Use `kubectl scale statefulset rahma-postgres --replicas=0`
to stop, debug, then `--replicas=1` to resume.

## 3. `rahma-redis` failing

Redis is for cache only — its outage does NOT lose data. Backend
re-derives from Postgres. Restart with:

```bash
kubectl -n rahma-data delete pod rahma-redis-0
```

If Redis is permanently mis-sized, the operator may bump
`memory.limits` on the StatefulSet via the manifest. Reapply with
`kubectl apply -f deployment/k3s/redis/rahma-redis-statefulset.yaml`.

## 4. WASM placeholder pods restart loops

Until real runtime images ship, the WASM Services run
`nginx-unprivileged` placeholders. Restart loops here are usually
node-level (memory pressure, image pull). Real fix lands when
`docs/wasm/RAHMA_WASM_DEPLOYMENT_PLAN.md` is executed.

## 5. Backup CronJob failure

```bash
kubectl -n rahma-data get cronjob rahma-postgres-backup
LATEST_BK=$(kubectl -n rahma-data get jobs -l job-name=rahma-postgres-backup -o jsonpath='{.items[-1:].metadata.name}')
kubectl -n rahma-data logs job/"$LATEST_BK" --tail=200
```

Common causes:

- PVC out of space → free old backups (the CronJob already prunes
  `mtime +14`; if filling up faster than retention, bump retention OR
  prune harder).
- Postgres unreachable from `rahma-data` (should be impossible since
  it's the same namespace) → check Postgres status.

## 6. Real image rollout went bad

See `docs/infra/RAHMA_REAL_IMAGE_DEPLOYMENT_RUNBOOK.md` for the
rollback path:

```bash
kubectl -n rahma-api rollout undo deployment/rahma-api
```

## 7. Suspected unauthorised access

1. Immediately revoke the suspect role: remove the email hash from
   `SHEIKH_ALLOWED_EMAIL_HASHES` / `ADMIN_ALLOWED_EMAIL_HASHES` in the
   `rahma-api-secrets` Secret.
2. Roll the Deployment so the new env is in process:
   `kubectl -n rahma-api rollout restart deployment/rahma-api`.
3. Query the `audit_events` table for the suspect `actor_email_hash`:
   `SELECT * FROM audit_events WHERE actor_email_hash = '<hex>' ORDER BY occurred_at DESC LIMIT 200;`
4. Capture the rows into
   `reports/RAHMA_INCIDENT_<date>.md` (operator-only).
5. Rotate the `JWT_SECRET` + `SESSION_SECRET` to invalidate any cached
   tokens.

## 8. Forbidden action attempted from this repo

If a script attempts `ufw default deny`, `iptables -P INPUT DROP`,
`kubectl apply` against `aks-iterlaw-we-prod`, etc.:

- `scripts/security/rahma-k8s-safety-scan.sh` blocks the commit.
- `scripts/guard/verify-rahma-scope.sh` blocks the commit.
- CI workflow `rahma-security-scan` blocks the merge.

If somehow a forbidden action lands on the cluster, the operator
captures the event in
`reports/RAHMA_BOUNDARY_VIOLATION_<date>.md` and reverts immediately.

## Hard rules during ANY incident

- NEVER touch firewall / UFW / iptables / SSH / K3s service / Traefik /
  cert-manager / NetworkPolicy from this repo.
- NEVER paste a secret into chat / pastebin / ticket.
- NEVER use the forbidden kubectl contexts.
- NEVER delete `audit_events`.

## After the incident

Write `reports/RAHMA_INCIDENT_<YYYY-MM-DD>.md` with:

- timeline,
- captured kubectl logs (redacted),
- root cause,
- corrective steps applied,
- preventive steps queued.
