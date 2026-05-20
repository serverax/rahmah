#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INPUT = path.join(REPO_ROOT, 'data', 'source-candidates', 'islamic-source-candidates.json');

function pushBlocker(blockers, msg) {
  if (!blockers.includes(msg)) blockers.push(msg);
}

function validateCandidate(c) {
  const blockers = [];
  const allowedTriState = new Set(['yes', 'no', 'unknown']);
  const required = [
    'source_id', 'title', 'provider', 'url', 'content_type', 'language',
    'licence_status', 'attribution_required', 'offline_storage_allowed',
    'commercial_use_allowed', 'authenticity_level', 'approval_status', 'notes',
  ];
  for (const k of required) {
    if (!(k in c)) pushBlocker(blockers, `missing_${k}`);
  }
  if (typeof c.source_id !== 'string' || !c.source_id.trim()) pushBlocker(blockers, 'invalid_source_id');
  if (typeof c.title !== 'string' || !c.title.trim()) pushBlocker(blockers, 'invalid_title');
  if (typeof c.url !== 'string' || !/^https?:\/\//i.test(c.url)) pushBlocker(blockers, 'invalid_url');
  if (typeof c.attribution_required !== 'boolean' && !allowedTriState.has(String(c.attribution_required).toLowerCase())) {
    pushBlocker(blockers, 'invalid_attribution_required');
  }
  if (typeof c.offline_storage_allowed !== 'boolean' && !allowedTriState.has(String(c.offline_storage_allowed).toLowerCase())) {
    pushBlocker(blockers, 'invalid_offline_storage_allowed');
  }
  if (typeof c.commercial_use_allowed !== 'boolean' && !allowedTriState.has(String(c.commercial_use_allowed).toLowerCase())) {
    pushBlocker(blockers, 'invalid_commercial_use_allowed');
  }
  if (c.approval_status === 'APPROVED') pushBlocker(blockers, 'approval_status_must_not_be_final_approved');
  if (c.approval_status === 'APPROVED_FOR_REVIEW' && c.source_approved === true) pushBlocker(blockers, 'source_approved_must_be_false_before_manual_approval');
  return blockers;
}

async function main() {
  try {
    const raw = await fs.readFile(INPUT, 'utf8');
    const data = JSON.parse(raw);
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const blockers = [];
    for (const c of candidates) {
      const candidateBlockers = validateCandidate(c);
      if (candidateBlockers.length > 0) {
        blockers.push({ source_id: c.source_id || null, blockers: candidateBlockers });
      }
    }
    const out = {
      ok: blockers.length === 0,
      registry_file: INPUT,
      candidate_count: candidates.length,
      blockers,
    };
    console.log(JSON.stringify(out, null, 2));
    if (blockers.length > 0) process.exitCode = 1;
  } catch (err) {
    console.log(JSON.stringify({
      ok: false,
      registry_file: INPUT,
      candidate_count: 0,
      blockers: [String(err?.message || err)],
    }, null, 2));
    process.exitCode = 1;
  }
}

main();
