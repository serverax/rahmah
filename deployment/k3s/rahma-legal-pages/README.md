# Rahma Legal Pages On Cluster IP

This deployment serves temporary legal pages for cluster testing only.

`NO_DOMAIN_AVAILABLE=true`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Current public candidate server: `148.251.247.56`

## Important Store Warning

These are HTTP/IP-based URLs. They are temporary only and are not recommended for final Google Play or Apple App Store submission. A real domain with HTTPS should be added before production store submission.

## Apply

```bash
kubectl apply -f deployment/k3s/rahma-legal-pages/
```

## Verify

```bash
kubectl get pods -n rahma-legal-pages -o wide
kubectl get svc -n rahma-legal-pages
```

The included NodePort is `30080` unless changed by the operator:

```bash
curl -I http://148.251.247.56:<NODEPORT>/privacy.html
curl -I http://148.251.247.56:<NODEPORT>/terms.html
curl -I http://148.251.247.56:<NODEPORT>/support.html
```

With the provided manifest default:

```bash
curl -I http://148.251.247.56:30080/privacy.html
curl -I http://148.251.247.56:30080/terms.html
curl -I http://148.251.247.56:30080/support.html
```

## Served Paths

- `/privacy.html`
- `/terms.html`
- `/support.html`
