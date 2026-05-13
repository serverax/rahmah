import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDatabaseConfigured,
  getDatabaseConfig,
  redactDatabaseUrlForDiagnostics,
} from '../src/db/config.js';

test('isDatabaseConfigured returns false when DATABASE_URL absent', () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.equal(isDatabaseConfigured(), false);
    assert.equal(getDatabaseConfig(), null);
    assert.equal(redactDatabaseUrlForDiagnostics(), '[unconfigured]');
  } finally {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});

test('isDatabaseConfigured returns true when DATABASE_URL set', () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://u:p@h:5432/db';
  try {
    assert.equal(isDatabaseConfigured(), true);
    const cfg = getDatabaseConfig();
    assert.equal(typeof cfg, 'object');
    assert.equal(cfg.connectionString, 'postgres://u:p@h:5432/db');
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test('redactDatabaseUrlForDiagnostics never echoes user/pass/host/db', () => {
  const previous = process.env.DATABASE_URL;
  const sentinels = [
    { url: 'postgres://leak_user:leak_pass@leak.example:5432/leak_db', scheme: 'postgres' },
    { url: 'postgresql://leak_user:leak_pass@leak.example:5432/leak_db', scheme: 'postgresql' },
  ];
  try {
    for (const s of sentinels) {
      process.env.DATABASE_URL = s.url;
      const out = redactDatabaseUrlForDiagnostics();
      assert.ok(!out.includes('leak_user'), `redaction leaked user: ${out}`);
      assert.ok(!out.includes('leak_pass'), `redaction leaked pass: ${out}`);
      assert.ok(!out.includes('leak.example'), `redaction leaked host: ${out}`);
      assert.ok(!out.includes('leak_db'),  `redaction leaked db name: ${out}`);
      assert.ok(!/\/\//.test(out), `redaction included // delimiter: ${out}`);
      assert.equal(out, '[configured: postgres scheme]');
    }
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test('redactDatabaseUrlForDiagnostics handles non-postgres scheme without leaking', () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'mysql://x:y@z:3306/db';
  try {
    const out = redactDatabaseUrlForDiagnostics();
    assert.equal(out, '[configured: non-postgres scheme]');
    assert.ok(!out.includes('mysql'));
    assert.ok(!out.includes('x'));
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
