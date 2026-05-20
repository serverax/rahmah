#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  createFallbackEmbedding,
  buildCitationLabel,
  normalizeTrustedText,
  stableHash,
} from '../../backend/app/src/rag/trusted-content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const QURAN_FILE = path.join(REPO_ROOT, 'data', 'islamic-sources', 'quran-full-tanzil.json');
const INTERNAL_QA_FILE = path.join(REPO_ROOT, 'data', 'islamic-sources', 'internal-reviewed-starter-qa.json');
const require = createRequire(path.resolve(REPO_ROOT, 'backend', 'app', 'package.json'));
const { Pool } = require('pg');

function sha256(text) {
  return createHash('sha256').update(String(text || '')).digest('hex');
}

function toVectorLiteral(values) {
  return `[${(Array.isArray(values) ? values : []).join(',')}]`;
}

function isApprovedSource(source) {
  return Boolean(
    source &&
    source.source_approved === true &&
    String(source.license_status || '').toLowerCase() === 'approved' &&
    typeof source.content_hash === 'string' &&
    source.content_hash.length === 64 &&
    typeof source.trust_level === 'string' &&
    source.trust_level.trim().length > 0
  );
}

function selectStarterQuranContent(quranJson) {
  const surahSet = new Set([1, 2, 112, 113, 114]);
  const ayatAlKursi = new Set([255]);
  const selected = [];
  for (const surah of Array.isArray(quranJson.surahs) ? quranJson.surahs : []) {
    if (!surahSet.has(Number(surah.id))) continue;
    if (surah.id === 2) {
      const ayahs = Array.isArray(surah.ayahs) ? surah.ayahs.filter((ayah) => ayatAlKursi.has(Number(ayah.ayah_number))) : [];
      selected.push({
        surah,
        title_ar: 'آية الكرسي',
        title_en: 'Ayat al-Kursi',
        ayahs,
      });
    } else {
      selected.push({
        surah,
        title_ar: String(surah.name_ar || surah.name_en || `السورة ${surah.id}`),
        title_en: String(surah.name_en || surah.name_ar || `Surah ${surah.id}`),
        ayahs: Array.isArray(surah.ayahs) ? surah.ayahs : [],
      });
    }
  }
  return selected;
}

async function loadApprovedSources(pool) {
  const res = await pool.query(`
    SELECT *
    FROM content_sources
    WHERE source_approved = TRUE
      AND license_status = 'approved'
      AND content_hash IS NOT NULL
      AND trust_level IS NOT NULL
    ORDER BY created_at ASC
  `);
  return res.rows || [];
}

async function main() {
  const out = {
    ok: false,
    approved_sources: 0,
    documents_indexed: 0,
    chunks_indexed: 0,
    embeddings_indexed: 0,
    citations_indexed: 0,
    blockers: [],
  };

  const dsn = process.env.DATABASE_URL;
  if (!dsn) {
    out.blockers.push('DATABASE_URL is missing or test DB unavailable');
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 5_000,
    options: '-c client_encoding=UTF8',
  });
  try {
    await pool.query('SELECT 1');
    const approvedSources = await loadApprovedSources(pool);
    out.approved_sources = approvedSources.length;
    if (approvedSources.length === 0) {
      out.blockers.push('no approved sources exist');
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 1;
      return;
    }

    const quranSource = approvedSources.find((source) => source.source_reference === 'tanzil-quran-text');
    if (!quranSource) {
      out.blockers.push('approved Tanzil source not found');
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 1;
      return;
    }

    const quranJson = JSON.parse(await fs.readFile(QURAN_FILE, 'utf8'));
    const selected = selectStarterQuranContent(quranJson);
    if (selected.length === 0) {
      out.blockers.push('no starter Quran content selected');
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 1;
      return;
    }

    const embeddingsMode = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) AS has_vector
    `);
    const hasVector = Boolean(embeddingsMode.rows?.[0]?.has_vector);
    const embeddingModel = hasVector ? 'pgvector' : 'jsonb_embedding';
    const ingestionHash = sha256(JSON.stringify({
      source: quranSource.source_reference,
      selected: selected.map((item) => item.surah.id),
      generated_at: quranJson.generated_at || null,
    }));

    await pool.query('BEGIN');
    const jobRow = await pool.query(
      `
      INSERT INTO rag_ingestion_jobs (
        job_type, status, source_id, source_count, document_count, chunk_count,
        embedding_count, citation_count, blocker_reason, started_at, finished_at
      ) VALUES (
        'ingest_documents', 'running', $1, $2, 0, 0, 0, 0, NULL, NOW(), NULL
      )
      RETURNING id
      `,
      [quranSource.id, approvedSources.length],
    );
    const jobId = jobRow.rows[0].id;

    let documentCount = 0;
    let chunkCount = 0;
    let embeddingCount = 0;
    let citationCount = 0;

    for (const item of selected) {
      const docContentHash = sha256(JSON.stringify({
        surah_id: item.surah.id,
        title_ar: item.title_ar,
        title_en: item.title_en,
        ayah_numbers: item.ayahs.map((ayah) => ayah.ayah_number),
        source_reference: quranSource.source_reference,
      }));
      const docInsert = await pool.query(
        `
        INSERT INTO islamic_documents (
          source_id, title_ar, title_en, source_type, provider_name, official_url,
          local_reference, author_or_compiler, madhhab, language, licence_status,
          source_approved, approved_by, approved_by_user_id, approved_at,
          trust_level, authenticity_level, attribution_required,
          offline_storage_allowed, commercial_use_allowed, content_hash, version,
          notes, approval_status, effective_from, effective_to
        ) VALUES (
          $1, $2, $3, 'quran', $4, $5,
          $6, $7, NULL, 'ar', 'approved',
          TRUE, $8, NULL, NOW(),
          $9, $10, TRUE,
          TRUE, TRUE, $11, $12,
          $13, 'approved', NULL, NULL
        )
        ON CONFLICT (source_id, content_hash)
        DO UPDATE SET
          title_ar = EXCLUDED.title_ar,
          title_en = EXCLUDED.title_en,
          local_reference = EXCLUDED.local_reference,
          author_or_compiler = EXCLUDED.author_or_compiler,
          trust_level = EXCLUDED.trust_level,
          authenticity_level = EXCLUDED.authenticity_level,
          approved_by = EXCLUDED.approved_by,
          approved_at = EXCLUDED.approved_at,
          updated_at = NOW()
        RETURNING id
        `,
        [
          quranSource.id,
          item.title_ar,
          item.title_en,
          quranSource.provider_name || quranSource.provider_name || quranSource.source_name_en || 'Tanzil Project',
          quranSource.official_url || quranSource.source_url || quranSource.source_reference,
          `Quran ${item.surah.id}`,
          quranSource.author_or_compiler || 'Tanzil Project',
          quranSource.approved_by || 'rahma-source-review',
          quranSource.trust_level || 'canonical',
          quranSource.authenticity_level || 'high',
          docContentHash,
          quranJson.content_version || 'tanzil-starter',
          `Starter approved Quran document for Surah ${item.surah.id}.`,
        ],
      );
      const documentId = docInsert.rows[0].id;
      documentCount += 1;

      for (const ayah of item.ayahs) {
        const citationLabel = buildCitationLabel({
          titleAr: item.title_ar,
          surahNumber: item.surah.id,
          ayahNumber: ayah.ayah_number,
          sourceReference: `Quran ${item.surah.id}:${ayah.ayah_number}`,
        });
        const chunkContentHash = sha256(`${item.surah.id}:${ayah.ayah_number}:${ayah.text_uthmani}`);
        const embedding = createFallbackEmbedding(ayah.text_normalized || ayah.text_uthmani, 24);
        const chunkInsert = await pool.query(
          `
          INSERT INTO islamic_document_chunks (
            document_id, source_id, chunk_index, chunk_text, normalized_text,
            language, content_type, citation_label, local_reference, approved,
            approval_status, embedding_model, embedding_jsonb, metadata, content_hash
          ) VALUES (
            $1, $2, $3, $4, $5,
            'ar', 'quran', $6, $7, TRUE,
            'approved', $8, $9::jsonb, $10::jsonb, $11
          )
          ON CONFLICT (content_hash)
          DO UPDATE SET
            chunk_text = EXCLUDED.chunk_text,
            normalized_text = EXCLUDED.normalized_text,
            citation_label = EXCLUDED.citation_label,
            embedding_model = EXCLUDED.embedding_model,
            embedding_jsonb = EXCLUDED.embedding_jsonb,
            metadata = EXCLUDED.metadata,
            approved = TRUE,
            approval_status = 'approved',
            updated_at = NOW()
          RETURNING id
          `,
          [
            documentId,
            quranSource.id,
            Number(ayah.ayah_number),
            ayah.text_uthmani,
            ayah.text_normalized || normalizeTrustedText(ayah.text_uthmani),
            citationLabel,
            `Quran ${item.surah.id}:${ayah.ayah_number}`,
            embeddingModel,
            JSON.stringify(embedding),
            JSON.stringify({
              surah_id: item.surah.id,
              surah_name_ar: item.surah.name_ar,
              surah_name_en: item.surah.name_en,
              ayah_number: ayah.ayah_number,
              source_reference: quranSource.source_reference,
              source_approved: true,
            }),
            chunkContentHash,
          ],
        );
        const chunkId = chunkInsert.rows[0].id;
        chunkCount += 1;
        embeddingCount += 1;

        if (hasVector) {
          await pool.query(
            `UPDATE islamic_document_chunks
             SET embedding = $1::vector, embedding_model = $2
             WHERE id = $3`,
            [toVectorLiteral(embedding), embeddingModel, chunkId],
          );
        }

        await pool.query(
          `
          INSERT INTO citation_registry (
            source_id, document_id, chunk_id, citation_label, reference_label,
            source_title_ar, source_title_en, source_type, official_url, local_reference,
            approved, approval_status, content_hash
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, 'quran', $8, $9,
            TRUE, 'approved', $10
          )
          ON CONFLICT (chunk_id)
          DO UPDATE SET
            citation_label = EXCLUDED.citation_label,
            reference_label = EXCLUDED.reference_label,
            source_title_ar = EXCLUDED.source_title_ar,
            source_title_en = EXCLUDED.source_title_en,
            official_url = EXCLUDED.official_url,
            local_reference = EXCLUDED.local_reference,
            approved = TRUE,
            approval_status = 'approved',
            updated_at = NOW()
          `,
          [
            quranSource.id,
            documentId,
            chunkId,
            citationLabel,
            `Quran ${item.surah.id}:${ayah.ayah_number}`,
            item.title_ar,
            item.title_en,
            quranSource.official_url || quranSource.source_url || null,
            `Quran ${item.surah.id}:${ayah.ayah_number}`,
            chunkContentHash,
          ],
        );
        citationCount += 1;
      }
    }

    const internalSource = approvedSources.find((source) => source.source_reference === 'rahma-internal-reviewed-starter-qa');
    if (!internalSource) {
      throw new Error('approved internal starter Q&A source not found');
    }
    if (!isApprovedSource(internalSource)) {
      throw new Error('internal starter Q&A source is not approved');
    }
    const qaJson = JSON.parse(await fs.readFile(INTERNAL_QA_FILE, 'utf8'));
    for (const item of Array.isArray(qaJson.items) ? qaJson.items : []) {
      if (item.review_status !== 'approved') continue;
      const docContentHash = sha256(JSON.stringify({
        id: item.id,
        title_ar: item.title_ar,
        answer_ar: item.answer_ar,
        source_reference: internalSource.source_reference,
      }));
      const docInsert = await pool.query(
        `
        INSERT INTO islamic_documents (
          source_id, title_ar, title_en, source_type, provider_name, official_url,
          local_reference, author_or_compiler, madhhab, language, licence_status,
          source_approved, approved_by, approved_by_user_id, approved_at,
          trust_level, authenticity_level, attribution_required,
          offline_storage_allowed, commercial_use_allowed, content_hash, version,
          notes, approval_status, effective_from, effective_to
        ) VALUES (
          $1, $2, $3, $4, $5, NULL,
          $6, $7, NULL, 'ar', 'approved',
          TRUE, $8, NULL, NOW(),
          $9, $10, TRUE,
          TRUE, TRUE, $11, $12,
          $13, 'approved', NULL, NULL
        )
        ON CONFLICT (source_id, content_hash)
        DO UPDATE SET
          title_ar = EXCLUDED.title_ar,
          title_en = EXCLUDED.title_en,
          approved_by = EXCLUDED.approved_by,
          approved_at = EXCLUDED.approved_at,
          updated_at = NOW()
        RETURNING id
        `,
        [
          internalSource.id,
          item.title_ar,
          item.title_en,
          item.type === 'children' ? 'children' : 'article',
          internalSource.provider_name || 'Rahma Internal Scholarly Review',
          `internal-reviewed-starter-qa:${item.id}`,
          internalSource.author_or_compiler || 'Rahma Internal Scholarly Review',
          internalSource.approved_by || 'rahma-source-review',
          internalSource.trust_level || 'approved_starter',
          internalSource.authenticity_level || 'reviewed_internal_learning',
          docContentHash,
          qaJson.content_version || 'internal-reviewed-starter-qa',
          `Review-approved internal starter learning item ${item.id}.`,
        ],
      );
      const documentId = docInsert.rows[0].id;
      documentCount += 1;

      const chunkText = `${item.question_ar}\n${item.answer_ar}`;
      const citationLabel = item.reference_label;
      const chunkContentHash = sha256(`${item.id}:${chunkText}`);
      const embedding = createFallbackEmbedding(chunkText, 24);
      const chunkInsert = await pool.query(
        `
        INSERT INTO islamic_document_chunks (
          document_id, source_id, chunk_index, chunk_text, normalized_text,
          language, content_type, citation_label, local_reference, approved,
          approval_status, embedding_model, embedding_jsonb, metadata, content_hash
        ) VALUES (
          $1, $2, 0, $3, $4,
          'ar', $5, $6, $7, TRUE,
          'approved', $8, $9::jsonb, $10::jsonb, $11
        )
        ON CONFLICT (content_hash)
        DO UPDATE SET
          chunk_text = EXCLUDED.chunk_text,
          normalized_text = EXCLUDED.normalized_text,
          citation_label = EXCLUDED.citation_label,
          embedding_model = EXCLUDED.embedding_model,
          embedding_jsonb = EXCLUDED.embedding_jsonb,
          metadata = EXCLUDED.metadata,
          approved = TRUE,
          approval_status = 'approved',
          updated_at = NOW()
        RETURNING id
        `,
        [
          documentId,
          internalSource.id,
          chunkText,
          normalizeTrustedText(chunkText),
          item.type === 'children' ? 'children' : 'article',
          citationLabel,
          `internal-reviewed-starter-qa:${item.id}`,
          embeddingModel,
          JSON.stringify(embedding),
          JSON.stringify({
            item_id: item.id,
            question_ar: item.question_ar,
            source_reference: internalSource.source_reference,
            source_approved: true,
          }),
          chunkContentHash,
        ],
      );
      const chunkId = chunkInsert.rows[0].id;
      chunkCount += 1;
      embeddingCount += 1;

      if (hasVector) {
        await pool.query(
          `UPDATE islamic_document_chunks
           SET embedding = $1::vector, embedding_model = $2
           WHERE id = $3`,
          [toVectorLiteral(embedding), embeddingModel, chunkId],
        );
      }

      await pool.query(
        `
        INSERT INTO citation_registry (
          source_id, document_id, chunk_id, citation_label, reference_label,
          source_title_ar, source_title_en, source_type, official_url, local_reference,
          approved, approval_status, content_hash
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, NULL, $9,
          TRUE, 'approved', $10
        )
        ON CONFLICT (chunk_id)
        DO UPDATE SET
          citation_label = EXCLUDED.citation_label,
          reference_label = EXCLUDED.reference_label,
          source_title_ar = EXCLUDED.source_title_ar,
          source_title_en = EXCLUDED.source_title_en,
          local_reference = EXCLUDED.local_reference,
          approved = TRUE,
          approval_status = 'approved',
          updated_at = NOW()
        `,
        [
          internalSource.id,
          documentId,
          chunkId,
          citationLabel,
          citationLabel,
          item.title_ar,
          item.title_en,
          item.type === 'children' ? 'children' : 'article',
          `internal-reviewed-starter-qa:${item.id}`,
          chunkContentHash,
        ],
      );
      citationCount += 1;
    }

    if (hasVector) {
      const missing = await pool.query(`
        SELECT id, embedding_jsonb
        FROM islamic_document_chunks
        WHERE embedding IS NULL
          AND embedding_jsonb IS NOT NULL
          AND embedding_jsonb::text <> '[]'
      `);
      for (const row of missing.rows || []) {
        const values = Array.isArray(row.embedding_jsonb)
          ? row.embedding_jsonb
          : JSON.parse(row.embedding_jsonb || '[]');
        await pool.query(
          `UPDATE islamic_document_chunks
           SET embedding = $1::vector, embedding_model = $2
           WHERE id = $3`,
          [toVectorLiteral(values), embeddingModel, row.id],
        );
      }
    }

    await pool.query(
      `
      UPDATE rag_ingestion_jobs
      SET status = 'succeeded',
          document_count = $2,
          chunk_count = $3,
          embedding_count = $4,
          citation_count = $5,
          finished_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [jobId, documentCount, chunkCount, embeddingCount, citationCount],
    );

    await pool.query('COMMIT');
    out.ok = true;
    out.job_id = jobId;
    out.documents_indexed = documentCount;
    out.chunks_indexed = chunkCount;
    out.embeddings_indexed = embeddingCount;
    out.citations_indexed = citationCount;
    out.vector_available = hasVector;
    out.ingestion_hash = ingestionHash;
    console.log(JSON.stringify(out, null, 2));
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    out.blockers.push(String(error?.message || error));
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
