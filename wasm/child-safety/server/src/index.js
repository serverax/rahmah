#!/usr/bin/env node
/**
 * Rahma child-safety WASM runtime bridge — foundation prototype.
 *
 * Endpoints:
 *   GET  /health         → liveness
 *   POST /evaluate       → { decision, reason, sensitive_topic? }
 *
 * Current implementation runs the deterministic JS port in-process.
 * A later sprint swaps the in-process call for a wasmtime / wasmedge
 * load of `child_safety.wasm` (built by `rahma-wasm-build`). The HTTP
 * contract is identical in both modes — clients do not need to know
 * which is running.
 *
 * NEVER persists raw `body_ar`. NEVER echoes DSN / secrets / tokens.
 * NEVER reaches the public internet — listens on the in-cluster IP
 * only via ClusterIP Service.
 */

import Fastify from 'fastify';
import { pathToFileURL } from 'node:url';
import { evaluateChildContent } from './policy.js';

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

export function buildServer() {
  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
    trustProxy: false,
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'rahma-child-safety-wasm',
    runtime_mode: 'in_process_js_port',
  }));

  app.post('/evaluate', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          body_ar:    { type: 'string', minLength: 0, maxLength: 4000 },
          age_band:   { type: 'string', enum: ['4-6', '7-9', '10-12', '13+'] },
          topic_tags: { type: 'array', items: { type: 'string', maxLength: 64 }, maxItems: 32 },
        },
      },
    },
  }, async (req, reply) => {
    const decision = evaluateChildContent(req.body || {});
    return reply.send({ ok: true, ...decision });
  });

  return app;
}

// Only auto-listen when this file is the Node entrypoint
// (`node src/index.js` / `npm start`). When imported by a test file
// (`node --test test/runtime.test.js`), do nothing — otherwise the
// listener pins the process open and the test runner hangs.
const isEntrypoint =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  const app = buildServer();
  app.listen({ port: PORT, host: HOST }).catch((err) => {
    // Never include token / DSN / body content here.
    process.stderr.write(`[child-safety-runtime] listen failed: ${err && err.code || 'unknown'}\n`);
    process.exit(1);
  });
}
