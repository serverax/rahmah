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
  { id: 'dua',           title_ar: 'الأدعية',           description_ar: 'أدعية مأثورة بعد التحقق من المصدر.' },
  { id: 'azkar',         title_ar: 'الأذكار',           description_ar: 'أذكار اليوم والمناسبات.' },
  { id: 'prayer',        title_ar: 'الصلاة',            description_ar: 'أحكام الصلاة بعد المراجعة.' },
  { id: 'fasting',       title_ar: 'الصيام',            description_ar: 'أحكام الصيام بعد المراجعة.' },
  { id: 'zakat',         title_ar: 'الزكاة',            description_ar: 'أحكام الزكاة بعد المراجعة.' },
  { id: 'hajj',          title_ar: 'الحج والعمرة',      description_ar: 'أحكام الحج والعمرة بعد المراجعة.' },
  { id: 'akhlaq',        title_ar: 'الأخلاق الإسلامية', description_ar: 'دروس في الأخلاق للأسرة.' },
  { id: 'child_content', title_ar: 'تعليم الأطفال',     description_ar: 'محتوى لطيف ومناسب للأطفال.' },
  { id: 'family',        title_ar: 'الأسرة',            description_ar: 'مواضيع الأسرة بأسلوب مراجَع.' },
  { id: 'seerah',        title_ar: 'السيرة النبوية',    description_ar: 'مواقف من السيرة بأسلوب مناسب.' },
]);

const APPROVED = 'approved';

/**
 * Project a document row safely. Any field not listed here MUST NOT appear
 * in a public response. Used by tests asserting "no private fields leak".
 */
function publicDocProjection(row) {
  if (!row || typeof row !== 'object') return null;
  if (row.verification_status !== APPROVED) return null;
  if (row.is_test_fixture === true) return null;
  return Object.freeze({
    id:              row.id || null,
    title_ar:        row.title_ar || null,
    category:        row.category || null,
    language:        row.language || 'ar',
    version:         row.version || null,
    citation_label_ar: row.citation_label_ar || null,
    source_name_ar:  row.source_name_ar || null,
    published_at:    row.published_at || null,
  });
}

function libraryEnabled() {
  const v = String(process.env.LIBRARY_ENABLED || '').toLowerCase();
  if (v === 'false') return false;
  return true;
}

// Test-only export — never imported by the route handlers.
export { publicDocProjection as _libraryDocProjectionForTest };

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
    const category = req.query && typeof req.query.category === 'string' ? req.query.category : null;
    if (!isDatabaseConfigured()) {
      return reply.send({ ok: true, configured: false, items: [], category });
    }
    // With a DB, a future repository wires real approved-only retrieval.
    // For Sprint 22 we return an empty list truthfully — never invent.
    return reply.send({ ok: true, configured: true, items: [], category });
  });

  fastify.get('/documents', async (req, reply) => {
    // Synonym for /items kept for the Sprint 37 contract (categories +
    // documents + document_versions). Always returns only approved content;
    // foundation mode returns [].
    const category = req.query && typeof req.query.category === 'string' ? req.query.category : null;
    if (!isDatabaseConfigured()) {
      return reply.send({ ok: true, configured: false, documents: [], category });
    }
    return reply.send({ ok: true, configured: true, documents: [], category });
  });

  fastify.get('/items/:id', async (req, reply) => {
    if (!isDatabaseConfigured()) {
      return reply.code(503).send({ ok: false, error: 'database_not_configured' });
    }
    return reply.code(404).send({ ok: false, error: 'not_found' });
  });

  fastify.get('/documents/:id', async (req, reply) => {
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
    if (q.length > 200) {
      return reply.code(400).send({ ok: false, error: 'query_too_long' });
    }
    if (!isDatabaseConfigured()) {
      return reply.send({ ok: true, configured: false, items: [], query: q });
    }
    return reply.send({ ok: true, configured: true, items: [], query: q });
  });


  fastify.get('/sources', async (req, reply) => {
    if (!isDatabaseConfigured()) {
      return reply.send({ ok: true, configured: false, sources: [] });
    }
    return reply.send({ ok: true, configured: true, sources: [] });
  });

  fastify.get('/sources/status', async (req, reply) => {
    const rag = await buildRagStatus();
    return reply.send({
      ok: true,
      enabled: libraryEnabled(),
      registry_configured: isRagRegistryConfigured() && isDatabaseConfigured(),
      approved_sources:       rag.approved_sources | 0,
      pending_review_sources: rag.pending_review_sources | 0,
      unverified_sources:     rag.unverified_sources | 0,
      blocked_sources:        rag.blocked_sources | 0,
      complete_database:      false,
    });
  });
}
