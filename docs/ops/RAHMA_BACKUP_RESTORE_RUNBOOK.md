# Rahma — Backup & Restore Runbook

**Date:** 2026-05-14
**Audience:** operator on master-of-brains with the Rahma-safe kubeconfig.

## Backup CronJob

`deployment/k3s/backup/rahma-postgres-backup.yaml` runs daily at
**02:15 UTC** in namespace `rahma-data`. It writes
`/backups/rahma-<UTC-timestamp>.sql.gz` to a dedicated PVC
(`rahma-postgres-backup-pvc`, 5 GiB).

Retention: rolling 14 days. Files older than 14 days are deleted by
`find … -mtime +14 -delete` inside the same job. Operator may bump
retention by editing the manifest + reapplying.

## List existing backups

```bash
# Spin up an ephemeral pod mounting the same PVC.
kubectl -n rahma-data run rahma-backup-ls \
  --rm -it --restart=Never \
  --image=alpine:3.20 \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "ls",
        "image": "alpine:3.20",
        "command": ["sh","-c","ls -lh /backups | head -50"],
        "volumeMounts": [{ "name": "backups", "mountPath": "/backups" }]
      }],
      "volumes": [{
        "name": "backups",
        "persistentVolumeClaim": { "claimName": "rahma-postgres-backup-pvc" }
      }]
    }
  }' --
```

## Restore a single backup

```bash
# 1. Identify the backup file to restore.
#    rahma-YYYYMMDD-HHMMSS.sql.gz
BACKUP_FILE='rahma-2026-05-14-021500.sql.gz'

# 2. Pause the rahma-api Deployment so no writes race the restore.
kubectl -n rahma-api scale deployment/rahma-api --replicas=0

# 3. Open a port-forward to the cluster Postgres.
kubectl -n rahma-data port-forward svc/rahma-postgres 15432:5432 &

# 4. Build the DSN from the cluster secret (NEVER paste it into history).
DB_USER=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_USER}'     | base64 -d)
DB_PW=$(kubectl   -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d)
DB_NAME=$(kubectl -n rahma-data get secret rahma-postgres-secret -o jsonpath='{.data.POSTGRES_DB}'        | base64 -d)

# 5. Copy the backup file out of the PVC.
kubectl -n rahma-data run rahma-backup-pull \
  --rm -it --restart=Never \
  --image=alpine:3.20 \
  --overrides='{
    "spec": {
      "containers":[{ "name":"pull","image":"alpine:3.20","command":["sh","-c","cat /backups/'"$BACKUP_FILE"'"],
                      "volumeMounts":[{"name":"backups","mountPath":"/backups"}] }],
      "volumes":[{ "name":"backups","persistentVolumeClaim":{ "claimName":"rahma-postgres-backup-pvc" } }]
    }
  }' -- > "/tmp/$BACKUP_FILE"

# 6. Restore. (Forward-only schema; restore replaces app data.)
gunzip -c "/tmp/$BACKUP_FILE" | psql "postgres://${DB_USER}:${DB_PW}@127.0.0.1:15432/${DB_NAME}?sslmode=disable"

# 7. Clean up.
rm -f "/tmp/$BACKUP_FILE"
unset DB_USER DB_PW DB_NAME
kill %1

# 8. Re-scale the API.
kubectl -n rahma-api scale deployment/rahma-api --replicas=1
kubectl -n rahma-api rollout status deployment/rahma-api --timeout=120s
```

## Test-restore (without overwriting production)

Restore the dump into a TEMPORARY database in the same Postgres
instance. Useful before trusting a backup.

```bash
PGPASSWORD="$DB_PW" psql -h 127.0.0.1 -p 15432 -U "$DB_USER" \
  -d "$DB_NAME" -c "CREATE DATABASE rahma_restore_test;"
gunzip -c "/tmp/$BACKUP_FILE" | \
  PGPASSWORD="$DB_PW" psql -h 127.0.0.1 -p 15432 -U "$DB_USER" -d rahma_restore_test
# Inspect with `\dt`, sample queries, then:
PGPASSWORD="$DB_PW" psql -h 127.0.0.1 -p 15432 -U "$DB_USER" \
  -d "$DB_NAME" -c "DROP DATABASE rahma_restore_test;"
```

## NEVER

- Echo the password in your shell prompt or paste into history.
- Restore to a DB whose name doesn't match the Rahma data store.
- Restore while the API is writing — always scale to 0 first.
- Skip the test-restore for a critical recovery.
- Move backup files to a developer machine. Pull → process → delete.

## Honesty record

When a restore is performed, the operator writes
`reports/RAHMA_DB_RESTORE_<date>.md` with:

- backup filename + size,
- timestamp range covered,
- rows-affected estimate (from `pg_stat_user_tables`),
- cluster context.

Until that report exists, no "restored from backup" claim is made.
