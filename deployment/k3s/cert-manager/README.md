# cert-manager for Rahma

This directory holds the **ClusterIssuer** manifest for issuing Let's
Encrypt certificates for the Rahma domains. The ClusterIssuer is shared
across namespaces, so it is installed once per cluster.

## Apply order (only after cluster access is restored)

1. Install cert-manager itself:

   ```bash
   kubectl --kubeconfig=<sakina-safe> apply -f \
     https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.yaml
   ```

   Wait for the three cert-manager pods to be `Ready`:

   ```bash
   kubectl get pods -n cert-manager
   ```

2. Replace the email in `letsencrypt-prod-clusterissuer.yaml` (search for
   `REPLACE_ME_operator@example.org`) with the operator's real contact
   address.

3. Apply the issuer:

   ```bash
   kubectl --kubeconfig=<sakina-safe> apply -f \
     deployment/k3s/cert-manager/letsencrypt-prod-clusterissuer.yaml
   ```

4. Verify it is `Ready`:

   ```bash
   kubectl get clusterissuer letsencrypt-prod -o wide
   ```

   The `Ready` column should say `True`. If not, inspect events with
   `kubectl describe clusterissuer letsencrypt-prod`.

## After ClusterIssuer is Ready

Apply the ingress manifests under `deployment/k3s/ingress/`. cert-manager
will automatically create a `Certificate` resource for each `tls:` block
and request the cert via HTTP-01.

DNS pre-requisite: the public A/CNAME record for the final API host
(temporary placeholder `api.rahma.example`) must already point at the
cluster ingress IP, or HTTP-01 will fail.

Rahma is mobile-only — there is no public website to issue a cert for,
only the API host.

## Safety

- This manifest uses **production** Let's Encrypt. For testing, swap the
  server URL to `https://acme-staging-v02.api.letsencrypt.org/directory`
  in a copy and rename to `letsencrypt-staging`.
- Do NOT commit the operator's real email here. Edit the rendered copy
  locally and apply it, or set the email via Kustomize overlay.
- If a `letsencrypt-prod` ClusterIssuer already exists on the cluster
  (e.g., shared with another project), **do not overwrite** it. Confirm
  the existing issuer's spec is compatible with Rahma's needs first.
