import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/screens/improvement_center_screen.dart';

void main() {
  testWidgets('Improvement center exposes approval-focused sections',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ImprovementCenterScreen()));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('مركز التحسين'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
