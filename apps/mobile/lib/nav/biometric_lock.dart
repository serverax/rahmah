import 'package:local_auth/local_auth.dart';
import 'package:flutter/services.dart';

/// Helper for biometric authentication (Fingerprint, Face ID, etc.).
class BiometricLock {
  static final LocalAuthentication _auth = LocalAuthentication();

  /// Check if the device supports any biometric hardware.
  static Future<bool> isAvailable() async {
    try {
      return await _auth.canCheckBiometrics || await _auth.isDeviceSupported();
    } on PlatformException catch (_) {
      return false;
    }
  }

  /// Trigger biometric authentication.
  static Future<bool> authenticate({
    String reasonAr = 'يُرجى التحقق من هويتك للدخول إلى التطبيق',
  }) async {
    try {
      return await _auth.authenticate(
        localizedReason: reasonAr,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false, // Fallback to PIN if biometrics fail
        ),
      );
    } on PlatformException catch (_) {
      return false;
    }
  }
}
