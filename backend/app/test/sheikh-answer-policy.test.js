import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideAnswerPublication,
  decideModeratorPublish,
  publicAnswerProjection,
  publicCitationProjection,
} from '../src/sheikh/sheikh-answer-policy.js';

const validQuranCitation = {
  citation_type: 'quran',
  citation_label: 'Surah Al-Baqarah 2:183',
};
const _validHadithCitation = {
  citation_type: 'hadith',
  citation_label: 'Sahih Muslim 1162',
};
// Referenced inline via the quran+hadith assertion below.

test('decideAnswerPublication: empty answer is refused', async () => {
  const d = await decideAnswerPublication({
    answer_text: '   ',
    citations: [validQuranCitation],
    publication_mode: 'public',
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'empty_answer_text');
  assert.equal(d.publication_status, 'draft');
});

test('decideAnswerPublication: invalid publication_mode is refused', async () => {
  const d = await decideAnswerPublication({
    answer_text: 'A scholarly answer.',
    citations: [validQuranCitation],
    publication_mode: 'something-else',
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'invalid_publication_mode');
});

test('decideAnswerPublication: private mode requires at least one citation', async () => {
  const d = await decideAnswerPublication({
    answer_text: 'Some answer',
    citations: [],
    publication_mode: 'private',
  });
  assert.equal(d.allowed, false);
  assert.equal(d.citation_status, 'insufficient_citation');
});

test('decideAnswerPublication: private with valid citation → answered_private', async () => {
  const d = await decideAnswerPublication({
    answer_text: 'Some answer',
    citations: [validQuranCitation],
    publication_mode: 'private',
  });
  assert.equal(d.allowed, true);
  assert.equal(d.publication_status, 'answered_private');
  assert.equal(d.citation_status, 'quran_cited');
});

test('decideAnswerPublication: public path with no citation refused', async () => {
  const d = await decideAnswerPublication({
    answer_text: 'Some answer',
    citations: [],
    publication_mode: 'public',
  });
  assert.equal(d.allowed, false);
  assert.equal(d.citation_status, 'insufficient_citation');
});

test('decideAnswerPublication: public path with Quran citation → pending_moderation', async () => {
  const d = await decideAnswerPublication({
    answer_text: 'Detailed scholar answer about fasting.',
    citations: [validQuranCitation],
    publication_mode: 'public',
  });
  assert.equal(d.allowed, true);
  assert.equal(d.citation_status, 'quran_cited');
  assert.equal(d.publication_status, 'pending_moderation');
});

test('decideAnswerPublication: public path with scholar_note only → moderation (no auto-publish)', async () => {
  const d = await decideAnswerPublication({
    answer_text: 'General guidance.',
    citations: [{ citation_type: 'scholar_note', citation_label: 'Sheikh Hasan personal note' }],
    publication_mode: 'public',
  });
  assert.equal(d.allowed, true);
  assert.equal(d.citation_status, 'scholar_advice_needs_review');
  assert.equal(d.publication_status, 'pending_moderation');
});

test('decideModeratorPublish: refuses when not in pending_moderation', () => {
  const d = decideModeratorPublish({
    citation_status: 'quran_cited',
    publication_status: 'draft',
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'not_in_pending_moderation');
});

test('decideModeratorPublish: allows when Quran or Hadith cited', () => {
  for (const cs of ['quran_cited', 'hadith_cited', 'quran_and_hadith_cited']) {
    const d = decideModeratorPublish({
      citation_status: cs,
      publication_status: 'pending_moderation',
    });
    assert.equal(d.allowed, true, `should allow ${cs}`);
  }
});

test('decideModeratorPublish: scholar_advice_needs_review requires explicit override', () => {
  const d = decideModeratorPublish({
    citation_status: 'scholar_advice_needs_review',
    publication_status: 'pending_moderation',
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'citation_status_requires_explicit_override');
});

test('publicAnswerProjection never exposes user_id / email_hash / question_hash', () => {
  const internal = {
    slug: 'demo-slug',
    title: 'How long is wudu valid?',
    language: 'en',
    category: 'salah',
    answer_text: 'short scholar answer',
    citations: [
      { citation_type: 'quran', citation_label: 'Al-Maidah 5:6', verification_status: 'verified' },
    ],
    sheikh_name: 'Sheikh Hasan',
    published_at: '2026-05-13T00:00:00Z',
    // intentionally adversarial fields:
    user_id: 'should-not-leak',
    email_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    question_hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    sheikh_user_id: 'should-not-leak-either',
  };
  const p = publicAnswerProjection(internal);
  const raw = JSON.stringify(p);
  assert.ok(!raw.includes('should-not-leak'), 'projection leaked user_id');
  assert.ok(!raw.includes('email_hash'), 'projection leaked email_hash field name');
  assert.ok(!raw.includes('question_hash'), 'projection leaked question_hash field name');
  assert.ok(!raw.includes('sheikh_user_id'), 'projection leaked sheikh_user_id');
});

test('publicCitationProjection strips internal fields', () => {
  const internal = {
    id: 'abc',
    answer_id: 'def',
    citation_type: 'quran',
    citation_label: 'Al-Baqarah 2:183',
    citation_text: null,
    citation_url: null,
    verification_status: 'verified',
    source_id: 'should-not-leak',
    created_at: '2026-05-13T00:00:00Z',
  };
  const p = publicCitationProjection(internal);
  const raw = JSON.stringify(p);
  assert.ok(!raw.includes('answer_id'),    'leaked answer_id');
  assert.ok(!raw.includes('source_id'),    'leaked source_id');
  assert.ok(!raw.includes('should-not-leak'), 'leaked sentinel');
  assert.equal(p.citation_label, 'Al-Baqarah 2:183');
  assert.equal(p.verification_status, 'verified');
});
