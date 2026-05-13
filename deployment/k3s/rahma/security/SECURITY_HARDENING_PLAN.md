# Rahma — Security Hardening Plan (additive, non-breaking)

This plan describes the **hardening steps that may be applied safely after** the cluster is online. Nothing in this file is applied automatically. The plan is purely additive — it must never close SSH, block existing apps, or break the data tier.

## Hard rules (non-negotiable)

1. **SSH must stay open.** Port 22 from the operator's IP is always allowed.
2. **Existing app ports must be preserved.** On the **current shared production worker** (`worker-llm` / 138.201.253.245), this currently includes 80 (Traefik), 443 (Traefik), 30282 (an existing host-bound web app), 10250 (kubelet). Do not touch.
3. **Databases stay ClusterIP only.** Postgres, Redis, MinIO admin must never be exposed via NodePort, LoadBalancer, or Ingress (except the optional MinIO S3 endpoint only if operator approves a separate hostname).
4. **No public Postgres / no public Redis.** Enforced by manifest (`type: ClusterIP`) and by absence of any Ingress for these services.
5. **No real secrets in git.** The repo carries `*.example.yaml` only; real `Secret` objects are created by `kubectl create secret`.
6. **No firewall changes blindly.** UFW / iptables remain operator-owned. This plan recommends rules; it does not apply them.

## Recommended host-firewall posture (UFW)

Already observed on `worker-llm`:

```
22/tcp     ALLOW IN   Anywhere
80/tcp     ALLOW IN   Anywhere
443/tcp    ALLOW IN   Anywhere
6443/tcp   ALLOW IN   Anywhere               # K3s API
8472/udp   ALLOW IN   Anywhere               # flannel VXLAN
51820/udp  ALLOW IN   Anywhere               # WireGuard
30282/tcp  ALLOW IN   Anywhere               # existing Next.js app (host port)
```

For Sakina, **no host-firewall change is required** if the cluster is **already shared with unrelated workloads**. New traffic is in-cluster only (rahma-app ↔ rahma-data).

## Recommended NetworkPolicies (in-cluster)

These are documented in `10-network-policy.yaml`. They are **applied only if** the CNI on the target cluster supports NetworkPolicy. K3s default is flannel without enforcement; if so, the operator either:

- accepts that NetworkPolicy is not enforced (state declared in `/ready`), OR
- installs kube-router / Calico / Cilium first.

Goals:

- Default-deny ingress within `rahma-data`. Only pods labelled `app.kubernetes.io/part-of: rahma` from `rahma-app` may reach Postgres/Redis/MinIO.
- Default-deny ingress within `rahma-security`. The WASM policy worker accepts traffic only from `rahma-app`.
- `rahma-app` accepts ingress from Traefik in `kube-system` (port 3000 only).

## Recommended PodSecurity posture

Already encoded in the namespace manifest:

```
pod-security.kubernetes.io/enforce: baseline
pod-security.kubernetes.io/audit: restricted
pod-security.kubernetes.io/warn: restricted
```

This blocks pods that would request elevated capabilities. Combined with each Deployment's explicit `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true` (where compatible), and `capabilities.drop: ["ALL"]`, this is sufficient for a baseline cluster.

## cert-manager + TLS

- Verify presence: `kubectl get pods -A | grep cert-manager`.
- If absent, **the ingress `tls:` section stays commented out**. Sakina remains HTTP-only on staging until cert-manager is added.
- Issuer recommendation: `letsencrypt-staging` first, then `letsencrypt-prod`.

## Falco + auditd (already present on `worker-llm`)

These are operator-managed. Sakina workloads adhere to:

- non-root containers,
- no `privileged: true`,
- no host namespaces,

which keeps Falco alerts quiet.

## Backups (deferred to Sprint 19)

- Postgres: `pg_dump` cron job → MinIO bucket `rahma-backups`.
- MinIO: rsync to a second region or off-cluster.
- Redis: persistent AOF on PVC (already set), plus periodic RDB snapshot to MinIO.

## Apply order when the operator green-lights

1. `kubectl apply -f deployment/k3s/rahma/00-namespace.yaml`
2. Create real Secrets via `kubectl -n rahma-data create secret …`
3. `kubectl apply -f deployment/k3s/rahma/data/10-postgres.yaml`
4. `kubectl apply -f deployment/k3s/rahma/data/20-redis.yaml`
5. `kubectl apply -f deployment/k3s/rahma/data/30-minio.yaml`
6. Create real backend Secret via `kubectl -n rahma-app create secret …`
7. `kubectl apply -f deployment/k3s/rahma/app/10-backend-configmap.yaml`
8. `kubectl apply -f deployment/k3s/rahma/app/30-backend-deployment.yaml`
9. `kubectl apply -f deployment/k3s/rahma/app/40-backend-service.yaml`
10. Verify rollouts: `kubectl -n rahma-data rollout status statefulset/rahma-postgres`, etc.
11. In-cluster smoke test: `kubectl -n rahma-app run rahma-curl-test --rm -i --restart=Never --image=curlimages/curl -- curl -sS http://rahma-backend.rahma-app.svc.cluster.local:3000/health`
12. Optional: `kubectl apply -f deployment/k3s/rahma/security/10-network-policy.yaml` (only if CNI supports NetworkPolicy)
13. Optional: `kubectl apply -f deployment/k3s/rahma/app/50-backend-ingress.yaml` (only after DNS + cert-manager)
