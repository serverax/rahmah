# sakina-backend

Backend API for the Sakina Islamic app. Built with Fastify, ESM, Node 20+.

## Strict safety rules

- Scope is locked to **ibadat** only: طهارة، صلاة، صيام، زكاة، حج، عمرة، أذكار، قرآن، نوافل، رمضان.
- **No external LLM calls** in this scaffold (no openai/anthropic/gemini/ollama, no axios, no fetch).
- **No unsourced religious answers**. Until the source store is wired to the
  Sprint 14 knowledge base, every in-scope question resolves to the blocked
  fallback: `لا أملك جواباً موثقاً لهذا السؤال حالياً. يرجى الرجوع إلى عالم موثوق.`

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness — static `{ ok, service, status }`. |
| GET | `/ready` | Readiness + safety flags. `database.connected=false` until DB wired. |
| POST | `/api/ibadat/ask` | Scope filter + source gate. Always blocks until sources exist. |

## Scripts

```
npm ci         # install (CI / reproducible)
npm install    # install (developer, regenerates lock if needed)
npm run lint   # eslint
npm run build  # syntax-check entrypoints (no transpile — pure ESM)
npm test       # node:test
npm start      # node src/index.js
npm run dev    # node --watch src/index.js
```

## Status

Scaffold only. Not deployed. Container image not built. Database not configured.
See `reports/SAKINA_BACKEND_SPRINT_2_REPORT.md` after Sprint 2 runs.
