// Single source of truth for what the assistant may answer.
// Mirrors docs/AI_FATWA_SAFETY_POLICY_AR.md and the seed in
// backend/db/seeds/001_ibadat_categories.sql.

export const ALLOWED_CATEGORIES = Object.freeze({
  taharah: 'طهارة',
  salah:   'صلاة',
  sawm:    'صيام',
  zakat:   'زكاة',
  hajj:    'حج',
  umrah:   'عمرة',
  adhkar:  'أذكار',
  quran:   'قرآن',
  nawafil: 'نوافل',
  ramadan: 'رمضان',
});

// Arabic surface forms that hint at each category. NOT a fatwa rulebook —
// just a coarse routing signal. The real classifier in Sprint 15 will be
// a model + rules. For now, presence of any of these keywords in a
// question is the only path into the "in-scope" branch.
export const CATEGORY_KEYWORDS = Object.freeze({
  taharah: ['طهارة', 'وضوء', 'الوضوء', 'غسل', 'الغسل', 'تيمم', 'التيمم', 'نواقض'],
  salah:   ['صلاة', 'الصلاة', 'صلاه', 'الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء', 'الجمعة', 'الوتر'],
  sawm:    ['صيام', 'الصيام', 'صوم', 'إفطار', 'الإفطار', 'سحور', 'السحور', 'مفطر'],
  zakat:   ['زكاة', 'الزكاة', 'نصاب', 'النصاب', 'حول'],
  hajj:    ['حج', 'الحج', 'الإحرام', 'طواف', 'الطواف', 'سعي', 'السعي', 'منى', 'عرفة', 'مزدلفة'],
  umrah:   ['عمرة', 'العمرة'],
  adhkar:  ['ذكر', 'أذكار', 'الأذكار', 'تسبيح', 'تحميد', 'استغفار', 'الاستغفار'],
  quran:   ['قرآن', 'القرآن', 'تجويد', 'التجويد', 'تلاوة', 'التلاوة', 'حفظ', 'سورة', 'آية'],
  nawafil: ['نافلة', 'نوافل', 'سنة', 'سنن', 'راتبة', 'الرواتب', 'تهجد', 'التهجد', 'قيام الليل'],
  ramadan: ['رمضان', 'تراويح', 'التراويح', 'إمساكية', 'الإمساكية', 'ليلة القدر'],
});
