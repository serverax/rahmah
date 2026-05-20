import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const metadataPath = path.join(repoRoot, 'data', 'islamic-sources', 'azan-audio-metadata.json');

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function headerType(buffer) {
  const ascii = buffer.subarray(0, 16).toString('ascii');
  const text = buffer.subarray(0, 32).toString('utf8').trimStart().toLowerCase();
  if (text.startsWith('<!doctype') || text.startsWith('<html')) return 'html';
  if (text.startsWith('file not found')) return 'text_not_found';
  if (ascii.startsWith('ID3')) return 'mp3_id3';
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'mp3_frame';
  if (ascii.startsWith('RIFF') && buffer.subarray(8, 12).toString('ascii') === 'WAVE') return 'wav';
  if (ascii.startsWith('OggS')) return 'ogg';
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'mp4_m4a';
  return 'unknown';
}

function isPlayableHeader(type) {
  return ['mp3_id3', 'mp3_frame', 'wav', 'ogg', 'mp4_m4a'].includes(type);
}

function estimateDurationSeconds(filePath, type) {
  const bytes = fs.statSync(filePath).size;
  if (!isPlayableHeader(type)) return null;
  // Conservative fallback estimate for verification. Exact duration should be
  // confirmed by device playback when an approved asset is added.
  const assumedBitrateKbps = 128;
  return Math.max(1, Math.round((bytes * 8) / (assumedBitrateKbps * 1000)));
}

function verifyOption(option) {
  const rel = option.file_path || '';
  const filePath = path.join(repoRoot, 'apps', 'mobile', rel);
  const result = {
    id: option.id || null,
    approved: option.approved === true,
    file_path: rel,
    exists: fs.existsSync(filePath),
    valid_header: false,
    header_type: 'missing',
    duration_readable: false,
    duration_seconds_estimate: null,
    hash_matches: false,
    license_documented: Boolean(option.license && option.source && option.source_url),
    source_documented: Boolean(option.source && option.source_url),
    blockers: [],
  };

  if (!result.exists) {
    result.blockers.push('file_missing');
  } else {
    const buffer = fs.readFileSync(filePath);
    result.header_type = headerType(buffer);
    result.valid_header = isPlayableHeader(result.header_type);
    if (!result.valid_header) result.blockers.push(`invalid_audio_header:${result.header_type}`);
    result.duration_seconds_estimate = estimateDurationSeconds(filePath, result.header_type);
    result.duration_readable = Number.isFinite(result.duration_seconds_estimate);
    if (!result.duration_readable) result.blockers.push('duration_not_readable');
    result.hash_matches = sha256(filePath) === String(option.file_hash_sha256 || '').toLowerCase();
    if (!result.hash_matches) result.blockers.push('hash_mismatch');
  }

  if (!result.license_documented) result.blockers.push('license_or_source_missing');
  if (!result.source_documented) result.blockers.push('source_missing');
  if (result.approved && result.blockers.length > 0) result.blockers.push('approved_asset_failed_verification');

  return result;
}

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const options = Array.isArray(metadata.options) ? metadata.options : [];
const results = options.map(verifyOption);
const approved = results.filter((r) => r.approved);
const approvedPassing = approved.filter((r) => r.blockers.length === 0);
const status = approved.length === 0
  ? 'AZAN_AUDIO_DISABLED_FOR_RELEASE'
  : approvedPassing.length === approved.length
    ? 'PASS_AZAN_AUDIO_ASSETS_VERIFIED'
    : 'FAIL_AZAN_AUDIO_BLOCKERS';

const output = {
  ok: status !== 'FAIL_AZAN_AUDIO_BLOCKERS',
  status,
  metadata_path: metadataPath,
  approved_assets: approved.length,
  verified_approved_assets: approvedPassing.length,
  results,
};

console.log(JSON.stringify(output, null, 2));
if (status === 'FAIL_AZAN_AUDIO_BLOCKERS') process.exitCode = 1;
