# Rahma — Internal Health-Check Runbook

**Date:** 2026-05-14

## What runs today

`deployment/k3s/monitoring/rahma-internal-health-check.yaml` —
CronJob in `rahma-monitoring`, schedule `*/5 * * * *`.

Each run:

1. Curls `http://rahma-api.rahma-api.svc.cluster.local/health` —
   captures status + time.
2. Curls `…/ready` — captures status + body (first 512 bytes,
   redacted by the backend before leaving the pod).
3. Curls each of the 4 WASM placeholder services — captures status.
4. TCP-probes `rahma-postgres.rahma-data.svc:5432` — open / closed.
5. TCP-probes `rahma-redis.rahma-data.svc:6379` — open / closed.

Job log retention: 5 successful + 5 failed runs (Kubernetes
`{successful,failed}JobsHistoryLimit`).

## How to inspect the latest job

```bash
kubectl -n rahma-monitoring get jobs --sort-by=.status.startTime | tail -5
LATEST=$(kubectl -n rahma-monitoring get jobs -o jsonpath='{.items[-1:].metadata.name}')
kubectl -n rahma-monitoring logs job/"$LATEST" | tail -40
```

## Triage matrix

| Symptom | Likely cause | Action |
|---|---|---|
| `api_health http_status=000` | API pod not running or NetworkPolicy mismatch | `kubectl -n rahma-api get pods`; `kubectl -n rahma-api describe deploy rahma-api` |
| `api_ready http_status=503` | one or more blockers present | `kubectl -n rahma-api logs deploy/rahma-api`; inspect the captured /ready body for the blocker list |
| `postgres_tcp status=closed` | Postgres pod not Ready / DNS not propagated | `kubectl -n rahma-data get pods`; `kubectl -n rahma-data describe statefulset rahma-postgres` |
| `redis_tcp status=closed` | Redis pod not Ready | `kubectl -n rahma-data get pods` |
| One WASM `http_status` non-200 | placeholder pod restarted | `kubectl -n rahma-ai get pods` — placeholders are ephemeral, restart is expected during cluster maintenance |

## Honesty rules

- Health-check job rows are NOT a substitute for a real metrics
  pipeline. They are append-only K8s job logs.
- The body of `/ready` is captured up to 512 bytes — enough to confirm
  the blocker list; not enough to leak large payloads.
- The job log NEVER contains a DSN or a secret.
- A passing health check is NOT a claim of "production ready" —
  that flag comes from `/ready` itself.

## What is NOT installed today

- Prometheus / Grafana / Alertmanager / Loki. They are not in scope
  yet. If installed later, they install into namespace
  `rahma-monitoring` with their own manifests; no firewall / no
  NetworkPolicy changes from this repo.

## What we will NEVER do here

- Push metrics to a third-party SaaS.
- Modify Traefik / cert-manager configuration.
- Add a PagerDuty / Slack hook without explicit operator action.
- Run the health check at < 1 minute cadence (too noisy in the K8s API).
