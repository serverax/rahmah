#!/usr/bin/env node
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../backend/app/package.json', import.meta.url));
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT q.status, q.public_visible, count(*)::int
  FROM ask_sheikh_questions q
  GROUP BY 1, 2
`);
const join = await pool.query(`
  SELECT q.id, q.question_text_ar, q.status, q.public_visible, a.status as answer_status
  FROM ask_sheikh_questions q
  LEFT JOIN ask_sheikh_answers a ON a.question_id = q.id
  ORDER BY q.created_at DESC
  LIMIT 10
`);
const published = await pool.query(`
  SELECT count(*)::int AS c
  FROM ask_sheikh_questions q
  JOIN ask_sheikh_answers a ON a.question_id = q.id
  WHERE q.status = 'published' AND a.status = 'published' AND q.public_visible = TRUE
`);
console.log(JSON.stringify({ groups: r.rows, published: published.rows[0].c, sample: join.rows }, null, 2));
await pool.end();
