-- =============================================================================
-- Seed: allowed ibadat categories (10 only)
-- Run AFTER 001_sakina_foundation.sql.
-- Idempotent via ON CONFLICT (slug) DO NOTHING.
-- =============================================================================

BEGIN;

INSERT INTO ibadat_categories (slug, name_ar, allowed) VALUES
  ('taharah', 'طهارة',  TRUE),
  ('salah',   'صلاة',   TRUE),
  ('sawm',    'صيام',   TRUE),
  ('zakat',   'زكاة',   TRUE),
  ('hajj',    'حج',     TRUE),
  ('umrah',   'عمرة',   TRUE),
  ('adhkar',  'أذكار',  TRUE),
  ('quran',   'قرآن',   TRUE),
  ('nawafil', 'نوافل',  TRUE),
  ('ramadan', 'رمضان',  TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Default dua_messages (banner + full settings dua). Wording matches docs.
INSERT INTO dua_messages (slug, kind, text_ar, active) VALUES
  ('sadaqah_banner',
   'banner',
   'صدقة جارية عن روح الوالد عبدالرازق الشافعي رحمه الله. نرجو منكم الدعاء له ولسائر موتى المسلمين.',
   TRUE),
  ('sadaqah_full',
   'full',
   'اللهم اغفر للوالد عبدالرازق الشافعي وارحمه وعافه واعف عنه، وأكرم نزله ووسع مدخله، واجعل قبره روضة من رياض الجنة، واجعل هذا العمل صدقة جارية له، ولجميع موتى المسلمين.',
   TRUE)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
