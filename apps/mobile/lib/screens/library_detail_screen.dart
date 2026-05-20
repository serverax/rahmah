import 'package:flutter/material.dart';

import '../offline/local_content.dart';
import '../widgets/rahma_widgets.dart';

class LibraryDetailScreen extends StatelessWidget {
  const LibraryDetailScreen({super.key, required this.itemId});
  final dynamic itemId;

  @override
  Widget build(BuildContext context) {
    final index = itemId is int
        ? (itemId as int).clamp(0, LocalContent.library.length - 1)
        : 0;
    final item = LocalContent.library[index];
    return RahmaScaffold(
      title: 'تفاصيل المحتوى',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          const RahmaOfflineBanner(
            message:
                'تفاصيل محلية مختصرة. المصادر الكاملة ستظهر بعد تفعيل المكتبة المعتمدة.',
          ),
          const SizedBox(height: 14),
          Rahma3DCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Chip(label: Text(item.category)),
                const SizedBox(height: 10),
                Text(
                  item.title,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const Divider(height: 28),
                Text(
                  item.summary,
                  textDirection: TextDirection.rtl,
                  style: Theme.of(context)
                      .textTheme
                      .bodyLarge
                      ?.copyWith(height: 1.8),
                ),
                const SizedBox(height: 20),
                const RahmaStatusBadge(
                  label: 'تنبيه: هذا ملخص تعليمي محلي وليس فتوى شخصية.',
                  icon: Icons.info_outline,
                  foregroundColor: RahmaColors.amber,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
