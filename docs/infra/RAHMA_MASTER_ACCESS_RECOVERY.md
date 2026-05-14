# Rahma — Master Node Access Recovery

**Date:** 2026-05-14
**Scope:** Rahma/Sakina infrastructure on Hetzner.

## Current state

| Node | IP | Reachability | Role |
|---|---|---|---|
| Master / control-plane | `138.201.253.56` | **UNREACHABLE** — SSH timing out from local Windows PowerShell | k3s master expected here |
| Worker | `138.201.202.174` | reachable over SSH; `k3s-agent` running; `k3s.service` not present | k3s-agent only |
| Worker (older, observed earlier) | `138.201.253.245` | reachable; `k3s-agent` only; reports back to a different master | shared with OrdinoxAI |

Without master access, **no `kubectl` mutation is possible** for Rahma.
`kubectl` against the worker fails because the worker has no admin
kubeconfig (default lookup is `localhost:8080`).

The assistant's local `kubectl config current-context` is
`aks-iterlaw-we-prod` — **forbidden** by the saved
`[[feedback-never-deploy-to-prod]]` rule. Even if a kubeconfig fell
out of the sky, the assistant would refuse to use a non-Rahma context.

## Recovery steps (operator-side)

### 1. Safe reboot via Hetzner Robot console

Log into the Hetzner Robot interface for the server with IP
`138.201.253.56`:

1. Open **"Server" → select the master server → "Server console" tab**.
2. Try a **CTRL+ALT+DEL** reboot first (non-destructive).
3. Watch the console output. If SSH comes back: stop here, you're done.

If the soft reboot does not bring SSH back:

1. **"Reset"** tab → choose **"automatic hardware reset"**.
2. Watch the console. If the OS boots but SSH still fails, log in via
   the **Rescue System**:
   - Activate rescue mode under **"Rescue"** tab.
   - Reboot.
   - SSH as `root@138.201.253.56` into the rescue OS.
   - Mount the real root (`mount /dev/md/0 /mnt`, then
     `chroot /mnt /bin/bash`).
   - Inspect `/var/log/auth.log`, `journalctl -xe`, `systemctl status k3s`.
   - Fix the discovered issue (often: full disk; failed cloud-init;
     network config drift).
   - Exit chroot, reboot back into normal OS.

### 2. After SSH is back

Confirm k3s is running on the master:

```bash
ssh root@138.201.253.56
systemctl is-active k3s
kubectl get nodes -o wide
kubectl get pods -A
```

### 3. Get the admin kubeconfig safely

```bash
ssh root@138.201.253.56 'cat /etc/rancher/k3s/k3s.yaml' > ~/.kube/rahma-master.yaml
# Replace the localhost server URL with the master's public IP:
sed -i 's|server: https://127.0.0.1:6443|server: https://138.201.253.56:6443|' ~/.kube/rahma-master.yaml
chmod 600 ~/.kube/rahma-master.yaml
```

Verify:

```bash
KUBECONFIG=~/.kube/rahma-master.yaml kubectl config current-context
KUBECONFIG=~/.kube/rahma-master.yaml kubectl get nodes -o wide
```

**The assistant must verify the context name does NOT match
`aks-iterlaw-we-prod` or anything in the forbidden context regex
(`scripts/deploy/verify-rahma-cluster.sh` lists the full pattern)
before any further action.**

### 4. NEVER do during recovery

- **Do NOT** apply firewall lockdown (`ufw default deny`,
  `iptables -P INPUT DROP`).
- **Do NOT** reset the cluster (`k3s-uninstall.sh`).
- **Do NOT** install Hetzner's "rescue + reinstall" — that wipes the
  cluster.
- **Do NOT** create the `rahma-*` namespaces from the worker — the
  worker has no admin kubeconfig.
- **Do NOT** disable SSH on the master while debugging (you may lock
  yourself out).
- **Do NOT** point Sakina at OrdinoxAI's master (`148.251.247.56`) —
  saved memory says "do not touch OrdinoxAI namespaces unless required
  for shared ingress and explicitly proven safe".

### 5. Once kubeconfig is in hand

Hand the kubeconfig path to the assistant. The deployment runbook is
at `docs/infra/RAHMA_K3S_DEPLOYMENT_RUNBOOK.md`.

## What the assistant CAN do without master access

- Author / lint / safety-scan all K3s manifests under `deployment/k3s/`.
- Author / run all secret + scope + safety scripts.
- Run all backend + web tests locally.
- Build the Docker image (when the daemon is running).
- Push code + reports to GitHub.

What the assistant **cannot** do without master access:

- Create namespaces on the cluster.
- Apply manifests.
- Verify ingress / TLS / DNS end-to-end.
- Confirm rollout success.

These items stay marked **BLOCKED** in every report until master access
is restored.
