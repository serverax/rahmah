/**
 * Cache entry point.
 *
 * Sprint 8 contract:
 *   - Memory mode is the only real backend. Redis adapter is NOT yet shipped.
 *   - If REDIS_URL is set, the backend reports `redis_url_configured: true`
 *     and `mode: "memory"`. The URL value is NEVER logged or echoed.
 *   - Every set() runs through isAllowedKey + isCacheableValue. Forbidden
 *     keys / values are silently dropped (no exception thrown).
 *   - safeSet helpers exist for the three high-value cases (public_qa list,
 *     public_qa detail, question_status) so route wrappers cannot accidentally
 *     bypass the policy.
 */

import { MemoryCache } from './memory-cache.js';
import {
  isAllowedKey,
  isCacheablePublicQAListEntry,
  isCacheablePublicQARow,
  isCacheableQuestionStatus,
  isCacheableValue,
} from './cache-policy.js';

let _cache = null;
let _configuredReason = null;

function buildCache() {
  // Future: if process.env.REDIS_URL is set AND the redis client is available,
  // attempt to construct a RedisCache. For Sprint 8 the redis client is not in
  // dependencies; the backend reports `mode: memory` even when REDIS_URL is set,
  // so misconfiguration never crashes the app.
  return new MemoryCache();
}

export function getCache() {
  if (!_cache) {
    _cache = buildCache();
    _configuredReason = process.env.REDIS_URL ? 'memory_fallback_no_redis_client' : 'memory_default';
  }
  return _cache;
}

export function isRedisUrlConfigured() {
  const v = process.env.REDIS_URL;
  return typeof v === 'string' && v.length > 0;
}

export function cacheStatusForReady() {
  // Lazy init so /ready never throws even before any route call has happened.
  if (!_cache) getCache();
  return Object.freeze({
    configured: _cache.configured,
    mode: _cache.mode,
    redis_url_configured: isRedisUrlConfigured(),
    external_network_required: false,
    safe_fallback_enabled: true,
  });
}

/**
 * Generic safe set — drops the value if the key or value is not allowed.
 */
export async function safeSet(key, value, ttlMs) {
  if (!isAllowedKey(key)) return false;
  if (!isCacheableValue(value)) return false;
  return getCache().set(key, value, ttlMs);
}

export async function safeGet(key) {
  if (!isAllowedKey(key)) return null;
  return getCache().get(key);
}

export async function safeDel(key) {
  if (!isAllowedKey(key)) return false;
  return getCache().del(key);
}

/* -----------------------------------------------------------------------------
 * High-value cacheable helpers — keyed and type-checked at this seam.
 * --------------------------------------------------------------------------- */

function listKey(language, category) {
  const lang = typeof language === 'string' && language.length ? language : 'any';
  const cat  = typeof category === 'string' && category.length ? category : 'any';
  return `sakina:public_qa:list:${lang}:${cat}`;
}

function detailKey(slug) {
  return `sakina:public_qa:detail:${typeof slug === 'string' ? slug : ''}`;
}

function statusKey(questionId) {
  return `sakina:question_status:${typeof questionId === 'string' ? questionId : ''}`;
}

export async function getPublicQAList({ language, category }) {
  return safeGet(listKey(language, category));
}

export async function setPublicQAList({ language, category, items }, ttlMs = 60_000) {
  if (!Array.isArray(items)) return false;
  for (const e of items) if (!isCacheablePublicQAListEntry(e)) return false;
  return safeSet(listKey(language, category), items, ttlMs);
}

export async function getPublicQADetail(slug) {
  return safeGet(detailKey(slug));
}

export async function setPublicQADetail(slug, row, ttlMs = 120_000) {
  if (!isCacheablePublicQARow(row)) return false;
  return safeSet(detailKey(slug), row, ttlMs);
}

export async function getQuestionStatus(questionId) {
  return safeGet(statusKey(questionId));
}

export async function setQuestionStatus(questionId, projection, ttlMs = 15_000) {
  if (!isCacheableQuestionStatus(projection)) return false;
  return safeSet(statusKey(questionId), projection, ttlMs);
}

/** Test-only reset. */
export function _resetCacheForTests() {
  _cache = null;
  _configuredReason = null;
}

/** Diagnostic (test/debug) — never user-facing. */
export function _cacheReason() { return _configuredReason; }
