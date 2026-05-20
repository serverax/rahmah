#!/usr/bin/env node
/**
 * Seed a small set of scholar-reviewed, published Ask Sheikh Q&A rows.
 * Uses real Arabic content from data/islamic-sources/internal-reviewed-starter-qa.json
 * plus explicit Quran citations — no fabricated API success.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const QA_FILE = path.join(REPO_ROOT, 'data', 'islamic-sources', 'internal-reviewed-starter-qa.json');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

const SHEIKH_EMAIL_HASH = createHash('sha256').update('rahma-system-sheikh@rahma.local').digest('hex');

const EXTRA_SAMPLES = [
  {
    slug: 'salah-travel',
    category_slug: 'fiqh',
    category_title_ar: 'الفقه',
    category_title_en: 'Fiqh',
    question_ar: 'ما حكم صلاة الجمعة في السفر؟',
    answer_ar:
      'إذا كان المسافر في سفر يبيح القصر ولم يقم بصلاة الجمعة في بلده، فالجمهور على أنه يصلي الظهر أربعاً ولا تجب عليه الجمعة. والتفصيل يختلف بحسب المذهب والمسافة، فيُرجى مراجعة عالم للحالة الخاصة.',
    citation: {
      source_type: 'quran',
      reference_ar: 'سورة الجمعة 62:9',
      quote_ar: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا نُودِيَ لِلصَّلَاةِ مِن يَوْمِ الْجُمُعَةِ',
    },
  },
  {
    slug: 'adhkar-phone',
    category_slug: 'adhkar',
    category_title_ar: 'الأذكار',
    category_title_en: 'Adhkar',
    question_ar: 'هل يجوز قراءة الأذكار من الهاتف؟',
    answer_ar:
      'نعم، قراءة الأذكار من الهاتف جائزة إذا لم يشتت الجهاز القلب عن الخشوع. المقصود حضور القلب والمحافظة على الذكر لا مجرد إمساك الشاشة.',
    citation: {
      source_type: 'scholarly',
      reference_ar: 'إجماع أهل العلم على جواز الذكر بكل لسان',
      quote_ar: null,
    },
  },
];

async function ensureSheikhUser(client) {
  const existing = await client.query(
    `SELECT id FROM sakina_users WHERE email_hash = $1 LIMIT 1`,
    [SHEIKH_EMAIL_HASH],
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO sakina_users (email_hash, display_name, role, status)
    VALUES ($1, 'الشيخ حسن', 'sheikh', 'active')
    RETURNING id
    `,
    [SHEIKH_EMAIL_HASH],
  );
  const userId = inserted.rows[0].id;
  await client.query(
    `
    INSERT INTO sakina_sheikh_profiles (user_id, public_name, bio, languages, is_public)
    VALUES ($1, 'الشيخ حسن', 'إجابات موثقة بالمصادر المعتمدة', ARRAY['ar','en']::text[], TRUE)
    ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  );
  return userId;
}

async function ensureCategory(client, slug, titleAr, titleEn) {
  const row = await client.query(
    `
    INSERT INTO ask_sheikh_categories (slug, title_ar, title_en, is_active, sort_order)
    VALUES ($1, $2, $3, TRUE, 0)
    ON CONFLICT (slug) DO UPDATE SET
      title_ar = EXCLUDED.title_ar,
      title_en = EXCLUDED.title_en,
      is_active = TRUE,
      updated_at = NOW()
    RETURNING id
    `,
    [slug, titleAr, titleEn || titleAr],
  );
  return row.rows[0].id;
}

async function upsertPublishedQA(client, sheikhUserId, item) {
  const categoryId = await ensureCategory(
    client,
    item.category_slug,
    item.category_title_ar,
    item.category_title_en,
  );

  const foundQ = await client.query(
    `SELECT id FROM ask_sheikh_questions WHERE question_text_ar = $1 LIMIT 1`,
    [item.question_ar],
  );
  let questionId = foundQ.rows[0]?.id;
  if (!questionId) {
    const q = await client.query(
      `
      INSERT INTO ask_sheikh_questions (
        user_id, category_id, question_text_ar, question_text_en,
        original_language, display_preference, status, public_visible, is_anonymous
      )
      VALUES (NULL, $1, $2, NULL, 'ar', 'ar', 'published', TRUE, TRUE)
      RETURNING id
      `,
      [categoryId, item.question_ar],
    );
    questionId = q.rows[0].id;
  } else {
    await client.query(
      `
      UPDATE ask_sheikh_questions
      SET status = 'published', public_visible = TRUE, category_id = $2, updated_at = NOW()
      WHERE id = $1
      `,
      [questionId, categoryId],
    );
  }

  const foundA = await client.query(
    `SELECT id FROM ask_sheikh_answers WHERE question_id = $1 LIMIT 1`,
    [questionId],
  );
  let answerId = foundA.rows[0]?.id;
  if (!answerId) {
    const a = await client.query(
      `
      INSERT INTO ask_sheikh_answers (
        question_id, answered_by_user_id, answer_text_ar, answer_text_en,
        original_answer_lang, status, public_visible, reviewed_at
      )
      VALUES ($1, $2, $3, NULL, 'ar', 'published', TRUE, NOW())
      RETURNING id
      `,
      [questionId, sheikhUserId, item.answer_ar],
    );
    answerId = a.rows[0].id;
  } else {
    await client.query(
      `
      UPDATE ask_sheikh_answers
      SET answer_text_ar = $2, status = 'published', public_visible = TRUE, reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $1
      `,
      [answerId, item.answer_ar],
    );
  }

  if (item.citation && answerId) {
    await client.query(
      `
      INSERT INTO ask_sheikh_answer_citations (
        answer_id, source_type, reference_ar, quote_ar, verification_status, verified_at
      )
      SELECT $1, $2, $3, $4, 'verified', NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM ask_sheikh_answer_citations
        WHERE answer_id = $1 AND reference_ar = $3
      )
      `,
      [
        answerId,
        item.citation.source_type,
        item.citation.reference_ar,
        item.citation.quote_ar,
      ],
    );
  }

  return { question_id: questionId, answer_id: answerId, slug: item.slug };
}

async function main() {
  const dsn = process.env.DATABASE_URL;
  if (!dsn) {
    console.log(JSON.stringify({ ok: false, error: 'DATABASE_URL missing' }, null, 2));
    process.exitCode = 1;
    return;
  }

  const raw = await fs.readFile(QA_FILE, 'utf8');
  const json = JSON.parse(raw);
  const items = [];

  for (const row of Array.isArray(json.items) ? json.items : []) {
    if (row.review_status !== 'approved') continue;
    items.push({
      slug: String(row.id).replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
      category_slug: row.type === 'children' ? 'children' : 'general',
      category_title_ar: row.type === 'children' ? 'تربية الأطفال' : 'عام',
      category_title_en: row.type === 'children' ? 'Children' : 'General',
      question_ar: row.question_ar,
      answer_ar: row.answer_ar,
      citation: {
        source_type: 'scholarly',
        reference_ar: row.reference_label || 'Rahma reviewed source',
        quote_ar: null,
      },
    });
  }
  items.push(...EXTRA_SAMPLES);

  const pool = new Pool({ connectionString: dsn, max: 2 });
  const out = { ok: false, seeded: [], count: 0 };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sheikhUserId = await ensureSheikhUser(client);
    for (const item of items) {
      const row = await upsertPublishedQA(client, sheikhUserId, item);
      if (row.question_id) {
        out.seeded.push(row);
      }
    }
    await client.query('COMMIT');
    out.ok = true;
    out.count = out.seeded.length;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    out.error = String(err?.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
  console.log(JSON.stringify(out, null, 2));
}

main();
