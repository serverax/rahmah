BEGIN;

ALTER TABLE content_sources
  ADD COLUMN IF NOT EXISTS licence_status TEXT;

UPDATE content_sources
SET licence_status = license_status
WHERE licence_status IS NULL
  AND license_status IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_content_sources_licence_status_alias()
RETURNS TRIGGER AS $$
BEGIN
  NEW.licence_status := NEW.license_status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_sources_licence_status_alias ON content_sources;
CREATE TRIGGER trg_content_sources_licence_status_alias
BEFORE INSERT OR UPDATE ON content_sources
FOR EACH ROW EXECUTE FUNCTION sync_content_sources_licence_status_alias();

COMMIT;
