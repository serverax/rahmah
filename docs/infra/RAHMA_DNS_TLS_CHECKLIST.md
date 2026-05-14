# Rahma — DNS & TLS Verification Checklist (Mobile-App Only)

**Date:** 2026-05-14
**Scope:** Rahma/Sakina only — mobile-app target. No public website, no admin web dashboard.

This document is the operator-facing checklist for bringing the single Rahma
public endpoint live. **Nothing in this list is verified by the assistant.**
DNS and TLS state is reported as either *unknown* or as *verified via curl*
once the operator captures the evidence.

## Required DNS records

| Host | Type | Target | Cloudflare proxy | Status |
|---|---|---|---|---|
| `api.rahma.example` (PLACEHOLDER — operator replaces with final domain) | A | cluster ingress public IP | ON (recommended) | UNVERIFIED |

`api.rahma.example` is a **placeholder** until the operator confirms the
final production hostname. Rahma is mobile-only — there are no
`rahma.*`, `admin.rahma.*`, or `ai.rahma.*` DNS records to create.

Cluster ingress IP: TBD until master access is restored
(`138.201.253.56` SSH unreachable per latest report).

## How to verify DNS (operator)

```bash
# After replacing api.rahma.example with the final hostname:
nslookup api.<final-rahma-domain>
dig +short api.<final-rahma-domain>
```

A successful resolution returns the expected ingress IP and exits 0.
**DNS is not considered verified until the assistant can paste this
output in a report.**

## How to verify TLS

```bash
# Without -k. Must respond AND present a valid certificate from the
# operator-chosen ClusterIssuer (typically Let's Encrypt prod).
curl -I https://api.<final-rahma-domain>/health

# Certificate detail (chain, issuer, expiry):
echo | openssl s_client -connect api.<final-rahma-domain>:443 -servername api.<final-rahma-domain> 2>/dev/null \
  | openssl x509 -noout -issuer -dates -subject
```

PASS criteria:
- HTTP 200 from `/health`.
- Issuer line shows the operator-configured issuer (e.g. `O = Let's Encrypt`).
- `notAfter` is at least 30 days in the future.

## How to verify ingress on the cluster (after master access restored)

```bash
kubectl --kubeconfig=<sakina-safe> get ingress -A
kubectl --kubeconfig=<sakina-safe> describe ingress rahma-api -n rahma-api
kubectl --kubeconfig=<sakina-safe> get certificate -A
```

The single `Certificate` for the API host should show `READY: True` and
be issued by the operator's configured ClusterIssuer.

## Honest claim policy

- "DNS live" requires a captured `nslookup` showing the expected IP.
- "TLS live" requires a captured `curl -I https://…` showing a 2xx and
  the expected issuer line.
- "Deployed" requires `kubectl rollout status` output.
- Without those three, the relevant area stays **UNVERIFIED** in every
  report.

## Forbidden

- **Do NOT** create or surface a public web hostname for Rahma. It is
  mobile-only.
- **Do NOT** modify Traefik, cert-manager, NetworkPolicy, firewall, UFW,
  iptables, or SSH from this repo.
