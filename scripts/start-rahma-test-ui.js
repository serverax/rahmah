/**
 * scripts/start-rahma-test-ui.js
 * 
 * Minimal static server for the Rahma Local Test UI.
 * Uses only built-in Node.js modules.
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'apps', 'web', 'public');

const PORT_DEFAULT = 3001;
const HOST = '127.0.0.1'; // Force localhost for local testing

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

async function serveFile(res, filePath) {
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
       res.writeHead(404, { 'Content-Type': 'text/plain' });
       res.end('404 Not Found');
    } else {
       res.writeHead(500);
       res.end('Internal Server Error');
    }
  }
}

const server = http.createServer(async (req, res) => {
  let urlPath = (req.url || '/').split('?')[0];
  if (urlPath === '/') urlPath = '/test-ui/index.html';

  let fullPath = path.join(PUBLIC_DIR, urlPath);

  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      fullPath = path.join(fullPath, 'index.html');
      const indexStats = await fs.stat(fullPath);
      if (!indexStats.isFile()) throw new Error('Not a file');
    }
    await serveFile(res, fullPath);
  } catch (err) {
    // Try appending .html
    try {
      const htmlPath = fullPath + '.html';
      await fs.access(htmlPath);
      await serveFile(res, htmlPath);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html lang="ar" dir="rtl"><body><h1>404 - الصفحة غير موجودة</h1><p>Path: '+urlPath+'</p></body></html>');
    }
  }
});

function startServer(port) {
  server.listen(port, HOST, () => {
    process.stdout.write('\x1b[32mRahma Local Test UI running\x1b[0m\n');
    process.stdout.write(`Dashboard URL: \x1b[36mhttp://localhost:${port}/test-ui/index.html\x1b[0m\n`);
    process.stdout.write(`Status URL:    \x1b[36mhttp://localhost:${port}/test-ui/status.html\x1b[0m\n`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
startServer(isNaN(envPort) ? PORT_DEFAULT : envPort);
