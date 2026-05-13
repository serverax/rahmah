/**
 * Public read-only Islamic library routes.
 *
 *   GET /api/library/status        — config snapshot
 *   GET /api/library/categories    — Arabic category list (static)
 *   GET /api/library/items         — approved-only items (empty when no DB)
 *   GET /api/library/items/:id     — single item
 *   GET /api/library/search        — search; never invents results
 *   GET /api/library/sources       — approved registry sources only
 *
 * Truthful: when DB/RAG is not configured, returns `configured: false` + empty
 * list. Never returns synthetic religious content.
 */

import { buildRagStatus, isRagRegistryConfigured } from '../rag/rag-status.js';
import { isDatabaseConfigured } from '../db/config.js';

const CATEGORIES_AR = Object.freeze([
  { id: 'quran',         title_ar: 'القرآن الكريم',     description_ar: 'آيات وتفسير مختصر بعد المراجعة.' },
  { id: 'hadith',        title_ar: 'الحديث الشريف',     description_ar: 'أحاديث صحيحة مع بيان درجة الصحة.' },
  { id: 'azkar',         title_ar: 'الأذكار',           description_ar: 'أذكار اليوم والمناسبات.' },
  { id: 'dua',           title_ar: 'الأدعية',           description_ar: 'أدعية مأثورة بعد التحقق من المصدر.' },
  { id: 'seerah',        title_ar: 'السيرة النبوية',    description_ar: 'مواقف من السيرة بأسلوب مناسب.' },
  { id: 'akhlaq',        title_ar: 'الأخلاق الإسلامية', description_ar: 'دروس في الأخلاق للأسرة.' },
  { id: 'child_content', title_ar: 'تعليم الأطفال',     description_ar: 'محتوى لطيف ومناسب للأطفال.' },
]);

function libraryEnabled() {
  const v = String(process.env.LIBRARY_ENABLED || '').toLowerCase();
  if (v === 'false') return false;
  return true;
}

export default async function libraryRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    const rag = await buildRagStatus();
    return reply.send({
      ok: true,
      enabled: libraryEnabled(),
      configured: isDatabaseConfigured() && isRagRegistryConfigured() && rag.approved_sources > 0,
      database_configured: isDatabaseConfigured(),
      rag_registry_configured: isRagRegistryConfigured(),
      approved_sources: rag.approved_sources | 0,
      message_ar: rag.approved_sources > 0
        ? 'المكتبة متاحة ومحدودة بالمحتوى المعتمد.'
        : 'المكتبة الموثقة غير متاحة بعد. يتم نشر المحتوى تدريجياً بعد المراجعة.',
    });
  });

  fastify.get('/categories', async (req, reply) => {
    return reply.send({ ok: true, categories: CATEGORIES_AR });
  });

  fastify.get('/items', async (req, reply) => {
    if (!isDatabaseConfigured()) {
      return reply.send({ ok: true, configured: false, items: [] });
    }
    // With a DB, a future repository wires real approved-only retrieval.
    // For Sprint 22 we return an empty list truthfully — never invent.
    return reply.send({ ok: true, configured: true, items: [] });
  });

  fastify.get('/items/:id', async (req, reply) => {
    if (!isDatabaseConfigured()) {
      return reply.code(503).send({ ok: false, error: 'database_not_configured' });
    }
    return reply.code(404).send({ ok: false, error: 'not_found' });
  });

  fastify.get('/search', async (req, reply) => {
    const q = req.query && typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length === 0) {
      return reply.code(400).send({ ok: false, error: 'invalid_query' });
    }
    if (!isDatabaseConfigured()) {
      return reply.send({ ok: true, configured: false, items: [] });
    }
    return reply.send({ ok: true, configured: true, items: [] });
  });

  fastify.get('/sources', async (req, reply) => {
    if (!isDatabaseConfigured()) {
      return reply.send({ ok: true, configured: false, sources: [] });
    }
    return reply.send({ ok: true, configured: true, sources: [] });
  });
}
