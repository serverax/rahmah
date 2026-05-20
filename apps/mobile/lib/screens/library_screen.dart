import 'package:flutter/material.dart';

import '../offline/local_content.dart';
import '../widgets/rahma_widgets.dart';

class IslamicLibraryScreen extends StatelessWidget {
  const IslamicLibraryScreen({super.key});

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'المكتبة الإسلامية',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            const RahmaPrayerHeroCard(
              title: 'مكتبة مختصرة موثوقة',
              subtitle:
                  'مقالات قصيرة محلية كمرحلة أولى، مع انتظار ربط مكتبة المصادر الكاملة.',
              nextPrayer: 'حالة',
              countdown: 'مختصرات محلية',
              trailing: Icon(
                Icons.local_library_rounded,
                color: RahmaColors.warmGold,
                size: 54,
              ),
            ),
            const SizedBox(height: 14),
            const RahmaOfflineBanner(
              message: 'المكتبة المحلية محدودة ولا تدعي اكتمال المصادر.',
            ),
            const RahmaSectionTitle('مقالات مختارة'),
            ...LocalContent.library.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Rahma3DCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Chip(label: Text(item.category)),
                      const SizedBox(height: 8),
                      Text(
                        item.title,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        item.summary,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      );
}
