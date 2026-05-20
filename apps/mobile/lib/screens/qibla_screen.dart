import 'package:flutter/material.dart';

import '../services/location_service.dart';
import '../services/prayer_calculation_service.dart';
import '../widgets/rahma_widgets.dart';

class QiblaScreen extends StatefulWidget {
  const QiblaScreen({super.key});

  @override
  State<QiblaScreen> createState() => _QiblaScreenState();
}

class _QiblaScreenState extends State<QiblaScreen> {
  final _locationService = LocationService();
  final _calculation = PrayerCalculationService();
  LocationResult? _location;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final loc = await _locationService.getCurrentLocation();
    if (mounted) setState(() => _location = loc);
  }

  @override
  Widget build(BuildContext context) {
    final qibla = _location == null
        ? 0.0
        : _calculation.qiblaDirection(
            _location!.latitude,
            _location!.longitude,
          );

    return RahmaScaffold(
      title: 'القبلة',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          RahmaPrayerHeroCard(
            title: 'اتجاه القبلة',
            subtitle:
                'واجهة بوصلة هادئة مع حساب محلي واتجاه واضح نحو الكعبة المشرفة.',
            nextPrayer: 'الاتجاه',
            countdown: '${qibla.toStringAsFixed(1)}°',
            trailing: const Icon(
              Icons.explore_rounded,
              color: RahmaColors.warmGold,
              size: 54,
            ),
          ),
          const SizedBox(height: 14),
          RahmaOfflineBanner(
            message: _location?.error == null
                ? 'الحساب محلي ويمكن استخدام الموقع اليدوي عند الحاجة.'
                : 'استخدم موقعاً محفوظاً أو افتراضياً: ${_location!.error}',
          ),
          const RahmaSectionTitle('البوصلة'),
          Rahma3DCard(
            child: Column(
              children: [
                Text(
                  'جاهزية الاتجاه',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 18),
                Transform.rotate(
                  angle: qibla * 3.141592653589793 / 180,
                  child: Container(
                    width: 180,
                    height: 180,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const RadialGradient(
                        colors: [
                          RahmaColors.nightSoft,
                          RahmaColors.deepEmerald,
                        ],
                      ),
                      border: Border.all(
                        color: RahmaColors.gold.withValues(alpha: 0.30),
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.24),
                          blurRadius: 24,
                          offset: const Offset(0, 12),
                        ),
                      ],
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 126,
                          height: 126,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color:
                                  RahmaColors.moonWhite.withValues(alpha: 0.18),
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.mosque_rounded,
                          color: RahmaColors.warmGold,
                          size: 42,
                        ),
                        Positioned(
                          top: 10,
                          child: Text(
                            'N',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  color: RahmaColors.gold,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                        ),
                        const PositionedDirectional(
                          bottom: 10,
                          child: Icon(
                            Icons.adjust_rounded,
                            color: RahmaColors.gold,
                            size: 20,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                RahmaStatusBadge(
                  label: '${qibla.toStringAsFixed(1)}°',
                  icon: Icons.explore_rounded,
                  backgroundColor: RahmaColors.gold.withValues(alpha: 0.16),
                  foregroundColor: RahmaColors.gold,
                ),
                const SizedBox(height: 12),
                Text(
                  _location?.source == 'gps'
                      ? 'موقع GPS'
                      : _location?.source == 'manual'
                          ? 'موقع يدوي'
                          : _location?.source == 'stored'
                              ? 'موقع محفوظ'
                              : 'مكة افتراضياً',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          const RahmaSectionTitle('الحالة'),
          const RahmaPremiumCard(
            child: Text(
              'القبلة محسوبة محلياً. تحذير: إذا تغير الموقع أو المنطقة الزمنية، أعد الحساب قبل الاعتماد النهائي.',
            ),
          ),
        ],
      ),
    );
  }
}
