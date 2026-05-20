import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../offline/local_content.dart';
import '../services/location_service.dart';
import '../services/prayer_calculation_service.dart';
import '../widgets/rahma_widgets.dart';

class PrayerScreen extends StatefulWidget {
  const PrayerScreen({super.key});

  @override
  State<PrayerScreen> createState() => _PrayerScreenState();
}

class _PrayerScreenState extends State<PrayerScreen> {
  final _locationService = LocationService();
  final _calculation = PrayerCalculationService();
  LocationResult? _location;
  String _method = 'أم القرى';
  String _madhab = 'الشافعي/المالكي/الحنبلي';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final loc = await _locationService.getCurrentLocation();
    if (!mounted) return;
    setState(() {
      _location = loc;
      _method = prefs.getString('prayer_method') ?? _method;
      _madhab = prefs.getString('madhab') ?? _madhab;
    });
  }

  @override
  Widget build(BuildContext context) {
    final result = _location == null
        ? null
        : _calculation.calculate(
            date: DateTime.now(),
            location: PrayerLocation(
              latitude: _location!.latitude,
              longitude: _location!.longitude,
              timezoneOffsetHours: _location!.longitude == 0
                  ? 0
                  : DateTime.now().timeZoneOffset.inMinutes / 60,
            ),
            method: _method == 'أم القرى'
                ? PrayerCalculationMethod.ummAlQura
                : PrayerCalculationMethod.muslimWorldLeague,
            madhab:
                _madhab == 'الحنفي' ? MadhabRule.hanafi : MadhabRule.standard,
          );
    final nextPrayer = _nextPrayer(result?.timings ?? {});
    final countdown =
        result == null ? '...' : _countdownFor(result.timings, nextPrayer);

    return RahmaScaffold(
      title: 'الصلاة',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          RahmaPrayerHeroCard(
            title: 'أوقات الصلاة',
            subtitle:
                'حساب محلي دقيق قدر الإمكان، مع وضع واضح للموقع والمذهب وطريقة الحساب.',
            nextPrayer: nextPrayer,
            countdown: countdown,
            trailing: const Icon(
              Icons.schedule_rounded,
              color: RahmaColors.warmGold,
              size: 54,
            ),
          ),
          const SizedBox(height: 14),
          RahmaOfflineBanner(
            message: _location?.error == null
                ? 'الحساب يعمل محلياً.'
                : 'تم استخدام موقع محفوظ أو افتراضي: ${_location!.error}',
          ),
          const RahmaSectionTitle('اليوم'),
          Rahma3DCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RahmaStatusBadge(
                  label: _location?.source == 'gps'
                      ? 'GPS'
                      : _location?.source == 'manual'
                          ? 'موقع يدوي'
                          : _location?.source == 'stored'
                              ? 'موقع محفوظ'
                              : 'مكة افتراضياً',
                  icon: Icons.place_rounded,
                ),
                const SizedBox(height: 12),
                Text(
                  'طريقة الحساب: $_method',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'المذهب: $_madhab',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: (result?.timings.isEmpty ?? true)
                      ? LocalContent.prayerTimes.entries
                          .map((e) => Chip(label: Text('${e.key}  ${e.value}')))
                          .toList()
                      : result!.timings.entries
                          .map(
                            (e) => Chip(
                              label: Text(
                                '${_label(e.key)}  ${_timeText(e.value)}',
                              ),
                            ),
                          )
                          .toList(),
                ),
              ],
            ),
          ),
          const RahmaSectionTitle('الأذان'),
          const RahmaPremiumCard(
            child: Text(
              'اختبر إشعارات الأذان على جهاز فعلي بعد منح الإذن، ثم راقب السلوك في الخلفية والإغلاق والقفل وإعادة التشغيل.',
            ),
          ),
        ],
      ),
    );
  }

  String _nextPrayer(Map<String, DateTime> timings) {
    if (timings.isEmpty) return 'الفجر';
    final now = DateTime.now();
    for (final entry in timings.entries) {
      if (entry.value.isAfter(now)) return _label(entry.key);
    }
    return 'الفجر';
  }

  String _countdownFor(Map<String, DateTime> timings, String nextPrayer) {
    final target = timings.entries
        .firstWhere(
          (e) => _label(e.key) == nextPrayer,
          orElse: () => timings.entries.first,
        )
        .value;
    final diff = target.difference(DateTime.now());
    if (diff.isNegative) return 'قريباً';
    final hours = diff.inHours;
    final minutes = diff.inMinutes.remainder(60).toString().padLeft(2, '0');
    return '$hoursس $minutesد';
  }

  String _label(String key) => switch (key) {
        'fajr' => 'الفجر',
        'sunrise' => 'الشروق',
        'dhuhr' => 'الظهر',
        'asr' => 'العصر',
        'maghrib' => 'المغرب',
        'isha' => 'العشاء',
        _ => key,
      };

  String _timeText(DateTime value) =>
      '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
}
