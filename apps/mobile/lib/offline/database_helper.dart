import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Rahma local storage helper.
///
/// Manages the SQLite database for offline content, user progress, and
/// synced citations.
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

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // 1. Offline Islamic Content (cached from RAG/Library)
    await db.execute('''
      CREATE TABLE offline_content (
        id TEXT PRIMARY KEY,
        title_ar TEXT NOT NULL,
        body_ar TEXT NOT NULL,
        source_type TEXT NOT NULL,
        citation_label_ar TEXT,
        last_synced_at TEXT NOT NULL
      )
    ''');

    // 2. User Game Progress (persisted locally, synced optionally)
    await db.execute('''
      CREATE TABLE game_progress (
        scenario_id TEXT PRIMARY KEY,
        completed INTEGER NOT NULL DEFAULT 0,
        score INTEGER NOT NULL DEFAULT 0,
        last_played_at TEXT NOT NULL
      )
    ''');

    // 3. Cached Public QA (Sheikh Hasan answers)
    await db.execute('''
      CREATE TABLE cached_answers (
        answer_id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        title_ar TEXT NOT NULL,
        answer_ar TEXT NOT NULL,
        citation_status TEXT NOT NULL,
        cached_at TEXT NOT NULL
      )
    ''');
  }

  Future<void> close() async {
    final db = await instance.database;
    db.close();
  }
}
