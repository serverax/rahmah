import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocationResult {
  LocationResult({
    required this.latitude,
    required this.longitude,
    required this.source,
    this.error,
  });

  final double latitude;
  final double longitude;
  final String source; // 'gps', 'manual', 'stored', 'fallback'
  final String? error;
}

class LocationService {
  static const String _latKey = 'rahma_lat';
  static const String _lngKey = 'rahma_lng';
  static const String _sourceKey = 'rahma_location_source';

  // Makkah fallback
  static const double fallbackLat = 21.4225;
  static const double fallbackLng = 39.8262;

  Future<LocationResult> getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Check if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return _getStoredOrFallback('Location services are disabled.');
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return _getStoredOrFallback('Location permissions are denied');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return _getStoredOrFallback(
        'Location permissions are permanently denied',
      );
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.low),
      );
      await saveLocation(position.latitude, position.longitude, 'gps');
      return LocationResult(
        latitude: position.latitude,
        longitude: position.longitude,
        source: 'gps',
      );
    } catch (e) {
      return _getStoredOrFallback('GPS error: $e');
    }
  }

  Future<void> saveLocation(double lat, double lng, String source) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_latKey, lat);
    await prefs.setDouble(_lngKey, lng);
    await prefs.setString(_sourceKey, source);
  }

  Future<LocationResult> _getStoredOrFallback(String? error) async {
    final prefs = await SharedPreferences.getInstance();
    final lat = prefs.getDouble(_latKey);
    final lng = prefs.getDouble(_lngKey);
    final source = prefs.getString(_sourceKey);

    if (lat != null && lng != null) {
      return LocationResult(
        latitude: lat,
        longitude: lng,
        source: source ?? 'stored',
        error: error,
      );
    }

    return LocationResult(
      latitude: fallbackLat,
      longitude: fallbackLng,
      source: 'fallback',
      error: error,
    );
  }
}
