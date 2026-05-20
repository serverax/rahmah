import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = process.env.RAHMA_REPO_ROOT
  ? path.resolve(process.env.RAHMA_REPO_ROOT)
  : path.resolve(__dirname, '..', '..', '..', '..');

export function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return createHash('sha256').update(data).digest('hex');
}

export function looksLikeAudioFile(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.length < 1024) return false;

  const start = data.subarray(0, 16);
  const textStart = start.toString('utf8').trimStart().toLowerCase();
  if (textStart.startsWith('<!doctype') || textStart.startsWith('<html') || textStart.startsWith('file not found')) {
    return false;
  }

  const ascii = start.toString('ascii');
  const hasId3 = ascii.startsWith('ID3');
  const hasMp3Frame = start[0] === 0xff && (start[1] & 0xe0) === 0xe0;
  const hasWav = ascii.startsWith('RIFF') && data.subarray(8, 12).toString('ascii') === 'WAVE';
  const hasOgg = ascii.startsWith('OggS');
  const hasM4a = data.subarray(4, 8).toString('ascii') === 'ftyp';

  return hasId3 || hasMp3Frame || hasWav || hasOgg || hasM4a;
}

export function getAzanAudioStatus() {
  try {
    const metaPath = path.join(REPO_ROOT, 'data', 'islamic-sources', 'azan-audio-metadata.json');
    if (!fs.existsSync(metaPath)) {
      return {
        configured: false,
        production_ready: false,
        assets_available: false,
        approved_assets: 0,
        verified_assets: 0,
        blocker: 'azan_metadata_missing',
      };
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const approved = (meta.options || []).filter((o) => o.approved === true);
    const verified = approved.filter((o) => {
      const storagePath = typeof o.file_path === 'string' ? o.file_path : '';
      const localFile = path.join(REPO_ROOT, 'apps', 'mobile', storagePath);
      if (!o.source || !o.license || !o.source_url || !o.file_hash_sha256 || !storagePath) {
        return false;
      }
      if (!o.approved_by || !o.approved_at) return false;
      if (!fs.existsSync(localFile)) return false;
      try {
        const onDisk = sha256File(localFile);
        if (onDisk !== String(o.file_hash_sha256).toLowerCase()) return false;
        if (!looksLikeAudioFile(localFile)) return false;
      } catch {
        return false;
      }
      return true;
    });
    return {
      configured: meta.configured === true && approved.length > 0,
      production_ready: meta.configured === true && verified.length > 0,
      assets_available: approved.length > 0,
      approved_assets: approved.length,
      verified_assets: verified.length,
      default_azan_id: meta.default_azan_id || null,
      blocker: verified.length > 0 ? null : 'azan_audio_license_or_hash_incomplete',
    };
  } catch {
    return {
      configured: false,
      production_ready: false,
      assets_available: false,
      approved_assets: 0,
      verified_assets: 0,
      blocker: 'azan_metadata_unreadable',
    };
  }
}

export function evaluateAzanOption(option) {
  const storagePath = typeof option?.file_path === 'string' ? option.file_path : '';
  const localFile = path.join(REPO_ROOT, 'apps', 'mobile', storagePath);
  if (option?.approved !== true) {
    return { accepted: false, reason: 'not_approved' };
  }
  if (!fs.existsSync(localFile)) {
    return { accepted: false, reason: 'file_missing' };
  }
  try {
    const hash = sha256File(localFile);
    if (hash !== String(option.file_hash_sha256 || '').toLowerCase()) {
      return { accepted: false, reason: 'hash_mismatch' };
    }
    if (!looksLikeAudioFile(localFile)) {
      return { accepted: false, reason: 'invalid_audio_file' };
    }
  } catch {
    return { accepted: false, reason: 'hash_read_failed' };
  }
  return { accepted: true, reason: null };
}
