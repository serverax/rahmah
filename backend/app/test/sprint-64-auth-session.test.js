import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { validatePasswordPolicy, PASSWORD_POLICY } from '../src/auth/password-policy.js';
import { authError, AUTH_ERROR_CODES } from '../src/auth/auth-errors.js';
import { validateDeviceRegistration } from '../src/auth/device-service.js';

function envSnap() { return { AUTH_MODE: process.env.AUTH_MODE, SESSION_SECRET: process.env.SESSION_SECRET, DATABASE_URL: process.env.DATABASE_URL }; }
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('Sprint64 — password policy rejects short / missing-class / common', () => {
  for (const bad of [
    '',
    'short',
    'NoNumber!Symbol',          // missing digit
    'nouppercase1!',            // missing uppercase
    'NOLOWERCASE1!',            // missing lowercase
    'Password1!',               // common breach
    'a'.repeat(200),            // too long
  ]) {
    const r = validatePasswordPolicy(bad);
    assert.equal(r.ok, false, `expected reject for "${bad.length > 30 ? '(long)' : bad}"`);
  }
});

test('Sprint64 — password policy accepts strong candidate', () => {
  const r = validatePasswordPolicy('ZxQ#9rcPv7m!Lwd2');
  assert.equal(r.ok, true);
});

test('Sprint64 — PASSWORD_POLICY exposes the required constraints', () => {
  assert.equal(PASSWORD_POLICY.min_length, 12);
  assert.ok(PASSWORD_POLICY.require_uppercase);
  assert.ok(PASSWORD_POLICY.require_digit);
});

test('Sprint64 — authError normalises unknown codes + includes Arabic safe message', () => {
  const e = authError('not_a_real_code', 'رسالة');
  assert.ok(AUTH_ERROR_CODES.includes(e.error));
  assert.equal(e.safe_message_ar, 'رسالة');
});

test('Sprint64 — POST /api/auth/session/start: 503 auth_not_configured by default', async () => {
  const s = envSnap();
  delete process.env.AUTH_MODE;
  delete process.env.SESSION_SECRET;
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'POST', url: '/api/auth/session/start', payload: {} });
    assert.equal(r.statusCode, 503);
    const b = r.json();
    assert.equal(b.error, 'auth_not_configured');
    assert.equal(typeof b.safe_message_ar, 'string');
  } finally { await app.close(); envRestore(s); }
});

test('Sprint64 — POST /api/auth/session/start: 400 password_grant_not_supported when auth=external', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'POST', url: '/api/auth/session/start', payload: {} });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error, 'password_grant_not_supported');
  } finally { await app.close(); envRestore(s); }
});

test('Sprint64 — POST /api/auth/session/refresh: 401 session_expired (no token)', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'POST', url: '/api/auth/session/refresh', payload: {} });
    assert.equal(r.statusCode, 401);
    assert.equal(r.json().error, 'session_expired');
  } finally { await app.close(); envRestore(s); }
});

test('Sprint64 — POST /api/auth/session/logout: always 200 ack', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'POST', url: '/api/auth/session/logout' });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().status, 'acknowledged');
  } finally { await app.close(); }
});

test('Sprint64 — POST /api/device/register: schema rejects bad platform / hash / version', async () => {
  const app = buildApp();
  try {
    for (const bad of [
      { platform: 'windows', app_version: '0.1.0', device_hash: 'a'.repeat(64) },
      { platform: 'android', app_version: '',      device_hash: 'a'.repeat(64) },
      { platform: 'android', app_version: '0.1.0', device_hash: 'not-hex' },
    ]) {
      const r = await app.inject({ method: 'POST', url: '/api/device/register', payload: bad });
      assert.equal(r.statusCode, 400, `bad payload accepted: ${JSON.stringify(bad)}`);
    }
  } finally { await app.close(); }
});

test('Sprint64 — POST /api/device/register: valid payload → persisted=false without DB', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/device/register',
      payload: { platform: 'android', app_version: '0.1.0', device_hash: 'a'.repeat(64) },
    });
    assert.equal(r.statusCode, 200);
    const b = r.json();
    assert.equal(b.persisted, false);
    assert.equal(b.reason, 'database_not_configured');
  } finally { await app.close(); envRestore(s); }
});

test('Sprint64 — validateDeviceRegistration: pure helper rejects bad shape', () => {
  for (const bad of [{}, { platform: 'x' }, { platform: 'android' }]) {
    const r = validateDeviceRegistration(bad);
    assert.equal(r.ok, false);
  }
});

test('Sprint64 — auth surface NEVER echoes a candidate password', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'RahmaTestSessionKey2026Aa1Bb2Cc3Dd4Ee5Ff6';
  const app = buildApp();
  try {
    const r = await app.inject({
      method: 'POST', url: '/api/auth/session/start',
      payload: { password: 'LEAK_pw_xyz_DEADBEEF' },
    });
    assert.ok(!r.body.includes('LEAK_pw_xyz_DEADBEEF'));
  } finally { await app.close(); envRestore(s); }
});
