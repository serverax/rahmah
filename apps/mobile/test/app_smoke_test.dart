import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('RahmaApp boots and shows the MaterialApp tree', (tester) async {
    SharedPreferences.setMockInitialValues({'rahma_onboarding_complete': true});
    await tester.pumpWidget(const RahmaApp());
    await tester.pump(const Duration(seconds: 2));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('Bottom nav exposes the 5 Arabic-labelled tabs', (tester) async {
    SharedPreferences.setMockInitialValues({'rahma_onboarding_complete': true});
    await tester.pumpWidget(const RahmaApp());
    await tester.pump(const Duration(seconds: 2));
    await tester.pump(const Duration(milliseconds: 100));
    for (final label in <String>[
      'الرئيسية',
      'الأذكار والدعاء',
      'اسأل الشيخ',
      'المكتبة',
      'الإعدادات',
    ]) {
      expect(
        find.text(label),
        findsWidgets,
        reason: 'missing bottom-nav label: $label',
      );
    }
  });
}
