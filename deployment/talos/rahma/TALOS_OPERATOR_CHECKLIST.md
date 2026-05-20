# Rahma Talos Operator Checklist

## Preflight

- [ ] Confirm this is the Rahma cluster context.
- [ ] Confirm no IterLaw, OrdinoxAI, OpenClaw, or shared project namespaces are targeted.
- [ ] Run `talosctl health`.
- [ ] Run `kubectl get nodes -o wide`.
- [ ] Run `bash deployment/talos/rahma/validate-talos-manifests.sh`.
- [ ] Run `kubectl apply --dry-run=client -f deployment/talos/rahma/`.

## Secrets

- [ ] Replace example secrets outside git.
- [ ] Do not commit real `DATABASE_URL`.
- [ ] Do not commit API keys, signing keys, passwords, or tokens.
- [ ] Confirm `rahma-api-secrets` exists before deploying API.
- [ ] Confirm `rahma-postgres-secrets` exists before deploying Postgres.

## Images

- [ ] Confirm image tags are immutable and not `:latest`.
- [ ] Confirm images exist in registry.
- [ ] Confirm vulnerability scan policy is satisfied.

## Network

- [ ] Confirm NetworkPolicy support is installed/enforced.
- [ ] Confirm DB is reachable only from `rahma-api`.
- [ ] Confirm Redis is reachable only from `rahma-api` and `rahma-ai` if required.
- [ ] Confirm web public exposure is limited to intended routes.

## Store/Legal

- [ ] Confirm no fake domain is used.
- [ ] Confirm privacy/support URLs are HTTPS before store submission.
- [ ] Confirm test-only IP URLs are not used as final Play/App Store URLs.

## Deployment Approval

- [ ] Operator explicitly approves deployment.
- [ ] Run `kubectl apply -f deployment/talos/rahma/`.
- [ ] Check pods, services, ingress, and logs.
- [ ] Roll back immediately if readiness fails.
