# Rahma AI Self-Development Risk Register

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Personal data leakage into proposals | High | Redact before analysis; store only anonymised evidence |
| Religious authority bypass | Critical | Human approval gate; no public publishing without review |
| Unsafe code generation | High | Safe branch only; no auto-merge or auto-push |
| Production deployment without review | Critical | Manual deployment gate only |
| Secret leakage in logs | High | Structured redaction, no secret fields in audit payloads |
| Over-confident local LLM output | High | Evidence-required RAG, citation validation, refusal on missing sources |

