import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCitationRequirement,
  normalizeCitations,
  CITATION_TYPES,
} from '../src/sheikh/citation-requirement.js';

test('normalizeCitations drops non-array / null / non-object inputs', () => {
  assert.deepEqual(normalizeCitations(null), []);
  assert.deepEqual(normalizeCitations(undefined), []);
  assert.deepEqual(normalizeCitations('quran'), []);
  assert.deepEqual(normalizeCitations([null, 'x', 5, undefined]), []);
});

test('normalizeCitations drops invalid types and empty labels', () => {
  const out = normalizeCitations([
    { citation_type: 'bogus', citation_label: 'whatever' },
    { citation_type: 'quran', citation_label: '   ' },
    { citation_type: 'hadith', citation_label: 'Sahih Muslim 1162' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].citation_type, 'hadith');
  assert.equal(out[0].citation_label, 'Sahih Muslim 1162');
});

test('CITATION_TYPES enum matches the migration', () => {
  assert.deepEqual(CITATION_TYPES.slice(), ['quran', 'hadith', 'fiqh', 'scholar_note']);
});

test('empty citation list → insufficient_citation, no publish', () => {
  const r = evaluateCitationRequirement([]);
  assert.equal(r.citation_status, 'insufficient_citation');
  assert.equal(r.can_publish_public, false);
  assert.equal(r.can_publish_private, false);
});

test('quran-only citation → quran_cited, publishable public + private', () => {
  const r = evaluateCitationRequirement([
    { citation_type: 'quran', citation_label: 'Al-Baqarah 2:183' },
  ]);
  assert.equal(r.citation_status, 'quran_cited');
  assert.equal(r.can_publish_public, true);
  assert.equal(r.can_publish_private, true);
});

test('hadith-only citation → hadith_cited, publishable public + private', () => {
  const r = evaluateCitationRequirement([
    { citation_type: 'hadith', citation_label: 'Sahih Bukhari 1' },
  ]);
  assert.equal(r.citation_status, 'hadith_cited');
  assert.equal(r.can_publish_public, true);
  assert.equal(r.can_publish_private, true);
});

test('quran + hadith → quran_and_hadith_cited', () => {
  const r = evaluateCitationRequirement([
    { citation_type: 'quran', citation_label: 'Al-Baqarah 2:183' },
    { citation_type: 'hadith', citation_label: 'Sahih Muslim 1162' },
  ]);
  assert.equal(r.citation_status, 'quran_and_hadith_cited');
  assert.equal(r.can_publish_public, true);
});

test('scholar_note only → scholar_advice_needs_review, public refused, private OK', () => {
  const r = evaluateCitationRequirement([
    { citation_type: 'scholar_note', citation_label: 'general guidance from scholar' },
  ]);
  assert.equal(r.citation_status, 'scholar_advice_needs_review');
  assert.equal(r.can_publish_public, false);
  assert.equal(r.can_publish_private, true);
});

test('fiqh only → scholar_advice_needs_review (moderation), public refused', () => {
  const r = evaluateCitationRequirement([
    { citation_type: 'fiqh', citation_label: 'Al-Mughni vol 1 p. 200' },
  ]);
  assert.equal(r.citation_status, 'scholar_advice_needs_review');
  assert.equal(r.can_publish_public, false);
  assert.equal(r.can_publish_private, true);
});

test('mix of unknown types only → insufficient_citation', () => {
  const r = evaluateCitationRequirement([
    { citation_type: 'tweet', citation_label: 'twitter post' },
    { citation_type: 'blog', citation_label: 'some blog' },
  ]);
  assert.equal(r.citation_status, 'insufficient_citation');
  assert.equal(r.can_publish_public, false);
});
