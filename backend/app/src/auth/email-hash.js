/**
 * Email-hash helper.
 *
 * Stored identifier for allow-listed sheikh/admin accounts is a sha-256 of
 * the lowercased trimmed email — the raw email is never stored or logged.
 */

import { createHash } from 'node:crypto';

export function hashEmail(email) {
  if (typeof email !== 'string') return null;
  const t = email.trim().toLowerCase();
  if (t.length === 0) return null;
  return createHash('sha256').update(t).digest('hex');
}

export function isValidEmailHash(h) {
  return typeof h === 'string' && /^[a-f0-9]{64}$/.test(h);
}
