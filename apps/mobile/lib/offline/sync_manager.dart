import 'package:sqflite/sqflite.dart';
import '../api/rahma_api_client.dart';
import 'database_helper.dart';

/// Manages data synchronization between local SQLite and remote API.
class SyncManager {
  SyncManager({required RahmaApiClient apiClient}) : _api = apiClient;

  final RahmaApiClient _api;
  final _db = DatabaseHelper.instance;

  /// Sync all essential data modules.
  Future<void> syncAll() async {
    await syncOfflineContent();
    await syncPublicAnswers();
  }

  /// Fetch approved Islamic content and cache it locally.
  Future<void> syncOfflineContent() async {
    try {
      final res = await _api.contentSources();
      if (res['ok'] == true && res['items'] != null) {
        final items = res['items'] as List;
        final db = await _db.database;

        await db.transaction((txn) async {
          for (final item in items) {
            await txn.insert(
              'offline_content',
              {
                'id': item['id'],
                'title_ar': item['title_ar'],
                'body_ar': item['body_ar'],
                'source_type': item['source_type'],
                'citation_label_ar': item['citation_label_ar'],
                'last_synced_at': DateTime.now().toIso8601String(),
              },
              conflictAlgorithm: ConflictAlgorithm.replace,
            );
          }
        });
      }
    } catch (e) {
      // Sync failed: silent fallback to existing local data is expected behavior.
    }
  }

  /// Sync public answers from Sheikh Hasan.
  Future<void> syncPublicAnswers() async {
    try {
      final res = await _api.publicAnswers();
      if (res['ok'] == true && res['items'] != null) {
        final items = res['items'] as List;
        final db = await _db.database;

        await db.transaction((txn) async {
          for (final item in items) {
            await txn.insert(
              'cached_answers',
              {
                'answer_id': item['answer_id'],
                'slug': item['slug'],
                'title_ar': item['title_ar'],
                'answer_ar': item['answer_ar'],
                'citation_status': item['citation_status'],
                'cached_at': DateTime.now().toIso8601String(),
              },
              conflictAlgorithm: ConflictAlgorithm.replace,
            );
          }
        });
      }
    } catch (e) {
      // Ignore sync errors for offline mode.
    }
  }
}
