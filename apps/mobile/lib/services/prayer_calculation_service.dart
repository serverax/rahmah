library;

import 'dart:math' as math;

class PrayerLocation {
  const PrayerLocation({
    required this.latitude,
    required this.longitude,
    this.timezoneOffsetHours = 0,
  });
  final double latitude;
  final double longitude;
  final double timezoneOffsetHours;
}

class PrayerCalculationMethod {
  const PrayerCalculationMethod({
    required this.id,
    required this.fajrAngle,
    required this.ishaAngle,
    this.ishaIntervalMinutes,
  });
  final String id;
  final double fajrAngle;
  final double ishaAngle;
  final int? ishaIntervalMinutes;

  static const muslimWorldLeague =
      PrayerCalculationMethod(id: 'mwl', fajrAngle: 18, ishaAngle: 17);
  static const ummAlQura = PrayerCalculationMethod(
    id: 'umm_al_qura',
    fajrAngle: 18.5,
    ishaAngle: 0,
    ishaIntervalMinutes: 90,
  );
}

class MadhabRule {
  const MadhabRule({required this.id, required this.asrShadowFactor});
  final String id;
  final double asrShadowFactor;

  static const standard = MadhabRule(id: 'standard', asrShadowFactor: 1);
  static const hanafi = MadhabRule(id: 'hanafi', asrShadowFactor: 2);
}

class PrayerTimesResult {
  const PrayerTimesResult({
    required this.timings,
    required this.qiblaDegrees,
    required this.calculatedAt,
  });
  final Map<String, DateTime> timings;
  final double qiblaDegrees;
  final DateTime calculatedAt;
}

class PrayerCalculationService {
  PrayerTimesResult calculate({
    required DateTime date,
    required PrayerLocation location,
    PrayerCalculationMethod method = PrayerCalculationMethod.muslimWorldLeague,
    MadhabRule madhab = MadhabRule.standard,
  }) {
    final day = _dayOfYear(date);
    final decl = _solarDeclination(day);
    final equation = _equationOfTime(day);
    final dhuhrHour = 12 +
        location.timezoneOffsetHours -
        location.longitude / 15 -
        equation / 60;
    final sunriseAngle = _hourAngle(location.latitude, decl, -0.833);
    final fajrAngle = _hourAngle(location.latitude, decl, -method.fajrAngle);
    final ishaAngle = method.ishaIntervalMinutes == null
        ? _hourAngle(location.latitude, decl, -method.ishaAngle)
        : 0.0;
    final asrAngle =
        _asrHourAngle(location.latitude, decl, madhab.asrShadowFactor);

    final fajr = dhuhrHour - fajrAngle / 15;
    final sunrise = dhuhrHour - sunriseAngle / 15;
    final dhuhr = dhuhrHour;
    final asr = dhuhrHour + asrAngle / 15;
    final maghrib = dhuhrHour + sunriseAngle / 15;
    final isha = method.ishaIntervalMinutes != null
        ? maghrib + method.ishaIntervalMinutes! / 60
        : dhuhrHour + ishaAngle / 15;

    return PrayerTimesResult(
      timings: {
        'fajr': _timeOnDate(date, fajr),
        'sunrise': _timeOnDate(date, sunrise),
        'dhuhr': _timeOnDate(date, dhuhr),
        'asr': _timeOnDate(date, asr),
        'maghrib': _timeOnDate(date, maghrib),
        'isha': _timeOnDate(date, isha),
      },
      qiblaDegrees: qiblaDirection(location.latitude, location.longitude),
      calculatedAt: DateTime.now(),
    );
  }

  bool isCacheFresh(
    DateTime calculatedAt, {
    Duration maxAge = const Duration(hours: 24),
  }) {
    return DateTime.now().difference(calculatedAt) <= maxAge;
  }

  double qiblaDirection(double lat, double lng) {
    const kaabaLat = 21.422487;
    const kaabaLng = 39.826206;
    final phi1 = _rad(lat);
    final phi2 = _rad(kaabaLat);
    final delta = _rad(kaabaLng - lng);
    final y = math.sin(delta);
    final x =
        math.cos(phi1) * math.tan(phi2) - math.sin(phi1) * math.cos(delta);
    return (_deg(math.atan2(y, x)) + 360) % 360;
  }

  String approximateHijriLabel(DateTime date) {
    // Deterministic civil-tabular approximation. Replace with reviewed library/WASM later.
    final jd = _julianDay(date.year, date.month, date.day);
    final islamic = ((30 * (jd - 1948439.5) + 10646) / 10631).floor();
    final startYear = _islamicToJd(islamic, 1, 1);
    final month = math.min(12, ((jd - (29 + startYear)) / 29.5) + 1).ceil();
    final day = (jd - _islamicToJd(islamic, month, 1) + 1).floor();
    return '$day/${month.toString().padLeft(2, '0')}/$islamic هـ';
  }

  int _dayOfYear(DateTime date) =>
      int.parse('${date.difference(DateTime(date.year, 1, 0)).inDays}');
  double _solarDeclination(int n) =>
      23.45 * math.sin(_rad(360 / 365 * (284 + n)));
  double _equationOfTime(int n) {
    final b = _rad(360 / 365 * (n - 81));
    return 9.87 * math.sin(2 * b) - 7.53 * math.cos(b) - 1.5 * math.sin(b);
  }

  double _hourAngle(double lat, double decl, double altitude) {
    final cosH = (math.sin(_rad(altitude)) -
            math.sin(_rad(lat)) * math.sin(_rad(decl))) /
        (math.cos(_rad(lat)) * math.cos(_rad(decl)));
    return _deg(math.acos(cosH.clamp(-1, 1)));
  }

  double _asrHourAngle(double lat, double decl, double factor) {
    final angle =
        _deg(math.atan(1 / (factor + math.tan((_rad(lat - decl)).abs()))));
    return _hourAngle(lat, decl, angle);
  }

  DateTime _timeOnDate(DateTime date, double hour) {
    final normalized = ((hour % 24) + 24) % 24;
    final h = normalized.floor();
    final mFloat = (normalized - h) * 60;
    final m = mFloat.floor();
    final s = ((mFloat - m) * 60).round();
    return DateTime(date.year, date.month, date.day, h, m, s);
  }

  double _julianDay(int y, int m, int d) {
    final a = ((14 - m) / 12).floor();
    final yy = y + 4800 - a;
    final mm = m + 12 * a - 3;
    return d +
        ((153 * mm + 2) / 5).floor() +
        365 * yy +
        (yy / 4).floor() -
        (yy / 100).floor() +
        (yy / 400).floor() -
        32045;
  }

  double _islamicToJd(int year, int month, int day) =>
      day +
      (29.5 * (month - 1)).ceil() +
      (year - 1) * 354 +
      ((3 + 11 * year) / 30).floor() +
      1948439.5 -
      1;
  double _rad(double deg) => deg * math.pi / 180;
  double _deg(double rad) => rad * 180 / math.pi;
}
