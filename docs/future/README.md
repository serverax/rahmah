# docs/future/

This directory holds manifests that **must not be applied yet**. They are
parked here precisely because applying them today would either:

- expose Rahma publicly before a final API domain is chosen, or
- bind to a placeholder host that does not resolve, or
- trigger cert-manager to fail an ACME challenge against a placeholder.

## Files

| File | Why deferred |
|---|---|
| `rahma-api-ingress.yaml.future` | Public API ingress. Final domain not chosen. |
| `50-backend-ingress.yaml.future` | Older Ingress variant from earlier sprints. |

## Before applying anything from this directory

1. Operator chooses the final production API domain (NOT `api.rahma.example`,
   NOT any OrdinoxAI domain, NOT any other placeholder).
2. Operator creates the DNS A/CNAME record at the registrar pointing at the
   cluster's ingress IP.
3. Operator confirms cert-manager + the chosen ClusterIssuer are Ready on
   the target K3s cluster.
4. Operator edits the file in this directory — replacing
   `REPLACE_ME_FINAL_API_HOST` and `REPLACE_ME_clusterissuer` with the
   real values.
5. Operator MOVES the file from `docs/future/` to
   `deployment/k3s/ingress/`.
6. Operator applies `kubectl apply -f deployment/k3s/ingress/<file>`.
7. Operator verifies with `kubectl get ingress -n rahma-api` and
   `curl -I https://<final-host>/health`.
8. Operator writes a follow-up report to `reports/RAHMA_PUBLIC_API_LIVE_<date>.md`.

Until step 8 lands, **no public Rahma API is claimed**.
