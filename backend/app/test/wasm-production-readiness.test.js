import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { buildApp } from '../src/app.js';
import { wasmReadiness, isWasmDisableFormallyApproved } from '../src/infra/wasm-probe.js';
import { evaluateProductionGates } from '../src/infra/production-gates.js';
import { WASM_EVALUATE_FIXTURES } from '../src/infra/wasm-probe.js';

function envSnap() {
  return { ...process.env };
}

function envRestore(s) {
  for (const key of Object.keys(process.env)) {
    if (!(key in s)) delete process.env[key];
  }
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function startMockBridge(name) {
  const fixture = WASM_EVALUATE_FIXTURES[name];
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: name }));
      return;
    }
    if (req.method === 'POST' && req.url === fixture.path) {
      let data = '';
      req.on('data', (c) => { data += c; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          decision: 'allow',
          citation_status: 'quran_cited',
          public_visible: true,
        }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('WASM disabled without approval => execution_proven false and not ready', async () => {
  const s = envSnap();
  process.env.WASM_RUNTIME_MODE = 'disabled';
  delete process.env.WASM_DISABLE_APPROVED;
  try {
    const w = await wasmReadiness();
    assert.equal(w.mode, 'disabled');
    assert.equal(w.execution_proven, false);
    assert.equal(w.ready, false);
    assert.equal(isWasmDisableFormallyApproved(), false);
  } finally {
    envRestore(s);
  }
});

test('WASM disabled with WASM_DISABLE_APPROVED=true => ready but execution_proven false', async () => {
  const s = envSnap();
  process.env.WASM_RUNTIME_MODE = 'disabled';
  process.env.WASM_DISABLE_APPROVED = 'true';
  try {
    const w = await wasmReadiness();
    assert.equal(w.ready, true);
    assert.equal(w.execution_proven, false);
    const gates = evaluateProductionGates({
      database_connected: true,
      pgvector: { ready: true },
      rag: { rag_ready: true, algorithm_ready: true },
      redis: { ready: true },
      wasm: w,
      auth_ready: true,
    });
    assert.ok(!gates.blockers.includes('wasm_not_ready'));
    assert.ok(!gates.blockers.includes('wasm_execution_not_proven'));
  } finally {
    envRestore(s);
  }
});

test('WASM required mode with live mock bridge => execution_proven true', async () => {
  const s = envSnap();
  const server = await startMockBridge('child-safety');
  const port = server.address().port;
  process.env.WASM_RUNTIME_MODE = 'required';
  delete process.env.WASM_DISABLE_APPROVED;
  process.env.WASM_CHILD_SAFETY_URL = `http://127.0.0.1:${port}`;
  delete process.env.WASM_FATWA_POLICY_GATE_URL;
  delete process.env.WASM_QURAN_HADITH_CITATION_URL;
  delete process.env.WASM_CONTENT_RULE_ENGINE_URL;
  try {
    const w = await wasmReadiness({ timeoutMs: 3000 });
    assert.equal(w.mode, 'required');
    const child = w.modules.find((m) => m.name === 'child-safety');
    assert.equal(child.execution_proven, true);
    assert.equal(w.ready, false);
  } finally {
    server.close();
    envRestore(s);
  }
});

test('/ready: WASM disabled without approval => wasm_execution_proven false and production_ready false', async () => {
  const s = envSnap();
  process.env.WASM_RUNTIME_MODE = 'disabled';
  delete process.env.WASM_DISABLE_APPROVED;
  const app = buildApp({ autoInit: false });
  try {
    const r = await app.inject({ method: 'GET', url: '/ready' });
    const b = r.json();
    assert.equal(b.wasm.execution_proven, false);
    assert.equal(b.wasm_execution_proven, false);
    assert.equal(b.production_ready, false);
    assert.ok(b.blockers.includes('wasm_disable_not_approved') || b.blockers.includes('wasm_not_ready'));
  } finally {
    await app.close();
    envRestore(s);
  }
});

test('production_ready false when WASM required but execution not proven', () => {
  const gates = evaluateProductionGates({
    database_connected: true,
    pgvector: { ready: true },
    rag: { rag_ready: true, algorithm_ready: true },
    redis: { ready: true },
    auth_ready: true,
    wasm: {
      mode: 'required',
      ready: false,
      reachable: true,
      execution_proven: false,
      disable_approved: false,
    },
  });
  assert.equal(gates.production_ready, false);
  assert.ok(gates.blockers.includes('wasm_execution_not_proven'));
});

test('production_ready true when WASM required and all modules executed', () => {
  const prev = process.env.APP_STORE_COMPLIANCE_STATUS;
  process.env.APP_STORE_COMPLIANCE_STATUS = 'approved';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://u:p@127.0.0.1:5435/rahma';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6381/0';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'RahmaProdSessionKey2026StrongValueXyZ9';
  process.env.AUTH_MODE = process.env.AUTH_MODE || 'external';
  process.env.WASM_FATWA_POLICY_GATE_URL = process.env.WASM_FATWA_POLICY_GATE_URL || 'http://127.0.0.1:8091';
  process.env.WASM_QURAN_HADITH_CITATION_URL = process.env.WASM_QURAN_HADITH_CITATION_URL || 'http://127.0.0.1:8092';
  process.env.WASM_CHILD_SAFETY_URL = process.env.WASM_CHILD_SAFETY_URL || 'http://127.0.0.1:8093';
  process.env.WASM_CONTENT_RULE_ENGINE_URL = process.env.WASM_CONTENT_RULE_ENGINE_URL || 'http://127.0.0.1:8094';
  process.env.PUSH_NOTIFICATIONS_PRODUCTION_REQUIRED = 'false';
  try {
    const gates = evaluateProductionGates({
      database_connected: true,
      pgvector: { ready: true },
      rag: { rag_ready: true, algorithm_ready: true },
      redis: { ready: true },
      auth_ready: true,
      app_store: {
        approval_status: 'approved',
        ready: true,
      },
      azan_audio: { production_ready: true },
      notifications: { push_production_ready: true },
      wasm: {
        mode: 'required',
        ready: true,
        reachable: true,
        execution_proven: true,
        disable_approved: false,
      },
    });
    assert.equal(gates.production_ready, true);
    assert.equal(gates.wasm_execution_proven, true);
  } finally {
    if (prev === undefined) delete process.env.APP_STORE_COMPLIANCE_STATUS;
    else process.env.APP_STORE_COMPLIANCE_STATUS = prev;
  }
});
