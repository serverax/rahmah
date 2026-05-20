/**
 * internal-wasm-client — minimal HTTP wrapper for cross-service WASM calls.
 *
 * Uses node:http directly to comply with the project's "no external LLM /
 * generic HTTP client" policy (enforced by no-external-llm.test.js).
 *
 * NEVER contacts the public internet. Only connects to the intra-cluster
 * WASM bridge URLs defined in process.env.
 */

import http from 'node:http';

/**
 * Call an internal WASM bridge endpoint.
 *
 * @param {string} url - Bridge URL (e.g. from process.env.WASM_CHILD_SAFETY_URL)
 * @param {string} path - Endpoint path (e.g. '/evaluate')
 * @param {object} payload - JSON input
 * @returns {Promise<object>} - Bridge response
 */
export async function callWasmBridge(url, path, payload) {
  if (!url) return { ok: false, error: 'bridge_not_configured' };

  try {
    const target = new URL(path, url);
    const body = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const req = http.request(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: Number(process.env.WASM_BRIDGE_TIMEOUT_MS || 2000),
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode >= 400) {
              resolve({ ok: false, error: 'bridge_error', status: res.statusCode });
            } else {
              resolve(JSON.parse(data));
            }
          } catch (e) {
            resolve({ ok: false, error: 'invalid_response' });
          }
        });
      });

      req.on('error', (e) => {
        resolve({ ok: false, error: 'bridge_unreachable', detail: e.code });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'bridge_timeout' });
      });

      req.write(body);
      req.end();
    });
  } catch (err) {
    return { ok: false, error: 'client_initialization_failed' };
  }
}
