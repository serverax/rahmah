BEGIN;

ALTER TABLE content_sources
  ADD COLUMN IF NOT EXISTS source_id TEXT;

UPDATE content_sources
SET source_id = source_reference
WHERE source_id IS NULL
  AND source_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_sources_source_id
  ON content_sources (source_id)
  WHERE source_id IS NOT NULL;

COMMIT;
