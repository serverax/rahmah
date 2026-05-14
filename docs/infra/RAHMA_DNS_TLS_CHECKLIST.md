# Rahma — DNS & TLS Verification Checklist

**Date:** 2026-05-14
**Scope:** Rahma/Sakina only

This document is the operator-facing checklist for bringing the four
Rahma domains live. **Nothing in this list is verified by the assistant.**
DNS, ingress, and TLS state is reported as either *unknown* or as
*verified via curl* once the operator captures the evidence.

## Required DNS records

| Host | Type | Target | Cloudflare proxy | Status |
|---|---|---|---|---|
| `rahma.ordinoxai.com` | A | cluster ingress public IP | ON (recommended) | UNVERIFIED |
| `api.rahma.ordinoxai.com` | A | cluster ingress public IP | ON | UNVERIFIED |
| `admin.rahma.ordinoxai.com` | A | cluster ingress public IP | ON | UNVERIFIED |
| `ai.rahma.ordinoxai.com` | (do NOT create unless authenticated AI gateway is ready) | — | — | NOT CREATED |

Cluster ingress IP: TBD until master access is restored (`138.201.253.56`
SSH unreachable per current report).

## How to verify DNS (operator)

```bash
# Each record should resolve to the cluster ingress IP.
nslookup rahma.ordinoxai.com
nslookup api.rahma.ordinoxai.com
nslookup admin.rahma.ordinoxai.com

# Or with dig:
dig +short rahma.ordinoxai.com
dig +short api.rahma.ordinoxai.com
dig +short admin.rahma.ordinoxai.com
```

A successful resolution returns the expected ingress IP and exits 0.
**DNS is not considered verified until the assistant can paste this
output in a report.**

## How to verify TLS

```bash
# Without -k. Both must respond 200 (or whatever the live response is)
# AND present a valid Let's Encrypt certificate.
curl -I https://rahma.ordinoxai.com
curl -I https://api.rahma.ordinoxai.com/health
curl -I https://admin.rahma.ordinoxai.com

# Certificate detail (chain, issuer, expiry):
echo | openssl s_client -connect rahma.ordinoxai.com:443 -servername rahma.ordinoxai.com 2>/dev/null \
  | openssl x509 -noout -issuer -dates -subject
```

PASS criteria:
- HTTP 200 (or the documented live response code for that endpoint).
- Issuer line shows `O = Let's Encrypt` (or current chain root).
- `notAfter` is at least 30 days in the future.

## How to verify ingress on the cluster (after master access restored)

```bash
kubectl --kubeconfig=<sakina-safe> get ingress -A
kubectl --kubeconfig=<sakina-safe> describe ingress rahma-web -n rahma-web
kubectl --kubeconfig=<sakina-safe> describe ingress rahma-api -n rahma-api
kubectl --kubeconfig=<sakina-safe> get certificate -A
```

Each `Certificate` should show `READY: True` and the cert should be
issued by `letsencrypt-prod`. If any shows `False`, inspect with
`kubectl describe certificate <name> -n <ns>`.

## Honest claim policy

- "DNS live" requires a captured `nslookup` showing the expected IP.
- "TLS live" requires a captured `curl -I https://…` showing a 2xx/3xx
  and a Let's Encrypt issuer line.
- "Deployed" requires `kubectl rollout status` output.
- Without those three, the relevant area stays **UNVERIFIED** in every
  report.
