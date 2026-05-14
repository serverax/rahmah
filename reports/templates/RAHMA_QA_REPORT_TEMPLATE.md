# Rahma — QA Report Template

**Date:** YYYY-MM-DD
**Sprint / Bundle:** —
**Author:** —
**Starting HEAD:** —
**Final HEAD:** —

## 1. Scope
- Project: Rahma/Sakina
- Repo: `serverax/rahmah`
- Branch: `main`
- Other projects touched: NO

## 2. Starting state
- `git status -sb`:
- `git log --oneline -5`:
- kubectl context:
- Docker daemon:

## 3. Commands run
List every command run, in order. Include the exact output (or `>/dev/null` if too long, with a pointer to the captured artifact).

## 4. Tests
- Backend: `cd backend/app && npm test` → `... tests N pass`
- Web: `cd apps/web && npm test` → `... tests N pass`

## 5. Build
- `npm run build` → output

## 6. Security scan
- `bash scripts/security/rahma-secret-scan.sh` → output

## 7. K8s manifest scan
- `bash scripts/security/rahma-k8s-safety-scan.sh` → output
- `bash deployment/k3s/scripts/verify-rahma-manifests.sh` → output

## 8. Deployment status
- kubectl ops attempted: YES / NO. If YES, paste output.
- Cluster context: …
- Namespace status: …

## 9. DNS / TLS status
- nslookup / dig output (paste)
- curl -I https://…  (paste)
- TLS issuer:

## 10. Bugs found
- [ ] …

## 11. Fixes applied
- [ ] …

## 12. Remaining blockers
- [ ] …

## 13. PASS / PARTIAL / FAIL decision
- Decision:
- Reason:

## 14. Evidence appendix

### 14.a. Endpoint probe
```
/health                          200
/ready                           200 production_ready=false blockers=[...]
/api/auth/status                 200 auth_configured=false
/api/db/status                   200 database_configured=false
/api/rag/status                  200 mode=foundation
/api/engine/status               200 engine_implemented=true
/api/privacy/status              200
/api/terms/status                200
/api/public/sheikh-hasan/qa      200
```

### 14.b. CI run
```
gh run list -R serverax/rahmah --workflow rahma-ci.yml --limit 5
```

### 14.c. Truth statement
"I did not fake, cheat, invent evidence, or mark production readiness without command evidence. Rahma/Sakina remains production_ready=false unless /ready, DB, auth, RAG, Docker, and deployment evidence prove otherwise."
