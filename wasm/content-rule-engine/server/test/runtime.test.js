import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/index.js';

test('rule-engine: GET /health returns runtime identity', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().service, 'rahma-rule-engine-wasm');
  } finally { await app.close(); }
});

test('rule-engine: POST /evaluate allows approved+cited+published', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: {
        verification_status: 'approved',
        has_citation: true,
        is_published: true,
        is_test_fixture: false,
      },
    });
    assert.equal(res.json().show_in_public_list, true);
    assert.equal(res.json().public_visible, true);
  } finally { await app.close(); }
});

test('rule-engine: POST /evaluate hides fixture', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: {
        verification_status: 'approved',
        has_citation: true,
        is_published: true,
        is_test_fixture: true,
      },
    });
    assert.equal(res.json().show_in_public_list, false);
    assert.equal(res.json().reason, 'test_fixture_hidden_from_public');
  } finally { await app.close(); }
});

test('rule-engine: POST /evaluate hides unapproved from public', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: {
        verification_status: 'pending_review',
        has_citation: true,
        is_published: true,
        is_test_fixture: false,
      },
    });
    assert.equal(res.json().show_in_public_list, false);
    assert.equal(res.json().public_visible, false);
    assert.equal(res.json().private_visible, true);
  } finally { await app.close(); }
});

test('rule-engine: POST /evaluate blocks missing citation', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: {
        verification_status: 'approved',
        has_citation: false,
        is_published: true,
        is_test_fixture: false,
      },
    });
    assert.equal(res.json().public_visible, false);
    assert.equal(res.json().private_visible, false);
    assert.equal(res.json().reason, 'missing_citation');
  } finally { await app.close(); }
});
