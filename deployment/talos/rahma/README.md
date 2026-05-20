# Rahma Talos/Kubernetes Manifests

This directory contains Rahma-only Kubernetes manifests for a Talos-managed cluster.

No production deployment is performed by these files. Operators must validate first and apply only after explicit approval.

## Namespace Separation

Rahma uses only these namespaces:

- `rahma-web`
- `rahma-api`
- `rahma-data`
- `rahma-ai`
- `rahma-monitoring`
- `rahma-security`

Do not deploy Rahma into:

- `default`
- any IterLaw namespace
- any Ordinox namespace
- any OpenClaw namespace
- any shared project namespace

## Talos Note

Talos does not allow normal SSH administration. Use `talosctl` for node operations and `kubectl` for Kubernetes workloads.

## Validation

```bash
bash deployment/talos/rahma/validate-talos-manifests.sh
kubectl apply --dry-run=client -f deployment/talos/rahma/
```

PowerShell:

```powershell
.\deployment\talos\rahma\validate-talos-manifests.ps1
kubectl apply --dry-run=client -f deployment/talos/rahma/
```

## Production Guardrails

- No hardcoded secrets.
- No committed real `DATABASE_URL`.
- No API keys in repo.
- No `:latest` images.
- Resource requests and limits are required.
- Readiness and liveness probes are required for deployments/stateful workloads.
- Container `securityContext` is required.
- `runAsNonRoot` and `readOnlyRootFilesystem` are required where possible.
- NetworkPolicy separates web, API, data, AI, monitoring, and security namespaces.
- Database is reachable only from `rahma-api`.
- Redis is reachable from `rahma-api` and `rahma-ai` only if needed.
- Ingress templates are templates only until a real domain and HTTPS are verified.
