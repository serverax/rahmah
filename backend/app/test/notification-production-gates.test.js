import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushNotificationReadiness } from '../src/infra/notification-probe.js';
import { evaluateProductionGates } from '../src/infra/production-gates.js';

function envSnap() {
  return {
    FCM_SERVER_KEY: process.env.FCM_SERVER_KEY,
    APNS_P8_KEY: process.env.APNS_P8_KEY,
    PUSH_NOTIFICATIONS_PRODUCTION_REQUIRED: process.env.PUSH_NOTIFICATIONS_PRODUCTION_REQUIRED,
    IOS_PUSH_REQUIRED: process.env.IOS_PUSH_REQUIRED,
  };
}

function envRestore(s) {
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

test('pushNotificationReadiness: reports fcm/apns booleans without secrets', () => {
  const s = envSnap();
  process.env.FCM_SERVER_KEY = 'RahmaFcmServerKeyForProductionGate2026';
  process.env.APNS_P8_KEY = 'RahmaApnsP8KeyForProductionGate2026xx';
  try {
    const status = pushNotificationReadiness();
    assert.equal(status.fcm_configured, true);
    assert.equal(status.apns_configured, true);
    assert.equal(status.push_production_ready, true);
    assert.equal(JSON.stringify(status).includes('RahmaFcm'), false);
  } finally {
    envRestore(s);
  }
});

test('pushNotificationReadiness: missing FCM blocks push production', () => {
  const s = envSnap();
  delete process.env.FCM_SERVER_KEY;
  delete process.env.APNS_P8_KEY;
  process.env.PUSH_NOTIFICATIONS_PRODUCTION_REQUIRED = 'true';
  try {
    const status = pushNotificationReadiness();
    assert.equal(status.fcm_configured, false);
    assert.equal(status.push_production_ready, false);
  } finally {
    envRestore(s);
  }
});

test('evaluateProductionGates: missing push blocks production_ready', () => {
  const gates = evaluateProductionGates({
    database_connected: true,
    pgvector: { ready: true },
    rag: { rag_ready: true, algorithm_ready: true },
    redis: { ready: true },
    wasm: { mode: 'required', ready: true, execution_proven: true, reachable: true },
    auth_ready: true,
    app_store: { approval_status: 'approved', ready: true },
    azan_audio: { production_ready: true },
    notifications: { push_production_ready: false },
  });
  assert.equal(gates.production_ready, false);
  assert.ok(gates.blockers.includes('push_notifications_not_ready'));
});
