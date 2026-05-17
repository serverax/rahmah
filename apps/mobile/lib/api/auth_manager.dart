import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'rahma_api_client.dart';

/// Manages user authentication sessions and secure token storage.
class AuthManager {
  AuthManager({required RahmaApiClient apiClient}) : _api = apiClient;

  final RahmaApiClient _api;
  final _storage = const FlutterSecureStorage();

  String? _token;
  String? get token => _token;

  bool get isAuthenticated => _token != null;

  /// Load session from secure storage.
  Future<void> loadSession() async {
    _token = await _storage.read(key: 'auth_token');
  }

  /// Start a new session (Login).
  Future<void> login(String email, String password) async {
    final res = await _api.postJson('/api/auth/session/start', {
      'email': email,
      'password': password,
    });

    if (res['ok'] == true && res['token'] != null) {
      _token = res['token'];
      await _storage.write(key: 'auth_token', value: _token);
    } else {
      throw RahmaApiError(
        res['error'] ?? 'login_failed',
        res['safe_message_ar'] ?? 'فشل تسجيل الدخول.',
      );
    }
  }

  /// End the session (Logout).
  Future<void> logout() async {
    try {
      await _api.postJson('/api/auth/session/logout', {});
    } catch (_) {
      // Best-effort logout on server.
    }
    _token = null;
    await _storage.delete(key: 'auth_token');
  }

  /// Get headers for authenticated requests.
  Map<String, String> get authHeaders {
    return _token != null ? {'Authorization': 'Bearer $_token'} : {};
  }
}
