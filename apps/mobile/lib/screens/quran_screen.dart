import 'package:flutter/material.dart';
import '../nav/sync_status_indicator.dart';
import '../config.dart';

class QuranScreen extends StatelessWidget {
  const QuranScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('القرآن الكريم'),
          actions: const [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SyncStatusIndicator(isOnline: true, isSyncing: false),
            ),
          ],
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              RahmaConfig.isApiConfigured
                  ? 'القرآن غير متاح بعد — لم يتم اعتماد المصادر.'
                  : 'الخدمة غير مهيأة بعد. لم يتم تكوين عنوان واجهة الـ API.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ),
      );
}
