BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    BEGIN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS vector';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Rahma vector extension could not be created.';
    END;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'rag_embeddings'
        AND column_name = 'embedding'
    ) THEN
      BEGIN
        ALTER TABLE rag_embeddings
          ALTER COLUMN embedding TYPE vector(24)
          USING CASE
            WHEN embedding IS NULL THEN NULL
            ELSE embedding::vector(24)
          END;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Rahma rag_embeddings.embedding dimension migration skipped.';
      END;

      BEGIN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rag_embeddings_embedding_hnsw ON rag_embeddings USING hnsw (embedding vector_cosine_ops)';
      EXCEPTION
        WHEN OTHERS THEN
          BEGIN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rag_embeddings_embedding_ivfflat ON rag_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
          EXCEPTION
            WHEN OTHERS THEN
              RAISE NOTICE 'Rahma RAG embedding index could not be created with either HNSW or IVFFlat.';
          END;
      END;
    END IF;
  ELSE
    RAISE NOTICE 'Rahma vector extension unavailable — embedding dimension migration deferred.';
  END IF;
END
$$;

COMMIT;
