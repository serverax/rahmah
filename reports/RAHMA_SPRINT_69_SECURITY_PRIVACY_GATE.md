# Sprint 69 — Security + Privacy Release Gate

**Date:** 2026-05-14

## What ships
- `scripts/security/rahma-release-security-gate.sh` — 12-check aggregator.
- 4 security docs:
  - `docs/security/RAHMA_PRIVACY_MODEL.md`
  - `docs/security/RAHMA_CHILD_DATA_PROTECTION.md`
  - `docs/security/RAHMA_API_SECURITY_RELEASE_GATE.md`
  - `docs/security/RAHMA_THREAT_MODEL_MOBILE_API.md`

## Local proof

```
$ bash scripts/security/rahma-release-security-gate.sh
[release-gate] PASS: scope guard
[release-gate] PASS: k3s manifest verify
[release-gate] PASS: k8s safety scan
[release-gate] PASS: secret scan
[release-gate] PASS: no public ingress in repo
[release-gate] PASS: no rahma-web / rahma-admin manifests
[release-gate] PASS: no forbidden / placeholder domains in deployment/k3s YAML manifests
[release-gate] PASS: no DEBUG=true / NODE_ENV=development in K3s manifests
[release-gate] PASS: no card-data field accepted in backend/app/src (outside donations.js refusal)
[release-gate] PASS: no Quran/Hadith citation literals in backend/app/src outside tests
[release-gate] PASS: /ready computes production_ready strictly from blockers list
[release-gate] PASS: no private-key literal in backend/app/src
==== RELEASE GATE: PASS ====
```

The gate is the NECESSARY condition for any release boundary.
Operator runs it on master-of-brains pre-release.
