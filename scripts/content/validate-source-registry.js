#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'data', 'islamic-sources', 'source-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const errors = [];

if (!Array.isArray(registry.sources)) errors.push('sources must be an array');
const ids = new Set();
for (const source of registry.sources || []) {
  for (const key of ['id', 'name', 'provider_type', 'usage_notes', 'license_status']) {
    if (!source[key]) errors.push(`${source.id || '<missing>'}: missing ${key}`);
  }
  if (ids.has(source.id)) errors.push(`${source.id}: duplicate source id`);
  ids.add(source.id);
  if (!['approved', 'needs_review', 'rejected'].includes(source.license_status)) {
    errors.push(`${source.id}: invalid license_status`);
  }
  if (source.approved_for_offline_bundle && source.license_status !== 'approved') {
    errors.push(`${source.id}: offline bundle requires license_status=approved`);
  }
  if (source.approved_for_offline_bundle && source.attribution_required && !source.license_url) {
    errors.push(`${source.id}: approved attributed source requires license_url`);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, source_count: registry.sources.length, approved_offline_sources: registry.sources.filter(s => s.approved_for_offline_bundle).map(s => s.id) }, null, 2));
