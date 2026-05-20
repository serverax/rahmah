import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/offline/cache_policy.dart';
import 'package:rahma_mobile/offline/sync_status.dart';

void main() {
  test('CachePolicy blocks unapproved source rendering', () {
    final d = CachePolicy.evaluate(
      const CacheItem(
        key: 'quran/2:255',
        fetchedAtMs: 1,
        sourceApproved: false,
      ),
    );
    expect(d.allowRender, false);
    expect(d.reason, 'source_not_approved');
  });

  test('CachePolicy blocks stale cache', () {
    const now = 100 * 1000;
    final d = CachePolicy.evaluate(
      const CacheItem(key: 'x', fetchedAtMs: 0, sourceApproved: true),
      nowMs: now,
      ttlMs: 50,
    );
    expect(d.allowRender, false);
    expect(d.reason, 'cache_stale');
  });

  test('CachePolicy allows fresh approved-source render', () {
    final d = CachePolicy.evaluate(
      const CacheItem(key: 'x', fetchedAtMs: 1000, sourceApproved: true),
      nowMs: 1500,
      ttlMs: 10000,
    );
    expect(d.allowRender, true);
  });

  test('Donation actions are NEVER queueable offline', () {
    expect(isQueueableOffline('donation_intent'), false);
    expect(isQueueableOffline('donation_capture'), false);
    expect(isQueueableOffline('card_data'), false);
  });

  test('Question drafts and game progress ARE queueable offline', () {
    expect(isQueueableOffline('question_draft'), true);
    expect(isQueueableOffline('game_progress'), true);
  });

  test('Unknown kind is refused (default-deny)', () {
    expect(isQueueableOffline('unknown_kind'), false);
  });
}
