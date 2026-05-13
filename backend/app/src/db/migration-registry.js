/**
 * Migration registry — pure, file-system-based inventory of every SQL file
 * under backend/db/migrations/.
 *
 * Pure module:
 *   - No DB I/O at module level.
 *   - Computes pending = total - applied (clamped at 0).
 *   - Never echoes secrets, never reads DATABASE_URL itself.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'backend', 'db', 'migrations');

let _cache = null;

export function _resetMigrationRegistryCache() {
  _cache = null;
}

export async function listMigrationFiles() {
  if (_cache) return _cache;
  try {
    const entries = await fs.readdir(MIGRATIONS_DIR);
    const files = entries.filter((f) => f.endsWith('.sql')).sort();
    _cache = Object.freeze(files);
    return _cache;
  } catch {
    _cache = Object.freeze([]);
    return _cache;
  }
}

export async function countMigrationFiles() {
  const files = await listMigrationFiles();
  return files.length;
}

export async function hashMigrationFile(filename) {
  if (typeof filename !== 'string' || filename.length === 0) return null;
  if (!filename.endsWith('.sql')) return null;
  try {
    const full = path.join(MIGRATIONS_DIR, filename);
    const buf = await fs.readFile(full);
    return createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

export function pendingCount(totalMigrations, appliedCount) {
  const t = Number.isInteger(totalMigrations) ? totalMigrations : 0;
  const a = Number.isInteger(appliedCount) ? appliedCount : 0;
  const diff = t - a;
  return diff < 0 ? 0 : diff;
}
