import { isAuthConfigured, getAuthMode } from '../auth/auth-config.js';
import { getWasmRuntimeMode, isWasmDisableFormallyApproved } from './wasm-probe.js';
import { getAzanAudioStatus } from './azan-probe.js';
import { pushNotificationReadiness } from './notification-probe.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** Host dev: four levels up to monorepo root. Docker: set RAHMA_REPO_ROOT=/app with mounted data/docs/apps volumes. */
const REPO_ROOT = process.env.RAHMA_REPO_ROOT
  ? path.resolve(process.env.RAHMA_REPO_ROOT)
  : path.resolve(__dirname, '..', '..', '..', '..');

function envFlag(name, fallback) {
  const v = process.env[name];
  if (typeof v !== 'string') return fallback;
  const t = v.toLowerCase();
  if (t === 'true') return true;
  if (t === 'false') return false;
  return fallback;
}

function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
  } catch {
    return null;
  }
}

const APP_STORE_REQUIRED = Object.freeze([
  {
    key: 'privacy_policy',
    doc: 'docs/app-store/PRIVACY_POLICY_DRAFT.md',
    page: 'apps/web/public/privacy.html',
    terms: ['privacy', 'خصوصية'],
  },
  {
    key: 'terms',
    doc: 'docs/app-store/TERMS_AND_CONDITIONS_DRAFT.md',
    page: 'apps/web/public/terms.html',
    terms: ['terms', 'شروط'],
  },
  {
    key: 'child_safety',
    doc: 'docs/app-store/CHILD_SAFETY_POLICY_DRAFT.md',
    page: 'apps/web/public/child-safety.html',
    terms: ['child', 'children', 'أطفال'],
  },
  {
    key: 'islamic_ai_disclaimer',
    doc: 'docs/app-store/AI_ISLAMIC_DISCLAIMER.md',
    page: 'apps/web/public/ask.html',
    terms: ['scholar', 'مصادر', 'مراجعة'],
  },
  {
    key: 'account_deletion',
    doc: 'docs/app-store/ACCOUNT_DELETION_POLICY_DRAFT.md',
    page: 'apps/web/public/account-deletion.html',
    terms: ['deletion', 'حذف'],
  },
  {
    key: 'data_handling',
    doc: 'docs/compliance/RAHMA_PRIVACY_AND_DATA_SAFETY_MODEL.md',
    page: 'apps/web/public/data-export.html',
    terms: ['data', 'بيانات'],
  },
  {
    key: 'support_contact',
    doc: 'docs/compliance/RAHMA_APP_STORE_COMPLIANCE_REQUIREMENTS.md',
    page: 'apps/web/public/support.html',
    terms: ['support', 'دعم'],
  },
]);

function appStoreFilesStatus() {
  const required = APP_STORE_REQUIRED.map((item) => {
    const docText = readText(item.doc);
    const pageText = readText(item.page);
    const docPresent = typeof docText === 'string' && docText.trim().length >= 40;
    const pagePresent = typeof pageText === 'string' && pageText.trim().length >= 200;
    const pageSansHints = String(pageText || '').replace(/\splaceholder\s*=\s*("[^"]*"|'[^']*')/gi, '');
    const haystack = `${docText || ''}\n${pageSansHints}`.toLowerCase();
    const contentMatches = item.terms.some((term) => haystack.includes(String(term).toLowerCase()));
    const hasPlaceholder = /\brahma\.example\.com\b|@example\.com\b|\bTODO\b|\bCHANGE_ME\b|\bPLACEHOLDER_TEXT\b/i.test(haystack);
    return {
      key: item.key,
      doc: item.doc,
      page: item.page,
      doc_present: docPresent,
      page_present: pagePresent,
      wired: pagePresent && contentMatches,
      placeholder_free: !hasPlaceholder,
      ready: docPresent && pagePresent && contentMatches && !hasPlaceholder,
    };
  });
  return {
    required,
    files_present: required.every((item) => item.doc_present && item.page_present),
    pages_wired: required.every((item) => item.wired),
    placeholder_free: required.every((item) => item.placeholder_free),
    ready: required.every((item) => item.ready),
  };
}

function appStoreComplianceStatus() {
  const status = String(process.env.APP_STORE_COMPLIANCE_STATUS || 'pending').toLowerCase();
  const approval_status = ['approved', 'pending', 'blocked'].includes(status) ? status : 'pending';
  const files = appStoreFilesStatus();
  return {
    approval_status,
    ready: approval_status === 'approved' && files.ready,
    ...files,
  };
}

function requiredSecretsPresent({ app_store = appStoreComplianceStatus() } = {}) {
  const blockers = [];
  if (!process.env.DATABASE_URL || /CHANGE_ME|REPLACE_ME/i.test(process.env.DATABASE_URL)) {
    blockers.push('database_url_missing');
  }
  if (!process.env.REDIS_URL || /CHANGE_ME|REPLACE_ME/i.test(process.env.REDIS_URL)) {
    blockers.push('redis_url_missing');
  }
  const wasmMode = getWasmRuntimeMode();
  if (wasmMode === 'required') {
    for (const key of [
      'WASM_FATWA_POLICY_GATE_URL',
      'WASM_QURAN_HADITH_CITATION_URL',
      'WASM_CHILD_SAFETY_URL',
      'WASM_CONTENT_RULE_ENGINE_URL',
    ]) {
      if (!process.env[key]) blockers.push(`${key.toLowerCase()}_missing`);
    }
  }
  if (!isAuthConfigured()) blockers.push('auth_not_configured');
  if (app_store.approval_status !== 'approved') blockers.push('app_store_compliance_pending');
  if (!app_store.ready) blockers.push('app_store_compliance_not_ready');
  return blockers;
}

function evaluateWasmGate(wasm = {}) {
  const blockers = [];
  const mode = wasm.mode || getWasmRuntimeMode();

  if (mode === 'disabled') {
    if (!isWasmDisableFormallyApproved() || wasm.disable_approved !== true) {
      blockers.push('wasm_disable_not_approved');
    }
    if (wasm.execution_proven === true) {
      blockers.push('wasm_disabled_but_execution_claimed');
    }
    return blockers;
  }

  if (!wasm?.ready) blockers.push('wasm_not_ready');
  if (!wasm?.execution_proven) blockers.push('wasm_execution_not_proven');
  if (!wasm?.reachable) blockers.push('wasm_not_reachable');
  return blockers;
}

/**
 * Truthful production gate — never returns production_ready=true unless every gate passes.
 */
export function evaluateProductionGates({
  database_connected = false,
  pgvector = {},
  rag = {},
  redis = {},
  wasm = {},
  auth_ready = false,
  app_store = appStoreComplianceStatus(),
  azan_audio = getAzanAudioStatus(),
  notifications = pushNotificationReadiness(),
} = {}) {
  const blockers = [];

  if (!database_connected) blockers.push('database_not_connected');
  if (!pgvector?.ready) blockers.push('pgvector_not_ready');
  if (!rag?.rag_ready) blockers.push('rag_not_ready');
  if (!rag?.algorithm_ready) blockers.push('algorithm_not_ready');
  if (!redis?.ready) blockers.push('redis_not_ready');
  if (!auth_ready) blockers.push('auth_not_ready');
  if (!azan_audio?.production_ready) blockers.push('azan_audio_not_production_ready');
  if (!notifications?.push_production_ready) blockers.push('push_notifications_not_ready');

  for (const wasmBlocker of evaluateWasmGate(wasm)) {
    if (!blockers.includes(wasmBlocker)) blockers.push(wasmBlocker);
  }

  for (const secretBlocker of requiredSecretsPresent({ app_store })) {
    if (!blockers.includes(secretBlocker)) blockers.push(secretBlocker);
  }

  const wasmMode = wasm.mode || getWasmRuntimeMode();
  const wasm_ready = wasmMode === 'disabled'
    ? Boolean(wasm.disable_approved)
    : Boolean(wasm.ready && wasm.execution_proven);

  return {
    production_ready: blockers.length === 0,
    blockers,
    auth_ready,
    redis_ready: Boolean(redis?.ready),
    pgvector_ready: Boolean(pgvector?.ready),
    wasm_ready,
    wasm_execution_proven: Boolean(wasm.execution_proven),
    rag_ready: Boolean(rag?.rag_ready),
    algorithm_ready: Boolean(rag?.algorithm_ready),
    app_store_compliance_status: app_store.approval_status,
    app_store_ready: Boolean(app_store.ready),
    app_store_compliance_ready: Boolean(app_store.ready),
    azan_audio_production_ready: Boolean(azan_audio.production_ready),
    notification_ready: Boolean(notifications.push_production_ready),
    auth_mode: getAuthMode(),
    wasm_mode: wasmMode,
  };
}

export { requiredSecretsPresent, envFlag, evaluateWasmGate, appStoreComplianceStatus };
