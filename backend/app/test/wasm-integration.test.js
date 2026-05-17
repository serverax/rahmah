import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { childContentGate, childProfileGate } from '../src/engine/child-safety-gate.js';

test('WASM Integration: childContentGate uses WASM bridge when configured', async () => {
  // Start a dummy bridge server.
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      const body = JSON.parse(data);
      if (body.body_ar.includes('wasm_trigger')) {
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
  const wasmUrl = `http://127.0.0.1:${port}`;

  const prev = process.env.WASM_CHILD_SAFETY_URL;
  process.env.WASM_CHILD_SAFETY_URL = wasmUrl;

  try {
    // 1. Check a trigger that should block via WASM.
    const res1 = await childContentGate({ body_ar: 'wasm_trigger content', age_band: '7-9' });
    assert.equal(res1.decision, 'block');
    assert.equal(res1.reason, 'wasm_says_no');

    // 2. Check a normal content.
    const res2 = await childContentGate({ body_ar: 'safe content', age_band: '7-9' });
    assert.equal(res2.decision, 'allow');
  } finally {
    process.env.WASM_CHILD_SAFETY_URL = prev;
    server.close();
  }
});

test('WASM Integration: childProfileGate uses WASM bridge when configured', async () => {
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
  const wasmUrl = `http://127.0.0.1:${port}`;

  const prev = process.env.WASM_CHILD_SAFETY_URL;
  process.env.WASM_CHILD_SAFETY_URL = wasmUrl;

  try {
    const res = await childProfileGate({ nickname_ar: 'wasm_bad_nick', age_band: '7-9' });
    assert.equal(res.decision, 'block');
    assert.equal(res.reason, 'bad_nick_from_wasm');
  } finally {
    process.env.WASM_CHILD_SAFETY_URL = prev;
    server.close();
  }
});

test('WASM Integration: falls back to local JS when bridge is unreachable', async () => {
  const prev = process.env.WASM_CHILD_SAFETY_URL;
  process.env.WASM_CHILD_SAFETY_URL = 'http://127.0.0.1:65530'; // unreachable

  try {
    // Should NOT throw, should fall back to local JS.
    // Local JS blocks 'غبي'.
    const res = await childContentGate({ body_ar: 'أنت غبي', age_band: '7-9' });
    assert.equal(res.decision, 'block');
    assert.equal(res.reason, 'shaming_language');
  } finally {
    process.env.WASM_CHILD_SAFETY_URL = prev;
  }
});
