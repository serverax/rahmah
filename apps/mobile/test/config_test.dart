import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/config.dart';

void main() {
  test('RahmaConfig.apiBase has empty default at compile time', () {
    // When the test runner doesn't pass --dart-define=RAHMA_API_BASE=...,
    // the constant resolves to its default value: empty string.
    // This is the safety contract — an unconfigured build does not
    // accidentally talk to a hardcoded host.
    expect(RahmaConfig.apiBase, '');
    expect(RahmaConfig.isApiConfigured, false);
  });

  test('RahmaConfig.buildFlavor defaults to internal-test', () {
    expect(RahmaConfig.buildFlavor, 'internal-test');
  });
}
