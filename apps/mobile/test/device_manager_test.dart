import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/api/device_manager.dart';
import 'package:rahma_mobile/api/rahma_api_client.dart';

class MockRahmaApiClient implements RahmaApiClient {
  @override
  bool get isConfigured => true;
  @override
  Future<Map<String, dynamic>> postJson(String p, Map<String, dynamic> b) async => {'ok': true};
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('DeviceManager can be initialized', () {
    final mockApi = MockRahmaApiClient();
    final manager = DeviceManager(apiClient: mockApi);
    expect(manager, isNotNull);
  });
}
