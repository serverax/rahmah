# Rahma — Backup & Restore Readiness

Sprint 14 deliverable. Scope: Rahma/Sakina only. **No real backup has ever been run** as of this commit — this document is the runbook the operator follows once a real K3s deployment exists. Until a successful restore drill is performed, nothing in this file may be cited as proof that backups work.

## What to back up

| Tier | What | Where | Frequency |
|---|---|---|---|
| Database | `rahma-postgres` PVC, full SQL dump | MinIO bucket `rahma-backups/postgres/` | hourly + daily + weekly |
| Object storage | MinIO bucket data | Off-cluster S3-compatible mirror | nightly |
| Cache | Redis is treated as ephemeral; no backup | — | n/a |
| Cluster manifests | The repo at `serverax/rahmah` is the source of truth | GitHub | every commit |
| Kubernetes Secrets | Operator vault (1Password / Bitwarden / Vault) — **never** committed | Operator-owned | on rotation |
| Audit tables | `sakina_sheikh_audit_log`, `islamic_rag_query_audit`, `privacy_audit_log`, `charity_transparency_logs` — included in Postgres dump | Same as DB | hourly |

## Database backup command (template — operator-driven)

```
# Run as a Kubernetes CronJob (not yet shipped) or operator-on-demand:
kubectl -n rahma-data exec rahma-postgres-0 -- \
  bash -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip' \
  > rahma-pg-$(date -u +%Y%m%dT%H%M%SZ).sql.gz

# Upload to MinIO:
mc cp rahma-pg-*.sql.gz rahma/rahma-backups/postgres/
```

Notes:
- `mc` is the MinIO client; `mc alias set rahma http://rahma-minio.rahma-data.svc.cluster.local:9000 …` first.
- Real passwords come from `kubectl get secret -n rahma-data rahma-postgres-secret …`. Operator must NEVER paste them into shell history; use `read -s` or a secret-manager helper.

## PVC backup note

For each PVC in `rahma-data`:

```
kubectl -n rahma-data get pvc
```

If the cluster uses K3s default `local-path` provisioner, PVCs live on a single node and require node-level snapshots if the operator wants disk-level rollback. The recommended path is to rely on application-level dumps (Postgres `pg_dump`, MinIO `mc mirror`) rather than disk snapshots.

## Secrets backup warning

- **Never** commit a real Kubernetes Secret to git.
- **Never** echo real secret values into a backup file path / filename.
- Real Secret values live in the operator's password manager. The backup of "the Secret" is the audit log + the password manager, not a YAML file.

## Restore checklist

1. Provision a fresh K3s cluster (or re-use the existing one with empty namespaces).
2. `kubectl apply -f deployment/k3s/rahma/00-namespace.yaml`
3. Create real Secrets via `kubectl create secret …` (values from the operator vault).
4. `kubectl apply -f deployment/k3s/rahma/data/`
5. Wait for `rahma-postgres-0` to be Running.
6. Restore Postgres:
   ```
   kubectl -n rahma-data exec -i rahma-postgres-0 -- \
     bash -c 'gunzip -c | psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
     < rahma-pg-<timestamp>.sql.gz
   ```
7. `kubectl apply -f deployment/k3s/rahma/app/`
8. Verify with `scripts/deploy/check-rahma-health.sh`.
9. Verify that `/api/rag/status` reports `documents_indexed` matching the pre-restore snapshot.
10. Verify that `sakina_sheikh_audit_log` row count matches.

## How to verify after restore

- `kubectl -n rahma-data exec rahma-postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM sakina_sheikh_audit_log"`
- `kubectl -n rahma-data exec rahma-postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM islamic_source_registry WHERE verification_status='approved'"`
- `bash scripts/deploy/check-rahma-health.sh` — must show `/ready` returning `safe_to_serve_public: true` and `rag.mode` matching expected.
- A test public Q&A entry must render with its citations intact.

## Hard rules

- A backup is not "complete" until a **restore drill** has been performed on a non-production cluster.
- A backup file is not a backup until it has been transferred off-cluster.
- Encrypted at rest, encrypted in transit. MinIO must enforce TLS for inter-cluster mirrors when added.
- Retention: at least 30 daily + 12 monthly + 3 yearly. Operator-tunable.
