# Rahma — API Security Release Gate

**Date:** 2026-05-14
**Audience:** operator + security reviewer.

## What the gate is

`scripts/security/rahma-release-security-gate.sh` is the canonical "OK
to ship" gate. It aggregates every safety constraint into a single
pass/fail. Operator runs it on master-of-brains before each release
boundary.

## Checks

| # | Check | Pass means |
|---|---|---|
| 1 | scope guard | no forbidden token in active paths |
| 2 | k3s manifest verify | namespaces / no plaintext secrets / data-layer ClusterIP only |
| 3 | k8s safety scan | no hostNetwork=true / privileged=true / allowPrivilegeEscalation=true |
| 4 | secret scan | no committed credential / kubeconfig / .env file |
| 5 | no public ingress | `deployment/k3s/ingress/*.yaml` absent |
| 6 | no rahma-web / rahma-admin | the dirs / namespace files don't exist |
| 7 | no forbidden domain in YAML | `api.rahma.example` / OrdinoxAI domains NOT in cluster YAMLs |
| 8 | no DEBUG=true in K3s manifests | env values clean |
| 9 | no card-data field accepted | `pan|card_number|cvv|cvc|track1|track2|iban|bic|swift` absent outside `donations.js`'s refusal |
| 10 | no fake Quran/Hadith literals in src/ | citation strings live in DB only |
| 11 | `/ready` derives `production_ready` from blockers | code path intact |
| 12 | no private-key literal in src/ | no PEM blocks |

## Exit code

`0` = all 12 PASS · `1` = at least one FAIL.

## When to run

- Before every release boundary (operator-decided).
- In CI on `main` push (the existing `rahma-security-scan` workflow is
  the per-commit gate; this aggregator is the release-level gate).

## Honesty rule

The release gate is a NECESSARY condition for shipping. It is NOT a
sufficient one — operator still verifies cluster state, license
posture, and store submission separately.
