/// Rahma mobile — build-time configuration.
///
/// `RAHMA_API_BASE` is the operator-chosen final API hostname, passed via
/// `--dart-define=RAHMA_API_BASE=https://api.<final-rahma-domain>` at build
/// time. The compile-time default is empty so an unconfigured build refuses
/// to talk to the network.
///
/// NEVER hardcode `api.rahma.example`, any OrdinoxAI domain, or any other
/// placeholder. The default value MUST stay empty until the operator picks
/// the final domain.
library;

class RahmaConfig {
  static const String apiBase = String.fromEnvironment(
    'RAHMA_API_BASE',
    defaultValue: '',
  );

  static const String buildFlavor = String.fromEnvironment(
    'RAHMA_BUILD_FLAVOR',
    defaultValue: 'internal-test',
  );

  /// True if the build was started with a non-empty `RAHMA_API_BASE`.
  /// The app refuses to make API calls when this is false.
  static bool get isApiConfigured => apiBase.isNotEmpty;
}
