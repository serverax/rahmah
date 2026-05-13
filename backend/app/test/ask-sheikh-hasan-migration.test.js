import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'db', 'migrations');

async function read(name) {
  return fs.readFile(path.join(MIGRATIONS_DIR, name), 'utf8');
}

test('migration 003 file exists and is non-trivial', async () => {
  const text = await read('003_ask_sheikh_hasan_public_qa.sql');
  assert.ok(text.length > 500, 'migration 003 looks suspiciously short');
});

test('migration 003 declares the eight required tables', async () => {
  const text = await read('003_ask_sheikh_hasan_public_qa.sql');
  for (const table of [
    'sakina_users',
    'sakina_sheikh_profiles',
    'sakina_user_questions',
    'sakina_sheikh_answers',
    'sakina_sheikh_answer_citations',
    'sakina_public_qa',
    'sakina_content_reports',
    'sakina_sheikh_audit_log',
  ]) {
    const re = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\b`);
    assert.ok(re.test(text), `missing CREATE TABLE for ${table}`);
  }
});

test('migration 003 declares the role and status enums via CHECK constraints', async () => {
  const text = await read('003_ask_sheikh_hasan_public_qa.sql');
  // Roles
  assert.ok(/role\s+TEXT\s+NOT NULL\s+CHECK \(role IN \(/.test(text), 'role enum CHECK missing');
  for (const role of ['user', 'sheikh', 'moderator', 'admin']) {
    assert.ok(text.includes(`'${role}'`), `role value missing: ${role}`);
  }
  // User question status
  for (const status of [
    'pending_review',
    'assigned_to_sheikh',
    'draft_answered',
    'pending_moderation',
    'published_public',
    'answered_private',
    'rejected',
    'archived',
  ]) {
    assert.ok(text.includes(`'${status}'`), `question status value missing: ${status}`);
  }
  // Answer citation_status enum
  for (const cs of [
    'quran_cited',
    'hadith_cited',
    'quran_and_hadith_cited',
    'scholar_advice_needs_review',
    'insufficient_citation',
  ]) {
    assert.ok(text.includes(`'${cs}'`), `citation_status value missing: ${cs}`);
  }
  // Answer publication_status enum
  for (const ps of ['draft', 'pending_moderation', 'published_public', 'answered_private', 'rejected']) {
    assert.ok(text.includes(`'${ps}'`), `publication_status value missing: ${ps}`);
  }
  // Citation type enum
  for (const t of ['quran', 'hadith', 'fiqh', 'scholar_note']) {
    assert.ok(text.includes(`'${t}'`), `citation_type value missing: ${t}`);
  }
});

test('migration 003 stores email_hash but never a plaintext email or password column', async () => {
  const text = await read('003_ask_sheikh_hasan_public_qa.sql');
  // email_hash present
  assert.ok(/email_hash\s+TEXT\s+NOT NULL\s+UNIQUE/.test(text), 'email_hash column missing');
  // explicitly forbid columns that would suggest credential storage
  assert.ok(!/\bpassword_hash\b/i.test(text), 'migration 003 contains password_hash column');
  assert.ok(!/\bpassword\b\s+TEXT/i.test(text), 'migration 003 contains password text column');
  assert.ok(!/\bphone_number\b/i.test(text), 'migration 003 contains phone_number column (none required this sprint)');
  assert.ok(!/\bwhatsapp_to\b/i.test(text), 'migration 003 contains whatsapp_to column');
});

test('migration 003 has no DSN, secret tokens, destructive ops, or seed rows', async () => {
  const text = await read('003_ask_sheikh_hasan_public_qa.sql');
  assert.ok(!/postgres(ql)?:\/\//.test(text),  'migration 003 leaked a DSN');
  assert.ok(!/REPLACE_ME/.test(text),          'migration 003 mentions REPLACE_ME placeholder');
  assert.ok(!/AKIA[0-9A-Z]{16}/.test(text),    'migration 003 contains AWS key shape');
  assert.ok(!/ghp_[0-9A-Za-z]{36}/.test(text), 'migration 003 contains GitHub PAT shape');
  assert.ok(!/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(text), 'migration 003 contains private key block');
  assert.ok(!/DROP\s+DATABASE/i.test(text),    'migration 003 contains DROP DATABASE');
  assert.ok(!/DROP\s+SCHEMA/i.test(text),      'migration 003 contains DROP SCHEMA');
  assert.ok(!/TRUNCATE\s+/i.test(text),        'migration 003 contains TRUNCATE');
  assert.ok(!/DELETE\s+FROM\s+sakina_/i.test(text), 'migration 003 contains DELETE FROM sakina_*');
  assert.ok(!/INSERT\s+INTO\s+sakina_/i.test(text),  'migration 003 INSERTs into sakina_* — must be schema only');
});

test('migration 003 indexes the queue and the public_qa live filter', async () => {
  const text = await read('003_ask_sheikh_hasan_public_qa.sql');
  // queue
  assert.ok(/CREATE INDEX IF NOT EXISTS\s+idx_suq_status\b/.test(text),
    'idx on sakina_user_questions(status) missing');
  assert.ok(/CREATE INDEX IF NOT EXISTS\s+idx_suq_assigned_sheikh\b/.test(text),
    'idx on sakina_user_questions(assigned_sheikh_id) missing');
  // public_qa
  assert.ok(/CREATE INDEX IF NOT EXISTS\s+idx_spqa_live_cat_lang\b/.test(text),
    'idx on sakina_public_qa(is_live, category, language) missing');
  // audit log
  assert.ok(/CREATE INDEX IF NOT EXISTS\s+idx_ssal_actor_action\b/.test(text),
    'idx on sakina_sheikh_audit_log(actor_user_id, action) missing');
});

test('migration 003 has no real WhatsApp / phone / token literals', async () => {
  const text = await read('003_ask_sheikh_hasan_public_qa.sql');
  // No phone-shaped literal like +<digits>{8+}. The schema-level audit row
  // never stores phone numbers; this is double-protection.
  assert.ok(!/\+\d{8,}/.test(text), 'migration 003 contains a phone-number-shaped literal');
  // No literal WhatsApp recipient
  assert.ok(!/wa\.me\//i.test(text), 'migration 003 contains a wa.me link');
  assert.ok(!/whatsapp_token/i.test(text), 'migration 003 contains whatsapp_token');
});
