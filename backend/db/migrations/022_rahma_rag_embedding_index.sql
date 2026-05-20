BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rag_embeddings'
      AND column_name = 'embedding'
  ) THEN
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
END
$$;

COMMIT;
