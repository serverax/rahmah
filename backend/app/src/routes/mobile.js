/**
 * Mobile-only status + read-only placeholder routes.
 *
 * Mounted at `/api`. Endpoints:
 *
 *   GET /api/mobile/status     — single-call mobile readiness snapshot
 *   GET /api/quran             — placeholder list; never invents content
 *   GET /api/hadith            — placeholder list; never invents content
 *   GET /api/dua               — placeholder list; never invents content
 *   GET /api/game/status       — children's-game status (no PII)
 *   POST /api/game/progress    — accepts opaque counters; persisted:false until DB
 *
 * Honest contract: every list endpoint returns `configured: false` + an
 * empty `items` array until approved content is seeded via the source
 * registry. No religious content is hardcoded here.
 */

import { isDatabaseConfigured } from '../db/config.js';
import { buildRagStatus } from '../rag/rag-status.js';
import { isAuthConfigured, getAuthMode } from '../auth/auth-config.js';
import { getGameRepository } from '../services/game-repository.js';

function envFlag(name, fallback) {
  const v = process.env[name];
  if (typeof v !== 'string') return fallback;
  return v.toLowerCase() === 'true';
}

export default async function mobileRoute(fastify) {
  fastify.get('/mobile/status', async (req, reply) => {
    const rag = await buildRagStatus();
    return reply.send({
      ok: true,
      service: 'rahma-api',
      platform: 'mobile-only',
      public_ingress_disabled: true,
      database: { configured: isDatabaseConfigured() },
      redis: { configured: Boolean(process.env.REDIS_URL) },
      wasm: { configured: false, modules: ['fatwa-policy-gate', 'quran-hadith-citation', 'child-safety', 'content-rule-engine'] },
      public_ingress: 'disabled',
      auth: { configured: isAuthConfigured(), mode: getAuthMode() },
      rag: { mode: rag.mode, approved_sources: rag.approved_sources | 0 },
      features: {
        quran_enabled:                envFlag('ENABLE_QURAN_FEATURES', true),
        hadith_enabled:               envFlag('ENABLE_HADITH_FEATURES', true),
        dua_enabled:                  envFlag('ENABLE_DUA_FEATURES', true),
        ask_sheikh_hasan_enabled:     envFlag('ENABLE_ASK_SHEIKH_HASAN', true),
        children_game_enabled:        envFlag('ENABLE_CHILDREN_ISLAMIC_GAME', true),
        donation_enabled:             envFlag('ENABLE_DONATION_FEATURES', true),
      },
      safe_message_ar: 'تطبيق رحمة — واجهة الموبايل فقط. لا توجد واجهة ويب عامة.',
    });
  });

  function placeholderList(label_ar) {
    return async (req, reply) => {
      const configured = isDatabaseConfigured();
      return reply.send({
        ok: true,
        configured,
        items: [],
        message_ar: configured
          ? `قائمة ${label_ar} ستظهر بعد اعتماد المصادر.`
          : `${label_ar} غير مهيأة بعد — قاعدة البيانات غير مفعلة.`,
      });
    };
  }

  fastify.get('/quran',  placeholderList('القرآن'));
  fastify.get('/hadith', placeholderList('الحديث'));
  fastify.get('/dua',    placeholderList('الأدعية'));

  fastify.get('/game/status', async (req, reply) => {
    const repo = getGameRepository();
    const items = await repo?.listApprovedScenarios(req.query.age_group);
    return reply.send({
      ok: true,
      enabled: envFlag('ENABLE_CHILDREN_ISLAMIC_GAME', true),
      local_first: true,
      server_backup_available: isDatabaseConfigured(),
      scenarios: items || [],
      scenarios_modules: [
        'salah_order', 'wudu_steps', 'dua_matching',
        'surah_recognition', 'manners_quiz', 'ramadan_tasks', 'prophet_stories',
      ],
      safe_message_ar: 'لعبة الأطفال محفوظة محلياً، ولا يتم جمع أي بيانات شخصية للطفل.',
    });
  });

  fastify.post('/game/progress', {
    schema: {
      body: {
        type: 'object',
        required: ['scenario_id'],
        additionalProperties: false,
        properties: {
          scenario_id:    { type: 'string', minLength: 1, maxLength: 64 },
          score:          { type: 'integer', minimum: 0 },
          attempts_count: { type: 'integer', minimum: 0, maximum: 10000 },
          correct_count:  { type: 'integer', minimum: 0, maximum: 10000 },
        },
      },
    },
  }, async (req, reply) => {
    const repo = getGameRepository();
    if (!repo) {
      return reply.send({
        ok: true,
        status: 'local_only',
        persisted: false,
        message_ar: 'تم حفظ التقدم محلياً. لن يتم إرسال أي بيانات إلى الخادم قبل تفعيل المزامنة.',
      });
    }

    const result = await repo.saveProgress(
      req.sakina_principal?.user_id,
      req.body.scenario_id,
      req.body.score || 0
    );

    return reply.send({
      ok: true,
      status: result.persisted ? 'synced' : 'local_only',
      persisted: result.persisted,
      message_ar: result.persisted ? 'تمت مزامنة التقدم.' : 'تم حفظ التقدم محلياً.',
    });
  });

  fastify.get('/public/answers', async (req, reply) => {
    // Surface alias of /api/public/sheikh-hasan/qa for the mobile contract.
    // Pure read-only; only published, cited answers — empty until DB seeded.
    return reply.send({ ok: true, configured: false, items: [] });
  });
}
