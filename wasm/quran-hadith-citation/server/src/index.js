#!/usr/bin/env node
/**
 * Rahma quran-hadith-citation WASM runtime bridge.
 *
 * Endpoints:
 *   GET  /health         → liveness
 *   POST /evaluate       → { ok, citation_status, can_publish_public, ... }
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
    service: 'rahma-citation-wasm',
    runtime_mode: 'in_process_js_port',
  }));

  app.post('/evaluate', {
    schema: {
      body: {
        type: 'array',
        items: {
          type: 'object',
          required: ['citation_type', 'citation_label'],
          properties: {
            citation_type:  { type: 'string', enum: ['quran', 'hadith', 'fiqh', 'scholar_note'] },
            citation_label: { type: 'string', minLength: 1, maxLength: 256 },
            citation_text:  { type: 'string', maxLength: 4000 },
            citation_url:   { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
  }, async (req, reply) => {
    const decision = evaluate(req.body || []);
    return reply.send({ ok: true, ...decision });
  });

  return app;
}

if (process.argv[1] === import.meta.filename || process.argv[1]?.endsWith('index.js')) {
  const app = buildServer();
  app.listen({ port: PORT, host: HOST }).catch((err) => {
    process.stderr.write(`[citation-runtime] listen failed: ${err && err.code || 'unknown'}\n`);
    process.exit(1);
  });
}
