import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/offline/sync_manager.dart';
import 'package:rahma_mobile/api/rahma_api_client.dart';

class MockRahmaApiClient implements RahmaApiClient {
  @override
  bool get isConfigured => true;

  @override
  Future<Map<String, dynamic>> contentSources() async {
    return {
      'ok': true,
      'items': [
        {
          'id': '1',
          'title_ar': 'عنوان 1',
          'body_ar': 'نص 1',
          'source_type': 'quran',
          'citation_label_ar': 'البقرة 1'
        },
      ],
    };
  }

  @override
  Future<Map<String, dynamic>> publicAnswers() async {
    return {
      'ok': true,
      'items': [
        {
          'answer_id': 'a1',
          'slug': 'slug1',
          'title_ar': 'سؤال 1',
          'answer_ar': 'إجابة 1',
          'citation_status': 'quran_cited'
        },
      ],
    };
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('SyncManager can be initialized', () {
    final mockApi = MockRahmaApiClient();
    final manager = SyncManager(apiClient: mockApi);
    expect(manager, isNotNull);
  });
}
