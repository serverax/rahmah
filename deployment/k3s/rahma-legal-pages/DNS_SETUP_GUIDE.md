# Rahma Legal Pages DNS Setup Guide

`NO_DOMAIN_AVAILABLE=true`

Current cluster:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Current public candidate server: `148.251.247.56`

## Current Test-Only URLs

Keep these for cluster testing only:

- `http://148.251.247.56:30080/privacy.html`
- `http://148.251.247.56:30080/terms.html`
- `http://148.251.247.56:30080/support.html`

These are HTTP/IP-based URLs. They are not recommended for final Google Play or Apple App Store submission.

## Domain Setup

1. Buy or assign a real domain or subdomain for Rahma.
2. Add an `A` record pointing to:

```text
148.251.247.56
```

3. Do not use `rahma.ordinoxai.com` unless the DNS record actually exists and resolves to the intended cluster endpoint.
4. Replace `<real-domain>` in:

- `deployment/k3s/rahma-legal-pages/ingress-domain-template.yaml`

5. Replace `<admin-email>` in:

- `deployment/k3s/rahma-legal-pages/cert-manager-template.yaml`

6. Apply the base legal pages first:

```bash
kubectl apply -f deployment/k3s/rahma-legal-pages/namespace.yaml
kubectl apply -f deployment/k3s/rahma-legal-pages/configmap-legal-pages.yaml
kubectl apply -f deployment/k3s/rahma-legal-pages/deployment.yaml
kubectl apply -f deployment/k3s/rahma-legal-pages/service.yaml
```

7. Apply cert-manager and ingress templates only after replacing placeholders and confirming Traefik/cert-manager are installed:

```bash
kubectl apply -f deployment/k3s/rahma-legal-pages/cert-manager-template.yaml
kubectl apply -f deployment/k3s/rahma-legal-pages/ingress-domain-template.yaml
```

## Future Store URLs

Expected future URLs after real DNS and HTTPS are verified:

- `https://<real-domain>/privacy.html`
- `https://<real-domain>/terms.html`
- `https://<real-domain>/support.html`

## Verification

```bash
nslookup <real-domain>
curl -I https://<real-domain>/privacy.html
curl -I https://<real-domain>/terms.html
curl -I https://<real-domain>/support.html
```

Only after those commands return the expected IP and HTTP 200/301/302 responses should the URLs be used in Google Play or Apple App Store metadata.
