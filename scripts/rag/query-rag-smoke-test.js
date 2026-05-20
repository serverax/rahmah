#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

async function loadBackendModules() {
  const [appModule, algorithmModule] = await Promise.all([
    import(pathToFileURL(path.resolve(REPO_ROOT, 'backend', 'app', 'src', 'app.js')).href),
    import(pathToFileURL(path.resolve(REPO_ROOT, 'backend', 'app', 'src', 'services', 'rahma-algorithm.service.js')).href),
  ]);
  return { appModule, algorithmModule };
}

async function main() {
  const question = process.argv.slice(2).join(' ').trim() || 'ما هي الآية الأولى من سورة الفاتحة؟';
  if (!process.env.DATABASE_URL) {
    console.log(JSON.stringify({
      ok: false,
      statusCode: 500,
      response: {
        db_status: 'DB_NOT_EXECUTED',
        blockers: ['DATABASE_URL is missing or test DB unavailable'],
      },
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: '-c client_encoding=UTF8',
    max: 2,
    connectionTimeoutMillis: 5_000,
  });

  let app = null;
  let algorithmModule = null;
  try {
    await pool.query('SELECT 1');
    const modules = await loadBackendModules();
    algorithmModule = modules.algorithmModule;
    const {
      createRahmaAlgorithmService,
      configureRahmaAlgorithm,
    } = algorithmModule;
    configureRahmaAlgorithm(createRahmaAlgorithmService({ pool }));
    app = modules.appModule.buildApp({ autoInit: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/rag/query',
      payload: {
        question_ar: question,
        language: 'ar',
        use_live_rag: true,
      },
    });
    const body = res.json();
    console.log(JSON.stringify({
      ok: res.statusCode === 200 && body.safety_status === 'verified_sources' && Array.isArray(body.citations) && body.citations.length > 0,
      statusCode: res.statusCode,
      response: body,
    }, null, 2));
    process.exitCode = res.statusCode === 200 && body.safety_status === 'verified_sources' && Array.isArray(body.citations) && body.citations.length > 0 ? 0 : 1;
  } catch (error) {
    console.log(JSON.stringify({
      ok: false,
      error: String(error?.message || error),
    }, null, 2));
    process.exitCode = 1;
  } finally {
    if (app) await app.close().catch(() => {});
    if (algorithmModule) algorithmModule._resetRahmaAlgorithmForTests();
    await pool.end().catch(() => {});
  }
}

main();
