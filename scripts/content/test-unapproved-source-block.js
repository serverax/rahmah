#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data', 'islamic-sources', 'source-registry.json'), 'utf8'));
const bundle = JSON.parse(fs.readFileSync(path.join(root, 'apps', 'mobile', 'assets', 'content', 'rahma_offline_seed.json'), 'utf8'));
const sources = new Map(registry.sources.map((s) => [s.id, s]));
const errors = [];
for (const category of bundle.adhkar?.categories || []) {
  for (const entry of category.entries || []) {
    const source = sources.get(entry.source_id);
    if (!source) errors.push(`${entry.id}: unknown source`);
    if (entry.source_approved === true && source?.license_status !== 'approved') errors.push(`${entry.id}: approved entry uses unapproved source`);
  }
}
for (const collection of bundle.hadith?.collections || []) {
  const source = sources.get(collection.source_id);
  if (!source || source.license_status !== 'approved') errors.push(`${collection.id}: hadith collection source not approved`);
}
if (errors.length) { console.error(JSON.stringify({ ok: false, errors }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ ok: true, unapproved_sources_blocked: true }, null, 2));
