/// Rahma mobile — build-time configuration.
///
/// `API_BASE_URL` is the operator-chosen API endpoint, passed at build time.
/// The compile-time default is empty so an unconfigured build refuses to talk
/// to the network.
///
/// `PRIVACY_URL`, `TERMS_URL`, and `SUPPORT_URL` are optional external legal
/// links. They default to empty so release builds can show bundled local legal
/// text instead of opening broken or unverified URLs.
///
/// NEVER hardcode a fake domain, IP address, or unverified HTTPS URL.
library;

class RahmaConfig {
  static const String _apiBase = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static const String _legacyApiBase = String.fromEnvironment(
    'RAHMA_API_BASE',
    defaultValue: '',
  );

  static String get apiBase => _apiBase.isNotEmpty ? _apiBase : _legacyApiBase;

  static const String privacyUrl = String.fromEnvironment(
    'PRIVACY_URL',
    defaultValue: '',
  );

  static const String termsUrl = String.fromEnvironment(
    'TERMS_URL',
    defaultValue: '',
  );

  static const String supportUrl = String.fromEnvironment(
    'SUPPORT_URL',
    defaultValue: '',
  );

  static const String buildFlavor = String.fromEnvironment(
    'RAHMA_BUILD_FLAVOR',
    defaultValue: 'internal-test',
  );

  /// True if the build was started with a non-empty API endpoint.
  /// The app refuses to make API calls when this is false.
  static bool get isApiConfigured => apiBase.isNotEmpty;

  static bool get hasExternalLegalUrls =>
      privacyUrl.isNotEmpty && termsUrl.isNotEmpty && supportUrl.isNotEmpty;
}
