#!/usr/bin/env node
/**
 * apps/web/server.js — minimal static dev server for the Rahma frontend.
 *
 * Why vanilla: avoids installing a React/Next.js tree in this turn while
 * still giving the operator a "visible in a browser" deliverable. The
 * frontend can be swapped to Next.js/Vite in a focused sprint by replacing
 * apps/web/public/ with the framework output — the routes already match.
 *
 * Usage:
 *   node apps/web/server.js                 # serves on :8080
 *   PORT=3001 node apps/web/server.js
 *
 * No external dependencies. No tracking. No analytics.
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function safeJoin(base, target) {
  const norm = path.normalize(target).replace(/^(\.\.[/\\])+/, '');
  const joined = path.join(base, norm);
  if (!joined.startsWith(base)) return null;
  return joined;
}

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = (req.url || '/').split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';
    // Allow `/about` to serve `/about.html`.
    let fp = safeJoin(PUBLIC_DIR, urlPath);
    if (!fp) { res.writeHead(400); res.end('bad request'); return; }
    let stat;
    try { stat = await fs.stat(fp); }
    catch {
      // Try appending .html.
      try {
        fp = safeJoin(PUBLIC_DIR, urlPath + '.html');
        if (!fp) { res.writeHead(404); res.end('not found'); return; }
        stat = await fs.stat(fp);
      } catch {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><html lang="ar" dir="rtl"><body><h1>الصفحة غير موجودة</h1></body></html>');
        return;
      }
    }
    if (stat.isDirectory()) {
      fp = path.join(fp, 'index.html');
      try { await fs.stat(fp); } catch { res.writeHead(404); res.end('not found'); return; }
    }
    const ext = path.extname(fp).toLowerCase();
    const ct  = MIME[ext] || 'application/octet-stream';
    const buf = await fs.readFile(fp);
    res.writeHead(200, {
      'content-type': ct,
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' *",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    });
    res.end(buf);
  } catch (_e) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('server error');
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`rahma web dev server listening on http://127.0.0.1:${PORT}`);
});
