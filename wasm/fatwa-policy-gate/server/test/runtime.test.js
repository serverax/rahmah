import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/index.js';

test('fatwa-gate: GET /health returns runtime identity', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().service, 'rahma-fatwa-gate-wasm');
  } finally { await app.close(); }
});

test('fatwa-gate: POST /evaluate allows public with both', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: {
        has_scholar_approval: true,
        has_verified_quran_or_hadith_citation: true,
        publication_mode_public: true,
      },
    });
    assert.equal(res.json().decision, 'allow_publish');
  } finally { await app.close(); }
});

test('fatwa-gate: POST /evaluate blocks public without approval', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: {
        has_scholar_approval: false,
        has_verified_quran_or_hadith_citation: true,
        publication_mode_public: true,
      },
    });
    assert.equal(res.json().decision, 'block');
    assert.equal(res.json().reason, 'public_fatwa_requires_scholar_approval');
  } finally { await app.close(); }
});

test('fatwa-gate: POST /evaluate allows private with citation', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: {
        has_scholar_approval: false,
        has_verified_quran_or_hadith_citation: true,
        publication_mode_public: false,
      },
    });
    assert.equal(res.json().decision, 'allow_publish');
  } finally { await app.close(); }
});

test('fatwa-gate: POST /evaluate needs review for private without citation', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: {
        has_scholar_approval: false,
        has_verified_quran_or_hadith_citation: false,
        publication_mode_public: false,
      },
    });
    assert.equal(res.json().decision, 'needs_scholar_review');
  } finally { await app.close(); }
});

test('fatwa-gate: POST /evaluate rejects malformed via schema', async () => {
  const app = buildServer();
  try {
    const res = await app.inject({
      method: 'POST', url: '/evaluate',
      payload: { has_scholar_approval: 'yes' }, // wrong type
    });
    assert.equal(res.statusCode, 400);
  } finally { await app.close(); }
});
