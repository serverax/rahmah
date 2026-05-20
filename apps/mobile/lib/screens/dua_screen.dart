import 'package:flutter/material.dart';

import '../offline/local_content.dart';
import '../widgets/rahma_widgets.dart';

class DuaScreen extends StatefulWidget {
  const DuaScreen({super.key});

  @override
  State<DuaScreen> createState() => _DuaScreenState();
}

class _DuaScreenState extends State<DuaScreen> {
  int _tasbeeh = 0;

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'الأذكار والدعاء',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            RahmaPrayerHeroCard(
              title: 'وردك اليومي قريب منك',
              subtitle:
                  'أذكار أساسية تعمل بدون اتصال، مع عداد تسبيح محلي وفئات واضحة.',
              nextPrayer: 'التسبيح',
              countdown: '$_tasbeeh مرة',
              trailing: const Icon(
                Icons.spa_rounded,
                color: RahmaColors.warmGold,
                size: 54,
              ),
            ),
            const SizedBox(height: 14),
            const RahmaOfflineBanner(),
            const RahmaSectionTitle('عداد التسبيح'),
            RahmaAdhkarCounter(
              label: 'سبحان الله',
              count: _tasbeeh,
              onIncrement: () => setState(() => _tasbeeh++),
              onReset: () => setState(() => _tasbeeh = 0),
            ),
            const RahmaSectionTitle('الأذكار'),
            ...LocalContent.adhkar.map(
              (cat) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: RahmaPremiumCard(
                  child: ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    childrenPadding: const EdgeInsets.only(top: 8),
                    leading:
                        Text(cat.icon, style: const TextStyle(fontSize: 26)),
                    title: Text(
                      cat.title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    subtitle: Text(cat.subtitle),
                    children: cat.items
                        .map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: Text(
                                item,
                                textDirection: TextDirection.rtl,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyLarge
                                    ?.copyWith(height: 1.7),
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
}
