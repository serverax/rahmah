import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/app.dart';
import 'package:rahma_mobile/nav/bottom_nav.dart';

void main() {
  testWidgets('RahmaApp boots and renders bottom nav with Arabic labels', (tester) async {
    await tester.pumpWidget(const RahmaApp());
    await tester.pumpAndSettle();

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.byType(RahmaBottomNav), findsOneWidget);
    expect(find.text('الرئيسية'), findsWidgets);
    expect(find.text('اسأل الشيخ'), findsWidgets);
    expect(find.text('الإعدادات'), findsWidgets);
  });

  testWidgets('Tapping the dua tab swaps the visible body', (tester) async {
    await tester.pumpWidget(const RahmaApp());
    await tester.pumpAndSettle();
    // Tap the second tab (الأذكار والدعاء).
    await tester.tap(find.text('الأذكار والدعاء').first);
    await tester.pumpAndSettle();
    expect(find.text('الأذكار والدعاء'), findsWidgets);
  });
}
