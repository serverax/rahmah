#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'data', 'islamic-sources', 'source-registry.json');
const contentPath = path.join(root, 'data', 'islamic-sources', 'offline-starter-content.json');
const quranFullPath = path.join(root, 'data', 'islamic-sources', 'quran-full-tanzil.json');
const outPath = path.join(root, 'apps', 'mobile', 'assets', 'content', 'rahma_offline_seed.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const sources = new Map(registry.sources.map((source) => [source.id, source]));
const errors = [];

function assertApproved(sourceId, context) {
  const source = sources.get(sourceId);
  if (!source) {
    errors.push(`${context}: unknown source ${sourceId}`);
    return false;
  }
  if (!source.approved_for_offline_bundle) {
    errors.push(`${context}: source ${sourceId} is not approved for offline bundle`);
    return false;
  }
  return true;
}

if (fs.existsSync(quranFullPath)) {
  const quran = JSON.parse(fs.readFileSync(quranFullPath, 'utf8'));
  assertApproved(quran.source_id, 'quran-full');
  if (quran.surah_count !== 114 || quran.ayah_count !== 6236) errors.push('quran-full: invalid counts');
  content.quran = { mode: 'full_tanzil_uthmani', ...quran };
} else if (content.quran?.source_id) {
  assertApproved(content.quran.source_id, 'quran-starter');
}

for (const category of content.adhkar?.categories || []) {
  for (const entry of category.entries || []) {
    if (entry.source_approved === true) assertApproved(entry.source_id, `adhkar:${entry.id}`);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, refused: true, errors }, null, 2));
  process.exit(1);
}

const exportPayload = {
  exported_at: new Date().toISOString(),
  ...content,
  attribution: registry.sources
    .filter((source) => source.approved_for_offline_bundle || source.attribution_required)
    .map((source) => ({
      id: source.id,
      name: source.name,
      homepage_url: source.homepage_url,
      license_url: source.license_url,
      license_name: source.license_name,
      license_status: source.license_status,
      approved_for_offline_bundle: source.approved_for_offline_bundle,
    })),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(exportPayload, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, output: outPath, quran_mode: exportPayload.quran?.mode, quran_ayah_count: exportPayload.quran?.ayah_count || null, content_version: exportPayload.content_version }, null, 2));
