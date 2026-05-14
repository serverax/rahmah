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

/**
 * Surface a safe build identifier (git SHA when the CI builder injected it,
 * "unknown" otherwise). NEVER reveals build paths / secrets.
 */
function buildIdentity() {
  const sha = process.env.GIT_COMMIT || process.env.GITHUB_SHA;
  let safeSha = null;
  if (typeof sha === 'string' && /^[a-f0-9]{7,40}$/i.test(sha.trim())) {
    safeSha = sha.trim().toLowerCase().slice(0, 40);
  }
  return {
    version: process.env.APP_VERSION || '0.1.0',
    git_commit: safeSha,
  };
}

/**
 * Redis "configured" = REDIS_URL present in env. "Reachable" requires a real
 * TCP probe; we don't ship the redis client today, so we cannot prove
 * reachability. The contract surfaces reachable=null in that case rather
 * than lying with true/false.
 */
function redisStatus() {
  return {
    configured: typeof process.env.REDIS_URL === 'string' && process.env.REDIS_URL.length > 0,
    reachable: null, // probe not implemented yet
  };
}

/**
 * WASM endpoints: configured iff the env var that names the service base is
 * present. We do NOT echo the URL — only whether each module is configured.
 * Reachability stays null until a real network probe ships.
 */
function wasmStatus() {
  const modules = [
    { name: 'fatwa-policy-gate',      env: 'WASM_FATWA_POLICY_GATE_URL' },
    { name: 'quran-hadith-citation',  env: 'WASM_QURAN_HADITH_CITATION_URL' },
    { name: 'child-safety',           env: 'WASM_CHILD_SAFETY_URL' },
    { name: 'content-rule-engine',    env: 'WASM_CONTENT_RULE_ENGINE_URL' },
  ];
  const out = modules.map((m) => ({
    name: m.name,
    configured: typeof process.env[m.env] === 'string' && process.env[m.env].length > 0,
    reachable: null,
  }));
  const allConfigured = out.every((m) => m.configured);
  return { configured: allConfigured, modules: out };
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
    const redis = redisStatus();
    const wasm = wasmStatus();
    const blockers = [];
    if (!isAuthFoundationConfigured()) blockers.push('auth_not_configured');
    if (!db.configured) blockers.push('database_not_configured');
    else if (!db.connected) blockers.push('database_not_connected');
    if (!redis.configured) blockers.push('redis_not_configured');
    if (!wasm.configured) blockers.push('wasm_not_configured');
    if (ragStatus.mode === 'foundation') blockers.push('rag_foundation_only');
    if (!isSheikhRepositoryConfigured()) blockers.push('sheikh_repository_not_configured');
    if (ragStatus.approved_sources === 0) blockers.push('no_approved_islamic_sources');
    const production_ready = blockers.length === 0;
    const build = buildIdentity();

    return {
      ok: true,
      service: 'rahma-api',
      legacy_service_name: 'sakina-backend',
      platform: 'mobile-only',
      public_ingress: 'disabled',
      version: build.version,
      git_commit: build.git_commit,
      production_ready,
      blockers,
      database: {
        ...db,
        migration_table_exists,
        applied_migrations_count,
        pending_migrations_count: null,
      },
      redis,
      wasm,
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
