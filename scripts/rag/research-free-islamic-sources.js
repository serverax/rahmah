#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'data', 'source-candidates');
const OUT_FILE = path.join(OUT_DIR, 'islamic-source-candidates.json');
const REPORT_FILE = path.join(REPO_ROOT, 'docs', 'RAHMA_FREE_ISLAMIC_SOURCES_AND_API_REVIEW.md');

const registry = {
  registry_version: 1,
  generated_at: new Date().toISOString(),
  source_approved_default: false,
  candidates: [
    {
      source_id: 'tanzil-quran-text',
      title: 'Tanzil Quran Text',
      provider: 'Tanzil Project',
      url: 'https://tanzil.net/docs/Text_License',
      content_type: 'Quran',
      language: 'ar',
      licence_status: 'approved',
      attribution_required: true,
      offline_storage_allowed: true,
      commercial_use_allowed: true,
      authenticity_level: 'high',
      approval_status: 'APPROVED_FOR_REVIEW',
      notes: 'Canonical Quran text source. Verbatim preservation only. Do not alter Arabic text.',
    },
    {
      source_id: 'quran-com-foundation-api',
      title: 'Quran.com / Quran Foundation API',
      provider: 'Quran Foundation',
      url: 'https://api-docs.quran.com/',
      content_type: 'Quran',
      language: 'ar',
      licence_status: 'pending',
      attribution_required: true,
      offline_storage_allowed: 'unknown',
      commercial_use_allowed: 'unknown',
      authenticity_level: 'high',
      approval_status: 'DEV_ONLY',
      notes: 'Token-gated access. API repo is MIT-licensed, but content-level licensing and per-field attribution still need manual review.',
    },
    {
      source_id: 'alquran-cloud-api',
      title: 'Al Quran Cloud API',
      provider: 'Islamic Network',
      url: 'https://alquran.cloud/',
      content_type: 'Quran',
      language: 'ar',
      licence_status: 'approved',
      attribution_required: true,
      offline_storage_allowed: true,
      commercial_use_allowed: 'unknown',
      authenticity_level: 'high',
      approval_status: 'APPROVED_FOR_REVIEW',
      notes: 'Open-source/open-media service. Keep attribution and terms on file before ingesting.',
    },
    {
      source_id: 'fawazahmed0-quran-api',
      title: 'fawazahmed0/quran-api',
      provider: 'fawazahmed0',
      url: 'https://github.com/fawazahmed0/quran-api',
      content_type: 'Quran',
      language: 'multi',
      licence_status: 'approved',
      attribution_required: true,
      offline_storage_allowed: true,
      commercial_use_allowed: true,
      authenticity_level: 'medium',
      approval_status: 'DEV_ONLY',
      notes: 'Unlicense repo, but editions/translations must be checked individually before approval.',
    },
    {
      source_id: 'risan-quran-json',
      title: 'risan/quran-json',
      provider: 'risan',
      url: 'https://github.com/risan/quran-json',
      content_type: 'Quran',
      language: 'multi',
      licence_status: 'approved',
      attribution_required: true,
      offline_storage_allowed: true,
      commercial_use_allowed: true,
      authenticity_level: 'high',
      approval_status: 'APPROVED_FOR_REVIEW',
      notes: 'CC-BY-SA-4.0 packaging with explicit Quran text provenance. Share-alike obligations apply.',
    },
    {
      source_id: 'fawazahmed0-hadith-api',
      title: 'fawazahmed0/hadith-api',
      provider: 'fawazahmed0',
      url: 'https://github.com/fawazahmed0/hadith-api',
      content_type: 'Hadith',
      language: 'multi',
      licence_status: 'approved',
      attribution_required: true,
      offline_storage_allowed: true,
      commercial_use_allowed: true,
      authenticity_level: 'medium',
      approval_status: 'APPROVED_FOR_REVIEW',
      notes: 'Free hadith API with multiple grades. Rahma must keep collection and grade metadata with every citation.',
    },
    {
      source_id: 'open-hadith-data',
      title: 'Open Hadith Data',
      provider: 'mhashim6',
      url: 'https://github.com/mhashim6/Open-Hadith-Data',
      content_type: 'Hadith',
      language: 'ar',
      licence_status: 'pending',
      attribution_required: true,
      offline_storage_allowed: 'unknown',
      commercial_use_allowed: 'unknown',
      authenticity_level: 'medium-high',
      approval_status: 'DEV_ONLY',
      notes: 'Repo includes a LICENSE file, but exact terms were not fully verified in this review.',
    },
    {
      source_id: 'sunnah-now-api',
      title: 'Sunnah.now API',
      provider: 'Sunnah.now',
      url: 'https://docs.sunnah.now/',
      content_type: 'Hadith',
      language: 'multi',
      licence_status: 'approved',
      attribution_required: true,
      offline_storage_allowed: 'unknown',
      commercial_use_allowed: 'unknown',
      authenticity_level: 'medium',
      approval_status: 'DEV_ONLY',
      notes: 'Official docs exist, MIT license is documented, but the service is early access and token-gated.',
    },
    {
      source_id: 'dorar-hadith',
      title: 'Dorar Hadith Encyclopedia',
      provider: 'Dorar',
      url: 'https://dorar.net/article/389',
      content_type: 'Hadith',
      language: 'ar',
      licence_status: 'unknown',
      attribution_required: 'unknown',
      offline_storage_allowed: 'unknown',
      commercial_use_allowed: 'unknown',
      authenticity_level: 'high',
      approval_status: 'BLOCKED_DO_NOT_USE',
      notes: 'No clear public data licence or legal reuse path was confirmed in this review.',
    },
    {
      source_id: 'aladhan-api',
      title: 'AlAdhan API',
      provider: 'Islamic Network',
      url: 'https://aladhan.com/',
      content_type: 'Prayer Times / Qibla / Hijri / Asma ul Husna',
      language: 'multi',
      licence_status: 'approved',
      attribution_required: true,
      offline_storage_allowed: true,
      commercial_use_allowed: 'unknown',
      authenticity_level: 'high',
      approval_status: 'APPROVED_FOR_REVIEW',
      notes: 'Open-source service with documented calculation methods and credits. Good candidate for Rahma prayer support.',
    },
    {
      source_id: 'islamicapi',
      title: 'IslamicAPI',
      provider: 'zuraan',
      url: 'https://islamicapi.com/',
      content_type: 'Prayer Times / Qibla / Hijri / Asma ul Husna',
      language: 'multi',
      licence_status: 'pending',
      attribution_required: true,
      offline_storage_allowed: 'unknown',
      commercial_use_allowed: 'unknown',
      authenticity_level: 'medium-high',
      approval_status: 'DEV_ONLY',
      notes: 'API-key gated. Terms and privacy pages exist, but Rahma should wait for a full policy review.',
    },
    {
      source_id: 'ummahapi',
      title: 'UmmahAPI',
      provider: 'UmmahAPI',
      url: 'https://ummahapi.com/api/docs',
      content_type: 'Prayer Times / Qibla / Hijri',
      language: 'multi',
      licence_status: 'unknown',
      attribution_required: 'unknown',
      offline_storage_allowed: 'unknown',
      commercial_use_allowed: 'unknown',
      authenticity_level: 'unknown',
      approval_status: 'BLOCKED_LICENSE_UNKNOWN',
      notes: 'Public licence and commercial terms were not sufficiently clear in this review.',
    },
  ],
};

function markdownReport() {
  const lines = [];
  lines.push('# Rahma Free Islamic Sources And API Review');
  lines.push('');
  lines.push('Scope: research-only review for Rahma. No source is ingested into live production by this report.');
  lines.push('');
  lines.push('## Decision Summary');
  lines.push('');
  lines.push('Recommended sources for Rahma are limited to items with clear source provenance, readable attribution requirements, and a path for manual approval. Everything else is blocked or dev-only until the legal / authenticity / attribution review is complete.');
  lines.push('');
  for (const c of registry.candidates) {
    lines.push(`### ${c.title}`);
    lines.push('');
    lines.push(`- Provider: ${c.provider}`);
    lines.push(`- URL: ${c.url}`);
    lines.push(`- Content type: ${c.content_type}`);
    lines.push(`- Language: ${c.language}`);
    lines.push(`- Licence status: ${c.licence_status}`);
    lines.push(`- Attribution required: ${String(c.attribution_required)}`);
    lines.push(`- Offline storage allowed: ${String(c.offline_storage_allowed)}`);
    lines.push(`- Commercial use allowed: ${String(c.commercial_use_allowed)}`);
    lines.push(`- Authenticity level: ${c.authenticity_level}`);
    lines.push(`- Approval status: ${c.approval_status}`);
    lines.push(`- Notes: ${c.notes}`);
    lines.push('');
  }
  lines.push('## Output For Ingestion Control');
  lines.push('');
  lines.push('No source in this review is auto-ingested into production. Any source that Rahma eventually ingests must still be inserted with source_approved=false by default, explicit manual approval metadata, content hash, attribution fields, and license status.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_FILE, `${markdownReport()}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    registry_file: OUT_FILE,
    report_file: REPORT_FILE,
    candidates: registry.candidates.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }));
  process.exitCode = 1;
});
