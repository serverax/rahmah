import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rahma_mobile/widgets/rahma_widgets.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    home: Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(body: Center(child: child)),
    ),
  );
}

void main() {
  testWidgets('RahmaHeroPanel renders compact hero and not prayer fields',
      (tester) async {
    await tester.pumpWidget(
      _wrap(
        RahmaHeroPanel(
          title: 'المكتبة الإسلامية',
          subtitle: 'ملخصات موثوقة ومختصرة',
          icon: const Icon(Icons.book_rounded, color: RahmaColors.warmGold),
          statusBadge: const RahmaStatusBadge(
            label: 'محلي',
            icon: Icons.cloud_off_rounded,
          ),
          action: RahmaPrimaryButton(
            label: 'فتح',
            icon: Icons.arrow_back_rounded,
            onPressed: () {},
          ),
        ),
      ),
    );

    expect(find.byType(RahmaPrayerHeroCard), findsNothing);
    expect(find.text('المكتبة الإسلامية'), findsOneWidget);
    expect(find.text('ملخصات موثوقة ومختصرة'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is Text && (widget.data ?? '').trim().isEmpty,
      ),
      findsNothing,
    );
  });

  testWidgets('RahmaPrayerHeroCard renders prayer fields correctly',
      (tester) async {
    await tester.pumpWidget(
      _wrap(
        const RahmaPrayerHeroCard(
          title: 'الصلاة',
          subtitle: 'حساب محلي دقيق',
          nextPrayer: 'المغرب',
          countdown: '20:47',
          trailing: Icon(Icons.schedule_rounded, color: RahmaColors.warmGold),
        ),
      ),
    );

    expect(find.byType(RahmaPrayerHeroCard), findsOneWidget);
    expect(find.text('الصلاة'), findsOneWidget);
    expect(find.text('المغرب'), findsOneWidget);
    expect(find.text('20:47'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is Text && (widget.data ?? '').trim().isEmpty,
      ),
      findsNothing,
    );
  });

  testWidgets('Rahma hero widgets remain stable on a narrow screen',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      _wrap(
        const Column(
          children: [
            RahmaHeroPanel(
              title: 'رحمة',
              subtitle: 'تجربة RTL مضغوطة',
              icon: Icon(Icons.mosque_rounded, color: RahmaColors.gold),
            ),
            SizedBox(height: 16),
            RahmaPrayerHeroCard(
              title: 'أوقات الصلاة',
              subtitle: 'الشاشة الضيقة',
              nextPrayer: 'العشاء',
              countdown: '01:12',
              trailing: Icon(Icons.explore_rounded, color: RahmaColors.gold),
            ),
          ],
        ),
      ),
    );

    expect(tester.takeException(), isNull);
  });

  testWidgets('RahmaRagAnswerCard renders verified citation cards',
      (tester) async {
    await tester.pumpWidget(
      _wrap(
        const RahmaRagAnswerCard(
          safetyStatus: 'verified_sources',
          intent: 'quran_lookup',
          answer: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          citations: [
            RahmaRagCitation(
              sourceId: 'tanzil-quran-text',
              sourceTitle: 'الفاتحة',
              sourceType: 'quran',
              referenceLabel: 'Quran 1:1',
              localReference: 'Quran 1:1',
            ),
          ],
        ),
      ),
    );

    expect(find.text('مصادر موثقة'), findsOneWidget);
    expect(find.text('الفاتحة'), findsOneWidget);
    expect(find.text('Quran 1:1'), findsWidgets);
  });

  testWidgets('RahmaRagAnswerCard renders scholar review warning',
      (tester) async {
    await tester.pumpWidget(
      _wrap(
        const RahmaRagAnswerCard(
          safetyStatus: 'scholar_review_required',
        ),
      ),
    );

    expect(find.text('تحتاج مراجعة الشيخ'), findsOneWidget);
    expect(find.textContaining('لن تعرض رحمة جواباً آلياً'), findsOneWidget);
  });

  testWidgets('RahmaRagAnswerCard renders blocked prompt state',
      (tester) async {
    await tester.pumpWidget(
      _wrap(
        const RahmaRagAnswerCard(
          safetyStatus: 'blocked_prompt_injection',
        ),
      ),
    );

    expect(find.text('تم حظر الطلب'), findsOneWidget);
    expect(find.byIcon(Icons.shield_rounded), findsOneWidget);
  });
}
