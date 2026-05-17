import 'package:flutter/material.dart';

/// Reusable indicator for data synchronization and offline state.
///
/// Arabic labels:
///   - متصل (Online)
///   - غير متصل - بيانات مخزنة (Offline - Cached Data)
///   - جاري المزامنة... (Syncing...)
class SyncStatusIndicator extends StatelessWidget {
  const SyncStatusIndicator({
    super.key,
    required this.isOnline,
    required this.isSyncing,
  });

  final bool isOnline;
  final bool isSyncing;

  @override
  Widget build(BuildContext context) {
    if (isSyncing) {
      return const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 12,
            height: 12,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 8),
          Text(
            'جاري المزامنة...',
            style: TextStyle(fontSize: 12, color: Colors.blue),
          ),
        ],
      );
    }

    if (!isOnline) {
      return const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.offline_bolt, size: 16, color: Colors.orange),
          SizedBox(width: 4),
          Text(
            'غير متصل - بيانات مخزنة',
            style: TextStyle(fontSize: 12, color: Colors.orange),
          ),
        ],
      );
    }

    return const Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.check_circle, size: 16, color: Colors.green),
        SizedBox(width: 4),
        Text(
          'متصل',
          style: TextStyle(fontSize: 12, color: Colors.green),
        ),
      ],
    );
  }
}
