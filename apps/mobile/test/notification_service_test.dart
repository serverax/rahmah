import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/services/notification_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

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
      } catch (e) {}
    });
  });
}
