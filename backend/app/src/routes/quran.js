/**
 * backend/app/src/routes/quran.js
 */
import { getQuranRepository } from '../services/quran-repository.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export default async function quranRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    try {
      const metaPath = path.resolve('../../data/islamic-sources/quran-metadata.json');
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      return reply.send({ ok: true, ...meta });
    } catch {
      return reply.send({ ok: true, is_sample_mode: true, verification_status: 'unverified' });
    }
  });

  fastify.get('/surahs', async (req, reply) => {
    const repo = getQuranRepository();
    if (!repo) return reply.send({ ok: true, configured: false, items: [] });
    const items = await repo.listSurahs();
    return reply.send({ ok: true, configured: true, items });
  });

  fastify.get('/surahs/:id', async (req, reply) => {
    const repo = getQuranRepository();
    if (!repo) return reply.code(503).send({ ok: false, error: 'service_not_configured' });
    const details = await repo.getSurahDetails(req.params.id);
    if (!details) return reply.code(404).send({ ok: false, error: 'not_found' });
    const ayahs = await repo.getAyahs(req.params.id);
    return reply.send({ ok: true, ...details, ayahs });
  });

  fastify.get('/search', async (req, reply) => {
    const repo = getQuranRepository();
    if (!repo) return reply.code(503).send({ ok: false, error: 'service_not_configured' });
    const results = await repo.searchQuran(req.query.q);
    return reply.send({ ok: true, results });
  });
}
