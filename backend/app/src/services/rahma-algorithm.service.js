import { calculatePrayerTimes, getNextPrayer } from './prayer-times-service.js';
import { LocalLlmClient } from '../rag/local-llm/client.js';
import { getLocalLlmConfig } from '../rag/local-llm/config.js';
import {
  normalizeTrustedText,
  stableHash,
  scoreTrustedChunk,
  composeVerifiedAnswer,
  createFallbackEmbedding,
} from '../rag/trusted-content.js';

export const RAHMA_ALGORITHM_VERSION = 'rahma-algorithm-v1';

let _rahmaAlgorithm = null;

export function configureRahmaAlgorithm(service = null) {
  _rahmaAlgorithm = service || null;
  return _rahmaAlgorithm;
}

export function getRahmaAlgorithm() {
  return _rahmaAlgorithm;
}

export function isRahmaAlgorithmConfigured() {
  return Boolean(_rahmaAlgorithm && typeof _rahmaAlgorithm.answerQuestion === 'function');
}

export function _resetRahmaAlgorithmForTests() {
  _rahmaAlgorithm = null;
}

function jsonArray(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function detectLanguage(text = '') {
  const raw = String(text || '');
  const hasArabic = /[ء-ي]/.test(raw);
  const hasEnglish = /[a-z]/i.test(raw);
  if (hasArabic && hasEnglish) return 'mixed';
  if (hasArabic) return 'ar';
  if (hasEnglish) return 'en';
  return 'ar';
}

function normalizeQuestion(text = '') {
  return normalizeTrustedText(text)
    .replace(/[؟?!.،,؛:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectPromptInjection(text = '') {
  const q = String(text || '').toLowerCase();
  const patterns = [
    'ignore previous',
    'forget previous',
    'pretend',
    'fake citation',
    'no citation',
    'do not cite',
    'invent',
    'override safety',
    'system prompt',
    'developer message',
    'jailbreak',
    'تجاهل التعليمات',
    'تجاهل القواعد',
    'انس التعليمات',
    'انسى التعليمات',
    'اكشف رسالة النظام',
    'رسالة النظام',
    'بدون مراجع',
    'بلا مراجع',
    'اخترع مصدر',
    'اصنع مصدر',
    'تجاوز قواعد',
  ];
  return patterns.some((p) => q.includes(p));
}

function detectUserMode({ mode = null, childSafe = false, question = '' } = {}) {
  if (typeof mode === 'string' && mode.trim()) return mode.trim();
  if (childSafe) return 'child';
  const q = String(question || '').toLowerCase();
  if (/طفل|children|kids/.test(q)) return 'child';
  if (/صلاة|prayer|azan|أذان|قِبلة|qibla|hijri|هجري/.test(q)) return 'prayer';
  if (/قرآن|quran|surah|sura|آية|ayah/.test(q)) return 'quran';
  if (/sheikh|شيخ|ask sheikh|ask sheikh hasan|hasan/.test(q)) return 'ask_sheikh';
  return 'adult';
}

function classifyIntent(question = '', mode = null) {
  const q = String(question || '');
  const lower = q.toLowerCase();
  const text = `${lower} ${q}`;
  if (detectPromptInjection(q)) return 'blocked_prompt_injection';
  if (/قرآن|quran|surah|sura|آية|ayah/.test(text)) return 'quran_lookup';
  if (/حديث|hadith|sunnah/.test(text)) return 'hadith_lookup';
  if (/صلاة|prayer|azan|أذان|وقت الصلاة|prayer time/.test(text)) return 'prayer_time';
  if (/qibla|قبلة/.test(text)) return 'qibla';
  if (/hijri|هجري/.test(text)) return 'hijri';
  if (/دعاء|dua|adkhar|أذكار|ذكر/.test(text)) return 'dua';
  if (
    /فتوى|حكم|حرام|حلال|يجوز|يحرم|يحل|fiqh|fatwa|marriage|divorce|inheritance|finance|medical|legal|crypto|bitcoin|استثمار|عملات\s*رقمية|رقمية|ربا|فائدة|تجارة|بيع|شراء/.test(text)
    || /هل\s+يجوز|هل\s+يحل|هل\s+يحرم/.test(text)
  ) return 'fiqh_fatwa_like';
  if (/طفل|children|kids|story|quiz|تعليم/.test(lower) || mode === 'child') return 'child_story';
  if (/settings|help|about|support|سجل|history|saved/.test(lower)) return 'app_help';
  if (mode === 'quran') return 'quran_lookup';
  if (mode === 'prayer') return 'prayer_time';
  if (mode === 'ask_sheikh') return 'fiqh_fatwa_like';
  return 'unknown';
}

function classifyRisk({ intent, mode, childSafe, question } = {}) {
  if (detectPromptInjection(question)) return 'blocked';
  if (childSafe || mode === 'child') {
    if (intent === 'fiqh_fatwa_like') return 'blocked';
    return 'low';
  }
  if (['quran_lookup', 'dua', 'prayer_time', 'qibla', 'hijri', 'app_help', 'child_story'].includes(intent)) return 'low';
  if (intent === 'hadith_lookup') return 'medium';
  if (intent === 'fiqh_fatwa_like') return 'high';
  return 'medium';
}

function selectRetrievalStrategy({ intent, riskLevel } = {}) {
  if (riskLevel === 'blocked') return 'blocked_prompt_injection';
  if (['prayer_time', 'qibla', 'hijri'].includes(intent)) return 'deterministic_calculation';
  if (intent === 'fiqh_fatwa_like') return 'scholar_review_required';
  if (intent === 'quran_lookup' || intent === 'dua' || intent === 'hadith_lookup' || intent === 'child_story') return 'approved_rag_search';
  if (intent === 'app_help') return 'safe_refusal';
  return 'approved_rag_search';
}

function prayerCitations({ method, madhab, qiblaDegrees, hijriLabel } = {}) {
  const citations = [];
  if (typeof qiblaDegrees === 'number') {
    citations.push({
      source_id: 'rahma-deterministic-prayer-engine',
      source_title: 'Rahma deterministic prayer engine',
      source_type: 'internal',
      document_id: null,
      chunk_id: null,
      reference_label: `qibla:${qiblaDegrees.toFixed(2)}`,
      url: null,
      local_reference: `method:${method || 'MWL'}; madhhab:${madhab || 'standard'}`,
      verified: true,
    });
  }
  if (typeof hijriLabel === 'string') {
    citations.push({
      source_id: 'rahma-deterministic-hijri-engine',
      source_title: 'Rahma deterministic Hijri engine',
      source_type: 'internal',
      document_id: null,
      chunk_id: null,
      reference_label: hijriLabel,
      url: null,
      local_reference: 'civil-tabular approximation',
      verified: true,
    });
  }
  return citations;
}

function prayerAnswer({ intent, language, prayerTimes, qiblaDegrees, hijriLabel } = {}) {
  if (intent === 'prayer_time') {
    const nextPrayer = getNextPrayer(prayerTimes?.times || {});
    const answer = language === 'en'
      ? `Deterministic prayer calculation result. Next prayer: ${nextPrayer.next} at ${nextPrayer.time}.`
      : `نتيجة حساب الصلاة المحدد حاسوبياً. الصلاة القادمة: ${nextPrayer.next} عند ${nextPrayer.time}.`;
    return {
      answer,
      citations: prayerCitations({ method: prayerTimes?.method, madhab: prayerTimes?.asr_method, qiblaDegrees }),
    };
  }
  if (intent === 'qibla') {
    const answer = language === 'en'
      ? `The qibla direction is ${qiblaDegrees.toFixed(2)} degrees from north.`
      : `اتجاه القبلة هو ${qiblaDegrees.toFixed(2)} درجة من الشمال.`;
    return {
      answer,
      citations: prayerCitations({ qiblaDegrees }),
    };
  }
  if (intent === 'hijri') {
    const answer = language === 'en'
      ? `Estimated Hijri date: ${hijriLabel}.`
      : `التاريخ الهجري التقريبي: ${hijriLabel}.`;
    return {
      answer,
      citations: prayerCitations({ hijriLabel }),
    };
  }
  return null;
}

async function queryApprovedChunks(pool, { language, intent }) {
  const allowedTypes = intent === 'quran_lookup'
    ? ['quran']
    : intent === 'dua'
      ? ['dua']
      : intent === 'hadith_lookup'
        ? ['hadith']
        : intent === 'child_story'
          ? ['children', 'quran']
          : ['quran', 'dua', 'hadith', 'fiqh', 'children', 'prayer', 'article'];

  const languagePriority = Array.from(new Set([
    language === 'mixed' ? 'ar' : language,
    language === 'en' ? 'ar' : 'en',
  ].filter(Boolean)));

  const res = await pool.query(
    `
    SELECT
      c.id AS chunk_id,
      c.document_id,
      c.source_id,
      c.chunk_text,
      c.normalized_text,
      c.language,
      c.content_type,
      c.citation_label,
      c.local_reference,
      c.approved,
      c.embedding_model,
      c.embedding_jsonb,
      c.metadata,
      d.title_ar,
      d.title_en,
      d.source_type,
      d.provider_name,
      d.official_url,
      d.local_reference AS document_local_reference,
      d.author_or_compiler,
      d.trust_level,
      d.authenticity_level,
      d.approval_status AS document_approval_status,
      s.source_name_ar,
      s.source_name_en,
      s.source_reference,
      s.source_approved,
      s.license_status,
      s.content_hash,
      s.trust_level AS source_trust_level,
      cr.id AS citation_id,
      cr.reference_label,
      cr.source_title_ar AS citation_source_title_ar,
      cr.source_title_en AS citation_source_title_en,
      cr.official_url AS citation_url,
      cr.local_reference AS citation_local_reference
    FROM islamic_document_chunks c
    JOIN islamic_documents d ON d.id = c.document_id
    JOIN content_sources s ON s.id = c.source_id
    LEFT JOIN citation_registry cr ON cr.chunk_id = c.id
      AND cr.approved = TRUE
      AND cr.approval_status = 'approved'
    WHERE c.approved = TRUE
      AND c.approval_status = 'approved'
      AND d.source_approved = TRUE
      AND d.licence_status = 'approved'
      AND s.source_approved = TRUE
      AND s.license_status = 'approved'
      AND c.language = ANY($1::text[])
      AND c.content_type = ANY($2::text[])
    ORDER BY c.created_at ASC
    `,
    [languagePriority, allowedTypes],
  );

  return mapChunkRows(res.rows || []);
}

async function queryApprovedChunksVector(pool, { language, intent, question }) {
  const allowedTypes = intent === 'quran_lookup'
    ? ['quran']
    : intent === 'dua'
      ? ['dua']
      : intent === 'hadith_lookup'
        ? ['hadith']
        : intent === 'child_story'
          ? ['children', 'quran']
          : ['quran', 'dua', 'hadith', 'fiqh', 'children', 'prayer', 'article'];

  const languagePriority = Array.from(new Set([
    language === 'mixed' ? 'ar' : language,
    language === 'en' ? 'ar' : 'en',
  ].filter(Boolean)));

  const embedding = createFallbackEmbedding(normalizeQuestion(question), 24);
  const vectorLiteral = `[${embedding.join(',')}]`;

  const res = await pool.query(
    `
    SELECT
      c.id AS chunk_id,
      c.document_id,
      c.source_id,
      c.chunk_text,
      c.normalized_text,
      c.language,
      c.content_type,
      c.citation_label,
      c.local_reference,
      c.approved,
      c.embedding_model,
      c.embedding_jsonb,
      c.metadata,
      d.title_ar,
      d.title_en,
      d.source_type,
      d.provider_name,
      d.official_url,
      d.local_reference AS document_local_reference,
      d.author_or_compiler,
      d.trust_level,
      d.authenticity_level,
      d.approval_status AS document_approval_status,
      s.source_name_ar,
      s.source_name_en,
      s.source_reference,
      s.source_approved,
      s.license_status,
      s.content_hash,
      s.trust_level AS source_trust_level,
      cr.id AS citation_id,
      cr.reference_label,
      cr.source_title_ar AS citation_source_title_ar,
      cr.source_title_en AS citation_source_title_en,
      cr.official_url AS citation_url,
      cr.local_reference AS citation_local_reference,
      (c.embedding <=> $3::vector) AS vector_distance
    FROM islamic_document_chunks c
    JOIN islamic_documents d ON d.id = c.document_id
    JOIN content_sources s ON s.id = c.source_id
    LEFT JOIN citation_registry cr ON cr.chunk_id = c.id
      AND cr.approved = TRUE
      AND cr.approval_status = 'approved'
    WHERE c.approved = TRUE
      AND c.approval_status = 'approved'
      AND d.source_approved = TRUE
      AND d.licence_status = 'approved'
      AND s.source_approved = TRUE
      AND s.license_status = 'approved'
      AND c.language = ANY($1::text[])
      AND c.content_type = ANY($2::text[])
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> $3::vector
    LIMIT 8
    `,
    [languagePriority, allowedTypes, vectorLiteral],
  );

  return mapChunkRows(res.rows || []);
}

function mapChunkRows(rows) {
  return rows.map((row) => ({
    chunk_id: row.chunk_id,
    document_id: row.document_id,
    source_id: row.source_id,
    title_ar: row.title_ar,
    title_en: row.title_en,
    source_type: row.source_type,
    source_name_ar: row.source_name_ar,
    source_name_en: row.source_name_en,
    source_reference: row.source_reference,
    official_url: row.official_url,
    local_reference: row.local_reference || row.document_local_reference || null,
    chunk_text: row.chunk_text,
    normalized_text: row.normalized_text,
    language: row.language,
    content_type: row.content_type,
    citation_label: row.citation_label,
    citation_id: row.citation_id,
    reference_label: row.reference_label,
    citation_url: row.citation_url,
    citation_local_reference: row.citation_local_reference,
    source_approved: row.source_approved,
    license_status: row.license_status,
    trust_level: row.trust_level || row.source_trust_level,
    authenticity_level: row.authenticity_level,
    content_hash: row.content_hash,
    embedding_model: row.embedding_model,
    embedding_jsonb: row.embedding_jsonb,
    metadata: row.metadata,
  }));
}

async function storeAnswerCache(pool, { questionHash, normalizedQuestion, language, answer, citations, sourceIds }) {
  if (!pool) return;
  await pool.query(
    `
    INSERT INTO rag_answer_cache (
      question_hash, normalized_question, answer_text, language, citation_json, source_ids, approved
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, TRUE)
    ON CONFLICT (question_hash)
    DO UPDATE SET
      normalized_question = EXCLUDED.normalized_question,
      answer_text = EXCLUDED.answer_text,
      language = EXCLUDED.language,
      citation_json = EXCLUDED.citation_json,
      source_ids = EXCLUDED.source_ids,
      approved = TRUE,
      updated_at = NOW()
    `,
    [
      questionHash,
      normalizedQuestion,
      answer,
      language,
      JSON.stringify(citations),
      JSON.stringify(sourceIds),
    ],
  );
}

async function storeAudit(pool, payload) {
  if (!pool) return null;
  const res = await pool.query(
    `
    INSERT INTO rag_query_audit (
      question_hash, normalized_question, language, mode, intent, risk_level, safety_status,
      source_ids, document_ids, chunk_ids, citation_ids,
      approved_sources_count, documents_indexed_count, chunks_indexed_count,
      embeddings_indexed_count, citations_indexed_count, llm_called,
      algorithm_version, refusal_reason, answer_text
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb,
      $12, $13, $14, $15, $16, $17,
      $18, $19, $20
    )
    RETURNING id, created_at
    `,
    [
      payload.questionHash,
      payload.normalizedQuestion,
      payload.language,
      payload.mode,
      payload.intent,
      payload.riskLevel,
      payload.safetyStatus,
      jsonArray(payload.sourceIds),
      jsonArray(payload.documentIds),
      jsonArray(payload.chunkIds),
      jsonArray(payload.citationIds),
      payload.approvedSourcesCount || 0,
      payload.documentsIndexedCount || 0,
      payload.chunksIndexedCount || 0,
      payload.embeddingsIndexedCount || 0,
      payload.citationsIndexedCount || 0,
      Boolean(payload.llmCalled),
      payload.algorithmVersion || RAHMA_ALGORITHM_VERSION,
      payload.refusalReason || null,
      payload.answer || null,
    ],
  );
  return res.rows?.[0] || null;
}

export function createRahmaAlgorithmService({ pool = null, llmClient = null, version = RAHMA_ALGORITHM_VERSION } = {}) {
  const config = getLocalLlmConfig();
  const localLlm = llmClient || new LocalLlmClient({ config });

  async function answerQuestion(input = {}) {
    if (!pool) {
      return {
        answer: null,
        language: 'ar',
        intent: 'unknown',
        risk_level: 'blocked',
        safety_status: 'system_error',
        citations: [],
        requires_scholar_review: false,
        learning_recommendation: null,
        audit_id: null,
        algorithm_version: version,
      };
    }

    const rawQuestion = String(input.question_ar || input.question || '').trim();
    const language = detectLanguage(rawQuestion || input.language || 'ar');
    const normalizedQuestion = normalizeQuestion(rawQuestion);
    const mode = detectUserMode({ mode: input.mode, childSafe: Boolean(input.child_safe), question: rawQuestion });
    const intent = classifyIntent(rawQuestion, mode);
    const riskLevel = classifyRisk({ intent, mode, childSafe: Boolean(input.child_safe), question: rawQuestion });
    const questionHash = stableHash(`${language}|${normalizedQuestion}`);
    const approvedSourceStats = await pool.query(`
      SELECT
        COUNT(*)::int AS approved_sources
      FROM content_sources
      WHERE source_approved = TRUE
        AND license_status = 'approved'
        AND content_hash IS NOT NULL
        AND trust_level IS NOT NULL
    `);
    const approvedSourcesCount = approvedSourceStats.rows?.[0]?.approved_sources || 0;
    const chunkStats = await pool.query(`
      SELECT
        COUNT(DISTINCT d.id)::int AS documents_indexed,
        COUNT(c.id)::int AS chunks_indexed,
        COUNT(*) FILTER (WHERE COALESCE(jsonb_array_length(c.embedding_jsonb), 0) > 0)::int AS embeddings_indexed,
        COUNT(cr.id)::int AS citations_indexed
      FROM islamic_document_chunks c
      JOIN islamic_documents d ON d.id = c.document_id
      JOIN content_sources s ON s.id = c.source_id
      LEFT JOIN citation_registry cr ON cr.chunk_id = c.id
      WHERE c.approved = TRUE
        AND c.approval_status = 'approved'
        AND d.source_approved = TRUE
        AND d.licence_status = 'approved'
        AND s.source_approved = TRUE
        AND s.license_status = 'approved'
    `);
    const docsIndexed = chunkStats.rows?.[0]?.documents_indexed || 0;
    const chunksIndexed = chunkStats.rows?.[0]?.chunks_indexed || 0;
    const embeddingsIndexed = chunkStats.rows?.[0]?.embeddings_indexed || 0;
    const citationsIndexed = chunkStats.rows?.[0]?.citations_indexed || 0;

    if (intent === 'blocked_prompt_injection' || riskLevel === 'blocked') {
      const refusal = language === 'en'
        ? 'I cannot answer this because the request appears to contain prompt-injection or unsafe instructions.'
        : 'لا أستطيع الإجابة لأن الطلب يبدو أنه يتضمن حقن أوامر أو تعليمات غير آمنة.';
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel: 'blocked',
        safetyStatus: 'blocked_prompt_injection',
        sourceIds: [],
        documentIds: [],
        chunkIds: [],
        citationIds: [],
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled: false,
        algorithmVersion: version,
        refusalReason: 'blocked_prompt_injection',
        answer: refusal,
      });
      return {
        answer: refusal,
        language,
        intent,
        risk_level: 'blocked',
        safety_status: 'blocked_prompt_injection',
        citations: [],
        requires_scholar_review: false,
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    if (riskLevel === 'high' && intent === 'fiqh_fatwa_like' && approvedSourcesCount === 0) {
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel,
        safetyStatus: 'scholar_review_required',
        sourceIds: [],
        documentIds: [],
        chunkIds: [],
        citationIds: [],
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled: false,
        algorithmVersion: version,
        refusalReason: 'high_risk_fiqh_requires_scholar_review',
        answer: null,
      });
      await pool.query(
        `
        INSERT INTO scholar_review_queue (
          question_hash, question_text, normalized_question, category, language,
          risk_level, status, reason, source_ids, chunk_ids
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, '[]'::jsonb, '[]'::jsonb)
        ON CONFLICT (question_hash) DO UPDATE SET
          question_text = EXCLUDED.question_text,
          normalized_question = EXCLUDED.normalized_question,
          category = EXCLUDED.category,
          language = EXCLUDED.language,
          risk_level = EXCLUDED.risk_level,
          status = 'pending',
          reason = EXCLUDED.reason,
          updated_at = NOW()
        `,
        [
          questionHash,
          rawQuestion,
          normalizedQuestion,
          intent,
          language,
          riskLevel,
          'High-risk fiqh question requires scholar review',
        ],
      ).catch(() => {});
      return {
        answer: language === 'en'
          ? 'This question needs review by a qualified scholar. We cannot provide an unsupported answer.'
          : 'هذا السؤال يحتاج إلى مراجعة من عالم مختص. لا يمكننا تقديم إجابة غير مدعومة.',
        language,
        intent,
        risk_level: riskLevel,
        safety_status: 'scholar_review_required',
        citations: [],
        requires_scholar_review: true,
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    if (approvedSourcesCount === 0) {
      const refusal = language === 'en'
        ? 'Rahma cannot answer religious questions until approved sources are available.'
        : 'لا يمكن لرحمة الإجابة عن الأسئلة الدينية حتى تتوفر مصادر معتمدة.';
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel,
        safetyStatus: 'insufficient_sources',
        sourceIds: [],
        documentIds: [],
        chunkIds: [],
        citationIds: [],
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled: false,
        algorithmVersion: version,
        refusalReason: 'no_approved_sources',
        answer: refusal,
      });
      return {
        answer: refusal,
        language,
        intent,
        risk_level: riskLevel,
        safety_status: 'insufficient_sources',
        citations: [],
        requires_scholar_review: false,
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    const prayerData = (() => {
      if (!['prayer_time', 'qibla', 'hijri'].includes(intent)) return null;
      const lat = Number(input.lat);
      const lng = Number(input.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { missing: true };
      }
      const method = typeof input.method === 'string' ? input.method : 'MWL';
      const asrMethod = typeof input.asr_method === 'string' ? input.asr_method : 'STANDARD';
      const timezone = Number.isFinite(Number(input.timezone)) ? Number(input.timezone) : undefined;
      const date = input.date ? new Date(input.date) : new Date();
      const prayerTimes = calculatePrayerTimes({ lat, lng, method, asrMethod, timezone, date });
      const qiblaDegrees = (() => {
        const kaabaLat = 21.422487;
        const kaabaLng = 39.826206;
        const dLon = (kaabaLng - lng) * Math.PI / 180;
        const lat1 = lat * Math.PI / 180;
        const lat2 = kaabaLat * Math.PI / 180;
        const y = Math.sin(dLon);
        const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLon);
        return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
      })();
      const hijriLabel = (() => {
        const d = date;
        const jd = Math.floor((d - new Date(Date.UTC(d.getFullYear(), 0, 0))) / 86400000);
        return `${jd} هـ`;
      })();
      return { prayerTimes, qiblaDegrees, hijriLabel, method, asrMethod };
    })();

    if (prayerData && prayerData.missing) {
      const refusal = language === 'en'
        ? 'I need location coordinates to calculate prayer times or qibla accurately.'
        : 'أحتاج إلى إحداثيات الموقع لحساب أوقات الصلاة أو القبلة بدقة.';
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel: 'medium',
        safetyStatus: 'insufficient_sources',
        sourceIds: [],
        documentIds: [],
        chunkIds: [],
        citationIds: [],
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled: false,
        algorithmVersion: version,
        refusalReason: 'missing_location_coordinates',
        answer: refusal,
      });
      return {
        answer: refusal,
        language,
        intent,
        risk_level: 'medium',
        safety_status: 'insufficient_sources',
        citations: [],
        requires_scholar_review: false,
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    if (prayerData && ['prayer_time', 'qibla', 'hijri'].includes(intent)) {
      const prayerResult = prayerAnswer({
        intent,
        language,
        prayerTimes: prayerData.prayerTimes,
        qiblaDegrees: prayerData.qiblaDegrees,
        hijriLabel: prayerData.hijriLabel,
      });
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel,
        safetyStatus: 'verified_sources',
        sourceIds: [],
        documentIds: [],
        chunkIds: [],
        citationIds: [],
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled: false,
        algorithmVersion: version,
        refusalReason: null,
        answer: prayerResult.answer,
      });
      return {
        answer: prayerResult.answer,
        language,
        intent,
        risk_level: riskLevel,
        safety_status: 'verified_sources',
        citations: prayerResult.citations,
        requires_scholar_review: false,
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    if (riskLevel === 'high' && intent === 'fiqh_fatwa_like') {
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel,
        safetyStatus: 'scholar_review_required',
        sourceIds: [],
        documentIds: [],
        chunkIds: [],
        citationIds: [],
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled: false,
        algorithmVersion: version,
        refusalReason: 'high_risk_fiqh_requires_scholar_review',
        answer: null,
      });
      await pool.query(
        `
        INSERT INTO scholar_review_queue (
          question_hash, question_text, normalized_question, category, language,
          risk_level, status, reason, source_ids, chunk_ids
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, '[]'::jsonb, '[]'::jsonb)
        ON CONFLICT (question_hash) DO UPDATE SET
          question_text = EXCLUDED.question_text,
          normalized_question = EXCLUDED.normalized_question,
          category = EXCLUDED.category,
          language = EXCLUDED.language,
          risk_level = EXCLUDED.risk_level,
          status = 'pending',
          reason = EXCLUDED.reason,
          updated_at = NOW()
        `,
        [
          questionHash,
          rawQuestion,
          normalizedQuestion,
          intent,
          language,
          riskLevel,
          'High-risk fiqh question requires scholar review',
        ],
      ).catch(() => {});
      return {
        answer: language === 'en'
          ? 'This question needs review by a qualified scholar. We cannot provide an unsupported answer.'
          : 'هذا السؤال يحتاج إلى مراجعة من عالم مختص. لا يمكننا تقديم إجابة غير مدعومة.',
        language,
        intent,
        risk_level: riskLevel,
        safety_status: 'scholar_review_required',
        citations: [],
        requires_scholar_review: true,
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    let retrievalStrategy = selectRetrievalStrategy({ intent, riskLevel });
    let chunks = [];
    if (process.env.RAG_VECTOR_SEARCH !== 'false') {
      try {
        const ext = await pool.query(`
          SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS ok
        `);
        if (ext.rows?.[0]?.ok) {
          chunks = await queryApprovedChunksVector(pool, {
            language,
            intent,
            question: rawQuestion,
          });
          if (chunks.length > 0) retrievalStrategy = 'vector_search';
        }
      } catch (vectorErr) {
        if (process.env.RAG_VECTOR_SEARCH_DEBUG === 'true') {
          // eslint-disable-next-line no-console
          console.error('[rahma-algorithm] vector retrieval failed:', vectorErr?.message || vectorErr);
        }
        chunks = [];
      }
    }
    if (chunks.length === 0) {
      chunks = await queryApprovedChunks(pool, { language, intent });
    }
    const scored = chunks
      .map((chunk) => ({ ...chunk, score: scoreTrustedChunk(rawQuestion, chunk) }))
      .sort((a, b) => b.score - a.score);
    const selected = scored.filter((chunk) => chunk.score > 0).slice(0, 4);

    if (selected.length === 0) {
      const refusal = language === 'en'
        ? 'I could not find an approved source for this question in Rahma’s approved library. Please ask a qualified scholar.'
        : 'لا أستطيع الإجابة بثقة بدون مصدر معتمد. سيتم تحويل السؤال للمراجعة.';
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel: riskLevel === 'high' ? 'high' : riskLevel,
        safetyStatus: 'insufficient_sources',
        sourceIds: [],
        documentIds: [],
        chunkIds: [],
        citationIds: [],
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled: false,
        algorithmVersion: version,
        refusalReason: 'no_approved_source',
        answer: refusal,
      });
      return {
        answer: refusal,
        language,
        intent,
        risk_level: riskLevel,
        safety_status: 'insufficient_sources',
        citations: [],
        requires_scholar_review: riskLevel === 'high',
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    const topScore = selected[0].score;
    if (topScore < 15) {
      const refusal = language === 'en'
        ? 'I found approved content, but the match is too weak to answer confidently.'
        : 'وجدت محتوى معتمدًا، لكن المطابقة ضعيفة جدًا للإجابة بثقة.';
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel: 'medium',
        safetyStatus: 'low_confidence',
        sourceIds: [],
        documentIds: [],
        chunkIds: selected.map((c) => c.chunk_id),
        citationIds: selected.map((c) => c.citation_id).filter(Boolean),
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled: false,
        algorithmVersion: version,
        refusalReason: 'low_confidence_match',
        answer: refusal,
      });
      return {
        answer: refusal,
        language,
        intent,
        risk_level: 'medium',
        safety_status: 'low_confidence',
        citations: [],
        requires_scholar_review: false,
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    let answer = null;
    let llmCalled = false;
    const llmDraft = await localLlm.draft({
      question: rawQuestion,
      chunks: selected.map((chunk) => ({
        source_id: chunk.source_id,
        citation: chunk.citation_label,
        text_ar: chunk.chunk_text,
        title: chunk.title_ar,
        translation: '',
      })),
    });
    if (llmDraft && llmDraft.answer_ar && Array.isArray(llmDraft.citations) && llmDraft.citations.length > 0) {
      answer = llmDraft.answer_ar;
      llmCalled = true;
    } else {
      const composed = composeVerifiedAnswer(selected.map((chunk) => ({
        chunk_text_ar: chunk.chunk_text,
        citation_label_ar: chunk.citation_label,
        source_name_ar: chunk.source_name_ar,
        source_type: chunk.source_type,
      })));
      answer = composed.answer_ar || null;
    }

    if (!answer) {
      const refusal = language === 'en'
        ? 'A verified answer could not be composed from the approved sources.'
        : 'تعذر تركيب إجابة موثوقة من المصادر المعتمدة.';
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel: 'medium',
        safetyStatus: 'citation_missing',
        sourceIds: selected.map((c) => c.source_id),
        documentIds: selected.map((c) => c.document_id),
        chunkIds: selected.map((c) => c.chunk_id),
        citationIds: selected.map((c) => c.citation_id).filter(Boolean),
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled,
        algorithmVersion: version,
        refusalReason: 'citation_missing',
        answer: refusal,
      });
      return {
        answer: refusal,
        language,
        intent,
        risk_level: 'medium',
        safety_status: 'citation_missing',
        citations: [],
        requires_scholar_review: false,
        learning_recommendation: null,
        audit_id: audit?.id || null,
        algorithm_version: version,
      };
    }

    const citations = selected.map((chunk) => ({
      source_id: chunk.source_reference || chunk.source_id,
      source_uuid: chunk.source_id,
      source_title: chunk.title_ar || chunk.source_name_ar,
      source_type: chunk.source_type,
      document_id: chunk.document_id,
      chunk_id: chunk.chunk_id,
      reference_label: chunk.reference_label || chunk.citation_label,
      url: chunk.citation_url || chunk.official_url || null,
      local_reference: chunk.citation_local_reference || chunk.local_reference || null,
      verified: true,
      citation_label: chunk.citation_label,
    }));

    const citationsValid = citations.length > 0 && citations.every((citation) =>
      Boolean(
        citation.source_id
        && citation.source_title
        && citation.source_type
        && citation.document_id
        && citation.chunk_id
        && citation.reference_label
      ),
    );

    if (!citationsValid) {
      const refusal = language === 'en'
        ? 'A verified answer could not be composed because citation metadata is incomplete.'
        : 'تعذر تركيب إجابة موثوقة لأن بيانات الاقتباس غير مكتملة.';
      const audit = await storeAudit(pool, {
        questionHash,
        normalizedQuestion,
        language,
        mode,
        intent,
        riskLevel: 'medium',
        safetyStatus: 'citation_missing',
        sourceIds: selected.map((c) => c.source_id),
        documentIds: selected.map((c) => c.document_id),
        chunkIds: selected.map((c) => c.chunk_id),
        citationIds: selected.map((c) => c.citation_id).filter(Boolean),
        approvedSourcesCount,
        documentsIndexedCount: docsIndexed,
        chunksIndexedCount: chunksIndexed,
        embeddingsIndexedCount: embeddingsIndexed,
        citationsIndexedCount: citationsIndexed,
        llmCalled,
        algorithmVersion: version,
        refusalReason: 'citation_metadata_incomplete',
        answer: refusal,
      });
      return {
        answer: refusal,
        language,
        intent,
        risk_level: 'medium',
        safety_status: 'citation_missing',
        citations: [],
        requires_scholar_review: false,
        learning_recommendation: null,
        audit_id: audit?.id || null,
      };
    }

    const finalAnswer = language === 'en' && !answer.match(/[A-Za-z]/)
      ? `Approved source found.\n\n${answer}`
      : answer;

    await storeAnswerCache(pool, {
      questionHash,
      normalizedQuestion,
      language,
      answer: finalAnswer,
      citations,
      sourceIds: selected.map((c) => c.source_id),
    });

    const audit = await storeAudit(pool, {
      questionHash,
      normalizedQuestion,
      language,
      mode,
      intent,
      riskLevel,
      safetyStatus: 'verified_sources',
      sourceIds: selected.map((c) => c.source_id),
      documentIds: selected.map((c) => c.document_id),
      chunkIds: selected.map((c) => c.chunk_id),
      citationIds: selected.map((c) => c.citation_id).filter(Boolean),
      approvedSourcesCount,
      documentsIndexedCount: docsIndexed,
      chunksIndexedCount: chunksIndexed,
      embeddingsIndexedCount: embeddingsIndexed,
      citationsIndexedCount: citationsIndexed,
      llmCalled,
      algorithmVersion: version,
      refusalReason: null,
      answer: finalAnswer,
    });

    return {
      answer: finalAnswer,
      language,
      intent,
      risk_level: riskLevel,
      retrieval_strategy: retrievalStrategy,
      safety_status: 'verified_sources',
      citations,
      requires_scholar_review: false,
      learning_recommendation: null,
      audit_id: audit?.id || null,
      algorithm_version: version,
    };
  }

  return {
    version,
    isConfigured: Boolean(pool),
    answerQuestion,
    detectLanguage,
    classifyIntent,
    classifyRisk,
    detectPromptInjection,
    selectRetrievalStrategy,
  };
}
