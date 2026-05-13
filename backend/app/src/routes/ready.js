import { checkDatabaseHealth } from '../db/health.js';
import { isSourceRetrievalConfigured } from '../safety/source-store-status.js';
import { isSheikhRepositoryConfigured } from '../sheikh/sheikh-question-repository.js';
import { isSheikhAuditConfigured } from '../audit/sheikh-action-audit.js';
import { isAuthConfigured as isSheikhAuthPolicyConfigured } from '../sheikh/sheikh-auth-policy.js';
import { whatsappStatusForReady } from '../sheikh/whatsapp-notifier.js';
import { cacheStatusForReady } from '../cache/index.js';
import { isAuthConfigured as isAuthFoundationConfigured, getAuthMode } from '../auth/auth-config.js';
import { safeQueryOne } from '../db/query.js';
import {
  buildRagStatus,
  isRagRegistryConfigured,
  isRagRetrievalConfigured,
} from '../rag/rag-status.js';

function envFlag(name, fallback) {
  const v = process.env[name];
  if (typeof v !== 'string') return fallback;
  const t = v.toLowerCase();
  if (t === 'true') return true;
  if (t === 'false') return false;
  return fallback;
}

export default async function readyRoute(fastify) {
  fastify.get('/ready', async () => {
    const db = await checkDatabaseHealth({ timeoutMs: 1500 });
    const wa = whatsappStatusForReady();

    // Migration-table probe — best effort. Never crashes /ready.
    let migration_table_exists = false;
    let applied_migrations_count = 0;
    if (db.configured && db.connected) {
      const m = await safeQueryOne("SELECT to_regclass('public.schema_migrations') AS t");
      migration_table_exists = Boolean(m.ok && m.row && m.row.t);
      if (migration_table_exists) {
        const c = await safeQueryOne('SELECT COUNT(*)::int AS n FROM schema_migrations');
        if (c.ok && c.row) applied_migrations_count = c.row.n | 0;
      }
    }

    // Compute production-readiness blockers honestly from the subsystem truths.
    const ragStatus = await buildRagStatus();
    const blockers = [];
    if (!isAuthFoundationConfigured()) blockers.push('auth_not_configured');
    if (!db.configured) blockers.push('database_not_configured');
    else if (!db.connected) blockers.push('database_not_connected');
    if (ragStatus.mode === 'foundation') blockers.push('rag_foundation_only');
    if (!isSheikhRepositoryConfigured()) blockers.push('sheikh_repository_not_configured');
    if (ragStatus.approved_sources === 0) blockers.push('no_approved_islamic_sources');
    const production_ready = blockers.length === 0;

    return {
      ok: true,
      service: 'sakina-backend',
      production_ready,
      blockers,
      database: {
        ...db,
        migration_table_exists,
        applied_migrations_count,
        pending_migrations_count: null,
      },
      auth: {
        configured: isAuthFoundationConfigured(),
        mode: getAuthMode(),
      },
      ibadat: {
        scope: 'ibadat',
        source_required: true,
        answer_without_source_blocked: true,
      },
      sources: {
        registry_required: true,
        retrieval_configured: isSourceRetrievalConfigured(),
        answer_generation_enabled: false,
        verified_sources_required: true,
      },
      ask_sheikh_hasan: {
        enabled: envFlag('ASK_SHEIKH_HASAN_ENABLED', true),
        sheikh_login_required: true,
        sheikh_auth_configured: isSheikhAuthPolicyConfigured(),
        public_answers_enabled: envFlag('PUBLIC_SHEIKH_QA_ENABLED', true),
        citation_required_for_public_answers: envFlag(
          'SCHOLAR_ANSWER_CITATION_REQUIRED',
          true,
        ),
        moderation_required: envFlag('PUBLIC_ANSWER_MODERATION_REQUIRED', true),
        repository_configured: isSheikhRepositoryConfigured(),
        whatsapp_configured: wa.configured,
      },
      public_qa: {
        enabled: envFlag('PUBLIC_SHEIKH_QA_ENABLED', true),
        private_user_identity_hidden: true,
        report_content_required: true,
        repository_configured: isSheikhRepositoryConfigured(),
      },
      app_store: {
        compliance_mode: envFlag('APP_STORE_COMPLIANCE_MODE', true),
        apple_foundation_required: true,
        google_play_foundation_required: true,
        account_deletion_required: true,
        content_reporting_required: true,
        moderation_required: true,
      },
      cache: cacheStatusForReady(),
      rag: ragStatus,
      sheikh_audit: {
        configured: isSheikhAuditConfigured(),
      },
      engine: {
        implemented: true,
        mode: 'deterministic_rules',
        rag_registry_configured: isRagRegistryConfigured(),
        rag_retrieval_configured: isRagRetrievalConfigured(),
      },
      safe_to_serve_public: db.configured === false ? false : db.configured,
      environment: process.env.NODE_ENV || 'staging',
    };
  });
}
