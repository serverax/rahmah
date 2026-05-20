import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/app.dart';
import 'package:rahma_mobile/screens/ask_sheikh_screen.dart';
import 'package:rahma_mobile/screens/quran_screen.dart';
import 'package:rahma_mobile/screens/sources_screen.dart';
import 'package:rahma_mobile/screens/verified_answers_screen.dart';
import 'package:rahma_mobile/widgets/rahma_service_unavailable_pill.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> _bootHome(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues({'rahma_onboarding_complete': true});
  await tester.binding.setSurfaceSize(const Size(430, 932));
  await tester.pumpWidget(const RahmaApp());
  await tester.pumpAndSettle(const Duration(seconds: 3));
}

void main() {
  testWidgets('MaterialApp exposes ask/quran/answers/sources routes',
      (tester) async {
    SharedPreferences.setMockInitialValues({'rahma_onboarding_complete': true});
    await tester.pumpWidget(const RahmaApp());
    await tester.pumpAndSettle(const Duration(seconds: 2));
    final routes = <String, Type>{
      '/ask': AskSheikhScreen,
      '/quran': QuranScreen,
      '/answers': VerifiedAnswersScreen,
      '/sources': SourcesScreen,
    };
    for (final entry in routes.entries) {
      final nav = tester.state<NavigatorState>(find.byType(Navigator).first);
      nav.pushNamed(entry.key);
      await tester.pumpAndSettle();
      expect(find.byType(entry.value), findsOneWidget);
      nav.pop();
      await tester.pumpAndSettle();
    }
  });

  testWidgets('service unavailable pill appears inside ask screen not on home',
      (tester) async {
    await _bootHome(tester);
    expect(find.byType(RahmaServiceUnavailablePill), findsNothing);
    final nav = tester.state<NavigatorState>(find.byType(Navigator).first);
    nav.pushNamed('/ask');
    await tester.pumpAndSettle();
    expect(find.byType(RahmaServiceUnavailablePill), findsOneWidget);
  });
}
