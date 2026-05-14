/// Rahma mobile — offline-first cache policy (pure).
///
/// No I/O. The host (storage layer) calls these helpers to decide
/// whether a cached record may still be rendered, or whether the
/// network must be hit first.
///
/// Hard rules:
///   - The mobile app NEVER renders Quran / Hadith / Dua content from a
///     cached record whose `source_approved` flag is missing or false.
///   - Donations / payment actions are NEVER queued offline.
///   - Questions to Sheikh Hasan can be queued as a draft; sending
///     happens only when the API is configured AND reachable.
library;

class CacheItem {
  const CacheItem({
    required this.key,
    required this.fetchedAtMs,
    required this.sourceApproved,
  });
  final String key;
  final int fetchedAtMs;
  final bool sourceApproved;
}

class CacheDecision {
  const CacheDecision({required this.allowRender, required this.reason});
  final bool allowRender;
  final String reason;

  bool get blocked => !allowRender;
}

class CachePolicy {
  /// Default TTL — 24 hours.
  static const int defaultTtlMs = 24 * 60 * 60 * 1000;

  static CacheDecision evaluate(
    CacheItem item, {
    int nowMs = 0,
    int ttlMs = defaultTtlMs,
  }) {
    final now = nowMs > 0 ? nowMs : DateTime.now().millisecondsSinceEpoch;
    if (!item.sourceApproved) {
      return const CacheDecision(allowRender: false, reason: 'source_not_approved');
    }
    final age = now - item.fetchedAtMs;
    if (age > ttlMs) {
      return const CacheDecision(allowRender: false, reason: 'cache_stale');
    }
    return const CacheDecision(allowRender: true, reason: 'fresh');
  }
}
