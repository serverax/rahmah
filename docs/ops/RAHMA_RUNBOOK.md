# Rahma — Operations Runbook

Sprint 14 deliverable. Day-to-day operational tasks for the Sakina/Rahmah backend. Companion to:

- `docs/ops/K3S_DEPLOYMENT_VERIFICATION.md` — fresh-deploy verification.
- `docs/ops/BACKUP_AND_RESTORE_READINESS.md` — backups.
- `deployment/k3s/rahma/security/SECURITY_HARDENING_PLAN.md` — hardening.

## Tail logs

```
kubectl -n rahma-app  logs deploy/rahma-backend --tail=200
kubectl -n rahma-data logs statefulset/rahma-postgres --tail=200
kubectl -n rahma-data logs statefulset/rahma-redis    --tail=200
kubectl -n rahma-data logs statefulset/rahma-minio    --tail=200
```

## Inspect a single pod

```
kubectl -n rahma-app describe pod -l app.kubernetes.io/name=rahma-backend
```

## Run a one-shot curl from inside the cluster

```
kubectl -n rahma-app run rahma-curl-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- \
  curl -sS http://rahma-backend.rahma-app.svc.cluster.local:3000/ready
```

## Rotate Postgres password (operator-only)

1. Generate a fresh password into the operator's password manager (`openssl rand -base64 32`).
2. `kubectl -n rahma-data delete secret rahma-postgres-secret`
3. `kubectl -n rahma-data create secret generic rahma-postgres-secret --from-literal=POSTGRES_DB='rahma' --from-literal=POSTGRES_USER='rahma_app' --from-literal=POSTGRES_PASSWORD='<NEW>'`
4. Update the `rahma-backend-secret.DATABASE_URL` to match (or recompute it from the new password).
5. `kubectl -n rahma-data rollout restart statefulset/rahma-postgres`
6. `kubectl -n rahma-app  rollout restart deploy/rahma-backend`
7. Verify with `scripts/deploy/check-rahma-health.sh`.

**Never echo the new password into a chat, ticket, or log.**

## Pause a charity campaign

```
# Operator-driven, via the (future) admin route. Until then, the only safe
# path is a SQL UPDATE via a kubectl exec into the Postgres pod:
kubectl -n rahma-data exec -it rahma-postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "UPDATE charity_campaigns SET status='paused', updated_at=NOW() WHERE id='<uuid>'"
```

Every such intervention should be followed by an entry in `charity_transparency_logs`.

## Hide a public Q&A entry

```
kubectl -n rahma-data exec -it rahma-postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "UPDATE sakina_public_qa SET is_live=FALSE WHERE slug='<slug>'"
```

Follow up with an audit row in `sakina_sheikh_audit_log` via the admin route (Sprint 17).

## When `/ready.safe_to_serve_public` is false

Order of checks:

1. `database.configured` — is the Secret wired?
2. `database.connected` — can the backend reach Postgres? Look at backend logs for `connection_refused` / `dns_unresolved`.
3. `rag.mode` — is the registry / retrieval module wired? If yes, the readiness flag flips automatically once the DB is reachable.
4. `cache.mode` — should stay `memory` until a real Redis adapter ships; cache failures should not flip safety to false on their own.

## On-call paging

This sprint does NOT wire alerting. Until Prometheus + Alertmanager are deployed (Sprint 19), monitoring is operator-manual.
