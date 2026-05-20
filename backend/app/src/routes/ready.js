import { checkDatabaseHealth } from '../db/health.js';
import { isSourceRetrievalConfigured } from '../safety/source-store-status.js';
import { isSheikhRepositoryConfigured } from '../sheikh/sheikh-question-repository.js';
import { isSheikhAuditConfigured } from '../audit/sheikh-action-audit.js';
import { isAuthConfigured as isSheikhAuthPolicyConfigured } from '../sheikh/sheikh-auth-policy.js';
import { whatsappStatusForReady } from '../sheikh/whatsapp-notifier.js';
import { cacheStatusForReady } from '../cache/index.js';
import { isAuthConfigured as isAuthFoundationConfigured, getAuthMode } from '../auth/auth-config.js';
import { safeQueryOne } from '../db/query.js';
import { getLocalLlmConfig } from '../rag/local-llm/config.js';
import { isRahmaAlgorithmConfigured, RAHMA_ALGORITHM_VERSION } from '../services/rahma-algorithm.service.js';
import { redisReadiness } from '../infra/redis-probe.js';
import { pgvectorReadiness } from '../infra/pgvector-probe.js';
import { wasmReadiness } from '../infra/wasm-probe.js';
import { evaluateProductionGates, appStoreComplianceStatus, envFlag } from '../infra/production-gates.js';
import { getAzanAudioStatus } from '../infra/azan-probe.js';
import { pushNotificationReadiness } from '../infra/notification-probe.js';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function getNotificationStatus() {
  const push = pushNotificationReadiness();
  return {
    azan_alerts_configured: envFlag('ENABLE_AZAN_ALERTS', true),
    native_notifications_configured: push.foundation_ready,
    fcm_configured: push.fcm_configured,
    apns_configured: push.apns_configured,
    push_production_ready: push.push_production_ready,
    push_required: push.push_required,
  };
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

/** Merge production gate blockers with stable foundation blocker codes used by tests and ops. */
function augmentFoundationBlockers(blockers, {
  db,
  ragStatus,
  redis,
  wasmProbe,
  auth_ready,
  donationProviderConfigured,
} = {}) {
  const set = new Set(Array.isArray(blockers) ? blockers : []);
  if (!db?.configured) {
    set.add('database_not_configured');
  } else if (!db?.connected) {
    set.add('database_not_connected');
  }
  if (!redis?.configured) {
    set.add('redis_not_configured');
  }
  if (wasmProbe?.mode === 'disabled' && !wasmProbe?.disable_approved) {
    set.add('wasm_disable_not_approved');
  }
  if (wasmProbe?.mode === 'required') {
    if (!wasmProbe?.configured) set.add('wasm_not_configured');
    if (!wasmProbe?.execution_proven) set.add('wasm_execution_not_proven');
  }
  if (!auth_ready) {
    set.add('auth_not_configured');
  }
  if (!ragStatus?.rag_ready) {
    set.add('rag_foundation_only');
  }
  if ((ragStatus?.approved_sources | 0) === 0) {
    set.add('no_approved_islamic_sources');
  }
  if (!isSheikhRepositoryConfigured()) {
    set.add('sheikh_repository_not_configured');
  }
  if (!donationProviderConfigured) {
    set.add('donations_provider_not_configured');
  }
  return [...set];
}

function localLlmStatus() {
  const cfg = getLocalLlmConfig();
  return {
    configured: cfg.enabled,
    provider: cfg.provider,
    require_approved_context: cfg.requireApprovedContext,
    require_citations: cfg.requireCitations,
    direct_religious_answers_disabled: cfg.allowDirectReligiousAnswers === false,
  };
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

    async function queryLiveRagStatus() {
      if (!db.configured || !db.connected || typeof process.env.DATABASE_URL !== 'string' || process.env.DATABASE_URL.length === 0) {
        return {
          mode: 'foundation',
          approved_sources: 0,
          pending_review_sources: 0,
          unverified_sources: 0,
          blocked_sources: 0,
          documents_indexed: 0,
          chunks_indexed: 0,
          embeddings_indexed: 0,
          citations_indexed: 0,
          last_ingestion_at: null,
          last_verified_at: null,
          last_algorithm_test_at: null,
          rag_ready: false,
          algorithm_ready: false,
          algorithm_version: RAHMA_ALGORITHM_VERSION,
          blocker_reason: 'database_not_configured',
          blockers: ['database_not_configured'],
        };
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 2,
        connectionTimeoutMillis: 5000,
      });
      try {
        await pool.query('SELECT 1');
        const counts = await pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM content_sources WHERE source_approved = TRUE AND license_status = 'approved' AND content_hash IS NOT NULL) AS approved_sources,
            (SELECT COUNT(*)::int FROM content_sources cs WHERE cs.source_approved = FALSE AND EXISTS (SELECT 1 FROM source_approvals sa WHERE sa.source_id = cs.id AND sa.approval_status = 'pending_review')) AS pending_review_sources,
            (SELECT COUNT(*)::int FROM content_sources cs WHERE cs.source_approved = FALSE AND EXISTS (SELECT 1 FROM source_approvals sa WHERE sa.source_id = cs.id AND sa.approval_status = 'rejected')) AS blocked_sources,
            (SELECT COUNT(*)::int FROM content_sources cs WHERE cs.source_approved = FALSE AND NOT EXISTS (SELECT 1 FROM source_approvals sa WHERE sa.source_id = cs.id AND sa.approval_status IN ('pending_review', 'rejected'))) AS unverified_sources,
            (SELECT COUNT(*)::int FROM islamic_documents WHERE source_approved = TRUE AND licence_status = 'approved' AND content_hash IS NOT NULL) AS documents_indexed,
            (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE approved = TRUE AND approval_status = 'approved') AS chunks_indexed,
            (SELECT COUNT(*)::int FROM islamic_document_chunks WHERE COALESCE(jsonb_array_length(embedding_jsonb), 0) > 0) AS embeddings_indexed,
            (SELECT COUNT(*)::int FROM citation_registry WHERE approved = TRUE AND approval_status = 'approved') AS citations_indexed,
            (SELECT MAX(finished_at) FROM rag_ingestion_jobs WHERE status = 'succeeded') AS last_ingestion_at,
            (SELECT MAX(created_at) FROM rag_query_audit WHERE safety_status = 'verified_sources') AS last_verified_at,
            (SELECT MAX(created_at) FROM rag_query_audit WHERE algorithm_version IS NOT NULL) AS last_algorithm_test_at
        `);
        const row = counts.rows?.[0] || {};
        const approved_sources = Number(row.approved_sources || 0);
        const documents_indexed = Number(row.documents_indexed || 0);
        const chunks_indexed = Number(row.chunks_indexed || 0);
        const embeddings_indexed = Number(row.embeddings_indexed || 0);
        const citations_indexed = Number(row.citations_indexed || 0);
        const last_verified_at = row.last_verified_at || null;
        const last_algorithm_test_at = row.last_algorithm_test_at || null;
        const blockers = [];
        if (approved_sources === 0) blockers.push('no_approved_sources');
        if (documents_indexed === 0) blockers.push('no_documents_indexed');
        if (chunks_indexed === 0) blockers.push('no_chunks_indexed');
        if (embeddings_indexed === 0) blockers.push('no_embeddings_indexed');
        if (citations_indexed === 0) blockers.push('no_citations_indexed');
        if (!last_verified_at) blockers.push('no_verified_query');
        const algorithm_ready = isRahmaAlgorithmConfigured() && Boolean(last_algorithm_test_at);
        if (!algorithm_ready) blockers.push('algorithm_not_ready');
        return {
          mode: 'live',
          approved_sources,
          pending_review_sources: Number(row.pending_review_sources || 0),
          unverified_sources: Number(row.unverified_sources || 0),
          blocked_sources: Number(row.blocked_sources || 0),
          documents_indexed,
          chunks_indexed,
          embeddings_indexed,
          vector_embeddings_indexed: 0,
          citations_indexed,
          last_ingestion_at: row.last_ingestion_at || null,
          last_verified_at,
          last_algorithm_test_at,
          rag_ready: blockers.length === 0,
          algorithm_ready,
          algorithm_version: RAHMA_ALGORITHM_VERSION,
          blocker_reason: blockers[0] || null,
          blockers,
        };
      } catch (error) {
        return {
          mode: 'live',
          approved_sources: 0,
          pending_review_sources: 0,
          unverified_sources: 0,
          blocked_sources: 0,
          documents_indexed: 0,
          chunks_indexed: 0,
          embeddings_indexed: 0,
          citations_indexed: 0,
          last_ingestion_at: null,
          last_verified_at: null,
          last_algorithm_test_at: null,
          rag_ready: false,
          algorithm_ready: false,
          algorithm_version: RAHMA_ALGORITHM_VERSION,
          blocker_reason: 'rag_live_probe_failed',
          blockers: ['rag_live_probe_failed'],
          error_type: String(error?.code || error?.name || 'query_failed'),
        };
      } finally {
        await pool.end().catch(() => {});
      }
    }

    const ragStatus = await queryLiveRagStatus();
    const redis = await redisReadiness({ timeoutMs: 1500 });
    const localLlm = localLlmStatus();
    const wasmProbe = await wasmReadiness({ timeoutMs: 2000 });

    let pgvector = {
      configured: false,
      extension_present: false,
      embedding_column_present: false,
      vector_index_present: false,
      vector_rows: 0,
      ready: false,
    };
    if (db.configured && db.connected && typeof process.env.DATABASE_URL === 'string') {
      const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 2,
        connectionTimeoutMillis: 5000,
        options: '-c client_encoding=UTF8',
      });
      try {
        pgvector = await pgvectorReadiness(pgPool);
      } finally {
        await pgPool.end().catch(() => {});
      }
    }

    const wasmByName = {};
    for (const m of wasmProbe.modules) {
      wasmByName[m.name.replace(/-/g, '_')] = {
        configured: Boolean(m.configured),
        reachable: typeof m.reachable === 'boolean' ? m.reachable : false,
        execution_proven: Boolean(m.execution_proven),
        error_type: m.error_type || null,
      };
    }
    const donationProvider = String(process.env.DONATION_PROVIDER || '').trim().toLowerCase();
    const donationProviderConfigured =
      ['stripe', 'paypal', 'manual_offline'].includes(donationProvider);
    const islamicSourcesConfigured = ragStatus.approved_sources > 0;
    const ragConfigured = Boolean(
      ragStatus.approved_sources > 0
      && ragStatus.documents_indexed > 0
      && ragStatus.chunks_indexed > 0
      && ragStatus.embeddings_indexed > 0
      && ragStatus.citations_indexed > 0
      && (ragStatus.rag_ready || false),
    );
    const contentGovernanceEnabled = Boolean(
      isSheikhRepositoryConfigured() ||
      isSheikhAuditConfigured() ||
      envFlag('PUBLIC_ANSWER_MODERATION_REQUIRED', true) ||
      envFlag('CONTENT_GOVERNANCE_ENABLED', true),
    );
    const auth_ready = isAuthFoundationConfigured();
    const appStoreStatus = appStoreComplianceStatus();
    const azan_audio = getAzanAudioStatus();
    const notifications = getNotificationStatus();
    const gates = evaluateProductionGates({
      database_connected: db.connected,
      pgvector,
      rag: ragStatus,
      redis,
      wasm: wasmProbe,
      auth_ready,
      app_store: appStoreStatus,
      azan_audio,
      notifications: pushNotificationReadiness(),
    });
    const blockers = augmentFoundationBlockers(gates.blockers, {
      db,
      ragStatus,
      redis,
      wasmProbe,
      auth_ready,
      donationProviderConfigured,
    });
    const build = buildIdentity();
    const backend_production_ready = blockers.length === 0;
    const mobileStoreBlockers = [];
    if (appStoreStatus.approval_status !== 'approved' || !appStoreStatus.ready) {
      mobileStoreBlockers.push('app_store_compliance_not_ready');
    }
    if (azan_audio.production_ready === false && azan_audio.blocker !== 'azan_audio_license_or_hash_incomplete') {
      mobileStoreBlockers.push('azan_audio_not_resolved');
    }
    if (notifications.push_required && !notifications.native_notifications_configured) {
      mobileStoreBlockers.push('native_notifications_not_configured');
    }
    const mobile_store_ready = mobileStoreBlockers.length === 0;
    const production_ready = backend_production_ready;

    return {
      ok: true,
      readiness_schema_version: '2',
      service: 'rahma-api',
      legacy_service_name: 'sakina-backend',
      platform: 'mobile-only',
      public_ingress: 'disabled',
      public_ingress_state: { disabled: true, status: 'disabled' },
      version: build.version,
      git_commit: build.git_commit,
      database_configured: db.configured,
      database_connected: db.connected,
      rag_configured: ragConfigured,
      llm_configured: localLlm.configured,
      wasm_runtime_configured: wasmProbe.configured,
      wasm_ready: gates.wasm_ready,
      wasm_execution_proven: gates.wasm_execution_proven,
      app_store_compliance_ready: gates.app_store_compliance_ready,
      mobile_store_ready,
      mobile_store_blockers: mobileStoreBlockers,
      backend_production_ready,
      azan_audio_production_ready: gates.azan_audio_production_ready,
      notification_ready: gates.notification_ready,
      redis_ready: gates.redis_ready,
      auth_ready: gates.auth_ready,
      pgvector_ready: gates.pgvector_ready,
      content_governance_enabled: contentGovernanceEnabled,
      algorithm_ready: ragStatus.algorithm_ready,
      algorithm_version: ragStatus.algorithm_version,
      last_algorithm_test_at: ragStatus.last_algorithm_test_at,
      production_ready,
      blockers,
      database: {
        ...db,
        migration_table_exists,
        applied_migrations_count,
        pending_migrations_count: null,
      },
      redis: {
        configured: redis.configured,
        reachable: redis.reachable,
        ready: redis.ready,
        error_type: redis.error_type || null,
      },
      pgvector,
      local_llm: localLlm,
      wasm: {
        mode: wasmProbe.mode,
        configured: wasmProbe.configured,
        ready: gates.wasm_ready,
        reachable: wasmProbe.reachable,
        execution_proven: Boolean(wasmProbe.execution_proven),
        disable_approved: Boolean(wasmProbe.disable_approved),
        modules: wasmProbe.modules,
        fatwa_policy_gate: wasmByName.fatwa_policy_gate || {
          configured: false, reachable: false, execution_proven: false,
        },
        quran_hadith_citation: wasmByName.quran_hadith_citation || {
          configured: false, reachable: false, execution_proven: false,
        },
        child_safety: wasmByName.child_safety || {
          configured: false, reachable: false, execution_proven: false,
        },
        content_rule_engine: wasmByName.content_rule_engine || {
          configured: false, reachable: false, execution_proven: false,
        },
      },
      azan_audio,
      notifications,
      islamic_sources: {
        configured: islamicSourcesConfigured,
        approved_sources: ragStatus.approved_sources | 0,
      },
      donations: {
        configured: donationProviderConfigured,
        provider: donationProvider.length > 0 ? donationProvider : 'disabled',
      },
      auth: {
        configured: auth_ready,
        ready: auth_ready,
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
        compliance_status: appStoreStatus.approval_status,
        ready: appStoreStatus.ready,
        files_present: appStoreStatus.files_present,
        pages_wired: appStoreStatus.pages_wired,
        placeholder_free: appStoreStatus.placeholder_free,
        required: appStoreStatus.required,
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
        rag_registry_configured: ragStatus.approved_sources > 0,
        rag_retrieval_configured: Boolean(ragStatus.rag_ready),
      },
      safe_to_serve_public: production_ready,
      environment: process.env.NODE_ENV || 'staging',
    };
  });
}
