import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/api/rahma_api_client.dart';
import 'package:rahma_mobile/config.dart';

void main() {
  test('RahmaApiClient refuses calls when API base URL is empty', () async {
    // Build-time default leaves apiBase = '', so isConfigured is false.
    expect(RahmaConfig.isApiConfigured, false);
    final client = RahmaApiClient();
    expect(client.isConfigured, false);
    expect(() => client.health(), throwsA(isA<RahmaApiError>()));
    expect(() => client.submitQuestion('سؤال'), throwsA(isA<RahmaApiError>()));
  });

  test('RahmaApiError surfaces machine code + Arabic safe message', () {
    final e = RahmaApiError('forbidden', 'لا تملك صلاحية');
    expect(e.code, 'forbidden');
    expect(e.messageAr, 'لا تملك صلاحية');
    expect(e.toString().contains('forbidden'), true);
  });
}
