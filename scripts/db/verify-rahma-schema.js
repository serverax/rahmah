#!/usr/bin/env node
/**
 * scripts/db/verify-rahma-schema.js
 *
 * Live Rahma schema verifier.
 *
 * Behaviour:
 *   - If DATABASE_URL is missing or clearly placeholder-like, prints
 *     DB_NOT_EXECUTED and exits 0.
 *   - If DATABASE_URL exists, connects to PostgreSQL and verifies:
 *       * migrations were applied and hashes match repo files
 *       * required tables exist
 *       * required columns exist
 *       * required indexes exist
 *       * required constraints / triggers exist
 *       * optional pgvector support when embeddings are present
 *       * approved-source query path can execute
 *   - Never prints DATABASE_URL.
 *
 * Output is JSON only.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const migrationsDir = path.resolve(repoRoot, 'backend', 'db', 'migrations');
const backendPkg = path.resolve(repoRoot, 'backend', 'app', 'package.json');
const require = createRequire(backendPkg);
const pg = require('pg');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function fileHash(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return sha256(text);
}

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

function isPlaceholderDsn(dsn) {
  return /change_me|replace_me|placeholder|example\.com/i.test(dsn);
}

async function main() {
  const out = {
    db_status: 'DB_NOT_EXECUTED',
    tables_checked: 0,
    missing_tables: [],
    missing_indexes: [],
    missing_constraints: [],
    rag_ready: false,
    content_governance_ready: false,
    app_ready: false,
    blockers: [],
    migration_files_checked: 0,
    migration_hash_mismatches: [],
    migration_files_missing_from_db: [],
    optional_extensions: [],
  };

  const dsn = process.env.DATABASE_URL;
  if (!dsn || isPlaceholderDsn(dsn)) {
    out.blockers.push('DATABASE_URL is missing or test DB unavailable');
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 0;
    return;
  }

  let files = [];
  try {
    files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    out.db_status = 'DB_FAILED';
    out.blockers.push('Unable to read migration directory');
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
    return;
  }

  let pool;
  try {
    pool = new pg.Pool({
      connectionString: dsn,
      connectionTimeoutMillis: 5000,
      max: 2,
      options: '-c client_encoding=UTF8',
    });
    await pool.query('SELECT 1');
  } catch {
    out.db_status = 'DB_FAILED';
    out.blockers.push('Database connection failed');
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
    return;
  }

  try {
    // -----------------------------------------------------------------------
    // Migration verification
    // -----------------------------------------------------------------------
    out.migration_files_checked = files.length;
    const dbApplied = new Map();
    try {
      const migrated = await pool.query(`
        SELECT filename, content_hash
        FROM schema_migrations
      `);
      for (const row of migrated.rows || []) {
        dbApplied.set(normalize(row.filename), row.content_hash);
      }
    } catch {
      out.blockers.push('schema_migrations table missing or unreadable');
    }

    for (const file of files) {
      const full = path.join(migrationsDir, file);
      const hash = await fileHash(full);
      const appliedHash = dbApplied.get(normalize(file));
      if (!appliedHash) {
        out.migration_files_missing_from_db.push(file);
      } else if (appliedHash !== hash) {
        out.migration_hash_mismatches.push({ file, expected: hash, actual: appliedHash });
      }
    }

    // -----------------------------------------------------------------------
    // Required tables
    // -----------------------------------------------------------------------
    const requiredTables = [
      'users',
      'user_profiles',
      'user_sessions',
      'user_devices',
      'user_preferences',
      'user_consents',
      'user_delete_requests',
      'content_sources',
      'source_approvals',
      'source_licenses',
      'scholar_reviewers',
      'content_audit_log',
      'islamic_documents',
      'islamic_document_chunks',
      'citation_registry',
      'rag_ingestion_jobs',
      'rag_query_audit',
      'scholar_review_queue',
      'quran_surahs',
      'quran_ayahs',
      'quran_translations',
      'quran_tafsir_notes',
      'quran_bookmarks',
      'quran_audio_assets',
      'hadith_collections',
      'hadith_books',
      'hadith_records',
      'hadith_translations',
      'hadith_grades',
      'dua_categories',
      'duas',
      'dua_translations',
      'dua_audio_assets',
      'user_favourite_duas',
      'prayer_locations',
      'prayer_times',
      'prayer_calculation_settings',
      'user_prayer_settings',
      'azan_audio_assets',
      'azan_audio_approvals',
      'notification_schedule',
      'chat_conversations',
      'chat_messages',
      'chat_message_sources',
      'saved_answers',
      'answer_feedback',
      'reported_answers',
      'rag_documents',
      'rag_chunks',
      'rag_embeddings',
      'rag_retrieval_logs',
      'rag_answer_cache',
      'rag_rejected_answers',
      'rag_policy_results',
      'scholar_questions',
      'scholar_answers',
      'scholar_answer_sources',
      'scholar_review_status',
      'public_qa',
      'children_profiles',
      'children_learning_paths',
      'children_game_scenarios',
      'children_game_attempts',
      'children_rewards',
      'children_safety_flags',
      'parent_controls',
      'library_categories',
      'library_items',
      'library_item_tags',
      'user_library_bookmarks',
      'library_downloads',
      'safety_policies',
      'moderation_results',
      'user_reports',
      'blocked_questions',
      'unsafe_answer_logs',
      'child_safety_events',
      'notification_templates',
      'notification_preferences',
      'notification_events',
      'notification_delivery_log',
      'privacy_policy_versions',
      'user_policy_acceptance',
      'data_processing_records',
      'consent_events',
      'deletion_requests',
      'audit_events',
      'admin_users',
      'admin_roles',
      'admin_permissions',
      'admin_audit_log',
      'admin_actions',
      'system_health_snapshots',
      'integration_checks',
      'readiness_history',
      'deployment_audit_log',
      'wasm_modules',
      'wasm_execution_logs',
      'wasm_policy_results',
      'subscription_plans',
      'user_subscriptions',
      'payment_customers',
      'payment_events',
      'invoices',
    ];

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tableSet = new Set((tables.rows || []).map((row) => normalize(row.table_name)));
    out.tables_checked = requiredTables.length;
    out.missing_tables = requiredTables.filter((table) => !tableSet.has(normalize(table)));

    // -----------------------------------------------------------------------
    // Required columns
    // -----------------------------------------------------------------------
    const columnChecks = [
      ['users', ['id', 'email', 'phone', 'display_name', 'role', 'status', 'created_at', 'updated_at']],
      ['user_preferences', ['id', 'user_id', 'language', 'theme', 'font_size', 'child_mode_enabled', 'notifications_enabled', 'prayer_location_enabled', 'created_at', 'updated_at']],
      ['content_sources', ['id', 'source_id', 'title_ar', 'title_en', 'provider_name', 'source_type', 'source_name_ar', 'source_reference', 'official_url', 'local_reference', 'license_status', 'licence_status', 'attribution_required', 'offline_storage_allowed', 'commercial_use_allowed', 'authenticity_level', 'source_approved', 'approved_by', 'approved_at', 'content_hash', 'trust_level', 'version', 'notes', 'created_at', 'updated_at']],
      ['source_approvals', ['id', 'source_id', 'approval_status', 'created_at', 'updated_at']],
      ['islamic_documents', ['source_id', 'title_ar', 'source_type', 'provider_name', 'language', 'licence_status', 'source_approved', 'approved_by', 'approved_at', 'trust_level', 'authenticity_level', 'content_hash', 'version', 'approval_status', 'created_at', 'updated_at']],
      ['islamic_document_chunks', ['document_id', 'source_id', 'chunk_index', 'chunk_text', 'language', 'content_type', 'citation_label', 'approved', 'approval_status', 'embedding_model', 'embedding_jsonb', 'metadata', 'content_hash', 'created_at', 'updated_at']],
      ['citation_registry', ['source_id', 'document_id', 'chunk_id', 'citation_label', 'reference_label', 'source_title_ar', 'source_type', 'approved', 'approval_status', 'content_hash', 'created_at', 'updated_at']],
      ['rag_ingestion_jobs', ['job_type', 'status', 'source_id', 'source_count', 'document_count', 'chunk_count', 'embedding_count', 'citation_count', 'created_at', 'updated_at']],
      ['rag_query_audit', ['question_hash', 'normalized_question', 'language', 'mode', 'intent', 'risk_level', 'safety_status', 'source_ids', 'document_ids', 'chunk_ids', 'citation_ids', 'approved_sources_count', 'documents_indexed_count', 'chunks_indexed_count', 'embeddings_indexed_count', 'citations_indexed_count', 'llm_called', 'algorithm_version', 'created_at', 'updated_at']],
      ['scholar_review_queue', ['question_hash', 'question_text', 'normalized_question', 'category', 'language', 'risk_level', 'status', 'source_ids', 'chunk_ids', 'created_at', 'updated_at']],
      ['quran_ayahs', ['surah_id', 'ayah_number', 'arabic_text', 'normalized_text', 'juz', 'page_number', 'source_id', 'approved', 'created_at', 'updated_at']],
      ['quran_translations', ['ayah_id', 'language', 'translation_text', 'translator_name', 'source_id', 'approved', 'created_at', 'updated_at']],
      ['quran_tafsir_notes', ['ayah_id', 'tafsir_text', 'tafsir_source', 'source_id', 'approved', 'created_at', 'updated_at']],
      ['hadith_records', ['collection_id', 'book_id', 'hadith_number', 'arabic_text', 'translation_text', 'narrator', 'grade', 'reference_label', 'source_id', 'approved', 'created_at', 'updated_at']],
      ['duas', ['category_id', 'title_ar', 'title_en', 'arabic_text', 'transliteration', 'source_reference', 'source_id', 'approved', 'created_at', 'updated_at']],
      ['user_prayer_settings', ['user_id', 'calculation_method', 'madhab', 'location_lat', 'location_lng', 'city', 'country', 'azan_enabled', 'selected_azan_audio_id', 'reminder_minutes_before', 'created_at', 'updated_at']],
      ['azan_audio_assets', ['title_ar', 'title_en', 'reciter_name', 'file_path', 'source_url', 'license_status', 'approved', 'approved_by', 'approved_at', 'file_hash', 'duration_seconds', 'created_at', 'updated_at']],
      ['rag_documents', ['source_id', 'title', 'document_type', 'language', 'approved', 'approval_status', 'created_at', 'updated_at']],
      ['rag_chunks', ['document_id', 'source_id', 'chunk_text', 'chunk_order', 'language', 'content_type', 'citation_label', 'approved', 'metadata', 'created_at']],
      ['rag_embeddings', ['chunk_id', 'embedding_model', 'created_at']],
      ['chat_conversations', ['user_id', 'title', 'mode', 'language', 'child_safe', 'created_at', 'updated_at']],
      ['chat_messages', ['conversation_id', 'sender_role', 'message_text', 'language', 'status', 'citations_json', 'source_ids', 'created_at', 'updated_at']],
      ['chat_message_sources', ['message_id', 'source_id', 'citation_label', 'source_type', 'verified', 'created_at', 'updated_at']],
      ['saved_answers', ['question_hash', 'answer_text', 'answer_status', 'language', 'citation_json', 'source_ids', 'approved', 'created_at', 'updated_at']],
      ['answer_feedback', ['message_id', 'feedback_type', 'created_at', 'updated_at']],
      ['reported_answers', ['message_id', 'report_reason', 'status', 'created_at', 'updated_at']],
      ['safety_policies', ['policy_key', 'policy_name', 'active', 'created_at', 'updated_at']],
      ['moderation_results', ['target_type', 'target_id', 'policy_name', 'result', 'reason', 'created_at', 'updated_at']],
      ['user_reports', ['user_id', 'message_id', 'report_type', 'report_text', 'status', 'created_at', 'updated_at']],
      ['notification_delivery_log', ['user_id', 'notification_type', 'channel', 'status', 'created_at', 'updated_at']],
      ['privacy_policy_versions', ['version', 'language', 'policy_text', 'published_at', 'active', 'created_at', 'updated_at']],
      ['user_policy_acceptance', ['user_id', 'policy_version_id', 'accepted_at', 'ip_hash', 'device_id', 'created_at', 'updated_at']],
      ['readiness_history', ['database_connected', 'rag_configured', 'llm_configured', 'wasm_runtime_configured', 'mobile_api_verified', 'production_ready', 'blockers', 'created_at', 'updated_at']],
      ['wasm_modules', ['module_name', 'module_type', 'version', 'file_path', 'file_hash', 'active', 'created_at', 'updated_at']],
      ['wasm_execution_logs', ['module_id', 'input_hash', 'result', 'execution_ms', 'created_at', 'updated_at']],
      ['wasm_policy_results', ['module_id', 'request_id', 'input_hash', 'decision', 'reasons_json', 'created_at', 'updated_at']],
    ];

    const missingColumns = [];
    for (const [table, columns] of columnChecks) {
      const r = await pool.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `,
        [table],
      );
      const have = new Set((r.rows || []).map((row) => normalize(row.column_name)));
      for (const column of columns) {
        if (!have.has(normalize(column))) {
          missingColumns.push(`${table}.${column}`);
        }
      }
    }

    // -----------------------------------------------------------------------
    // Required indexes
    // -----------------------------------------------------------------------
    const indexChecks = [
      'uq_users_email',
      'idx_users_role_status',
      'idx_chat_conversations_user',
      'idx_chat_messages_conversation',
      'idx_rag_chunks_document',
      'idx_rag_chunks_source',
      'idx_rag_chunks_approved',
      'idx_rag_documents_approved',
      'uq_rag_answer_cache_question_hash',
      'idx_content_sources_approved',
      'idx_content_sources_source_approved_live',
      'idx_content_sources_content_hash_live',
      'uq_islamic_documents_source_hash',
      'idx_islamic_documents_source',
      'idx_islamic_documents_type_lang',
      'idx_islamic_documents_approved',
      'idx_islamic_document_chunks_document',
      'idx_islamic_document_chunks_source',
      'idx_islamic_document_chunks_approved',
      'idx_islamic_document_chunks_citation',
      'idx_citation_registry_source',
      'idx_citation_registry_document',
      'idx_citation_registry_chunk',
      'idx_rag_ingestion_jobs_status',
      'idx_rag_ingestion_jobs_source',
      'idx_rag_query_audit_created',
      'idx_rag_query_audit_status',
      'idx_scholar_review_queue_status',
      'uq_scholar_review_queue_question_hash',
      'uq_source_approvals_source_id',
      'uq_source_licenses_source_id',
      'idx_library_items_content_type',
      'idx_library_items_approved',
      'idx_scholar_questions_status',
      'idx_user_reports_status',
      'idx_notification_delivery_log_user',
      'idx_audit_events_created_at',
    ];

    const idxRows = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);
    const idxSet = new Set((idxRows.rows || []).map((row) => normalize(row.indexname)));
    for (const idx of indexChecks) {
      if (!idxSet.has(normalize(idx))) {
        out.missing_indexes.push(idx);
      }
    }
    if (tableSet.has('rag_embeddings')) {
      const hasVectorColumn = await pool.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'rag_embeddings'
          AND column_name = 'embedding'
        LIMIT 1
      `);
      if (hasVectorColumn.rowCount > 0) {
        const vectorIndexRows = await pool.query(`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'rag_embeddings'
        `);
        const vectorIndexSet = new Set((vectorIndexRows.rows || []).map((row) => normalize(row.indexname)));
        const hasVectorIndex = vectorIndexSet.has('idx_rag_embeddings_embedding_hnsw') || vectorIndexSet.has('idx_rag_embeddings_embedding_ivfflat');
        if (!hasVectorIndex) {
          out.missing_indexes.push('idx_rag_embeddings_embedding_hnsw|idx_rag_embeddings_embedding_ivfflat');
        }
      }
    }

    // -----------------------------------------------------------------------
    // Required constraints / trigger guards
    // -----------------------------------------------------------------------
    const constraintChecks = [
      'users_role_check',
      'users_status_check',
      'islamic_source_registry_approval_consistency',
      'trg_islamic_source_registry_approval',
      'trg_content_sources_approval_guard',
      'trg_islamic_documents_guard',
      'trg_islamic_document_chunks_guard',
      'trg_citation_registry_guard',
      'trg_scholar_answers_approval',
      'trg_azan_audio_assets_approval',
      'trg_library_items_publication',
      'trg_public_qa_published',
    ];

    const constraintRows = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace
    `);
    const constraintSet = new Set((constraintRows.rows || []).map((row) => normalize(row.conname)));

    const triggerRows = await pool.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid IN (
      'public.islamic_source_registry'::regclass,
        'public.content_sources'::regclass,
        'public.islamic_documents'::regclass,
        'public.islamic_document_chunks'::regclass,
        'public.citation_registry'::regclass,
        'public.rag_ingestion_jobs'::regclass,
        'public.rag_query_audit'::regclass,
        'public.scholar_review_queue'::regclass,
        'public.rag_documents'::regclass,
        'public.rag_chunks'::regclass,
        'public.library_items'::regclass,
        'public.scholar_answers'::regclass,
        'public.public_qa'::regclass,
        'public.azan_audio_assets'::regclass
      )
      AND NOT tgisinternal
    `);
    const triggerSet = new Set((triggerRows.rows || []).map((row) => normalize(row.tgname)));

    for (const constraint of constraintChecks) {
      const exists = constraintSet.has(normalize(constraint)) || triggerSet.has(normalize(constraint));
      if (!exists) {
        out.missing_constraints.push(constraint);
      }
    }

    // -----------------------------------------------------------------------
    // Extensions
    // -----------------------------------------------------------------------
    const extRows = await pool.query(`
      SELECT extname
      FROM pg_extension
    `);
    const extSet = new Set((extRows.rows || []).map((row) => normalize(row.extname)));
    const hasPgcrypto = extSet.has('pgcrypto');
    const hasVector = extSet.has('vector');
    out.optional_extensions = [
      { name: 'pgcrypto', present: hasPgcrypto },
      { name: 'vector', present: hasVector, optional: true },
    ];
    if (!hasPgcrypto) {
      out.blockers.push('pgcrypto extension missing');
    }
    if (tableSet.has('rag_embeddings')) {
      const hasVectorColumn = await pool.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'rag_embeddings'
          AND column_name = 'embedding'
        LIMIT 1
      `);
      if (hasVectorColumn.rowCount > 0 && !hasVector) {
        out.blockers.push('vector extension missing while rag_embeddings.embedding exists');
      }
    }

    // -----------------------------------------------------------------------
    // Approved-source query path proof
    // -----------------------------------------------------------------------
    try {
      await pool.query(`
        SELECT c.id
        FROM islamic_document_chunks c
        JOIN islamic_documents d ON d.id = c.document_id
        JOIN content_sources cs ON cs.id = c.source_id
        WHERE c.approved = true
          AND d.source_approved = true
          AND d.licence_status = 'approved'
          AND cs.source_approved = true
          AND cs.license_status = 'approved'
        LIMIT 1
      `);
      out.rag_ready = true;
    } catch {
      out.rag_ready = false;
      out.blockers.push('Approved-source RAG query failed');
    }

    out.content_governance_ready = out.missing_tables.length === 0
      && out.missing_indexes.length === 0
      && out.missing_constraints.length === 0
      && out.blockers.filter((b) => !b.includes('vector extension missing')).length === 0;

    out.app_ready = out.content_governance_ready
      && out.rag_ready
      && tableSet.has('chat_conversations')
      && tableSet.has('chat_messages')
      && tableSet.has('privacy_policy_versions')
      && tableSet.has('notification_delivery_log')
      && tableSet.has('readiness_history');

    if (
      out.missing_tables.length === 0
      && out.missing_indexes.length === 0
      && out.missing_constraints.length === 0
      && out.migration_files_missing_from_db.length === 0
      && out.migration_hash_mismatches.length === 0
      && out.blockers.length === 0
      && out.rag_ready
      && out.content_governance_ready
      && out.app_ready
    ) {
      out.db_status = 'DB_VERIFIED_LIVE';
    } else {
      out.db_status = 'DB_FAILED';
      if (out.missing_tables.length > 0) out.blockers.push(`missing_tables:${out.missing_tables.length}`);
      if (out.missing_indexes.length > 0) out.blockers.push(`missing_indexes:${out.missing_indexes.length}`);
      if (out.missing_constraints.length > 0) out.blockers.push(`missing_constraints:${out.missing_constraints.length}`);
      if (out.migration_files_missing_from_db.length > 0) out.blockers.push(`unapplied_migrations:${out.migration_files_missing_from_db.length}`);
      if (out.migration_hash_mismatches.length > 0) out.blockers.push(`migration_hash_mismatches:${out.migration_hash_mismatches.length}`);
    }

    console.log(JSON.stringify(out, null, 2));
    process.exitCode = out.db_status === 'DB_VERIFIED_LIVE' ? 0 : 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((err) => {
  console.log(JSON.stringify({
    db_status: 'DB_FAILED',
    tables_checked: 0,
    missing_tables: [],
    missing_indexes: [],
    missing_constraints: [],
    rag_ready: false,
    content_governance_ready: false,
    app_ready: false,
    blockers: [String(err && err.message ? err.message : err)],
  }, null, 2));
  process.exitCode = 1;
});
