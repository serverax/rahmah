#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { buildApp } = require(path.resolve(REPO_ROOT, 'backend', 'app', 'src', 'app.js'));

async function main() {
  const app = buildApp();
  try {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    const body = res.json();
    console.log(JSON.stringify({
      ok: res.statusCode === 200,
      statusCode: res.statusCode,
      readiness_schema_version: body.readiness_schema_version || null,
      production_ready: body.production_ready ?? null,
      safe_to_serve_public: body.safe_to_serve_public ?? null,
      rag: body.rag || null,
      algorithm: body.algorithm || null,
      blockers: body.blockers || [],
      database: body.database || null,
      mobile: body.mobile || null,
      auth: body.auth || null,
      wasm: body.wasm || null,
    }, null, 2));
    process.exitCode = res.statusCode === 200 ? 0 : 1;
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: String(error?.message || error) }, null, 2));
    process.exitCode = 1;
  } finally {
    await app.close().catch(() => {});
  }
}

main();
