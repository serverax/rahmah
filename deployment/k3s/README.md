# Rahma K3s Foundation

These manifests are foundation-only scaffolding.

- Do not apply directly to production without pinned image tags, secrets, TLS, storage class, backups, and human review.
- No `:latest` tags.
- No public Ollama ingress.
- No real secrets.
- Review securityContext, probes, and resource limits before deployment.