import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/api/rahma_api_client.dart';
import 'package:rahma_mobile/screens/azan_audio_settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeAzanApi extends RahmaApiClient {
  _FakeAzanApi(this._body);

  final Map<String, dynamic> _body;

  @override
  bool get isConfigured => true;

  @override
  Future<Map<String, dynamic>> azanAudioOptions() async => _body;
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('shows no-approved message when API has no playback_allowed',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AzanAudioSettingsScreen(
          apiClient: _FakeAzanApi({
            'ok': true,
            'configured': false,
            'production_ready': false,
            'options': [],
            'blocker': 'azan_metadata_missing',
          }),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('لم يتم اعتماد ملف الأذان بعد'), findsWidgets);
    expect(find.byIcon(Icons.play_circle_fill_rounded), findsNothing);
  });

  testWidgets('shows preview when API reports playback_allowed',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AzanAudioSettingsScreen(
          apiClient: _FakeAzanApi({
            'ok': true,
            'configured': true,
            'production_ready': true,
            'default_azan_id': 'makkah_public_01',
            'options': [
              {
                'id': 'makkah_public_01',
                'title_ar': 'أذان مكة المكرمة',
                'review_status': 'verified',
                'file_path': 'assets/audio/azan/makkah_azan_public_domain.mp3',
                'playback_allowed': true,
              },
            ],
          }),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('أذان مكة المكرمة'), findsOneWidget);
    expect(find.byIcon(Icons.play_circle_fill_rounded), findsOneWidget);
    expect(find.text('لم يتم اعتماد ملف الأذان بعد'), findsNothing);
  });
}
