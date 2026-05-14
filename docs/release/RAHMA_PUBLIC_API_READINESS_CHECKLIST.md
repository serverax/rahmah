# Rahma — Public API Readiness Checklist

**Audience:** operator + security reviewer.

Run this checklist BEFORE moving `docs/future/rahma-api-ingress.yaml.future`
to `deployment/k3s/ingress/`.

## 1. Domain + DNS

- [ ] Final API domain chosen (NOT `api.rahma.example`, NOT OrdinoxAI, NOT a fake placeholder).
- [ ] DNS A/CNAME record created and verified with `nslookup` / `dig`.
- [ ] Cloudflare proxy decided (operator-side).

## 2. TLS

- [ ] cert-manager installed on cluster.
- [ ] ClusterIssuer Ready (operator-chosen — typically `letsencrypt-prod`).
- [ ] Operator has authority over `acme-challenge` records.

## 3. Backend state

- [ ] `rahma-api` Deployment runs the real `rahma-api:latest` image.
- [ ] `rahma-api-secrets` created with real values via `create-rahma-secrets-from-env.sh`.
- [ ] Migrations applied (db:status → `pending: []`).
- [ ] At least one approved Islamic source row exists.
- [ ] `/ready` returns `production_ready: false` ONLY if blockers list explains why.

## 4. WASM gates

- [ ] All 4 WASM placeholders rolled to real runtime images (or operator-decided to leave child-safety as bridge for RC1).
- [ ] `/ready.wasm.<module>.reachable` will be non-null once probes ship; for RC1 it may remain null.

## 5. Payments

- [ ] If launching with donations active: `DONATION_PROVIDER` set in secrets + webhook URL bound.
- [ ] If launching without donations: provider stays `disabled` and mobile screen shows the safe Arabic notice.

## 6. Release gate

- [ ] `bash scripts/security/rahma-release-security-gate.sh` PASSED on master.
- [ ] `bash deployment/k3s/scripts/check-rahma-live-drift.sh` PASSED on master.

## 7. Ingress apply

- [ ] Edit `docs/future/rahma-api-ingress.yaml.future` — replace `REPLACE_ME_FINAL_API_HOST` + `REPLACE_ME_clusterissuer`.
- [ ] Move it to `deployment/k3s/ingress/rahma-api-ingress.yaml`.
- [ ] `kubectl apply -f deployment/k3s/ingress/rahma-api-ingress.yaml`.
- [ ] `kubectl get ingress -n rahma-api` shows the new ingress.
- [ ] `kubectl get certificate -n rahma-api` shows Ready=True.

## 8. Live verification

- [ ] `curl -I https://api.<final>/health` returns 200.
- [ ] `curl -I https://api.<final>/ready` returns 200; body shows `service: rahma-api`, `platform: mobile-only`.
- [ ] Certificate issuer matches the operator-chosen issuer.
- [ ] `notAfter` ≥ 30 days in the future.

## 9. Honesty record

Once 1–8 pass, write `reports/RAHMA_PUBLIC_API_LIVE_<date>.md` with:
- captured `nslookup` output,
- captured `curl -I` output,
- certificate issuer + expiry,
- cluster context name (must NOT match the forbidden regex).

Until that report exists, **the public API is NOT claimed live anywhere**.
