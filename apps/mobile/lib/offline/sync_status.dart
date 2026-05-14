/// Rahma mobile — offline-first sync status enum + helpers (pure).
library;

enum SyncStatus {
  /// API not configured at build time → no sync ever.
  apiNotConfigured,

  /// API configured but device is offline / unreachable.
  offline,

  /// Local draft / progress exists; awaiting sync.
  pendingSync,

  /// Last sync successful.
  synced,

  /// Last sync attempted and failed.
  syncFailed,
}

class OutboundQueueItem {
  const OutboundQueueItem({
    required this.kind,
    required this.payloadJson,
    required this.createdAtMs,
  });
  final String kind; // e.g. 'question_draft', 'game_progress'
  final String payloadJson;
  final int createdAtMs;
}

/// Hard rule: donation / payment actions are NEVER queued offline.
bool isQueueableOffline(String kind) {
  switch (kind) {
    case 'question_draft':
    case 'game_progress':
      return true;
    case 'donation_intent':
    case 'donation_capture':
    case 'card_data':
      return false;
    default:
      return false;
  }
}
