# Rahma — Public API Exposure (Deferred)

**Date:** 2026-05-14

This document records the deferred decision around Rahma's public API
endpoint. Operator-owned; assistant cannot execute these steps.

## Current state

- **No public Rahma ingress is applied.** Internal cluster traffic is the
  only mode today.
- The mobile app talks to `api.<final-rahma-domain>` only AFTER the
  operator chooses the final domain.
- The repo's ingress manifest uses `api.rahma.example` as a placeholder
  and `REPLACE_ME_clusterissuer` for the TLS issuer name. Neither will
  resolve in production.

## When the operator IS ready

1. Choose the final API domain (e.g. `api.rahma.app`, `api.rahma.com`,
   anything that is not an OrdinoxAI domain).
2. Create the DNS A record pointing at the cluster ingress IP.
3. Confirm cert-manager + Let's Encrypt ClusterIssuer Ready
   (operator-owned).
4. Edit `deployment/k3s/ingress/rahma-api-ingress.yaml`:
   - Replace `api.rahma.example` everywhere with the chosen host.
   - Replace `REPLACE_ME_clusterissuer` with the existing
     ClusterIssuer's name.
5. Apply:
   ```bash
   kubectl apply -f deployment/k3s/ingress/rahma-api-ingress.yaml
   ```
6. Verify:
   ```bash
   kubectl get ingress -n rahma-api
   kubectl get certificate -n rahma-api
   nslookup api.<final-rahma-domain>
   curl -I https://api.<final-rahma-domain>/health
   ```
7. Update mobile app's `RAHMA_API_BASE` build-time constant.
8. Update `SAKINA_PROJECT_STATUS.md` with the new live state + curl
   evidence.

## Hard rules during deferral

- **No TLS** is issued until the final domain exists.
- **No public exposure of any other Rahma service.** Postgres,
  Redis, WASM placeholders, CronJobs — ClusterIP only.
- **No `rahma-web`** namespace; no public website; no public admin
  dashboard.
- **No firewall / UFW / iptables / SSH / Traefik / cert-manager /
  NetworkPolicy** modification from this repo.

## What the assistant will NOT do, ever

- Pick the final domain.
- Apply an ingress with a non-placeholder host without explicit
  operator instruction.
- Modify the operator-owned cluster's Traefik or cert-manager config.
- Submit ACME challenges from the local workstation.

## When public exposure IS live

Add a follow-up report to `reports/RAHMA_PUBLIC_API_LIVE_<date>.md`
with:
- the chosen domain,
- the `nslookup` output,
- the `curl -I https://...` output showing the Let's Encrypt issuer,
- the cert expiry date.

Until that report exists, every other document in this repo must say
the public API is **NOT live**.
