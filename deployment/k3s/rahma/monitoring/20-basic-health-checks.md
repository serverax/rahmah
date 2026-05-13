# Rahma — Basic health-check runbook

Run these in order when the rahma stack is applied to a real cluster.

## 1. Namespaces

```
kubectl get ns | grep rahma
```

Expected: `rahma-app`, `rahma-data`, `rahma-security`, `rahma-monitoring`.

## 2. Data tier

```
kubectl -n rahma-data get pods -o wide
kubectl -n rahma-data get svc
kubectl -n rahma-data get pvc
kubectl -n rahma-data rollout status statefulset/rahma-postgres --timeout=180s
kubectl -n rahma-data rollout status statefulset/rahma-redis    --timeout=180s
kubectl -n rahma-data rollout status statefulset/rahma-minio    --timeout=180s
```

## 3. Backend rollout

```
kubectl -n rahma-app get pods -o wide
kubectl -n rahma-app rollout status deploy/rahma-backend --timeout=180s
kubectl -n rahma-app logs deploy/rahma-backend --tail=100
```

## 4. Internal smoke test (no Ingress / DNS required)

```
kubectl -n rahma-app run rahma-curl-health --rm -i --restart=Never --image=curlimages/curl -- \
  curl -sS http://rahma-backend.rahma-app.svc.cluster.local:3000/health

kubectl -n rahma-app run rahma-curl-ready --rm -i --restart=Never --image=curlimages/curl -- \
  curl -sS http://rahma-backend.rahma-app.svc.cluster.local:3000/ready
```

Expected `/health`: `{"ok":true,…}`.
Expected `/ready`: structured JSON with `database`, `sources`, `ask_sheikh_hasan`, `public_qa`, `app_store`, `cache` blocks.

## 5. Ingress (only when DNS + cert-manager are in place)

```
kubectl -n rahma-app get ingress
curl -I  http://sakina.ordinoxai.com/health  || true
curl -kI https://sakina.ordinoxai.com/health || true
```

## 6. Stop conditions

Roll back and surface to the operator if any of the following:

- A `rahma-data` pod is `CrashLoopBackOff` for more than 5 minutes.
- `rahma-backend` is `ImagePullBackOff` (image not yet published; rebuild + push first).
- `/health` or `/ready` returns a 5xx for more than 10 consecutive seconds.
- `kubectl get pods -A` shows any non-rahma pod transitioning from Running to non-Running shortly after Sakina apply (possible noisy-neighbour resource pressure on a shared cluster).
