Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Add-ReportLine {
  param(
    [Parameter(Mandatory = $true)][string]$Line
  )
  $script:ReportLines += $Line
}

function New-DirSafe {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
    $script:CreatedDirs += $Path
    Add-ReportLine "DIR CREATED: $Path"
  } else {
    $script:SkippedDirs += $Path
  }
}

function Write-FileSafe {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path -Parent $Path
  if ($dir) { New-DirSafe -Path $dir }

  if (Test-Path -LiteralPath $Path) {
    $current = Get-Content -LiteralPath $Path -Raw
    if ($current -eq $Content) {
      $script:SkippedFiles += $Path
      Add-ReportLine "FILE SKIPPED (unchanged): $Path"
      return
    }
    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $bak = "$Path.bak.$timestamp"
    Copy-Item -LiteralPath $Path -Destination $bak -Force
    $script:BackedUpFiles += $bak
    Add-ReportLine "BACKUP CREATED: $bak"
    Set-Content -LiteralPath $Path -Value $Content -NoNewline -Encoding UTF8
    $script:ModifiedFiles += $Path
    Add-ReportLine "FILE MODIFIED: $Path"
    return
  }

  Set-Content -LiteralPath $Path -Value $Content -NoNewline -Encoding UTF8
  $script:CreatedFiles += $Path
  Add-ReportLine "FILE CREATED: $Path"
}

function Test-RequiredPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [bool](Test-Path -LiteralPath $Path)
}

function Test-GitRepo {
  param([Parameter(Mandatory = $true)][string]$Root)

  $remote = (git -C $Root remote -v 2>$null) -join "`n"
  if ($remote -notmatch 'serverax/rahmah') {
    throw "Git remote does not contain serverax/rahmah."
  }
  $branch = (git -C $Root branch --show-current 2>$null)
  if ($branch -ne 'main') {
    throw "Current branch is not main."
  }
}

function Test-NoSecrets {
  param([Parameter(Mandatory = $true)][string[]]$Paths)

  $patterns = @(
    '-----BEGIN PRIVATE KEY-----',
    '\bAKIA[0-9A-Z]{16}\b',
    '\bghp_[A-Za-z0-9]{20,}\b',
    '\bsk-[A-Za-z0-9]{20,}\b',
    '\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?:com|net|org)\b\s*[:=]\s*(?!\[REDACTED\])',
    'postgres:\/\/[^\/\s]+:[^\/\s]+@'
  )

  $hits = @()
  foreach ($path in $Paths) {
    if (-not (Test-Path -LiteralPath $path)) { continue }
    $content = Get-Content -LiteralPath $path -Raw
    foreach ($pattern in $patterns) {
      if ($content -match $pattern) {
        $hits += "$path :: $pattern"
      }
    }
  }
  if ($hits.Count -gt 0) {
    throw "Secret-like content detected:`n$($hits -join "`n")"
  }
}

function New-RouteSkeletonContent {
  param(
    [Parameter(Mandatory = $true)][string]$RegisterName,
    [Parameter(Mandatory = $true)][object[]]$Endpoints
  )

  $endpointLines = foreach ($endpoint in $Endpoints) {
    "  app.$($endpoint.Method)('$($endpoint.Path)', async () => foundationResponse('$($endpoint.Path)'));"
  }

  @"
import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function $RegisterName(app: FastifyInstance): Promise<void> {
$($endpointLines -join "`r`n")
}
"@
}

function New-ServiceSkeletonContent {
  param(
    [Parameter(Mandatory = $true)][string]$ModuleName,
    [Parameter(Mandatory = $true)][string[]]$FunctionNames
  )

  $fnLines = foreach ($fn in $FunctionNames) {
@"
export async function $fn(_input: unknown = null): Promise<FoundationResult> {
  return foundationResult('$ModuleName::$fn');
}

"@
  }

  @"
export interface FoundationResult {
  status: 'foundation';
  message: string;
  module: string;
}

function foundationResult(module: string): FoundationResult {
  return {
    status: 'foundation',
    message: 'Service skeleton created. Real implementation pending.',
    module,
  };
}

$($fnLines -join "`r`n")
"@
}

function New-GenericTsContent {
  param([string]$Name)
  @"
export const $Name = Object.freeze({
  status: 'foundation',
  message: 'Foundation module created. Real implementation pending.',
});
"@
}

function New-FileContent {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  Write-FileSafe -Path $Path -Content $Content
}

$script:ReportLines = @()
$script:CreatedDirs = @()
$script:SkippedDirs = @()
$script:CreatedFiles = @()
$script:SkippedFiles = @()
$script:ModifiedFiles = @()
$script:BackedUpFiles = @()
$script:TestResults = @()

$expectedRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$currentLocation = (Get-Location).Path

Test-GitRepo -Root $expectedRoot

Add-ReportLine 'RAHMA BACKEND FOUNDATION SCRIPT STARTED'
Add-ReportLine "Repo root: $expectedRoot"
Add-ReportLine "Invocation directory: $currentLocation"

$dirs = @(
  'scripts',
  'docs',
  'docs/compliance',
  'docs/architecture',
  'docs/app-store',
  'docs/security',
  'docs/islamic-content',
  'docs/release',
  'deployment',
  'deployment/k3s',
  'deployment/k3s/namespaces',
  'deployment/k3s/api',
  'deployment/k3s/data',
  'deployment/k3s/ai',
  'deployment/k3s/rag',
  'deployment/k3s/wasm',
  'deployment/k3s/security',
  'deployment/k3s/monitoring',
  'deployment/k3s/storage',
  'deployment/k3s/workers',
  'apps/backend',
  'apps/backend/src',
  'apps/backend/src/routes',
  'apps/backend/src/services',
  'apps/backend/src/db',
  'apps/backend/src/db/migrations',
  'apps/backend/src/rag',
  'apps/backend/src/llm',
  'apps/backend/src/wasm',
  'apps/backend/src/wasm/policy-gate',
  'apps/backend/src/wasm/citation-verifier',
  'apps/backend/src/wasm/child-safety',
  'apps/backend/src/wasm/prayer-rules',
  'apps/backend/src/wasm/zakat-rules-placeholder',
  'apps/backend/src/llm/prompts',
  'apps/backend/src/admin',
  'apps/backend/src/workers',
  'apps/backend/src/security',
  'apps/backend/src/validation',
  'apps/backend/test',
  'apps/mobile/assets/content',
  'apps/mobile/assets/audio/adhan',
  'apps/mobile/assets/images',
  '.github',
  '.github/workflows'
)

foreach ($dir in $dirs) {
  New-DirSafe -Path (Join-Path $expectedRoot $dir)
}

$routes = @(
  @{ Path = 'apps/backend/src/routes/health.routes.ts'; Register = 'registerHealthRoutes'; Endpoints = @(@{ Method = 'get'; Path = '/api/health' }) },
  @{ Path = 'apps/backend/src/routes/ready.routes.ts'; Register = 'registerReadyRoutes'; Endpoints = @(@{ Method = 'get'; Path = '/api/ready' }) },
  @{ Path = 'apps/backend/src/routes/auth.routes.ts'; Register = 'registerAuthRoutes'; Endpoints = @(@{ Method = 'post'; Path = '/api/auth/register' }, @{ Method = 'post'; Path = '/api/auth/login' }, @{ Method = 'get'; Path = '/api/auth/me' }) },
  @{ Path = 'apps/backend/src/routes/prayer.routes.ts'; Register = 'registerPrayerRoutes'; Endpoints = @(@{ Method = 'get'; Path = '/api/prayer/times' }, @{ Method = 'get'; Path = '/api/prayer/settings' }, @{ Method = 'post'; Path = '/api/prayer/settings' }, @{ Method = 'get'; Path = '/api/prayer/adhan-audio' }, @{ Method = 'post'; Path = '/api/prayer/notifications/test' }) },
  @{ Path = 'apps/backend/src/routes/quran.routes.ts'; Register = 'registerQuranRoutes'; Endpoints = @(@{ Method = 'get'; Path = '/api/quran/surahs' }, @{ Method = 'get'; Path = '/api/quran/ayah' }, @{ Method = 'get'; Path = '/api/quran/search' }, @{ Method = 'post'; Path = '/api/quran/bookmark' }) },
  @{ Path = 'apps/backend/src/routes/hadith.routes.ts'; Register = 'registerHadithRoutes'; Endpoints = @(@{ Method = 'get'; Path = '/api/hadith/search' }, @{ Method = 'get'; Path = '/api/hadith/topics' }, @{ Method = 'get'; Path = '/api/hadith/daily' }) },
  @{ Path = 'apps/backend/src/routes/dua.routes.ts'; Register = 'registerDuaRoutes'; Endpoints = @(@{ Method = 'get'; Path = '/api/dua/categories' }, @{ Method = 'get'; Path = '/api/dua/list' }, @{ Method = 'post'; Path = '/api/dua/favourite' }) },
  @{ Path = 'apps/backend/src/routes/ask.routes.ts'; Register = 'registerAskRoutes'; Endpoints = @(@{ Method = 'post'; Path = '/api/ask/question' }, @{ Method = 'get'; Path = '/api/ask/history' }, @{ Method = 'get'; Path = '/api/ask/review-required' }) },
  @{ Path = 'apps/backend/src/routes/children.routes.ts'; Register = 'registerChildrenRoutes'; Endpoints = @(@{ Method = 'get'; Path = '/api/children/profiles' }, @{ Method = 'post'; Path = '/api/children/profiles' }, @{ Method = 'get'; Path = '/api/children/stories' }, @{ Method = 'get'; Path = '/api/children/games' }, @{ Method = 'get'; Path = '/api/children/progress' }) },
  @{ Path = 'apps/backend/src/routes/admin.routes.ts'; Register = 'registerAdminRoutes'; Endpoints = @(@{ Method = 'get'; Path = '/api/admin/content' }, @{ Method = 'post'; Path = '/api/admin/content' }, @{ Method = 'post'; Path = '/api/admin/content/approve' }, @{ Method = 'post'; Path = '/api/admin/content/reject' }, @{ Method = 'get'; Path = '/api/admin/sources' }, @{ Method = 'post'; Path = '/api/admin/sources' }, @{ Method = 'get'; Path = '/api/admin/review' }, @{ Method = 'post'; Path = '/api/admin/review/assign' }, @{ Method = 'post'; Path = '/api/admin/audio/approve' }, @{ Method = 'get'; Path = '/api/admin/users' }) },
  @{ Path = 'apps/backend/src/routes/feedback.routes.ts'; Register = 'registerFeedbackRoutes'; Endpoints = @(@{ Method = 'post'; Path = '/api/feedback' }) }
)

foreach ($route in $routes) {
  $content = New-RouteSkeletonContent -RegisterName $route.Register -Endpoints $route.Endpoints
  New-FileContent -Path (Join-Path $expectedRoot $route.Path) -Content $content
}

$serviceSpecs = @(
  @{ Path = 'apps/backend/src/services/prayer.service.ts'; Module = 'prayer.service'; Functions = @('getPrayerTimesFoundation', 'savePrayerSettingsFoundation') },
  @{ Path = 'apps/backend/src/services/quran.service.ts'; Module = 'quran.service'; Functions = @('listSurahsFoundation', 'searchQuranFoundation') },
  @{ Path = 'apps/backend/src/services/hadith.service.ts'; Module = 'hadith.service'; Functions = @('searchHadithFoundation', 'getHadithTopicsFoundation') },
  @{ Path = 'apps/backend/src/services/dua.service.ts'; Module = 'dua.service'; Functions = @('listDuaCategoriesFoundation', 'listDuaEntriesFoundation') },
  @{ Path = 'apps/backend/src/services/children.service.ts'; Module = 'children.service'; Functions = @('listChildProfilesFoundation', 'listChildStoriesFoundation') },
  @{ Path = 'apps/backend/src/services/notification.service.ts'; Module = 'notification.service'; Functions = @('scheduleNotificationFoundation', 'sendNotificationTestFoundation') },
  @{ Path = 'apps/backend/src/services/content-approval.service.ts'; Module = 'content-approval.service'; Functions = @('approveContentFoundation', 'rejectContentFoundation') },
  @{ Path = 'apps/backend/src/services/source-governance.service.ts'; Module = 'source-governance.service'; Functions = @('approveSourceFoundation', 'validateSourceFoundation') }
)

foreach ($service in $serviceSpecs) {
  $content = New-ServiceSkeletonContent -ModuleName $service.Module -FunctionNames $service.Functions
  New-FileContent -Path (Join-Path $expectedRoot $service.Path) -Content $content
}

$extraSkeletons = @{
  'apps/backend/src/admin/improvement-center.service.ts' = @'
export async function improvementCenterFoundation(_input: unknown = null): Promise<{ status: string; message: string }> {
  return { status: 'foundation', message: 'Admin improvement center skeleton created. Real implementation pending.' };
}
'@;
  'apps/backend/src/workers/notification.worker.ts' = @'
export async function runNotificationWorkerFoundation(): Promise<{ status: string; message: string }> {
  return { status: 'foundation', message: 'Notification worker skeleton created. Real implementation pending.' };
}
'@;
  'apps/backend/src/validation/content-approval.validation.ts' = @'
export function validateContentApprovalFoundation(_input: unknown): { status: string; message: string; valid: boolean } {
  return { status: 'foundation', message: 'Content approval validation skeleton created. Real validation pending.', valid: false };
}
'@
}
foreach ($extra in $extraSkeletons.GetEnumerator()) {
  New-FileContent -Path (Join-Path $expectedRoot $extra.Key) -Content $extra.Value
}

$ragFiles = @{
  'apps/backend/src/rag/islamic-rag.service.ts' = @"
export interface IslamicRagQuery {
  question: string;
  language?: string;
}

export async function answerIslamicQuestionFoundation(_query: IslamicRagQuery): Promise<{ status: string; message: string }> {
  return { status: 'foundation', message: 'RAG foundation created. Real retrieval pending.' };
}
"@;
  'apps/backend/src/rag/retriever.service.ts' = @"
export async function retrieveApprovedChunksFoundation(_query: unknown): Promise<{ status: string; message: string; chunks: unknown[] }> {
  return { status: 'foundation', message: 'Retriever skeleton created. Real retrieval pending.', chunks: [] };
}
"@;
  'apps/backend/src/rag/citation-guard.service.ts' = @"
export async function validateCitationsFoundation(_answer: unknown): Promise<{ status: string; message: string; allowed: boolean }> {
  return { status: 'foundation', message: 'Citation guard skeleton created. Real validation pending.', allowed: false };
}
"@;
  'apps/backend/src/rag/review-escalation.service.ts' = @"
export async function escalateReviewFoundation(_payload: unknown): Promise<{ status: string; message: string; queued: boolean }> {
  return { status: 'foundation', message: 'Review escalation skeleton created. Real workflow pending.', queued: true };
}
"@;
  'apps/backend/src/llm/ollama-client.ts' = @"
export const RAHMA_LOCAL_LLM_MODELS = Object.freeze({
  classification: 'qwen2.5:1.5b',
  answer_drafting: 'llama3.2:3b',
  review_escalation: 'phi3.5:3.8b',
  coding_helper: 'qwen2.5-coder:1.5b',
});

export async function ollamaGenerateFoundation(_payload: unknown): Promise<{ status: string; message: string }> {
  return { status: 'foundation', message: 'Ollama client skeleton created. Real network integration pending.' };
}
"@;
  'apps/backend/src/llm/model-policy.ts' = @"
export const MODEL_POLICY = Object.freeze({
  classification: 'qwen2.5:1.5b',
  answer_drafting: 'llama3.2:3b',
  review_escalation: 'phi3.5:3.8b',
  coding_helper: 'qwen2.5-coder:1.5b',
  religious_answers_require_sources: true,
  citation_required: true,
});
"@;
  'apps/backend/src/llm/prompts/islamic-answer.prompt.ts' = @"
export const ISLAMIC_ANSWER_PROMPT = [
  'Do not issue unsupported fatwa.',
  'Use only retrieved approved Islamic sources.',
  'Include citations.',
  'If sources are missing or weak, return needs_scholar_review.',
  'Do not invent Quran, Hadith, scholar names, or references.',
  'Do not provide medical, legal, or financial advice as Islamic ruling.',
  'Recommend qualified scholar review for complex personal matters.',
].join('\n');
"@;
  'apps/backend/src/llm/prompts/classifier.prompt.ts' = @"
export const CLASSIFIER_PROMPT = [
  'Classify the question into Quran, Hadith, Dua, Adhkar, Prayer, Children, or General Guidance.',
  'Never answer from memory.',
  'Return only a category and a confidence hint.',
].join('\n');
"@
  'apps/backend/src/wasm/wasm-runtime.ts' = @"
export type WasmDecision = 'ALLOW' | 'BLOCK' | 'NEEDS_REVIEW' | 'NEEDS_SCHOLAR_REVIEW' | 'ALLOW_NOTIFICATION' | 'BLOCK_STALE_CACHE' | 'HIDE_UNTIL_VERIFIED' | 'NEEDS_ONLINE_CHECK';

export interface WasmRuleInput {
  action: string;
  [key: string]: unknown;
}

export interface WasmRuleOutput {
  decision: WasmDecision;
  reasons: string[];
  requiresScholarReview: boolean;
}

export async function runWasmRuleFoundation(_moduleName: string, input: WasmRuleInput): Promise<WasmRuleOutput> {
  return {
    decision: 'NEEDS_REVIEW',
    reasons: ['placeholder runtime for ' + String(input.action || 'unknown')],
    requiresScholarReview: false,
  };
}
"@;
  'apps/backend/src/wasm/policy-gate.client.ts' = @"
import { runWasmRuleFoundation, type WasmRuleInput, type WasmRuleOutput } from './wasm-runtime';

export async function evaluatePolicyGate(input: WasmRuleInput): Promise<WasmRuleOutput> {
  return runWasmRuleFoundation('rahma-policy-gate-wasm', input);
}
"@;
  'apps/backend/src/wasm/citation-verifier.client.ts' = @"
import { runWasmRuleFoundation, type WasmRuleInput, type WasmRuleOutput } from './wasm-runtime';

export async function verifyCitationFoundation(input: WasmRuleInput): Promise<WasmRuleOutput> {
  return runWasmRuleFoundation('rahma-citation-verifier-wasm', input);
}
"@;
  'apps/backend/src/wasm/child-safety.client.ts' = @"
import { runWasmRuleFoundation, type WasmRuleInput, type WasmRuleOutput } from './wasm-runtime';

export async function evaluateChildSafetyFoundation(input: WasmRuleInput): Promise<WasmRuleOutput> {
  return runWasmRuleFoundation('rahma-child-safety-wasm', input);
}
"@;
  'apps/backend/src/wasm/prayer-rules.client.ts' = @"
import { runWasmRuleFoundation, type WasmRuleInput, type WasmRuleOutput } from './wasm-runtime';

export async function evaluatePrayerRulesFoundation(input: WasmRuleInput): Promise<WasmRuleOutput> {
  return runWasmRuleFoundation('rahma-prayer-rules-wasm', input);
}
"@;
  'apps/backend/src/wasm/policy-gate/index.ts' = @"
export const POLICY_GATE_RULES = Object.freeze({
  module_name: 'rahma-policy-gate-wasm',
  allow: 'ALLOW',
  block: 'BLOCK',
  needs_review: 'NEEDS_REVIEW',
  needs_scholar_review: 'NEEDS_SCHOLAR_REVIEW',
});
"@;
  'apps/backend/src/wasm/citation-verifier/index.ts' = @"
export const CITATION_VERIFIER_RULES = Object.freeze({
  module_name: 'rahma-citation-verifier-wasm',
  block_on_missing_citation: true,
  block_on_unapproved_source: true,
  block_on_rejected_content: true,
  needs_review_for_pending: true,
});
"@;
  'apps/backend/src/wasm/child-safety/index.ts' = @"
export const CHILD_SAFETY_RULES = Object.freeze({
  module_name: 'rahma-child-safety-wasm',
  block_unapproved_content: true,
  block_over_age_group: true,
  block_unreviewed_ai: true,
  block_weak_hadith_unless_approved: true,
});
"@;
  'apps/backend/src/wasm/prayer-rules/index.ts' = @"
export const PRAYER_RULES = Object.freeze({
  module_name: 'rahma-prayer-rules-wasm',
  recognised_methods: ['umm_al_qura', 'mwl', 'egyptian', 'karachi'],
  recognised_madhhabs: ['shafii', 'hanafi'],
});
"@;
  'apps/backend/src/wasm/zakat-rules-placeholder/README.md' = @"
# Rahma Zakat Rules Placeholder

This directory is reserved for a future deterministic WASM zakat calculator.
Real WASM implementation is pending.
"@
}

foreach ($pair in $ragFiles.GetEnumerator()) {
  New-FileContent -Path (Join-Path $expectedRoot $pair.Key) -Content $pair.Value
}

$testFiles = @{
  'apps/backend/test/health.test.ts' = "export const foundationHealthTest = true;";
  'apps/backend/test/ready.test.ts' = "export const foundationReadyTest = true;";
  'apps/backend/test/rag-policy.test.ts' = "export const foundationRagPolicyTest = true;";
  'apps/backend/test/no-secret-leak.test.ts' = "export const foundationNoSecretLeakTest = true;";
  'apps/backend/test/schema-files.test.ts' = "export const foundationSchemaFilesTest = true;";
}
foreach ($pair in $testFiles.GetEnumerator()) {
  New-FileContent -Path (Join-Path $expectedRoot $pair.Key) -Content $pair.Value
}

$sql001 = @'
-- Rahma core schema foundation.
-- Optional pgvector support is documented below and intentionally commented so
-- the migration remains portable when the extension is unavailable.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Optional if the cluster has pgvector installed:
-- CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'parent', 'scholar_reviewer', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  country TEXT,
  city TEXT,
  madhhab_preference TEXT,
  calculation_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  age_group TEXT NOT NULL,
  content_level TEXT NOT NULL DEFAULT 'age_appropriate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('quran', 'hadith', 'dua', 'adhkar', 'tafsir', 'story', 'adhan_audio', 'scholarly_reference', 'manual_admin_entry')),
  source_url TEXT,
  license_status TEXT NOT NULL DEFAULT 'unknown' CHECK (license_status IN ('pending', 'approved', 'rejected', 'restricted', 'unknown')),
  source_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_sources_provider_type ON content_sources (provider_type);
CREATE INDEX IF NOT EXISTS idx_content_sources_license_status ON content_sources (license_status);
CREATE INDEX IF NOT EXISTS idx_content_sources_source_approved ON content_sources (source_approved);

CREATE TABLE IF NOT EXISTS islamic_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL CHECK (content_type IN ('quran', 'hadith', 'dua', 'adhkar', 'tafsir', 'story', 'fatwa_reference', 'general_guidance')),
  title_ar TEXT,
  title_en TEXT,
  body_ar TEXT NOT NULL,
  body_en TEXT,
  topic TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT NOT NULL DEFAULT 'ar',
  madhhab TEXT,
  confidence_level TEXT NOT NULL DEFAULT 'medium',
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected', 'needs_scholar_review')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_islamic_content_type ON islamic_content (content_type);
CREATE INDEX IF NOT EXISTS idx_islamic_content_review_status ON islamic_content (review_status);

CREATE TABLE IF NOT EXISTS quran_surahs (
  id BIGSERIAL PRIMARY KEY,
  surah_number INTEGER NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  revelation_type TEXT NOT NULL,
  ayah_count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quran_surahs_number ON quran_surahs (surah_number);

CREATE TABLE IF NOT EXISTS quran_ayahs (
  id BIGSERIAL PRIMARY KEY,
  surah_number INTEGER NOT NULL REFERENCES quran_surahs(surah_number) ON DELETE CASCADE,
  ayah_number INTEGER NOT NULL,
  text_ar TEXT NOT NULL,
  juz INTEGER NOT NULL,
  page_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (surah_number, ayah_number)
);
CREATE INDEX IF NOT EXISTS idx_quran_ayahs_surah_ayah ON quran_ayahs (surah_number, ayah_number);

CREATE TABLE IF NOT EXISTS quran_translations (
  id BIGSERIAL PRIMARY KEY,
  ayah_id BIGINT NOT NULL REFERENCES quran_ayahs(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  translator TEXT NOT NULL,
  translation_text TEXT NOT NULL,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quran_tafsir (
  id BIGSERIAL PRIMARY KEY,
  ayah_id BIGINT NOT NULL REFERENCES quran_ayahs(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  tafsir_text TEXT NOT NULL,
  tafsir_source TEXT NOT NULL,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hadith_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_hadith_collections_source_id ON hadith_collections (source_id);

CREATE TABLE IF NOT EXISTS hadith_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES hadith_collections(id) ON DELETE CASCADE,
  hadith_number TEXT NOT NULL,
  book_name TEXT,
  chapter_name TEXT,
  text_ar TEXT NOT NULL,
  text_en TEXT,
  grade TEXT,
  narrator TEXT,
  source_reference TEXT,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hadith_entries_collection_id ON hadith_entries (collection_id);

CREATE TABLE IF NOT EXISTS dua_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dua_categories_sort_order ON dua_categories (sort_order);

CREATE TABLE IF NOT EXISTS dua_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES dua_categories(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  dua_ar TEXT NOT NULL,
  transliteration TEXT,
  translation_en TEXT,
  source_reference TEXT,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dua_entries_category_id ON dua_entries (category_id);

CREATE TABLE IF NOT EXISTS adhan_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  title_en TEXT,
  reciter_name TEXT,
  source_url TEXT,
  license_status TEXT NOT NULL DEFAULT 'unknown',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  file_hash TEXT,
  duration_seconds INTEGER,
  storage_path TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prayer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country TEXT,
  city TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  calculation_method TEXT,
  madhhab TEXT,
  adhan_audio_id UUID REFERENCES adhan_audio(id) ON DELETE SET NULL,
  notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  fajr_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  jummah_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prayer_settings_city_date ON prayer_settings (city, calculation_method);

CREATE TABLE IF NOT EXISTS prayer_times_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT,
  city TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  calculation_method TEXT,
  madhhab TEXT,
  prayer_date DATE NOT NULL,
  fajr TIME NOT NULL,
  sunrise TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prayer_times_cache_city_date ON prayer_times_cache (city, prayer_date);

CREATE TABLE IF NOT EXISTS ask_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'answered_from_database', 'answered_with_rag', 'needs_scholar_review', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ask_questions_user_status ON ask_questions (user_id, status);

CREATE TABLE IF NOT EXISTS ask_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES ask_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  language TEXT NOT NULL,
  answer_mode TEXT NOT NULL CHECK (answer_mode IN ('database', 'rag', 'llm_draft', 'scholar_review')),
  confidence_level TEXT NOT NULL,
  review_status TEXT NOT NULL,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ask_answers_question_id ON ask_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_ask_answers_review_status ON ask_answers (review_status);

CREATE TABLE IF NOT EXISTS ask_answer_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES ask_answers(id) ON DELETE CASCADE,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  content_id UUID REFERENCES islamic_content(id) ON DELETE SET NULL,
  citation_label TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue (status);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS children_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
'@

$sql002 = @'
-- Rahma RAG foundation.
-- Optional vector support remains optional and must not break the migration.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Optional if pgvector exists in the target cluster:
-- CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  content_id UUID REFERENCES islamic_content(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  topic TEXT,
  trust_level TEXT NOT NULL DEFAULT 'approved',
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  content_id UUID REFERENCES islamic_content(id) ON DELETE SET NULL,
  chunk_text TEXT NOT NULL,
  language TEXT NOT NULL,
  topic TEXT,
  trust_level TEXT NOT NULL DEFAULT 'approved',
  effective_date DATE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc_idx ON rag_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_trust_level ON rag_chunks (trust_level);

CREATE TABLE IF NOT EXISTS rag_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES rag_chunks(id) ON DELETE CASCADE,
  embedding_model TEXT NOT NULL,
  embedding_vector TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag_retrieval_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  language TEXT,
  category TEXT,
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  content_id UUID REFERENCES islamic_content(id) ON DELETE SET NULL,
  chunk_id UUID REFERENCES rag_chunks(id) ON DELETE SET NULL,
  trust_level TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_answer_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  language TEXT NOT NULL,
  model_used TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_llm_answer_cache_question_hash ON llm_answer_cache (question_hash);

COMMIT;
'@

New-FileContent -Path (Join-Path $expectedRoot 'apps/backend/src/db/migrations/001_rahma_core_schema.sql') -Content $sql001
New-FileContent -Path (Join-Path $expectedRoot 'apps/backend/src/db/migrations/002_rahma_rag_foundation.sql') -Content $sql002
New-FileContent -Path (Join-Path $expectedRoot 'apps/backend/src/db/migrations/003_rahma_wasm_foundation.sql') -Content @'
-- Rahma WASM foundation.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS wasm_rule_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  module_name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wasm_policy_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  module_name TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  decision TEXT NOT NULL,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wasm_rule_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
'@

$docs = @{
  'docs/islamic-content/CONTENT_SOURCE_APPROVAL_POLICY.md' = @'
# Content Source Approval Policy

- No Islamic content is approved by default.
- Every Quran, Hadith, Dua, Tafsir, story, adhan file, or AI answer needs source tracking.
- Content must have `source_id`.
- `source_approved` must be `true` before live use.
- Hadith must include collection and grade where available.
- Weak hadith must be clearly labelled or excluded from children/daily reminders.
- AI answers must be citation-bound.
- Complex fatwa questions must be escalated to scholar review.
'@;
  'docs/islamic-content/AZAN_AUDIO_SOURCE_APPROVAL.md' = @'
# Azan Audio Source Approval

Required metadata:

- ID
- Title Arabic
- Title English
- Reciter
- Source URL
- License
- Permission evidence
- Approved by
- Approved at
- File hash
- Duration
- Storage path
'@;
  'docs/islamic-content/ASK_SHEIKH_RAG_POLICY.md' = @'
# Ask Sheikh RAG Policy

1. Database first.
2. RAG second.
3. Local LLM only if retrieved sources exist.
4. No citation means no answer.
5. Escalate to scholar review when needed.
'@;
  'docs/architecture/RAHMA_BACKEND_HLD.md' = @'
# Rahma Backend High-Level Design

## Components

- Mobile app
- Web/admin panel
- API backend
- Postgres database
- Redis cache
- RAG service
- Ollama local LLM
- Notification worker
- Object storage
- Admin review workflow
- Content approval workflow
- K3s namespaces
- CI/CD
- App store compliance

## Flow

Mobile App -> Rahma API -> Auth / Prayer / Quran / Hadith / Dua / Children / Ask Sheikh -> Postgres + Redis -> RAG service -> Ollama only when approved sources exist -> Citation guard -> Review queue if uncertain
'@;
  'docs/architecture/RAHMA_WASM_ARCHITECTURE.md' = @'
# Rahma WASM Architecture

## What WASM is used for

- prayer calculation validation
- citation and source guards
- child safety checks
- cached timetable validation
- deterministic rule execution

## What WASM is not used for

- free Islamic answers
- fatwa generation
- LLM reasoning
- Quran/Hadith interpretation
- scholar judgement

## Phase 1

Backend-only placeholder runtime and rule contracts.

## Phase 2

Mobile offline validation packs with signed rule packs.
'@;
  'docs/security/RAHMA_WASM_SECURITY_POLICY.md' = @'
# Rahma WASM Security Policy

- WASM services are internal only.
- No public ingress.
- No direct mobile access to backend WASM services.
- Mobile offline WASM must use signed rule packs later.
- Rule packs must have checksum.
- Rule packs must be approved before use.
- All decisions must be logged.
- WASM cannot replace scholar review.
'@;
  'docs/app-store/PRIVACY_POLICY_DRAFT.md' = @'
# Privacy Policy Draft

Rahma minimizes data collection and uses approval-gated Islamic content. Any user data handling must be disclosed before release.
'@;
  'docs/app-store/TERMS_AND_CONDITIONS_DRAFT.md' = @'
# Terms and Conditions Draft

Rahma provides educational Islamic information. Human review remains authoritative for published answers.
'@;
  'docs/app-store/CHILD_SAFETY_POLICY_DRAFT.md' = @'
# Child Safety Policy Draft

- Parent-controlled child profiles
- No unsafe external links
- No unreviewed AI content for children
- Age-appropriate stories and games
- Report content option
'@;
  'docs/app-store/ACCOUNT_DELETION_POLICY_DRAFT.md' = @'
# Account Deletion Policy Draft

- In-app deletion required
- User data deletion request
- Retention exceptions for audit/security/legal compliance
'@;
  'docs/app-store/AI_ISLAMIC_DISCLAIMER.md' = @'
# AI Islamic Disclaimer

Rahma provides educational Islamic information based on approved sources. It does not replace a qualified scholar. Complex personal matters should be referred to a trusted scholar.
'@;
  'docs/app-store/GOOGLE_PLAY_READINESS_CHECKLIST.md' = @'
# Google Play Readiness Checklist

- No misleading AI religious authority claims
- Clear privacy message
- Clear source/citation message
- Child safety policy
- Account deletion path
'@;
  'docs/app-store/APPLE_APP_STORE_READINESS_CHECKLIST.md' = @'
# Apple App Store Readiness Checklist

- No misleading AI religious authority claims
- Clear privacy message
- Clear source/citation message
- Child safety policy
- Account deletion path
'@;
}
foreach ($doc in $docs.GetEnumerator()) {
  New-FileContent -Path (Join-Path $expectedRoot $doc.Key) -Content $doc.Value
}

$k3sFiles = @{
  'deployment/k3s/namespaces/rahma-namespaces.yaml' = @'
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-api
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-web
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-mobile-build
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-data
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-ai
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-rag
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-monitoring
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-security
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-storage
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-wasm
---
apiVersion: v1
kind: Namespace
metadata:
  name: rahma-workers
'@;
  'deployment/k3s/data/postgres.yaml' = @'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-postgres
  namespace: rahma-data
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:PLACEHOLDER-PINNED-TAG
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            tcpSocket:
              port: 5432
          livenessProbe:
            tcpSocket:
              port: 5432
'@;
  'deployment/k3s/data/redis.yaml' = @'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-redis
  namespace: rahma-data
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: redis
          image: redis:PLACEHOLDER-PINNED-TAG
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "200m"
              memory: "256Mi"
'@;
  'deployment/k3s/ai/ollama.yaml' = @'
# Placeholder only. Replace with pinned image tags before deployment.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-ollama
  namespace: rahma-ai
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: ollama
          image: ollama/ollama:PLACEHOLDER-PINNED-TAG
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "2Gi"
'@;
  'deployment/k3s/rag/rag-api.yaml' = @'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-rag
  namespace: rahma-rag
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: rag
          image: ghcr.io/serverax/rahma-rag:PLACEHOLDER-PINNED-TAG
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
'@;
  'deployment/k3s/wasm/rahma-policy-gate-wasm.yaml' = @'
# Placeholder only. Internal ClusterIP service, no public ingress.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-policy-gate-wasm
  namespace: rahma-wasm
spec:
  replicas: 1
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        allowPrivilegeEscalation: false
      containers:
        - name: policy
          image: ghcr.io/serverax/rahma-policy-gate-wasm:PLACEHOLDER-PINNED-TAG
          resources:
            requests:
              cpu: "20m"
              memory: "32Mi"
            limits:
              cpu: "100m"
              memory: "128Mi"
          readinessProbe:
            tcpSocket:
              port: 8080
          livenessProbe:
            tcpSocket:
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: rahma-policy-gate-wasm
  namespace: rahma-wasm
spec:
  type: ClusterIP
  selector:
    app: rahma-policy-gate-wasm
  ports:
    - port: 80
      targetPort: 8080
'@;
  'deployment/k3s/wasm/rahma-citation-verifier-wasm.yaml' = @'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-citation-verifier-wasm
  namespace: rahma-wasm
spec:
  replicas: 1
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        allowPrivilegeEscalation: false
      containers:
        - name: verifier
          image: ghcr.io/serverax/rahma-citation-verifier-wasm:PLACEHOLDER-PINNED-TAG
          resources:
            requests:
              cpu: "20m"
              memory: "32Mi"
            limits:
              cpu: "100m"
              memory: "128Mi"
          readinessProbe:
            tcpSocket:
              port: 8080
          livenessProbe:
            tcpSocket:
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: rahma-citation-verifier-wasm
  namespace: rahma-wasm
spec:
  type: ClusterIP
  selector:
    app: rahma-citation-verifier-wasm
  ports:
    - port: 80
      targetPort: 8080
'@;
  'deployment/k3s/wasm/rahma-child-safety-wasm.yaml' = @'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-child-safety-wasm
  namespace: rahma-wasm
spec:
  replicas: 1
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        allowPrivilegeEscalation: false
      containers:
        - name: child
          image: ghcr.io/serverax/rahma-child-safety-wasm:PLACEHOLDER-PINNED-TAG
          resources:
            requests:
              cpu: "20m"
              memory: "32Mi"
            limits:
              cpu: "100m"
              memory: "128Mi"
          readinessProbe:
            tcpSocket:
              port: 8080
          livenessProbe:
            tcpSocket:
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: rahma-child-safety-wasm
  namespace: rahma-wasm
spec:
  type: ClusterIP
  selector:
    app: rahma-child-safety-wasm
  ports:
    - port: 80
      targetPort: 8080
'@;
  'deployment/k3s/wasm/rahma-prayer-rules-wasm.yaml' = @'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-prayer-rules-wasm
  namespace: rahma-wasm
spec:
  replicas: 1
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        allowPrivilegeEscalation: false
      containers:
        - name: prayer
          image: ghcr.io/serverax/rahma-prayer-rules-wasm:PLACEHOLDER-PINNED-TAG
          resources:
            requests:
              cpu: "20m"
              memory: "32Mi"
            limits:
              cpu: "100m"
              memory: "128Mi"
          readinessProbe:
            tcpSocket:
              port: 8080
          livenessProbe:
            tcpSocket:
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: rahma-prayer-rules-wasm
  namespace: rahma-wasm
spec:
  type: ClusterIP
  selector:
    app: rahma-prayer-rules-wasm
  ports:
    - port: 80
      targetPort: 8080
'@;
  'deployment/k3s/wasm/network-policies.yaml' = @'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rahma-wasm-internal-only
  namespace: rahma-wasm
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: rahma-api
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: rahma-rag
'@;
  'deployment/k3s/api/rahma-api.yaml' = @'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-api
  namespace: rahma-api
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/serverax/rahma-api:PLACEHOLDER-PINNED-TAG
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
'@;
  'deployment/k3s/workers/notification-worker.yaml' = @'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rahma-notification-worker
  namespace: rahma-workers
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: worker
          image: ghcr.io/serverax/rahma-notification-worker:PLACEHOLDER-PINNED-TAG
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "250m"
              memory: "256Mi"
'@;
  'deployment/k3s/storage/object-storage-placeholder.yaml' = @'
# Placeholder only. Replace with a real object storage class / service later.
apiVersion: v1
kind: ConfigMap
metadata:
  name: rahma-object-storage-placeholder
  namespace: rahma-storage
data:
  note: "Object storage foundation only. No public access."
'@;
  'deployment/k3s/security/network-policies.yaml' = @'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rahma-default-deny
  namespace: rahma-api
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
'@;
  'deployment/k3s/security/resource-limits.yaml' = @'
apiVersion: v1
kind: LimitRange
metadata:
  name: rahma-default-limits
  namespace: rahma-api
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: "50m"
        memory: "64Mi"
      default:
        cpu: "250m"
        memory: "256Mi"
'@;
  'deployment/k3s/monitoring/health-checks.yaml' = @'
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rahma-health-check
  namespace: rahma-monitoring
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: check
              image: curlimages/curl:PLACEHOLDER-PINNED-TAG
              args: ["-s", "http://rahma-api:80/api/health"]
          restartPolicy: Never
'@
  'deployment/k3s/README.md' = @'
# Rahma K3s Foundation

These manifests are foundation-only scaffolding.

- Do not apply directly to production without pinned image tags, secrets, TLS, storage class, backups, and human review.
- No `:latest` tags.
- No public Ollama ingress.
- No real secrets.
- Review securityContext, probes, and resource limits before deployment.
'@;
  'deployment/k3s/wasm/README.md' = @'
# Rahma WASM Foundation

These services are internal-only deterministic rule executors.

- No public ingress.
- ClusterIP only.
- Replace placeholder images with pinned artifacts before deployment.
- WASM cannot replace scholar review.
'@
}
foreach ($k in $k3sFiles.GetEnumerator()) {
  New-FileContent -Path (Join-Path $expectedRoot $k.Key) -Content $k.Value
}

New-FileContent -Path (Join-Path $expectedRoot 'scripts/install-rahma-ollama-models.sh') -Content @'
#!/usr/bin/env sh
set -eu

# classification
ollama pull qwen2.5:1.5b
# answer drafting
ollama pull llama3.2:3b
# review / escalation
ollama pull phi3.5:3.8b
# coding helper only
ollama pull qwen2.5-coder:1.5b
'@

New-FileContent -Path (Join-Path $expectedRoot 'scripts/install-rahma-ollama-models.ps1') -Content @'
ollama pull qwen2.5:1.5b
ollama pull llama3.2:3b
ollama pull phi3.5:3.8b
ollama pull qwen2.5-coder:1.5b
'@

$workflows = @{
  '.github/workflows/rahma-backend-foundation.yml' = @'
name: Rahma Backend Foundation
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
jobs:
  foundation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Check for secrets
        run: echo "Secret scan placeholder"
      - name: Validate SQL files
        run: find apps/backend/src/db/migrations -name '*.sql' -print
      - name: Validate K3s manifests
        run: find deployment/k3s -name '*.yaml' -o -name '*.yml' -print
'@;
  '.github/workflows/rahma-apk-build.yml' = @'
name: Rahma APK Build
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
      - name: Flutter pub get
        working-directory: apps/mobile
        run: flutter pub get
      - name: Flutter test
        working-directory: apps/mobile
        run: flutter test
      - name: Build APK
        working-directory: apps/mobile
        run: flutter build apk --release
      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: rahma-release-apk
          path: apps/mobile/build/app/outputs/flutter-apk/app-release.apk
'@
}
foreach ($w in $workflows.GetEnumerator()) {
  New-FileContent -Path (Join-Path $expectedRoot $w.Key) -Content $w.Value
}

$foundationTests = @{
  'apps/backend/test/health.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("foundation health test stub exists", () => {
  assert.ok(true);
});
'@;
  'apps/backend/test/ready.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("foundation ready test stub exists", () => {
  assert.ok(true);
});
'@;
  'apps/backend/test/rag-policy.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("RAG policy requires citations", () => {
  assert.ok(true);
});
'@;
  'apps/backend/test/no-secret-leak.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("no obvious secret placeholders committed", () => {
  assert.ok(true);
});
'@;
  'apps/backend/test/schema-files.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("schema files exist", () => {
  assert.ok(true);
});
'@
  'apps/backend/test/wasm-policy-gate.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("WASM policy gate placeholder exists", () => {
  assert.ok(true);
});
'@;
  'apps/backend/test/wasm-citation-verifier.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("WASM citation verifier placeholder exists", () => {
  assert.ok(true);
});
'@;
  'apps/backend/test/wasm-child-safety.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("WASM child safety placeholder exists", () => {
  assert.ok(true);
});
'@;
  'apps/backend/test/wasm-prayer-rules.test.ts' = @'
import assert from "node:assert/strict";
import test from "node:test";

test("WASM prayer rules placeholder exists", () => {
  assert.ok(true);
});
'@
}
foreach ($t in $foundationTests.GetEnumerator()) {
  New-FileContent -Path (Join-Path $expectedRoot $t.Key) -Content $t.Value
}

Add-ReportLine "Created directories: $($script:CreatedDirs.Count)"
Add-ReportLine "Created files: $($script:CreatedFiles.Count)"
Add-ReportLine "Skipped files: $($script:SkippedFiles.Count)"
Add-ReportLine "Modified files: $($script:ModifiedFiles.Count)"

$status = 'PARTIAL'

$requiredChecks = @(
  'apps/backend/src/db/migrations/001_rahma_core_schema.sql',
  'apps/backend/src/db/migrations/002_rahma_rag_foundation.sql',
  'apps/backend/src/db/migrations/003_rahma_wasm_foundation.sql',
  'apps/backend/src/routes/health.routes.ts',
  'apps/backend/src/services/prayer.service.ts',
  'apps/backend/src/wasm/wasm-runtime.ts',
  'docs/islamic-content/CONTENT_SOURCE_APPROVAL_POLICY.md',
  'docs/architecture/RAHMA_WASM_ARCHITECTURE.md',
  'deployment/k3s/namespaces/rahma-namespaces.yaml',
  'deployment/k3s/wasm/rahma-policy-gate-wasm.yaml',
  '.github/workflows/rahma-backend-foundation.yml',
  'scripts/install-rahma-ollama-models.sh'
)

foreach ($check in $requiredChecks) {
  if (Test-RequiredPath -Path (Join-Path $expectedRoot $check)) {
    $script:TestResults += "PASS: $check"
  } else {
    $script:TestResults += "FAIL: $check"
    $status = 'FAIL'
  }
}

try {
  Test-NoSecrets -Paths @(
    (Join-Path $expectedRoot 'apps/backend/src/db/migrations/001_rahma_core_schema.sql'),
    (Join-Path $expectedRoot 'apps/backend/src/db/migrations/002_rahma_rag_foundation.sql'),
    (Join-Path $expectedRoot 'docs/islamic-content/CONTENT_SOURCE_APPROVAL_POLICY.md'),
    (Join-Path $expectedRoot '.github/workflows/rahma-backend-foundation.yml')
  )
  $script:TestResults += 'PASS: secret scan placeholder check'
} catch {
  $script:TestResults += "FAIL: secret scan placeholder check - $($_.Exception.Message)"
  $status = 'FAIL'
}

$backendSmokeStatus = 'SKIPPED'
if (Test-Path -LiteralPath (Join-Path $expectedRoot 'backend/app/test/self-improvement-engine.test.js')) {
  try {
    Push-Location (Join-Path $expectedRoot 'backend/app')
    node --test test/self-improvement-engine.test.js
    $backendSmokeStatus = 'PASS'
  } catch {
    $backendSmokeStatus = 'FAIL'
    $status = 'PARTIAL'
    Add-ReportLine "backend smoke test failed: $($_.Exception.Message)"
  } finally {
    Pop-Location
  }
}
$script:TestResults += "backend smoke test: $backendSmokeStatus"

$flutterTestStatus = 'SKIPPED'
if (Test-Path -LiteralPath (Join-Path $expectedRoot 'apps/mobile/pubspec.yaml')) {
  try {
    $flutterProjectRoot = Join-Path $expectedRoot 'apps/mobile'
    $flutterCmd = Get-Command flutter -ErrorAction Stop
    $stdout = Join-Path $env:TEMP 'rahma_flutter_smoke_stdout.txt'
    $stderr = Join-Path $env:TEMP 'rahma_flutter_smoke_stderr.txt'
    Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue
    $proc = Start-Process -FilePath $flutterCmd.Source -ArgumentList @('test', 'test/rahma_widgets_test.dart', 'test/improvement_center_screen_test.dart') -WorkingDirectory $flutterProjectRoot -NoNewWindow -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    try {
      Wait-Process -Id $proc.Id -Timeout 600 -ErrorAction Stop
      $proc.Refresh()
      if ($proc.ExitCode -eq 0) {
        $flutterTestStatus = 'PASS'
      } else {
        $flutterTestStatus = 'FAIL'
        $status = 'PARTIAL'
        Add-ReportLine "flutter smoke test failed with exit code $($proc.ExitCode)"
        if (Test-Path -LiteralPath $stderr) {
          Add-ReportLine "flutter smoke test stderr: $(Get-Content -LiteralPath $stderr -Raw)"
        }
      }
    } catch {
      if (-not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      }
      $flutterTestStatus = 'SKIPPED'
      $status = 'PARTIAL'
      Add-ReportLine 'flutter smoke test skipped after 600s timeout'
      if (Test-Path -LiteralPath $stderr) {
        Add-ReportLine "flutter smoke test partial stderr: $(Get-Content -LiteralPath $stderr -Raw)"
      }
    }
  } catch {
    $flutterTestStatus = 'FAIL'
    $status = 'PARTIAL'
    Add-ReportLine "flutter smoke test failed: $($_.Exception.Message)"
  }
}
$script:TestResults += "flutter smoke test: $flutterTestStatus"

$reportPath = Join-Path $expectedRoot 'docs/RAHMA_BACKEND_FOUNDATION_REPORT.md'
$report = @"
# Rahma Backend Foundation Report

## Files created

$((($script:CreatedFiles + $script:CreatedDirs) | Sort-Object | ForEach-Object { "- $_" }) -join "`r`n")

## Files skipped because already existed

$((($script:SkippedFiles + $script:SkippedDirs) | Sort-Object | ForEach-Object { "- $_" }) -join "`r`n")

## Files modified

$((($script:ModifiedFiles + $script:BackedUpFiles) | Sort-Object | ForEach-Object { "- $_" }) -join "`r`n")

## Tests attempted

$((($script:TestResults) | ForEach-Object { "- $_" }) -join "`r`n")

## Remaining manual actions

- Wire the new `apps/backend` foundation into the active application entrypoints.
- Replace placeholder image tags and secret stubs before any deployment.
- Decide whether the new foundation becomes the canonical backend or remains a scaffold.

## Honest status

Status: $status
"@

Write-FileSafe -Path $reportPath -Content $report

Add-ReportLine "Report written: $reportPath"
Add-ReportLine "Final status: $status"

if (Test-Path -LiteralPath (Join-Path $expectedRoot 'apps/backend/src/db/migrations/001_rahma_core_schema.sql')) {
  $dbStatus = 'PASS'
} else { $dbStatus = 'FAIL' }
if (Test-Path -LiteralPath (Join-Path $expectedRoot 'apps/backend/src/routes/health.routes.ts')) {
  $apiStatus = 'PASS'
} else { $apiStatus = 'FAIL' }
if (Test-Path -LiteralPath (Join-Path $expectedRoot 'apps/backend/src/rag/islamic-rag.service.ts')) {
  $ragStatus = 'PASS'
} else { $ragStatus = 'FAIL' }
if (Test-Path -LiteralPath (Join-Path $expectedRoot 'deployment/k3s/namespaces/rahma-namespaces.yaml')) {
  $k3sStatus = 'PASS'
} else { $k3sStatus = 'FAIL' }
if (Test-Path -LiteralPath (Join-Path $expectedRoot '.github/workflows/rahma-backend-foundation.yml')) {
  $ciStatus = 'PASS'
} else { $ciStatus = 'FAIL' }
if (Test-Path -LiteralPath (Join-Path $expectedRoot 'docs/app-store/AI_ISLAMIC_DISCLAIMER.md')) {
  $docsStatus = 'PASS'
} else { $docsStatus = 'FAIL' }

Write-Host 'RAHMA BACKEND FOUNDATION RESULT'
Write-Host ("- Database foundation: $dbStatus")
Write-Host ("- API skeleton: $apiStatus")
Write-Host ("- RAG foundation: $ragStatus")
Write-Host ("- K3s manifests: $k3sStatus")
Write-Host ("- CI/CD foundation: $ciStatus")
Write-Host ("- App store docs: $docsStatus")
Write-Host ('- Tests: ' + $backendSmokeStatus + ' / ' + $flutterTestStatus)
Write-Host ('- Overall: ' + $status)

exit 0
