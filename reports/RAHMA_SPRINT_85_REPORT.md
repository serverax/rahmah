# Rahma — Sprint 85 — WASM Ecosystem: Final Verification — Report

**Date:** 2026-05-17
**Project:** Rahma/Sakina (mobile-only)
**Repo:** `serverax/rahmah` · Branch `main`

## 1. Objective

Resolve all repository-side blockers for the remaining WASM module rollouts (Citation, Fatwa, Rule Engine), ensuring infrastructure parity with the child-safety module.

## 2. Deliverables

| # | Goal | Status | Evidence |
|---|---|---|---|
| 1 | Create Bridge Dockerfiles | **PASS** | Dockerfiles created for Citation, Fatwa, and Rule Engine |
| 2 | Create Build Workflows | **PASS** | GitHub Action workflows created for all 3 images |
| 3 | Create K3s Manifests | **PASS** | Deployment/Service YAMLs created in `deployment/k3s/wasm/` |
| 4 | Create Rollout Scripts | **PASS** | Bash helper scripts created in `deployment/k3s/scripts/` |

## 3. Changes

- **Dockerfiles**:
  - `wasm/quran-hadith-citation/server/Dockerfile`
  - `wasm/fatwa-policy-gate/server/Dockerfile`
  - `wasm/content-rule-engine/server/Dockerfile`
- **Workflows**:
  - `.github/workflows/rahma-citation-image.yml`
  - `.github/workflows/rahma-fatwa-gate-image.yml`
  - `.github/workflows/rahma-rule-engine-image.yml`
- **Manifests**:
  - `deployment/k3s/wasm/rahma-citation-runtime.yaml`
  - `deployment/k3s/wasm/rahma-fatwa-gate-runtime.yaml`
  - `deployment/k3s/wasm/rahma-rule-engine-runtime.yaml`
- **Scripts**:
  - `deployment/k3s/scripts/deploy-rahma-citation-runtime.sh`
  - `deployment/k3s/scripts/deploy-rahma-fatwa-gate-runtime.sh`
  - `deployment/k3s/scripts/deploy-rahma-rule-engine-runtime.sh`

## 4. Verification

- All Dockerfiles follow the established security best practices (non-root, healthchecks).
- All workflows are correctly scoped to their respective module paths.
- All manifests use correct GHCR image references and standard ports.

## 5. Verdict: **PASS**

Sprint 85 is complete. The entire WASM sidecar ecosystem is now repository-complete and ready for operator rollout.
