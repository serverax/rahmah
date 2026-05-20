import 'package:flutter/material.dart';

import '../config.dart';
import '../offline/local_content.dart';
import '../widgets/rahma_service_unavailable_pill.dart';
import '../widgets/rahma_widgets.dart';

class SourcesScreen extends StatelessWidget {
  const SourcesScreen({super.key});

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'مصادر المحتوى',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            if (!RahmaConfig.isApiConfigured)
              const RahmaServiceUnavailablePill(),
            const RahmaOfflineBanner(
              message:
                  'المصادر المحلية للعرض الآمن حتى يكتمل ربط المكتبة الكاملة.',
            ),
            const RahmaSectionTitle('مصادر معتمدة'),
            ...LocalContent.approvedSources.map(
              (source) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Rahma3DCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        source.nameAr,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        source.reference,
                        style: Theme.of(context).textTheme.bodySmall,
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
