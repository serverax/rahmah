# Rahma — Operator Rollout Commands

**Audience:** operator running commands on `master-of-brains` (IP `148.251.247.56`) with the Rahma-safe kubeconfig.
**Scope:** roll the `rahma-api` Deployment from placeholder to the real GHCR image. Internal only. No public ingress is applied.

## Pre-flight

```bash
# 1. Verify the context is Rahma-safe.
kubectl config current-context
#  Expected: a context that does NOT match
#  aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw

# 2. Pull the latest repo so the script + manifests match.
cd /path/to/rahma
git pull --ff-only origin main

# 3. Optional: confirm CI image build is fresh.
gh run list -R serverax/rahmah --workflow rahma-container-build.yml --limit 3
```

## Optional: apply the latest rahma-api YAML

Only needed if the operator wants to pick up changes to probes /
securityContext / PDB. The Deployment must already exist on the cluster.

```bash
kubectl apply -f deployment/k3s/api/rahma-api.yaml
```

## Roll the image

```bash
bash deployment/k3s/scripts/deploy-rahma-api-image.sh \
  ghcr.io/serverax/rahmah/rahma-api:latest
```

Or, without arguments (the script defaults to `:latest`):

```bash
bash deployment/k3s/scripts/deploy-rahma-api-image.sh
```

The script:

1. Refuses forbidden contexts.
2. Prints the current image (audit trail).
3. Runs `kubectl set image`.
4. Runs `kubectl rollout status` with a 180s timeout.
5. Runs an internal `/health` + `/ready` probe via a one-shot pod.
6. Confirms no Rahma ingress has appeared.
7. Prints the final image.

## Capture evidence

```bash
# Final image:
kubectl -n rahma-api get deploy rahma-api -o jsonpath='{.spec.template.spec.containers[0].image}'

# Pod status:
kubectl -n rahma-api get pods -o wide

# Internal ready (paste full body into the follow-up report):
kubectl -n rahma-api run probe --rm -it --restart=Never --image=alpine/curl:8.10.1 -- \
  curl -sS http://rahma-api.rahma-api.svc.cluster.local/ready

# Ingress sanity (must be empty for Rahma):
kubectl get ingress -A | grep rahma || echo "OK: no Rahma ingress"
```

## After rollout

1. Write `reports/RAHMA_REAL_IMAGE_LIVE_<YYYY-MM-DD>.md` with:
   - context name,
   - command outputs (image, rollout status, /ready body, ingress check),
   - timestamp.
2. Update `SAKINA_PROJECT_STATUS.md` to note "real `rahma-api:latest`
   live on cluster" + the digest.
3. Until that report exists, the rollout is **NOT** claimed live in
   any other doc or report.

## Rollback (if anything is wrong)

```bash
# Revert to the previous Deployment revision:
kubectl -n rahma-api rollout undo deployment/rahma-api
kubectl -n rahma-api rollout status deployment/rahma-api --timeout=60s

# Or pin back to the nginx placeholder:
kubectl -n rahma-api set image deployment/rahma-api \
  rahma-api=nginxinc/nginx-unprivileged:1.27-alpine
```

## NEVER do here

- Create or apply a public ingress.
- Touch `cert-manager`, `traefik`, NetworkPolicy, firewall, UFW,
  iptables, or SSH.
- Roll against any forbidden kubectl context.
- Echo any DSN, JWT, password, OIDC client_secret in your terminal logs.
- Push images from a developer machine (CI is the only publisher).
