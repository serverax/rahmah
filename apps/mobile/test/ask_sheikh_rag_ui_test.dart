import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/screens/ask_sheikh_screen.dart';

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  testWidgets('Ask Sheikh screen shows RAG source search and empty state',
      (tester) async {
    tester.view.physicalSize = const Size(900, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(const MaterialApp(home: AskSheikhScreen()));
    await tester.pump();

    expect(find.text('اسأل الشيخ حسن'), findsWidgets);
    expect(find.text('بحث بالمصادر'), findsOneWidget);
    await tester.ensureVisible(find.text('نتيجة المصادر المعتمدة'));
    expect(find.text('نتيجة المصادر المعتمدة'), findsOneWidget);
    expect(find.text('ابدأ بسؤال واضح'), findsOneWidget);
  });

  testWidgets('Ask Sheikh source search shows safe refusal when API unset',
      (tester) async {
    tester.view.physicalSize = const Size(900, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(const MaterialApp(home: AskSheikhScreen()));
    await tester.pump();

    await tester.enterText(find.byType(TextField), 'ما حكم مسألة خاصة؟');
    await tester.ensureVisible(find.text('بحث بالمصادر'));
    await tester.tap(find.text('بحث بالمصادر'));
    await tester.pump();

    expect(find.text('لا توجد إجابة موثوقة كافية'), findsOneWidget);
    expect(find.textContaining('لم نجد مصدراً معتمداً'), findsOneWidget);
  });
}
