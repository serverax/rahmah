import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/index.js';

test('citation: GET /health returns runtime identity', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().service, 'rahma-citation-wasm');
  } finally { await app.close(); }
});

test('citation: POST /evaluate handles empty list', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({ method: 'POST', url: '/evaluate', payload: [] });
    assert.equal(res.json().citation_status, 'insufficient_citation');
    assert.equal(res.json().can_publish_public, false);
  } finally { await app.close(); }
});

test('citation: POST /evaluate allows Quran citation', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: [{ citation_type: 'quran', citation_label: '2:255' }],
    });
    assert.equal(res.json().citation_status, 'quran_cited');
    assert.equal(res.json().can_publish_public, true);
  } finally { await app.close(); }
});

test('citation: POST /evaluate requires moderation for fiqh only', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: [{ citation_type: 'fiqh', citation_label: 'Mughni' }],
    });
    assert.equal(res.json().citation_status, 'scholar_advice_needs_review');
    assert.equal(res.json().can_publish_public, false);
  } finally { await app.close(); }
});

test('citation: POST /evaluate combines Quran and Hadith', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: [
        { citation_type: 'quran', citation_label: 'Q' },
        { citation_type: 'hadith', citation_label: 'H' },
      ],
    });
    assert.equal(res.json().citation_status, 'quran_and_hadith_cited');
    assert.equal(res.json().can_publish_public, true);
  } finally { await app.close(); }
});

test('citation: POST /evaluate rejects malformed items via schema', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: [{ citation_type: 'invalid', citation_label: '' }],
    });
    assert.equal(res.statusCode, 400);
  } finally { await app.close(); }
});
