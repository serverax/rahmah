/**
 * GET /api/db/status — honest DB snapshot. Never echoes DATABASE_URL.
 *
 * When DATABASE_URL is missing: returns `database_configured: false`.
 * When set: probes with a short timeout; reports `database_reachable`,
 * `migration_table_exists`, and `applied_migrations_count`. All errors are
 * redacted before being surfaced.
 */

import { isDatabaseConfigured } from '../db/config.js';
import { safeQueryOne } from '../db/query.js';
import { countMigrationFiles, pendingCount } from '../db/migration-registry.js';

const DB_NOT_CONFIGURED_AR = 'قاعدة البيانات غير مفعلة بعد';
const DB_UNREACHABLE_AR = 'قاعدة البيانات مهيأة لكنها غير قابلة للوصول حالياً.';
const DB_READY_AR = 'قاعدة البيانات جاهزة. تم تطبيق المهاجرات.';
const DB_NO_MIGRATIONS_AR = 'قاعدة البيانات متصلة لكن لم تُطبَّق المهاجرات بعد.';

export default async function dbRoute(fastify) {
  fastify.get('/status', async (req, reply) => {
    const total = await countMigrationFiles();
    if (!isDatabaseConfigured()) {
      return reply.send({
        ok: true,
        database_configured: false,
        database_reachable: false,
        migration_table_exists: false,
        applied_migrations_count: 0,
        pending_migrations_count: null,
        total_migration_files: total,
        last_error_redacted: null,
        safe_message_ar: DB_NOT_CONFIGURED_AR,
      });
    }
    const ping = await safeQueryOne('SELECT 1 AS one');
    if (!ping.ok) {
      return reply.send({
        ok: true,
        database_configured: true,
        database_reachable: false,
        migration_table_exists: false,
        applied_migrations_count: 0,
        pending_migrations_count: null,
        total_migration_files: total,
        last_error_redacted: ping.reason || 'unreachable',
        safe_message_ar: DB_UNREACHABLE_AR,
      });
    }
    const m = await safeQueryOne("SELECT to_regclass('public.schema_migrations') AS t");
    const exists = Boolean(m.ok && m.row && m.row.t);
    let count = 0;
    if (exists) {
      const c = await safeQueryOne('SELECT COUNT(*)::int AS n FROM schema_migrations');
      if (c.ok && c.row) count = c.row.n | 0;
    }
    return reply.send({
      ok: true,
      database_configured: true,
      database_reachable: true,
      migration_table_exists: exists,
      applied_migrations_count: count,
      pending_migrations_count: pendingCount(total, count),
      total_migration_files: total,
      last_error_redacted: null,
      safe_message_ar: exists ? DB_READY_AR : DB_NO_MIGRATIONS_AR,
    });
  });
}
