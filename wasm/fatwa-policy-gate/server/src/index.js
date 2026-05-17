#!/usr/bin/env node
/**
 * Rahma fatwa-policy-gate WASM runtime bridge.
 *
 * Endpoints:
 *   GET  /health         → liveness
 *   POST /evaluate       → { ok, decision, reason }
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
    service: 'rahma-fatwa-gate-wasm',
    runtime_mode: 'in_process_js_port',
  }));

  app.post('/evaluate', {
    schema: {
      body: {
        type: 'object',
        required: [
          'has_scholar_approval',
          'has_verified_quran_or_hadith_citation',
          'publication_mode_public',
        ],
        properties: {
          has_scholar_approval:                  { type: 'boolean' },
          has_verified_quran_or_hadith_citation: { type: 'boolean' },
          publication_mode_public:               { type: 'boolean' },
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
    process.stderr.write(`[fatwa-gate-runtime] listen failed: ${err && err.code || 'unknown'}\n`);
    process.exit(1);
  });
}
