import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'rahma_api_client.dart';

/// Manages unique device identification and registration.
class DeviceManager {
  DeviceManager({required RahmaApiClient apiClient}) : _api = apiClient;

  final RahmaApiClient _api;
  final _deviceInfo = DeviceInfoPlugin();

  /// Register this device with the Rahma backend.
  Future<void> registerDevice() async {
    final payload = await _getDevicePayload();
    
    try {
      final res = await _api.postJson('/api/device/register', payload);
      if (res['ok'] != true) {
        debugPrint('Device registration failed: ${res['error']}');
      }
    } catch (e) {
      debugPrint('Device registration error: $e');
    }
  }

  Future<Map<String, dynamic>> _getDevicePayload() async {
    String platform = 'unknown';
    String deviceId = 'unknown';
    String model = 'unknown';
    String version = 'unknown';

    if (kIsWeb) {
      platform = 'web';
      final web = await _deviceInfo.webBrowserInfo;
      deviceId = web.userAgent ?? 'web-user-agent';
      model = web.browserName.toString();
    } else if (Platform.isAndroid) {
      platform = 'android';
      final android = await _deviceInfo.androidInfo;
      deviceId = android.id;
      model = android.model;
      version = android.version.release;
    } else if (Platform.isIOS) {
      platform = 'ios';
      final ios = await _deviceInfo.iosInfo;
      deviceId = ios.identifierForVendor ?? 'ios-id';
      model = ios.model;
      version = ios.systemVersion;
    }

    return {
      'platform': platform,
      'device_id_hash': deviceId, // Backend should hash this
      'model': model,
      'os_version': version,
      'app_version': '0.1.0',
    };
  }
}
