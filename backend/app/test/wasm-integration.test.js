import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { childContentGate, childProfileGate } from '../src/engine/child-safety-gate.js';
import { citationGate } from '../src/engine/citation-gate.js';
import { evaluatePublishEligibility } from '../src/services/citation-policy-service.js';
import { decidePublish } from '../src/services/sheikh-workflow-service.js';
import { reviewGate } from '../src/engine/review-gate.js';
import { configureSheikhRepository, _resetSheikhRepositoryForTests } from '../src/sheikh/sheikh-question-repository.js';

function envSnap() {
  return {
    AUTH_MODE: process.env.AUTH_MODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    WASM_CHILD_SAFETY_URL: process.env.WASM_CHILD_SAFETY_URL,
    WASM_QURAN_HADITH_CITATION_URL: process.env.WASM_QURAN_HADITH_CITATION_URL,
    WASM_FATWA_POLICY_GATE_URL: process.env.WASM_FATWA_POLICY_GATE_URL,
    WASM_CONTENT_RULE_ENGINE_URL: process.env.WASM_CONTENT_RULE_ENGINE_URL,
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
  process.env.WASM_CHILD_SAFETY_URL = `http://127.0.0.1:${server.address().port}`;
  try {
    const r = await childContentGate({ body_ar: 'wasm_trigger content' });
    assert.equal(r.decision, 'block');
  } finally { server.close(); envRestore(s); }
});

test('WASM Integration: reviewGate uses Rule Engine bridge when configured', async () => {
  const s = envSnap();
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      const body = JSON.parse(data);
      if (body.verification_status === 'approved' && !body.has_citation) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, public_visible: false, reason: 'wasm_missing_citation' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, public_visible: true, reason: 'wasm_ok' }));
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.WASM_CONTENT_RULE_ENGINE_URL = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await reviewGate({ verification_status: 'approved', has_citation: false });
    assert.equal(res.decision, 'block');
    assert.equal(res.reason, 'wasm_missing_citation');
  } finally { server.close(); envRestore(s); }
});

test('WASM Integration: citationGate uses WASM bridge when configured', async () => {
  const s = envSnap();
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, citation_status: 'quran_cited', can_publish_public: true }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.WASM_QURAN_HADITH_CITATION_URL = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await citationGate({ answer_text: 'A', citations: [{ citation_type: 'quran', citation_label: 'Q' }] });
    assert.equal(res.citation_status, 'quran_cited');
  } finally { server.close(); envRestore(s); }
});

test('WASM Integration: decidePublish uses Fatwa WASM bridge when configured', async () => {
  const s = envSnap();
  process.env.AUTH_MODE = 'external';
  process.env.SESSION_SECRET = 'a'.repeat(32);
  configureSheikhRepository({ repository: {} });
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, decision: 'allow_publish' }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.WASM_FATWA_POLICY_GATE_URL = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await decidePublish({ citation_status: 'quran_cited', has_scholar_approval: true });
    assert.equal(res.ok, true);
  } finally { server.close(); _resetSheikhRepositoryForTests(); envRestore(s); }
});

test('WASM Integration: falls back to local JS when bridge is unreachable', async () => {
  const s = envSnap();
  process.env.WASM_CHILD_SAFETY_URL = 'http://127.0.0.1:65530';
  try {
    const res = await childContentGate({ body_ar: 'أنت غبي' });
    assert.equal(res.decision, 'block');
    assert.equal(res.reason, 'shaming_language');
  } finally { envRestore(s); }
});
