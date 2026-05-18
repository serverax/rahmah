import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/app.dart';

void main() {
  testWidgets('RahmaApp boots and shows the MaterialApp tree', (tester) async {
    await tester.pumpWidget(const RahmaApp());
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
    // Bottom-nav strip — Flutter renders our BottomNavigationBarItem labels.
    expect(find.byType(BottomNavigationBar), findsOneWidget);
  });

  testWidgets('Bottom nav exposes the 5 Arabic-labelled tabs', (tester) async {
    await tester.pumpWidget(const RahmaApp());
    await tester.pump();
    for (final label in <String>['الرئيسية', 'الأذكار والدعاء', 'اسأل الشيخ', 'المكتبة', 'الإعدادات']) {
      expect(find.text(label), findsWidgets, reason: 'missing bottom-nav label: $label');
    }
  });
}
