BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'islamic_document_chunks'
        AND column_name = 'embedding'
    ) THEN
      BEGIN
        ALTER TABLE islamic_document_chunks
          ALTER COLUMN embedding TYPE vector(24)
          USING CASE
            WHEN embedding IS NULL THEN NULL
            ELSE embedding::vector(24)
          END;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Rahma islamic_document_chunks.embedding dimension migration skipped: %', SQLERRM;
      END;

      BEGIN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_islamic_document_chunks_embedding_hnsw ON islamic_document_chunks USING hnsw (embedding vector_cosine_ops)';
      EXCEPTION
        WHEN OTHERS THEN
          BEGIN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_islamic_document_chunks_embedding_ivfflat ON islamic_document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
          EXCEPTION
            WHEN OTHERS THEN
              RAISE NOTICE 'Rahma islamic_document_chunks vector index could not be created.';
          END;
      END;
    END IF;
  END IF;
END
$$;

COMMIT;
