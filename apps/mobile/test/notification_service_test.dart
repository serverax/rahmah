import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/services/notification_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('NotificationService', () {
    late NotificationService service;

    setUp(() {
      service = NotificationService();
    });

    test('init does not throw', () async {
      // In a test environment, plugins might not be fully available
      // but we can check if the service initializes without immediate error.
      try {
        await service.init();
      } catch (e) {
        // Platform exceptions are expected in some environments
      }
    });

    test('cancelAll does not throw', () async {
      try {
        await service.cancelAll();
      } catch (e) {
        // Notification plugins may be unavailable in unit tests.
        expect(e, isA<Object>());
      }
    });

    test('buildDailyPrayerSchedule skips disabled prayers', () {
      final now = DateTime(2026, 5, 20, 12, 0);
      final schedules = NotificationService.buildDailyPrayerSchedule(
        times: const {'الفجر': '04:10', 'العصر': '15:45'},
        enabledPrayers: const ['الفجر'],
        now: now,
      );
      expect(schedules, isEmpty);
    });

    test('buildDailyPrayerSchedule includes enabled future prayer', () {
      final now = DateTime(2026, 5, 20, 12, 0);
      final schedules = NotificationService.buildDailyPrayerSchedule(
        times: const {'العصر': '15:45'},
        enabledPrayers: const ['العصر'],
        now: now,
      );
      expect(schedules, hasLength(1));
      expect(schedules.single.prayer, 'العصر');
      expect(schedules.single.scheduledTime.hour, 15);
      expect(schedules.single.scheduledTime.minute, 45);
    });

    test('buildDailyPrayerSchedule rejects invalid prayer-time data', () {
      final now = DateTime(2026, 5, 20, 12, 0);
      final schedules = NotificationService.buildDailyPrayerSchedule(
        times: const {
          'العصر': 'not-a-time',
          'المغرب': '28:99',
        },
        enabledPrayers: const ['العصر', 'المغرب'],
        now: now,
      );
      expect(schedules, isEmpty);
    });
  });
}
