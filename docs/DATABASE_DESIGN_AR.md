# تصميم قاعدة البيانات — islamic-ai-mobile-app

> صدقة جارية عن روح الوالد عبدالرازق الشافعي رحمه الله. نرجو منكم الدعاء له ولسائر موتى المسلمين.

## 1. نظرة عامة

ثلاث طبقات من البيانات:

1. **محلي على الجهاز** (SQLite / Hive / Isar): القرآن، الأذكار، التفسير، تفضيلات المستخدم، تقدم العبادة.
2. **خادمي** (PostgreSQL + pgvector): قاعدة المعرفة الشرعية للـRAG، سجلات بوابة الأسئلة.
3. **ملفات أصول** (CDN / تخزين الجهاز): تلاوات صوتية، حركات Rive.

كل البيانات الشخصية تبقى **محلية** افتراضياً. لا مزامنة سحابية بدون موافقة صريحة.

---

## 2. قاعدة بيانات الجهاز (Local)

### 2.1 جدول `quran`
| العمود | النوع | ملاحظات |
|---|---|---|
| `id` | INTEGER PK | |
| `surah` | INTEGER | 1..114 |
| `ayah` | INTEGER | |
| `text_uthmani` | TEXT | نص رسم عثماني |
| `juz` | INTEGER | |
| `page` | INTEGER | مصحف المدينة |

### 2.2 جدول `tafsir`
| العمود | النوع |
|---|---|
| `id` | INTEGER PK |
| `surah` | INTEGER |
| `ayah` | INTEGER |
| `tafsir_id` | TEXT |  (muyassar/saadi) |
| `text` | TEXT |

### 2.3 جدول `adhkar`
| العمود | النوع |
|---|---|
| `id` | INTEGER PK |
| `category` | TEXT | (morning/evening/sleep/wakeup/prayer/eating/travel) |
| `text` | TEXT |
| `count` | INTEGER |
| `source` | TEXT |
| `reference` | TEXT |

### 2.4 جدول `bookmarks`
| العمود | النوع |
|---|---|
| `id` | INTEGER PK |
| `kind` | TEXT | quran/adhkar |
| `target_id` | INTEGER |
| `note` | TEXT |
| `created_at` | INTEGER |

### 2.5 جدول `user_prefs`
| المفتاح | القيمة |
|---|---|
| `calc_method` | umm_al_qura / mwl / egypt / ... |
| `madhhab_asr` | shafii / hanafi |
| `adhan_voice` | id |
| `theme` | light / dark / auto |
| `font_size` | small / medium / large |
| `lite_3d` | bool |
| `notif_*` | bool per type |
| `city_manual` | string |

### 2.6 جدول `worship_progress`
| العمود | النوع |
|---|---|
| `id` | INTEGER PK |
| `date` | TEXT (ISO) |
| `goal_id` | TEXT |
| `value` | INTEGER |
| `completed` | INTEGER (bool) |

### 2.7 جدول `worship_goals`
| العمود | النوع |
|---|---|
| `id` | TEXT PK |
| `kind` | TEXT (prayer/quran/adhkar/fast/charity) |
| `target` | INTEGER |
| `frequency` | TEXT (daily/weekly) |
| `active` | INTEGER bool |

### 2.8 جدول `ramadan_log`
| العمود | النوع |
|---|---|
| `day` | INTEGER PK (1..30) |
| `fasted` | INTEGER bool |
| `quran_juz` | INTEGER |
| `taraweeh` | INTEGER bool |

### 2.9 جدول `notifications_schedule`
| العمود | النوع |
|---|---|
| `id` | INTEGER PK |
| `kind` | TEXT |
| `scheduled_at` | INTEGER (epoch) |
| `delivered` | INTEGER bool |

---

## 3. قاعدة البيانات الخادمية (Server)

### 3.1 جدول `knowledge_chunks`
| العمود | النوع |
|---|---|
| `id` | UUID PK |
| `source` | TEXT (bukhari/muslim/quran/...) |
| `book` | TEXT |
| `chapter` | TEXT |
| `number` | TEXT |
| `text_ar` | TEXT |
| `category` | TEXT (taharah/salah/sawm/...) |
| `embedding` | vector(768) |
| `license` | TEXT |
| `created_at` | TIMESTAMPTZ |

فهارس:
- HNSW على `embedding`.
- GIN على `text_ar` لبحث keyword عربي.
- B-tree على `category`.

### 3.2 جدول `ask_logs`
| العمود | النوع |
|---|---|
| `id` | UUID PK |
| `question_hash` | TEXT | SHA-256 |
| `category_detected` | TEXT |
| `in_scope` | BOOL |
| `retrieved_count` | INT |
| `confidence` | TEXT |
| `blocked` | BOOL |
| `created_at` | TIMESTAMPTZ |

**لا يُخزَّن نص السؤال الخام، ولا أي معرف للمستخدم.**

### 3.3 جدول `sources_catalog`
| العمود | النوع |
|---|---|
| `id` | TEXT PK |
| `display_title` | TEXT |
| `author` | TEXT |
| `license` | TEXT |
| `verified` | BOOL |

### 3.4 جدول `golden_questions`
| العمود | النوع |
|---|---|
| `id` | INT PK |
| `question` | TEXT |
| `expected_in_scope` | BOOL |
| `expected_category` | TEXT |
| `notes` | TEXT |

تستخدم لاختبارات بوابة السلامة.

---

## 4. مخطط Migration

- أداة: Alembic (Python) أو Prisma/TypeORM (TS).
- الترحيلات في `database/migrations/`.
- بذور البيانات في `database/seeds/` (مع نصوص أذكار/قرآن من مصادر موثقة).

## 5. خصوصية وأمن

- لا نخزّن: الاسم، البريد، الموقع الدقيق، نص الأسئلة الخام.
- جميع الاتصالات HTTPS.
- مفاتيح API الخادمية في متغيرات بيئة على المنصة فقط.
- النسخ الاحتياطي يستثني `ask_logs` أو يطمسها بعد 90 يوماً.

## 6. ملاحظة

أسماء الأعمدة الموضحة هنا أولية وقابلة للتحسين خلال السبرنتات 13-15.

