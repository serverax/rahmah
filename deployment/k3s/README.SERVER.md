# Sakina K3s — server-side facts

Authoritative notes for operators. Updated 2026-05-13. **Read this before touching anything labelled "K3s" in this repo.**

---

## Servers (Hetzner)

| Role | Hostname | Public IP | SSH |
|---|---|---|---|
| K3s control plane (suspected — needs confirmation) | `ordinox-master` | `148.251.247.56` | `~/.ssh/config` alias `ordinox-master`, password auth |
| K3s worker | `worker-llm` | `138.201.253.245` | `~/.ssh/config` host `138.201.253.245`, key `~/.ssh/ordinoxai-deploy`, user `root` |

`worker-llm` runs **`k3s-agent.service`** and joins the master via `K3S_URL='https://148.251.247.56:6443'` (sourced from `/etc/systemd/system/k3s-agent.service.env`).

---

## The 6443-refused trap

`~/.kube/config-hetzner` historically pointed at `server: https://138.201.253.245:6443`. **That IP is the worker, not the API server.** No process binds 6443 on the worker, so connections refuse instantly. The correct API endpoint is **`https://148.251.247.56:6443`** (the master).

When acquiring or fixing a kubeconfig:

1. SSH to `ordinox-master` (148.251.247.56) and read `/etc/rancher/k3s/k3s.yaml`.
2. Rewrite `server: https://127.0.0.1:6443` → `server: https://148.251.247.56:6443`.
3. Write to `F:/rahma/.kube/sakina-k3s.yaml` (gitignored).
4. Verify: `kubectl --kubeconfig F:/rahma/.kube/sakina-k3s.yaml get nodes -o wide`.

The repo's `~/.kube/config-hetzner` reference is preserved as historical context; do not reuse it without fixing the `server:` line first.

---

## Shared-cluster awareness

The K3s cluster behind `worker-llm` is **OrdinoxAI's production K3s cluster**, not a dedicated Sakina cluster. Already-present workloads (observed on the worker via `crictl ps` on 2026-05-13):

- `ordinox-ai/bifrost` — LLM gateway (maximhq/bifrost)
- `ordinox-ai/ollama` — local LLM runtime
- `kube-system/svclb-traefik-*` — klipper-lb fronting Traefik on host ports 80/443

Plus host-level services on the worker:

- `ordinox-web.service` — Next.js on port 30282 (bare-metal, not in K3s)
- `falco` + `falco-modern-bpf` — runtime security; will alert on anomalous container activity
- `fail2ban`, `auditd`, `unattended-upgrades`

**Rules for any Sakina apply against this cluster:**

1. Never `kubectl delete`, `patch`, or `exec` into `ordinox-ai/*` or `kube-system/*` resources.
2. All Sakina objects live in `sakina-ai` (current manifests) or new dedicated `sakina-*` namespaces — never `default`.
3. Set resource `requests`/`limits` so Sakina pods cannot starve `bifrost` / `ollama`.
4. The deployment scripts (`scripts/k3s/deploy-sakina-staging.sh`) refuse to run if the context name contains `aks`, `prod`, or `iterlaw`. Keep this gate.
5. Co-tenancy is allowed **only with explicit operator confirmation per sprint**. Default answer is no.

---

## Ingress, storage, certs (state on 2026-05-13)

| Item | Observed on the worker (via `crictl`/host) | Confirmation needed by querying master |
|---|---|---|
| Ingress controller | Traefik (klipper-lb svclb on host ports 80/443) | `kubectl get ingressclass` |
| Cert-manager | Not visible from the worker — verify on master | `kubectl get pods -A \| grep cert-manager` |
| Storage class | Unknown from worker view | `kubectl get storageclass` |
| External DNS for `sakina.ordinoxai.com` | Not verified | `dig sakina.ordinoxai.com` |

Ingress (`deployment/k3s/ingress/sakina-backend-ingress.yaml`) remains **unapplied** until DNS resolves to a node IP under operator control. TLS section is commented out; enable only after `cert-manager` and a `ClusterIssuer` are confirmed.

---

## Firewall snapshot (UFW on `worker-llm`)

```
22/tcp    ALLOW IN  Anywhere
80/tcp    ALLOW IN  Anywhere
443/tcp   ALLOW IN  Anywhere
6443/tcp  ALLOW IN  Anywhere               # ufw permits, but nothing binds 6443 on worker
8472/udp  ALLOW IN  Anywhere               # flannel VXLAN
51820/udp ALLOW IN  Anywhere               # WireGuard
6443/tcp  ALLOW IN  138.201.202.174        # peer node? confirm
10250/tcp ALLOW IN  138.201.202.174        # kubelet from peer
8472/udp  ALLOW IN  138.201.202.174
30282/tcp ALLOW IN  Anywhere               # ordinox-web (Next.js host port)
```

Do not modify UFW from this repo. Firewall is operator-owned.

---

## What this directory does NOT do

- It does NOT install or configure K3s.
- It does NOT manage `cert-manager`, Traefik, or DNS.
- It does NOT mutate any cluster on `kubectl apply --dry-run=client` (client-only, no API call).
- It does NOT contain secrets — only `*.template.yaml`. Rendered secrets live in `.gitignored` paths.

For the real apply sequence, see `scripts/k3s/deploy-sakina-staging.sh` and the most recent sprint report under `reports/`.
