import 'package:flutter/material.dart';

import '../offline/local_content.dart';
import '../widgets/rahma_widgets.dart';
import 'quran_reader_screen.dart';

class QuranScreen extends StatefulWidget {
  const QuranScreen({super.key});

  @override
  State<QuranScreen> createState() => _QuranScreenState();
}

class _QuranScreenState extends State<QuranScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = LocalContent.surahs.where((s) {
      final q = _searchController.text.trim();
      if (q.isEmpty) return true;
      return s.nameAr.contains(q) ||
          s.nameEn.toLowerCase().contains(q.toLowerCase());
    }).toList();

    return RahmaScaffold(
      title: 'القرآن الكريم',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          const RahmaOfflineBanner(
            message:
                'نص القرآن المحلي محروس بالأصول المعتمدة، ولا نغير النص العربي.',
          ),
          const SizedBox(height: 14),
          const RahmaPrayerHeroCard(
            title: 'قراءة هادئة للقرآن',
            subtitle:
                'مصحف محلي، بحث سريع، وحفظ متابعة القراءة في واجهة عربية واضحة.',
            nextPrayer: 'متابعة',
            countdown: 'الفاتحة',
            trailing: Icon(
              Icons.menu_book_rounded,
              color: RahmaColors.warmGold,
              size: 54,
            ),
          ),
          const RahmaSectionTitle('آية اليوم'),
          const RahmaQuranAyahCard(
            ayah: LocalContent.dailyVerse,
            translation: LocalContent.dailyReminder,
            reference: 'مصدر محلي / محفوظ',
          ),
          const RahmaSectionTitle('بحث'),
          TextField(
            controller: _searchController,
            onChanged: (_) => setState(() {}),
            textDirection: TextDirection.rtl,
            decoration: const InputDecoration(
              labelText: 'ابحث في السور',
              prefixIcon: Icon(Icons.search_rounded),
            ),
          ),
          const RahmaSectionTitle('متابعة القراءة'),
          RahmaPremiumCard(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    const QuranReaderScreen(surahId: 1, surahName: 'الفاتحة'),
              ),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  backgroundColor: RahmaColors.gold,
                  child: Text('1'),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الفاتحة',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'حفظ الموضع، الكتب المرجعية، والقراءة الهادئة.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_left),
              ],
            ),
          ),
          const RahmaSectionTitle('السور'),
          ...filtered.map(
            (s) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Rahma3DCard(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        QuranReaderScreen(surahId: s.id, surahName: s.nameAr),
                  ),
                ),
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: RahmaColors.gold.withValues(alpha: 0.18),
                      child: Text('${s.id}'),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            s.nameAr,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${s.nameEn} • ${s.type} • ${s.ayahCount} آية',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_left),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
