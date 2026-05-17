import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { childContentGate, childProfileGate } from '../src/engine/child-safety-gate.js';
import { citationGate } from '../src/engine/citation-gate.js';
import { evaluatePublishEligibility } from '../src/services/citation-policy-service.js';
import { decidePublish } from '../src/services/sheikh-workflow-service.js';
import { configureSheikhRepository, _resetSheikhRepositoryForTests } from '../src/sheikh/sheikh-question-repository.js';

function envSnap() {
  return {
    AUTH_MODE: process.env.AUTH_MODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    WASM_CHILD_SAFETY_URL: process.env.WASM_CHILD_SAFETY_URL,
    WASM_QURAN_HADITH_CITATION_URL: process.env.WASM_QURAN_HADITH_CITATION_URL,
    WASM_FATWA_POLICY_GATE_URL: process.env.WASM_FATWA_POLICY_GATE_URL,
  };
}
function envRestore(s) { for (const [k, v] of Object.entries(s)) v === undefined ? delete process.env[k] : process.env[k] = v; }

test('WASM Integration: childContentGate uses WASM bridge when configured', async () => {
  const s = envSnap();
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      const body = JSON.parse(data);
      if (body.body_ar && body.body_ar.includes('wasm_trigger')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, decision: 'block', reason: 'wasm_says_no' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, decision: 'allow', reason: null }));
      }
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  process.env.WASM_CHILD_SAFETY_URL = `http://127.0.0.1:${port}`;

  try {
    const res1 = await childContentGate({ body_ar: 'wasm_trigger content', age_band: '7-9' });
    assert.equal(res1.decision, 'block');
    assert.equal(res1.reason, 'wasm_says_no');
  } finally {
    server.close();
    envRestore(s);
  }
});

test('WASM Integration: childProfileGate uses WASM bridge when configured', async () => {
  const s = envSnap();
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      const body = JSON.parse(data);
      if (body.value === 'wasm_bad_nick') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, decision: 'block', reason: 'bad_nick_from_wasm' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, decision: 'allow', reason: null }));
      }
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  process.env.WASM_CHILD_SAFETY_URL = `http://127.0.0.1:${port}`;

  try {
    const res = await childProfileGate({ nickname_ar: 'wasm_bad_nick', age_band: '7-9' });
    assert.equal(res.decision, 'block');
    assert.equal(res.reason, 'bad_nick_from_wasm');
  } finally {
    server.close();
    envRestore(s);
  }
});

test('WASM Integration: citationGate uses WASM bridge when configured', async () => {
  const s = envSnap();
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      const body = JSON.parse(data);
      if (Array.isArray(body) && body.some(c => c.citation_label === 'wasm_trigger')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, citation_status: 'quran_cited', can_publish_public: true }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, citation_status: 'insufficient_citation', can_publish_public: false }));
      }
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  process.env.WASM_QURAN_HADITH_CITATION_URL = `http://127.0.0.1:${port}`;

  try {
    const res = await citationGate({
      answer_text: 'Some answer',
      citations: [{ citation_type: 'quran', citation_label: 'wasm_trigger' }],
    });
    assert.equal(res.citation_status, 'quran_cited');
  } finally {
    server.close();
    envRestore(s);
  }
});

test('WASM Integration: decidePublish uses Fatwa WASM bridge when configured', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  configureSheikhRepository({ repository: {} });
  delete process.env.WASM_CHILD_SAFETY_URL; 

  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      const body = JSON.parse(data);
      if (body.has_scholar_approval && body.has_verified_quran_or_hadith_citation) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, decision: 'allow_publish' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, decision: 'block', reason: 'wasm_fatwa_rejected' }));
      }
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  process.env.WASM_FATWA_POLICY_GATE_URL = `http://127.0.0.1:${port}`;

  try {
    const res = await decidePublish({
      citation_status: 'quran_cited',
      has_scholar_approval: true,
      publication_mode: 'public',
    });
    assert.equal(res.ok, true);
    assert.equal(res.next_publication_status, 'published_public');
  } finally {
    server.close();
    _resetSheikhRepositoryForTests();
    envRestore(s);
  }
});

test('WASM Integration: falls back to local JS when bridge is unreachable', async () => {
  const s = envSnap();
  process.env.WASM_CHILD_SAFETY_URL = 'http://127.0.0.1:65530'; // unreachable

  try {
    const res = await childContentGate({ body_ar: 'أنت غبي', age_band: '7-9' });
    assert.equal(res.decision, 'block');
    assert.equal(res.reason, 'shaming_language');
  } finally {
    envRestore(s);
  }
});
