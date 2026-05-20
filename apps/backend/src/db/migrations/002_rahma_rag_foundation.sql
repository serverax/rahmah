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