# Rahma — Bundle 04 Blocker Resolution Plan

## 1. Objective
Resolve the 8 blockers identified at the end of Bundle 04 to achieve a clean baseline for Sprints 71–100.

## 2. Blocker Classification

| # | Blocker | Class | Plan |
|---|---|---|---|
| 1 | Real API cluster rollout | Operator | Document as pending operator rollout. |
| 2 | Live DB migrations + seeds | Operator | Document as pending DATABASE_URL. |
| 3 | Real secrets | Operator | Document as pending SESSION_SECRET etc. |
| 4 | Real WASM runtime image | Operator | Document as pending deployment. |
| 5 | Mobile native shell | Code | Run `flutter create .` to initialize. |
| 6 | Final API domain + ingress | Decision | Pending operator decision. |
| 7 | Payment provider | Decision | Pending operator decision. |
| 8 | Failing Tests | Code | Fix regressions in Sprint 71. |

## 3. Implementation Steps
- Fix `backend/app/test` regressions via Unified Pool Reset and environment isolation.
- Initialize `apps/mobile` Flutter native shell.
- Audit all user-facing strings for LQA.
