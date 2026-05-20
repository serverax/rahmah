# Rahma Talos Deployment Guide

This guide is for operators. It does not authorize production deployment by itself.

Rahma must remain separated from IterLaw, OrdinoxAI, OpenClaw, and all other projects.

## Check Talos Nodes

```bash
talosctl version
talosctl health
kubectl get nodes -o wide
```

Talos does not allow normal SSH. Use `talosctl` and `kubectl`.

## Validate Before Apply

```bash
bash deployment/talos/rahma/validate-talos-manifests.sh
kubectl apply --dry-run=client -f deployment/talos/rahma/namespaces.yaml
kubectl apply --dry-run=client -f deployment/talos/rahma/
```

## Apply Namespaces

```bash
kubectl apply -f namespaces.yaml
```

From repo root:

```bash
kubectl apply -f deployment/talos/rahma/namespaces.yaml
```

## Deploy Only After Operator Approval

Do not run this command until the operator has approved deployment and secrets/images/domains are finalized:

```bash
kubectl apply -f deployment/talos/rahma/
```

## Check Pods

```bash
kubectl get pods -n rahma-web
kubectl get pods -n rahma-api
kubectl get pods -n rahma-data
kubectl get pods -n rahma-ai
```

## Check Services

```bash
kubectl get svc -A | grep rahma
```

PowerShell:

```powershell
kubectl get svc -A | Select-String rahma
```

## Check Ingress

```bash
kubectl get ingress -A | grep rahma
```

PowerShell:

```powershell
kubectl get ingress -A | Select-String rahma
```

## Check Logs

```bash
kubectl logs -n rahma-api deploy/rahma-api --tail=100
kubectl logs -n rahma-web deploy/rahma-web --tail=100
```

## Rollback

```bash
kubectl rollout undo deployment/rahma-api -n rahma-api
kubectl rollout undo deployment/rahma-web -n rahma-web
```

## Domain And HTTPS

The included ingress and cert-manager files are ConfigMap templates only. Do not expose public production routes until:

- A real domain exists.
- DNS points to the intended cluster endpoint.
- HTTPS certificate issuance is verified.
- Store legal URLs return expected HTTP status.

Current store status remains blocked by no domain/HTTPS.
