/**
 * scripts/smoke-rahma-test-ui.js
 * 
 * REAL HTTP Smoke test for the Rahma Local Test UI.
 * Spawns the server, waits for port 3001, and performs HTTP GET requests.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

const CHECKS = [
  { path: '/test-ui/index.html', expected: 'Rahma Local Test UI' },
  { path: '/test-ui/status.html', expected: 'PASS' },
  { path: '/assets/test-ui.css', expected: '--rahma-emerald' }
];

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = http.get(`${BASE_URL}/health-check-dummy`, (res) => {
      resolve(true);
      res.resume();
    }).on('error', () => {
      resolve(false);
    });
    setTimeout(() => socket.destroy(), 500);
  });
}

async function runTest() {
  console.log('Starting REAL HTTP Smoke Test for Rahma Local Test UI...');

  // 1. Spawn the server
  const server = spawn('node', ['scripts/start-rahma-test-ui.js'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    env: { ...process.env, PORT: PORT.toString() }
  });

  server.stdout.on('data', (data) => {
    // console.log(`[SERVER]: ${data}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR]: ${data}`);
  });

  // 2. Wait for server to be ready
  let ready = false;
  for (let i = 0; i < 10; i++) {
    if (await isPortOpen(PORT)) {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error(`\x1b[31m[FAIL] Server failed to start on port ${PORT} within 10 seconds.\x1b[0m`);
    server.kill();
    process.exit(1);
  }

  // 3. Perform HTTP checks
  let failures = 0;
  for (const check of CHECKS) {
    try {
      const resBody = await new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${check.path}`, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Status ${res.statusCode} for ${check.path}`));
            return;
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });

      if (resBody.includes(check.expected)) {
        console.log(`\x1b[32m[PASS]\x1b[0m ${check.path} returned 200 and contains "${check.expected}"`);
      } else {
        console.error(`\x1b[31m[FAIL]\x1b[0m ${check.path} returned 200 but MISSING "${check.expected}"`);
        failures++;
      }
    } catch (err) {
      console.error(`\x1b[31m[FAIL]\x1b[0m ${check.path} failed: ${err.message}`);
      failures++;
    }
  }

  // 4. Cleanup
  server.kill();

  if (failures === 0) {
    console.log('\x1b[32m%s\x1b[0m', '\nRAHMA LOCAL TEST UI HTTP SMOKE TEST: PASS');
    process.exit(0);
  } else {
    console.error('\x1b[31m%s\x1b[0m', `\nRAHMA LOCAL TEST UI HTTP SMOKE TEST: FAIL (${failures} errors)`);
    process.exit(1);
  }
}

runTest();
