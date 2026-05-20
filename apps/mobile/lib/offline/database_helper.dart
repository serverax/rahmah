import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Rahma local storage helper.
///
/// Versioned SQLite schema for offline Islamic content, local progress,
/// cached public answers, prayer/Hijri/Qibla cache, and sync metadata.
class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('rahma_local.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return openDatabase(
      path,
      version: 2,
      onCreate: _createDB,
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) await _createDB(db, newVersion);
      },
    );
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS content_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider_type TEXT NOT NULL,
        homepage_url TEXT,
        license_url TEXT,
        license_name TEXT,
        usage_notes TEXT NOT NULL DEFAULT '',
        attribution_required INTEGER NOT NULL DEFAULT 1,
        license_status TEXT NOT NULL DEFAULT 'needs_review',
        approved_for_offline_bundle INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS quran_surahs (
        id INTEGER PRIMARY KEY,
        name_ar TEXT NOT NULL,
        name_en TEXT,
        revelation_type TEXT,
        ayah_count INTEGER NOT NULL,
        source_id TEXT NOT NULL,
        source_approved INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS quran_ayahs (
        surah_id INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        juz_number INTEGER,
        text_uthmani TEXT NOT NULL,
        text_normalized TEXT,
        source_id TEXT NOT NULL,
        source_approved INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (surah_id, ayah_number)
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS quran_translations (
        id TEXT PRIMARY KEY,
        surah_id INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        language TEXT NOT NULL,
        translator TEXT NOT NULL,
        text TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_approved INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS tafsir_snippets (
        id TEXT PRIMARY KEY,
        surah_id INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        language TEXT NOT NULL DEFAULT 'ar',
        body TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_approved INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS quran_bookmarks (
        id TEXT PRIMARY KEY,
        surah_id INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS reading_progress (
        id TEXT PRIMARY KEY,
        surah_id INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS adhkar_categories (
        id TEXT PRIMARY KEY,
        title_ar TEXT NOT NULL,
        title_en TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS adhkar_entries (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        text_ar TEXT NOT NULL,
        text_en TEXT,
        repeat_count INTEGER NOT NULL DEFAULT 1,
        source_id TEXT NOT NULL,
        reference_label TEXT,
        source_approved INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS adhkar_favorites (
        entry_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS adhkar_counters (
        id TEXT PRIMARY KEY,
        label_ar TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS hadith_collections (
        id TEXT PRIMARY KEY,
        title_ar TEXT NOT NULL,
        title_en TEXT,
        source_id TEXT NOT NULL,
        license_status TEXT NOT NULL DEFAULT 'needs_review'
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS hadith_entries (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        chapter_ar TEXT,
        hadith_number TEXT,
        text_ar TEXT NOT NULL,
        text_en TEXT,
        grading TEXT,
        reference_label TEXT,
        source_id TEXT NOT NULL,
        source_approved INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS sheikh_questions (
        id TEXT PRIMARY KEY,
        question_ar TEXT NOT NULL,
        category_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL,
        synced_at TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_answers (
        answer_id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        title_ar TEXT NOT NULL,
        answer_ar TEXT NOT NULL,
        citation_status TEXT NOT NULL,
        cached_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS children_age_groups (
        id TEXT PRIMARY KEY,
        label_ar TEXT NOT NULL,
        min_age INTEGER NOT NULL,
        max_age INTEGER NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS children_games (
        id TEXT PRIMARY KEY,
        age_group_id TEXT NOT NULL,
        title_ar TEXT NOT NULL,
        prompt_ar TEXT NOT NULL,
        options_json TEXT NOT NULL,
        answer_index INTEGER NOT NULL,
        reward_points INTEGER NOT NULL DEFAULT 10,
        source_id TEXT,
        source_approved INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS game_progress (
        scenario_id TEXT PRIMARY KEY,
        completed INTEGER NOT NULL DEFAULT 0,
        score INTEGER NOT NULL DEFAULT 0,
        last_played_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS calculation_methods (
        id TEXT PRIMARY KEY,
        name_ar TEXT NOT NULL,
        params_json TEXT NOT NULL,
        source_id TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS madhab_rules (
        id TEXT PRIMARY KEY,
        name_ar TEXT NOT NULL,
        asr_shadow_factor REAL NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS prayer_cache (
        id TEXT PRIMARY KEY,
        date_iso TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        method_id TEXT NOT NULL,
        madhab_id TEXT NOT NULL,
        timings_json TEXT NOT NULL,
        calculated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS hijri_cache (
        gregorian_date TEXT PRIMARY KEY,
        hijri_date_ar TEXT NOT NULL,
        source_id TEXT,
        calculated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS qibla_cache (
        id TEXT PRIMARY KEY,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        bearing_degrees REAL NOT NULL,
        calculated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_api_payloads (
        cache_key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        source_id TEXT,
        fetched_at TEXT NOT NULL,
        expires_at TEXT,
        stale INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS refresh_metadata (
        module TEXT PRIMARY KEY,
        last_success_at TEXT,
        last_error_code TEXT,
        content_version TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_state (
        id TEXT PRIMARY KEY,
        module TEXT NOT NULL,
        status TEXT NOT NULL,
        pending_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_quran_ayahs_text_normalized ON quran_ayahs(text_normalized)',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_adhkar_entries_category ON adhkar_entries(category_id)',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_hadith_entries_collection ON hadith_entries(collection_id)',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_children_games_age ON children_games(age_group_id)',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_prayer_cache_lookup ON prayer_cache(date_iso, lat, lng, method_id, madhab_id)',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_cached_api_payloads_stale ON cached_api_payloads(stale, expires_at)',
    );

    // Legacy table retained for existing installations/tests.
    await db.execute('''
      CREATE TABLE IF NOT EXISTS offline_content (
        id TEXT PRIMARY KEY,
        title_ar TEXT NOT NULL,
        body_ar TEXT NOT NULL,
        source_type TEXT NOT NULL,
        citation_label_ar TEXT,
        last_synced_at TEXT NOT NULL
      )
    ''');
  }

  Future<void> close() async {
    final db = await instance.database;
    await db.close();
    _database = null;
  }
}
