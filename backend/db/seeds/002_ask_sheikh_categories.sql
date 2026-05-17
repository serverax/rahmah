-- Seed data for Ask Sheikh Hasan categories
INSERT INTO ask_sheikh_categories (slug, title_ar, title_en, sort_order) VALUES
('aqidah', 'العقيدة', 'Aqidah', 1),
('fiqh-ibadat', 'فقه العبادات', 'Fiqh of Worship', 2),
('family-matters', 'القضايا الأسرية', 'Family Matters', 3),
('ethics-morals', 'الأخلاق والآداب', 'Ethics and Morals', 4),
('contemporary-issues', 'قضايا معاصرة', 'Contemporary Issues', 5),
('general', 'عام', 'General', 100)
ON CONFLICT (slug) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  sort_order = EXCLUDED.sort_order;
