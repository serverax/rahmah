import 'package:flutter/material.dart';

import '../nav/sync_status_indicator.dart';
import '../offline/local_content.dart';
import '../services/location_service.dart';
import '../widgets/rahma_widgets.dart';

class _Tile {
  const _Tile(this.title, this.subtitle, this.route, this.icon);
  final String title;
  final String subtitle;
  final String route;
  final IconData icon;
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _locationService = LocationService();
  LocationResult? _currentLocation;

  static const _tiles = [
    _Tile(
      'اسأل الشيخ حسن',
      'احصل على إجابة موثقة بالمصادر',
      '/ask',
      Icons.forum_rounded,
    ),
    _Tile(
      'القرآن الكريم',
      'تلاوة وقراءة بتجربة مريحة',
      '/quran',
      Icons.menu_book_rounded,
    ),
    _Tile(
      'مصادر المحتوى',
      'مصادر موثوقة ومراجعة',
      '/sources',
      Icons.source_rounded,
    ),
    _Tile(
      'إجابات موثقة',
      'أسئلة وأجوبة مع المراجع',
      '/answers',
      Icons.fact_check_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _refreshLocation();
  }

  Future<void> _refreshLocation() async {
    final loc = await _locationService.getCurrentLocation();
    if (mounted) setState(() => _currentLocation = loc);
  }

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'رحمة',
        actions: const [
          Padding(
            padding: EdgeInsetsDirectional.only(end: 16),
            child: SyncStatusIndicator(isOnline: false, isSyncing: false),
          ),
        ],
        body: RefreshIndicator(
          onRefresh: _refreshLocation,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
            children: [
              const RahmaLuxuryIslamicHero(),
              const SizedBox(height: 14),
              const RahmaLuxuryPrayerCard(),
              const RahmaSectionTitle('إلهام اليوم'),
              const RahmaQuranAyahCard(
                ayah: LocalContent.dailyVerse,
                translation: LocalContent.dailyReminder,
                reference: 'آية اليوم',
              ),
              const RahmaSectionTitle('الصلاة والقبلة'),
              Rahma3DCard(
                gradient: LinearGradient(
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                  colors: [
                    RahmaColors.moonWhite.withValues(alpha: 0.12),
                    const Color(0xFF123B35).withValues(alpha: 0.88),
                    const Color(0xFF061615).withValues(alpha: 0.95),
                  ],
                ),
                borderColor: RahmaColors.gold.withValues(alpha: 0.38),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'الموقع: ${_sourceLabel(_currentLocation?.source)}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: RahmaColors.moonWhite,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: LocalContent.prayerTimes.entries
                          .map(
                            (e) => Chip(
                              backgroundColor:
                                  RahmaColors.gold.withValues(alpha: 0.16),
                              side: BorderSide(
                                color: RahmaColors.gold.withValues(alpha: 0.30),
                              ),
                              label: Text(
                                '${e.key}  ${e.value}',
                                style: const TextStyle(
                                  color: RahmaColors.moonWhite,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: RahmaPrimaryButton(
                            label: 'الصلاة',
                            icon: Icons.schedule_rounded,
                            onPressed: () =>
                                Navigator.pushNamed(context, '/prayer'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: RahmaPrimaryButton(
                            label: 'القبلة',
                            icon: Icons.explore_rounded,
                            onPressed: () =>
                                Navigator.pushNamed(context, '/qibla'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const RahmaSectionTitle('الاختصارات'),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.02,
                ),
                itemCount: _tiles.length,
                itemBuilder: (context, i) {
                  final t = _tiles[i];
                  return RahmaLuxuryFeatureCard(
                    key: ValueKey('home-card-${t.route}'),
                    onTap: () => Navigator.pushNamed(context, t.route),
                    title: t.title,
                    description: t.subtitle,
                    icon: t.icon,
                  );
                },
              ),
              const RahmaSectionTitle('سريع'),
              Row(
                children: [
                  Expanded(
                    child: RahmaAskSheikhCard(
                      status: 'المسودة فقط / المراجعة لاحقاً',
                      questionHint:
                          'اكتب سؤالاً واضحاً دون بيانات حساسة، وسيتم حفظه أو مراجعته.',
                      onTap: () => Navigator.pushNamed(context, '/ask'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: RahmaChildrenGameCard(
                      points: 30,
                      level: 'المستوى الأول',
                      onTap: () => Navigator.pushNamed(context, '/game'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );

  String _sourceLabel(String? source) => switch (source) {
        'gps' => 'GPS',
        'manual' => 'موقع يدوي',
        'stored' => 'موقع محفوظ',
        'fallback' => 'مكة المكرمة افتراضياً',
        _ => 'غير محدد',
      };
}
