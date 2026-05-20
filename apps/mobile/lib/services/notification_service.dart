import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest_all.dart' as tz;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    tz.initializeTimeZones();

    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initializationSettings =
        InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _notificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (details) {
        // Handle notification tap
      },
    );
  }

  Future<bool> requestPermissions() async {
    final androidPlugin =
        _notificationsPlugin.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    final androidNotificationsAllowed =
        await androidPlugin?.requestNotificationsPermission();
    final androidExactAlarmAllowed =
        await androidPlugin?.requestExactAlarmsPermission();

    if (androidNotificationsAllowed != null ||
        androidExactAlarmAllowed != null) {
      return androidNotificationsAllowed != false &&
          androidExactAlarmAllowed != false;
    }

    final iosResult = await _notificationsPlugin
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        );
    return iosResult ?? false;
  }

  Future<void> scheduleAzan(
    int id,
    String title,
    String body,
    DateTime scheduledDate,
    String soundFile,
  ) async {
    await _notificationsPlugin.zonedSchedule(
      id,
      title,
      body,
      tz.TZDateTime.from(scheduledDate, tz.local),
      NotificationDetails(
        android: AndroidNotificationDetails(
          'azan_alerts',
          'تنبيهات الأذان',
          channelDescription: 'تنبيهات أوقات الصلاة',
          importance: Importance.max,
          priority: Priority.high,
          sound:
              RawResourceAndroidNotificationSound(soundFile.split('.').first),
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
          sound: soundFile,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  Future<void> cancelAll() async {
    await _notificationsPlugin.cancelAll();
  }

  Future<void> scheduleDailyPrayerTimes(
    Map<String, dynamic> times,
    List<String> enabledPrayers,
    String selectedAzanFile,
  ) async {
    await cancelAll();

    final now = DateTime.now();

    for (final entry in buildDailyPrayerSchedule(
      times: times,
      enabledPrayers: enabledPrayers,
      now: now,
    )) {
      await scheduleAzan(
        entry.prayer.hashCode,
        'أذان ${entry.prayer}',
        'حان الآن موعد صلاة ${entry.prayer}',
        entry.scheduledTime,
        selectedAzanFile,
      );
    }
  }

  static DateTime? parsePrayerTimeForToday(String? timeStr, DateTime now) {
    if (timeStr == null) return null;
    final match = RegExp(r'^([01]?\d|2[0-3]):([0-5]\d)$').firstMatch(timeStr);
    if (match == null) return null;
    final hour = int.parse(match.group(1)!);
    final minute = int.parse(match.group(2)!);
    return DateTime(now.year, now.month, now.day, hour, minute);
  }

  static List<PrayerNotificationSchedule> buildDailyPrayerSchedule({
    required Map<String, dynamic> times,
    required List<String> enabledPrayers,
    required DateTime now,
  }) {
    final schedules = <PrayerNotificationSchedule>[];
    for (final prayer in enabledPrayers) {
      final value = times[prayer];
      final scheduledTime = parsePrayerTimeForToday(value?.toString(), now);
      if (scheduledTime == null || !scheduledTime.isAfter(now)) continue;
      schedules.add(
        PrayerNotificationSchedule(
          prayer: prayer,
          scheduledTime: scheduledTime,
        ),
      );
    }
    return schedules;
  }
}

class PrayerNotificationSchedule {
  const PrayerNotificationSchedule({
    required this.prayer,
    required this.scheduledTime,
  });

  final String prayer;
  final DateTime scheduledTime;
}
