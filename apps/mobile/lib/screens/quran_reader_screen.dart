import 'package:flutter/material.dart';

import '../offline/local_content.dart';
import '../widgets/rahma_widgets.dart';

class QuranReaderScreen extends StatelessWidget {
  const QuranReaderScreen({
    super.key,
    required this.surahId,
    required this.surahName,
  });

  final int surahId;
  final String surahName;

  @override
  Widget build(BuildContext context) {
    final surah = LocalContent.surahs.firstWhere(
      (s) => s.id == surahId,
      orElse: () => LocalContent.surahs.first,
    );
    final ayahs = surah.ayahs.isNotEmpty
        ? surah.ayahs
        : const [
            'هذه السورة غير مخزنة بالكامل في النسخة المحلية الحالية.',
            'سيظهر النص الكامل بعد تفعيل قاعدة القرآن المحلية الكاملة أو الاتصال بالخادم.',
          ];

    return RahmaScaffold(
      title: surahName,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          const RahmaOfflineBanner(
            message: 'النص العربي للقرآن لا يُحوّر ولا يُعاد صياغته.',
          ),
          const SizedBox(height: 14),
          RahmaPrayerHeroCard(
            title: surah.nameAr,
            subtitle:
                '${surah.nameEn} • ${surah.type} • ${surah.ayahCount} آية',
            nextPrayer: 'النص',
            countdown: 'مصحف محلي',
            trailing: const Icon(
              Icons.bookmark_border,
              color: RahmaColors.warmGold,
              size: 48,
            ),
          ),
          const RahmaSectionTitle('النص'),
          Rahma3DCard(
            child: Column(
              children: [
                for (var i = 0; i < ayahs.length; i++) ...[
                  Text(
                    ayahs[i],
                    textAlign: TextAlign.center,
                    textDirection: TextDirection.rtl,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          height: 2.0,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '﴿${i + 1}﴾',
                    style: const TextStyle(
                      color: RahmaColors.gold,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (i != ayahs.length - 1) const Divider(height: 28),
                ],
              ],
            ),
          ),
          const RahmaSectionTitle('أدوات القراءة'),
          const Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              Chip(
                avatar: Icon(Icons.text_fields, size: 18),
                label: Text('حجم الخط'),
              ),
              Chip(
                avatar: Icon(Icons.volume_up, size: 18),
                label: Text('التلاوة لاحقاً'),
              ),
              Chip(
                avatar: Icon(Icons.bookmark, size: 18),
                label: Text('حفظ الموضع'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
