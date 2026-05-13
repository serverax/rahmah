# Rahma monitoring — notes for future Prometheus / Grafana integration

This file documents how Rahma services can be integrated with Prometheus/Grafana **if** the operator deploys them. Nothing here is applied automatically. If kube-prometheus-stack is not installed on the target cluster, none of this work is required for Sakina to run.

## When Prometheus is present

Check:

```
kubectl get crd | grep monitoring.coreos.com
kubectl get pods -A | grep -E 'prometheus|grafana|alertmanager'
```

If both `servicemonitors.monitoring.coreos.com` CRD and a running Prometheus instance exist, add a `ServiceMonitor`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rahma-backend
  namespace: rahma-monitoring
  labels:
    app.kubernetes.io/part-of: rahma
spec:
  namespaceSelector:
    matchNames:
      - rahma-app
  selector:
    matchLabels:
      app.kubernetes.io/name: rahma-backend
  endpoints:
    - port: http
      interval: 30s
      path: /metrics       # not yet implemented; Sprint 19
```

A `/metrics` endpoint will be added in a later monitoring sprint. Until then, the Prometheus scrape target will return a 404 — harmless but worth knowing.

## Without Prometheus

Manual health checks are sufficient for staging:

```
kubectl -n rahma-app get pods
kubectl -n rahma-app logs deploy/rahma-backend --tail=100
kubectl -n rahma-app run rahma-curl-test --rm -i --restart=Never --image=curlimages/curl -- \
  curl -sS http://rahma-backend.rahma-app.svc.cluster.local:3000/health
kubectl -n rahma-app run rahma-ready-test --rm -i --restart=Never --image=curlimages/curl -- \
  curl -sS http://rahma-backend.rahma-app.svc.cluster.local:3000/ready
```

The `/ready` endpoint already exposes per-subsystem health (database, sources, ask_sheikh_hasan, public_qa, app_store, cache) so operators get a structured snapshot without needing Prometheus.
