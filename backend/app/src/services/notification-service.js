/**
 * backend/app/src/services/notification-service.js
 */

const NOTIFICATION_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  URGENT: 'urgent'
};

export function createNotificationService({ pool } = {}) {
  const hasPool = Boolean(pool);

  async function createNotification({
    user_id,
    title_ar,
    title_en,
    body_ar,
    body_en,
    level = NOTIFICATION_LEVELS.INFO,
    metadata = {}
  }) {
    if (!hasPool) {
      console.log(`[Notification Mock] To: ${user_id}, Title: ${title_ar}`);
      return { ok: true, persisted: false };
    }

    const sql = `
      INSERT INTO user_notifications (user_id, title_ar, title_en, body_ar, body_en, level, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    try {
      const res = await pool.query(sql, [
        user_id, title_ar, title_en, body_ar, body_en, level, JSON.stringify(metadata)
      ]);
      return { ok: true, id: res.rows[0].id, persisted: true };
    } catch (err) {
      return { ok: false, error: 'persistence_failed' };
    }
  }

  async function pushToDevice({ user_id, title, body }) {
    // This would call FCM/APNs.
    // For now, it's a stub as per PENDING rules.
    return { ok: true, status: 'pending_credentials' };
  }

  return {
    createNotification,
    pushToDevice,
    NOTIFICATION_LEVELS
  };
}
