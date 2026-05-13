import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDatabaseHealth, _resetPoolForTests } from '../src/db/health.js';

test('checkDatabaseHealth returns unconfigured shape when DATABASE_URL absent', async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  _resetPoolForTests();
  try {
    const res = await checkDatabaseHealth({ timeoutMs: 500 });
    assert.deepEqual(res, {
      configured: false,
      connected: false,
      checked: false,
      error_type: null,
    });
  } finally {
    _resetPoolForTests();
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});

test('checkDatabaseHealth resolves to a safe failure when host is unreachable', async () => {
  const previous = process.env.DATABASE_URL;
  // 127.0.0.99 + a high closed port → connection_refused or probe_timeout
  process.env.DATABASE_URL = 'postgres://x:y@127.0.0.99:65530/z';
  _resetPoolForTests();
  try {
    const res = await checkDatabaseHealth({ timeoutMs: 1500 });
    assert.equal(res.configured, true);
    assert.equal(res.connected,  false);
    assert.equal(res.checked,    true);
    assert.ok(
      ['connection_refused', 'connection_timeout', 'dns_unresolved', 'probe_timeout', 'unknown_error'].includes(res.error_type),
      `unexpected error_type: ${res.error_type}`,
    );
  } finally {
    _resetPoolForTests();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test('checkDatabaseHealth does NOT throw raw pg error with DSN in message', async () => {
  const sentinel = 'postgres://leak_user:leak_pass_secret@127.0.0.99:65530/leak_db';
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = sentinel;
  _resetPoolForTests();
  try {
    // Stringify the entire result; verify no DSN substring leaks through it.
    const res = await checkDatabaseHealth({ timeoutMs: 1500 });
    const dump = JSON.stringify(res);
    assert.ok(!dump.includes('leak_user'),        'health result leaked user');
    assert.ok(!dump.includes('leak_pass_secret'), 'health result leaked password');
    assert.ok(!dump.includes('leak_db'),          'health result leaked db name');
    assert.ok(!dump.includes('127.0.0.99'),       'health result leaked host');
    assert.ok(!/postgres(ql)?:\/\//.test(dump),   'health result contains DSN substring');
  } finally {
    _resetPoolForTests();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test('checkDatabaseHealth respects a tight timeout budget', async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://x:y@127.0.0.99:65530/z';
  _resetPoolForTests();
  try {
    const t0 = Date.now();
    const res = await checkDatabaseHealth({ timeoutMs: 200 });
    const elapsed = Date.now() - t0;
    assert.equal(res.connected, false);
    // Allow generous slack for slow CI: must be well under 2s.
    assert.ok(elapsed < 2000, `probe took ${elapsed}ms which exceeds the budget`);
  } finally {
    _resetPoolForTests();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
