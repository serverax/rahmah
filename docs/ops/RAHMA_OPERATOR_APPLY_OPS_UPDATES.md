# Rahma — Operator Apply: Ops Updates

**Audience:** operator on master-of-brains.

## What this script applies

`deployment/k3s/scripts/apply-rahma-ops-updates.sh` applies (in order):

1. `deployment/k3s/config/rahma-platform-config.yaml` — ConfigMap in `rahma-api`.
2. `deployment/k3s/backup/rahma-postgres-backup.yaml` — PVC + daily CronJob in `rahma-data`.
3. `deployment/k3s/monitoring/rahma-internal-health-check.yaml` — 5-minute CronJob in `rahma-monitoring`.
4. `deployment/k3s/security/rahma-security-scan-placeholder.yaml` — ConfigMap + daily CronJob in `rahma-security`.

## What it refuses

- Forbidden kubectl contexts.
- Any `deployment/k3s/ingress/*.yaml` present in the repo.
- Any rahma-web / rahma-admin manifest present.
- Any forbidden domain (`rahma.ordinoxai.com`, `admin.rahma.ordinoxai.com`, `api.rahma.ordinoxai.com`, `api.rahma.example`) appearing in any of the four manifests.
- Live apply if the cluster already has a Rahma ingress.

## Run

```bash
# 1. Dry-run (safe anywhere, no kubectl).
bash deployment/k3s/scripts/apply-rahma-ops-updates.sh --dry-run

# 2. Live apply (operator on master-of-brains).
bash deployment/k3s/scripts/apply-rahma-ops-updates.sh
```

## Verify

```bash
kubectl -n rahma-api        get cm rahma-platform-config
kubectl -n rahma-data       get cronjob rahma-postgres-backup
kubectl -n rahma-monitoring get cronjob rahma-internal-health-check
kubectl -n rahma-security   get cronjob rahma-security-scan
kubectl get ingress -A | grep rahma || echo "OK: no Rahma ingress"
```

## NEVER

- Touch Traefik / cert-manager / NetworkPolicy / firewall / UFW / iptables / SSH / K3s service.
- Apply an ingress from this script.
- Apply rahma-web / rahma-admin / sakina-* legacy manifests.
- Run against a forbidden context.
