/**
 * In-process memory cache with TTL.
 *
 * Properties:
 *   - Fail-safe: get/set/del never throw; they swallow internal errors.
 *   - Eviction: simple expiry-driven; opportunistic when get/set is called.
 *   - Bounded size: hard cap on entries; oldest evicted first when at cap.
 *   - No logging of values; no logging of keys that could contain PII.
 *
 * This is the default cache backend for Sakina. A Redis adapter may replace
 * it in a future sprint without changing call sites.
 */

const DEFAULT_TTL_MS = 60_000;
const HARD_MAX_ENTRIES = 2000;

export class MemoryCache {
  constructor({ maxEntries = HARD_MAX_ENTRIES, now = () => Date.now() } = {}) {
    this._store = new Map();        // key -> { value, expiresAt }
    this._maxEntries = Number.isInteger(maxEntries) && maxEntries > 0 ? maxEntries : HARD_MAX_ENTRIES;
    this._now = typeof now === 'function' ? now : () => Date.now();
  }

  get mode() { return 'memory'; }
  get configured() { return true; }

  async get(key) {
    try {
      if (typeof key !== 'string' || key.length === 0) return null;
      const entry = this._store.get(key);
      if (!entry) return null;
      if (this._now() >= entry.expiresAt) {
        this._store.delete(key);
        return null;
      }
      return entry.value;
    } catch {
      return null;
    }
  }

  async set(key, value, ttlMs = DEFAULT_TTL_MS) {
    try {
      if (typeof key !== 'string' || key.length === 0) return false;
      if (value === undefined) return false;
      const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
      const expiresAt = this._now() + ttl;
      // Evict expired entries opportunistically.
      this._evictOneIfFull();
      this._store.set(key, { value, expiresAt });
      return true;
    } catch {
      return false;
    }
  }

  async del(key) {
    try {
      if (typeof key !== 'string' || key.length === 0) return false;
      return this._store.delete(key);
    } catch {
      return false;
    }
  }

  size() { return this._store.size; }

  _evictOneIfFull() {
    if (this._store.size < this._maxEntries) return;
    // Map iteration is insertion-ordered; the first key is the oldest.
    const firstKey = this._store.keys().next().value;
    if (firstKey !== undefined) this._store.delete(firstKey);
  }

  // Test-only helpers.
  _reset() { this._store.clear(); }
}
