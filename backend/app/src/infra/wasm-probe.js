import http from 'node:http';
import { callWasmBridge } from '../safety/internal-wasm-client.js';

const WASM_MODULES = [
  { name: 'fatwa-policy-gate', env: 'WASM_FATWA_POLICY_GATE_URL', healthPath: '/health' },
  { name: 'quran-hadith-citation', env: 'WASM_QURAN_HADITH_CITATION_URL', healthPath: '/health' },
  { name: 'child-safety', env: 'WASM_CHILD_SAFETY_URL', healthPath: '/health' },
  { name: 'content-rule-engine', env: 'WASM_CONTENT_RULE_ENGINE_URL', healthPath: '/health' },
];

/** Per-bridge POST /evaluate fixtures (production contract smoke). */
const WASM_EVALUATE_FIXTURES = {
  'fatwa-policy-gate': {
    path: '/evaluate',
    payload: {
      has_scholar_approval: true,
      has_verified_quran_or_hadith_citation: true,
      publication_mode_public: false,
    },
    validate: (res) => res?.ok === true && ['allow_publish', 'block', 'needs_scholar_review'].includes(res.decision),
  },
  'quran-hadith-citation': {
    path: '/evaluate',
    payload: [{
      citation_type: 'quran',
      citation_label: 'Quran 1:1',
      citation_text: 'بِسْمِ اللَّهِ',
    }],
    validate: (res) => res?.ok === true && typeof res.citation_status === 'string',
  },
  'child-safety': {
    path: '/evaluate',
    payload: { body_ar: 'نتعلم آداب الصلاة', age_band: '7-9' },
    validate: (res) => res?.ok === true && (res.decision === 'allow' || res.decision === 'block'),
  },
  'content-rule-engine': {
    path: '/evaluate',
    payload: {
      verification_status: 'approved',
      has_citation: true,
      is_published: false,
      is_test_fixture: true,
    },
    validate: (res) => res?.ok === true && typeof res.public_visible === 'boolean',
  },
};

export function getWasmRuntimeMode() {
  return String(process.env.WASM_RUNTIME_MODE || 'required').trim().toLowerCase();
}

/** Explicit operator approval to run without live WASM bridges (never production-default). */
export function isWasmDisableFormallyApproved() {
  return String(process.env.WASM_DISABLE_APPROVED || '').toLowerCase() === 'true';
}

function probeHttpHealth(baseUrl, healthPath, { timeoutMs = 2000 } = {}) {
  return new Promise((resolve) => {
    try {
      const target = new URL(healthPath, baseUrl);
      const req = http.request(target, { method: 'GET', timeout: timeoutMs }, (res) => {
        res.resume();
        resolve({ reachable: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ reachable: false, status: null, error_type: 'timeout' });
      });
      req.on('error', (err) => {
        resolve({ reachable: false, status: null, error_type: String(err?.code || err?.name || 'error') });
      });
      req.end();
    } catch {
      resolve({ reachable: false, status: null, error_type: 'invalid_url' });
    }
  });
}

async function proveModuleExecution(mod, baseUrl, { timeoutMs = 3000 } = {}) {
  const fixture = WASM_EVALUATE_FIXTURES[mod.name];
  if (!fixture) return false;
  const prevTimeout = process.env.WASM_BRIDGE_TIMEOUT_MS;
  if (timeoutMs > 2000) process.env.WASM_BRIDGE_TIMEOUT_MS = String(timeoutMs);
  try {
    const res = await callWasmBridge(baseUrl, fixture.path, fixture.payload);
    return fixture.validate(res);
  } catch {
    return false;
  } finally {
    if (prevTimeout === undefined) delete process.env.WASM_BRIDGE_TIMEOUT_MS;
    else process.env.WASM_BRIDGE_TIMEOUT_MS = prevTimeout;
  }
}

/**
 * WASM_RUNTIME_MODE:
 *   - disabled: only ready when WASM_DISABLE_APPROVED=true; execution_proven always false
 *   - required: all four WASM_*_URL env vars must respond on /health AND /evaluate smoke
 */
export async function wasmReadiness({ timeoutMs = 2500 } = {}) {
  const mode = getWasmRuntimeMode();

  if (mode === 'disabled') {
    const disableApproved = isWasmDisableFormallyApproved();
    return {
      mode: 'disabled',
      configured: disableApproved,
      ready: disableApproved,
      reachable: false,
      execution_proven: false,
      disable_approved: disableApproved,
      modules: WASM_MODULES.map((m) => ({
        name: m.name,
        configured: false,
        reachable: false,
        execution_proven: false,
        error_type: disableApproved ? 'disabled_by_approval' : 'wasm_disable_not_approved',
      })),
    };
  }

  const modules = [];
  for (const mod of WASM_MODULES) {
    const url = process.env[mod.env];
    const configured = typeof url === 'string' && url.length > 0 && !/CHANGE_ME|REPLACE_ME/i.test(url);
    let reachable = false;
    let execution_proven = false;
    let error_type = null;
    if (configured) {
      const probe = await probeHttpHealth(url, mod.healthPath, { timeoutMs });
      reachable = probe.reachable === true;
      error_type = probe.error_type || null;
      if (reachable) {
        execution_proven = await proveModuleExecution(mod, url, { timeoutMs: timeoutMs + 500 });
        if (!execution_proven) error_type = error_type || 'evaluate_failed';
      }
    } else {
      error_type = 'not_configured';
    }
    modules.push({
      name: mod.name,
      configured,
      reachable,
      execution_proven,
      error_type,
    });
  }

  const allReady = modules.every((m) => m.configured && m.reachable && m.execution_proven);
  const execution_proven = modules.every((m) => m.execution_proven);

  return {
    mode: 'required',
    configured: modules.every((m) => m.configured && m.reachable),
    ready: allReady,
    reachable: modules.every((m) => m.reachable),
    execution_proven,
    disable_approved: false,
    modules,
  };
}

/** Legacy helper — child-safety evaluate smoke. */
export async function proveWasmExecution(baseUrl) {
  return proveModuleExecution({ name: 'child-safety' }, baseUrl);
}

export { WASM_MODULES, WASM_EVALUATE_FIXTURES, proveModuleExecution };
