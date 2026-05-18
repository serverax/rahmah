import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/screens/azan_audio_settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('AzanAudioSettingsScreen renders correctly', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: AzanAudioSettingsScreen(),
    ));

    expect(find.text('إعدادات صوت الأذان'), findsOneWidget);
    // Initially shows loader while fetching options
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('AzanAudioSettingsScreen has functional structure', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: AzanAudioSettingsScreen(),
    ));
    
    // Smoke check for state management and Radio logic
    expect(tester.takeException(), isNull);
  });
}
