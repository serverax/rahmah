import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { _resetClientPoolForTests } from '../src/db/client.js';
import { _resetPoolForTests as _resetHealthPoolForTests } from '../src/db/health.js';

function envSnap() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    ENABLE_QURAN_FEATURES: process.env.ENABLE_QURAN_FEATURES,
    ENABLE_CHILDREN_ISLAMIC_GAME: process.env.ENABLE_CHILDREN_ISLAMIC_GAME,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

function resetAllPools() {
  _resetClientPoolForTests();
  _resetHealthPoolForTests();
}

test('mobile: GET /api/mobile/status reports platform=mobile-only + public_ingress_disabled=true', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  resetAllPools();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/mobile/status' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.platform, 'mobile-only');
    assert.equal(body.public_ingress_disabled, true);
    assert.equal(body.service, 'rahma-api');
    assert.equal(body.database.configured, false);
    assert.equal(body.redis.configured, false);
    assert.equal(body.wasm.configured, false);
    assert.ok(Array.isArray(body.wasm.modules) && body.wasm.modules.length === 4);
    assert.equal(typeof body.features.quran_enabled, 'boolean');
    assert.equal(typeof body.features.children_game_enabled, 'boolean');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile: placeholder list endpoints never invent religious content', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    for (const url of ['/api/quran', '/api/hadith', '/api/dua']) {
      const r = await app.inject({ method: 'GET', url });
      assert.equal(r.statusCode, 200);
      const body = r.json();
      assert.equal(body.configured, false);
      assert.deepEqual(body.items, []);
      assert.ok(typeof body.message_ar === 'string' && body.message_ar.length > 0);
    }
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile: GET /api/game/status reports local-first + 7 scenario modules', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  resetAllPools();
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/game/status' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.local_first, true);
    assert.equal(body.server_backup_available, false);
    assert.ok(Array.isArray(body.scenarios_modules) && body.scenarios_modules.length === 7);
  } finally {
    await app.close();
    envRestore(s);
    resetAllPools();
  }
});

test('mobile: POST /api/game/progress rejects missing scenario_id; persisted=false without DB', async () => {
  const s = envSnap();
  delete process.env.DATABASE_URL;
  const app = buildApp();
  try {
    let r = await app.inject({ method: 'POST', url: '/api/game/progress', payload: {} });
    assert.equal(r.statusCode, 400);

    r = await app.inject({ method: 'POST', url: '/api/game/progress', payload: { scenario_id: 'salah-order-1', attempts_count: 3, correct_count: 2 } });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.persisted, false);
    assert.equal(body.status, 'local_only');
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('mobile: GET /api/public/answers — mobile alias returns empty list', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/public/answers' });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.configured, false);
    assert.deepEqual(body.items, []);
  } finally {
    await app.close();
  }
});

test('mobile: /api/mobile/status never echoes DATABASE_URL / REDIS_URL', async () => {
  const s = envSnap();
  process.env.DATABASE_URL = 'postgres://mobile_leak:mobile_pw@127.0.0.99:5432/leak_db';
  process.env.REDIS_URL = 'redis://:redis_leak_pw@127.0.0.99:6379/0';
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/mobile/status' });
    const raw = r.body;
    assert.ok(!raw.includes('mobile_leak'));
    assert.ok(!raw.includes('mobile_pw'));
    assert.ok(!raw.includes('redis_leak_pw'));
    const body = r.json();
    assert.equal(body.database.configured, true);
    assert.equal(body.redis.configured, true);
  } finally {
    await app.close();
    envRestore(s);
  }
});
