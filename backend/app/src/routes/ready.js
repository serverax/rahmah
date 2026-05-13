import { checkDatabaseHealth } from '../db/health.js';
import { isSourceRetrievalConfigured } from '../safety/source-store-status.js';
import { isSheikhRepositoryConfigured } from '../sheikh/sheikh-question-repository.js';
import { isAuthConfigured } from '../sheikh/sheikh-auth-policy.js';
import { whatsappStatusForReady } from '../sheikh/whatsapp-notifier.js';

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

    return {
      ok: true,
      service: 'sakina-backend',
      database: db,
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
        sheikh_auth_configured: isAuthConfigured(),
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
      environment: process.env.NODE_ENV || 'staging',
    };
  });
}
