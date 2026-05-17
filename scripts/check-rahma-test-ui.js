/**
 * scripts/check-rahma-test-ui.js
 * 
 * Diagnostic script for Rahma Local Test UI.
 * Checks port usage and reachability.
 */

import http from 'node:http';
import { execSync } from 'node:child_process';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function check() {
  console.log('--- Rahma Local Test UI Diagnostic ---');
  
  // 1. Check if port is listening
  try {
    const res = await new Promise((resolve, reject) => {
      const req = http.get(`${BASE_URL}/test-ui/index.html`, (res) => {
        resolve(res);
        res.resume();
      }).on('error', reject);
      setTimeout(() => req.destroy(), 1000);
    });

    if (res.statusCode === 200) {
      console.log(`\x1b[32m[OK]\x1b[0m Server is listening on port ${PORT} and reachable.`);
      console.log(`URL: ${BASE_URL}/test-ui/index.html`);
    } else {
      console.log(`\x1b[33m[WARN]\x1b[0m Port ${PORT} is listening but returned status ${res.statusCode}.`);
    }
  } catch (err) {
    console.log(`\x1b[31m[FAIL]\x1b[0m Port ${PORT} is NOT reachable: ${err.message}`);
    
    // 2. Windows specific check
    if (process.platform === 'win32') {
      try {
        const netstat = execSync(`netstat -ano | findstr :${PORT}`).toString();
        if (netstat.includes('LISTENING')) {
          console.log(`\x1b[33m[DIAG]\x1b[0m Port ${PORT} is in use by another process but not responding as expected.`);
          console.log(netstat);
          console.log('To kill the process, run: Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force');
        } else {
          console.log(`\x1b[36m[DIAG]\x1b[0m Port ${PORT} is completely free.`);
        }
      } catch (e) {
        console.log(`\x1b[36m[DIAG]\x1b[0m Port ${PORT} is completely free.`);
      }
    }
  }

  console.log('\nTo start the server, run:');
  console.log('  npm run local:test-ui');
}

check();
