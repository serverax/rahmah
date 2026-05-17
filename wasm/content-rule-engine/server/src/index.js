#!/usr/bin/env node
/**
 * Rahma content-rule-engine WASM runtime bridge.
 *
 * Endpoints:
 *   GET  /health         → liveness
 *   POST /evaluate       → { ok, ...visibility_flags }
 */

import Fastify from 'fastify';
import { evaluate } from './policy.js';

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

export function buildServer() {
  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'rahma-rule-engine-wasm',
    runtime_mode: 'in_process_js_port',
  }));

  app.post('/evaluate', {
    schema: {
      body: {
        type: 'object',
        required: [
          'verification_status',
          'has_citation',
          'is_published',
          'is_test_fixture',
        ],
        properties: {
          verification_status: { type: 'string' },
          has_citation:        { type: 'boolean' },
          is_published:        { type: 'boolean' },
          is_test_fixture:     { type: 'boolean' },
        },
      },
    },
  }, async (req, reply) => {
    const decision = evaluate(req.body);
    return reply.send({ ok: true, ...decision });
  });

  return app;
}

if (process.argv[1] === import.meta.filename || process.argv[1]?.endsWith('index.js')) {
  const app = buildServer();
  app.listen({ port: PORT, host: HOST }).catch((err) => {
    process.stderr.write(`[rule-engine-runtime] listen failed: ${err && err.code || 'unknown'}\n`);
    process.exit(1);
  });
}
