/**
 * backend/app/test/azan-readiness.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('GET /ready: contains azan_audio and notifications status', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    
    assert.ok(body.azan_audio, 'missing azan_audio block');
    assert.ok(body.notifications, 'missing notifications block');
    
    assert.equal(typeof body.azan_audio.configured, 'boolean');
    assert.equal(typeof body.azan_audio.assets_available, 'boolean');
    
    assert.equal(typeof body.notifications.azan_alerts_configured, 'boolean');
    assert.equal(typeof body.notifications.native_notifications_configured, 'boolean');
    assert.equal(typeof body.notifications.fcm_configured, 'boolean');
    assert.equal(typeof body.notifications.apns_configured, 'boolean');
  } finally {
    await app.close();
  }
});
