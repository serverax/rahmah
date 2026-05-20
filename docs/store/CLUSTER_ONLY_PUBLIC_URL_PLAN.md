# Cluster-Only Public URL Plan

Date: 2026-05-20

## Current Public URL Position

`NO_DOMAIN_AVAILABLE=true`

Rahma has no verified public domain and no verified HTTPS URL yet. Do not use `rahma.ordinoxai.com` or any other fake domain in release claims.

## Current Cluster

| Role | IP |
|---|---|
| master/control-plane | `148.251.247.56` |
| worker-llm | `138.201.253.245` |
| worker-secondary | `138.201.202.174` |

Current public candidate server: `148.251.247.56`

## Temporary Legal Page URLs For Testing Only

These HTTP/IP-based URLs are temporary testing candidates only:

- `http://148.251.247.56/privacy.html`
- `http://148.251.247.56/terms.html`
- `http://148.251.247.56/support.html`

If served through the included NodePort manifests, use:

- `http://148.251.247.56:<NODEPORT>/privacy.html`
- `http://148.251.247.56:<NODEPORT>/terms.html`
- `http://148.251.247.56:<NODEPORT>/support.html`

## Store Submission Warning

HTTP/IP-based URLs are not recommended for final Google Play or Apple App Store submission. A real domain with HTTPS should be added before production store submission.

Current store blocker labels:

- `NO_DOMAIN_AVAILABLE`
- `PUBLIC_PRIVACY_POLICY_HTTPS_URL_NOT_AVAILABLE`
- `PUBLIC_SUPPORT_HTTPS_URL_NOT_AVAILABLE`
- `APPLE_PRIVACY_POLICY_HTTPS_URL_NOT_AVAILABLE`
