import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/screens/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Settings screen exposes privacy, azan, and local API state',
      (tester) async {
    tester.view.physicalSize = const Size(900, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(const MaterialApp(home: SettingsScreen()));
    await tester.pump();

    expect(find.text('الإعدادات'), findsOneWidget);
    expect(find.text('الأذان والتنبيهات'), findsOneWidget);
    expect(find.textContaining('لم يتم ضبط عنوان API'), findsOneWidget);
    expect(find.text('صوت الأذان'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('الخصوصية والامتثال'),
      500,
      scrollable: find.byType(Scrollable),
    );
    expect(find.text('الخصوصية والامتثال'), findsOneWidget);
  });
}
