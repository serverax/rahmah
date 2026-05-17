import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/nav/privacy_gate.dart';

void main() {
  testWidgets('PrivacyGate shows child when disabled', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: PrivacyGate(
          isEnabled: false,
          child: Text('Sensitive Content'),
        ),
      ),
    );

    expect(find.text('Sensitive Content'), findsOneWidget);
    expect(find.text('وضع الخصوصية مفعل'), findsNothing);
  });

  testWidgets('PrivacyGate hides child when enabled', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: PrivacyGate(
          isEnabled: true,
          child: Text('Sensitive Content'),
        ),
      ),
    );

    expect(find.text('وضع الخصوصية مفعل'), findsOneWidget);
  });
}
