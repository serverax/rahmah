import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/services/prayer_calculation_service.dart';

void main() {
  test('calculates deterministic prayer times offline for location', () {
    final service = PrayerCalculationService();
    final result = service.calculate(
      date: DateTime(2026, 5, 18),
      location: const PrayerLocation(
        latitude: 21.4225,
        longitude: 39.8262,
        timezoneOffsetHours: 3,
      ),
    );
    expect(
      result.timings.keys,
      containsAll(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']),
    );
    expect(result.timings['fajr']!.isBefore(result.timings['sunrise']!), true);
    expect(result.timings['sunrise']!.isBefore(result.timings['dhuhr']!), true);
    expect(result.timings['dhuhr']!.isBefore(result.timings['asr']!), true);
    expect(result.timings['asr']!.isBefore(result.timings['maghrib']!), true);
  });

  test('madhab rule changes asr calculation', () {
    final service = PrayerCalculationService();
    final date = DateTime(2026, 5, 18);
    const loc = PrayerLocation(
      latitude: 51.5074,
      longitude: -0.1278,
      timezoneOffsetHours: 1,
    );
    final standard = service.calculate(
      date: date,
      location: loc,
      madhab: MadhabRule.standard,
    );
    final hanafi =
        service.calculate(date: date, location: loc, madhab: MadhabRule.hanafi);
    expect(hanafi.timings['asr']!.isAfter(standard.timings['asr']!), true);
  });

  test('qibla calculation is deterministic', () {
    final service = PrayerCalculationService();
    final london = service.qiblaDirection(51.5074, -0.1278);
    expect(london, greaterThan(110));
    expect(london, lessThan(130));
  });

  test('cache freshness reports stale and fresh states', () {
    final service = PrayerCalculationService();
    expect(
      service.isCacheFresh(DateTime.now().subtract(const Duration(hours: 1))),
      true,
    );
    expect(
      service.isCacheFresh(DateTime.now().subtract(const Duration(days: 2))),
      false,
    );
  });

  test('hijri label is available offline', () {
    final service = PrayerCalculationService();
    expect(
      service.approximateHijriLabel(DateTime(2026, 5, 18)),
      contains('هـ'),
    );
  });
}
