import 'package:flutter/material.dart';

import '../offline/local_content.dart';
import '../widgets/rahma_widgets.dart';

class ChildrenGameScreen extends StatefulWidget {
  const ChildrenGameScreen({super.key});

  @override
  State<ChildrenGameScreen> createState() => _ChildrenGameScreenState();
}

class _ChildrenGameScreenState extends State<ChildrenGameScreen> {
  String _selectedAgeGroup = '7-9';
  int _score = 0;

  @override
  Widget build(BuildContext context) {
    final scenarios =
        LocalContent.games.where((g) => g.age == _selectedAgeGroup).toList();
    return RahmaScaffold(
      title: 'الأطفال',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          RahmaChildrenGameCard(
            points: _score,
            level: _selectedAgeGroup,
            onTap: () {},
          ),
          const SizedBox(height: 14),
          const RahmaOfflineBanner(
            message:
                'اللعبة تعمل محلياً. مزامنة التقدم تحتاج تفعيل الخادم لاحقاً.',
          ),
          const RahmaSectionTitle('الفئة العمرية'),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: '4-6', label: Text('4-6')),
              ButtonSegment(value: '7-9', label: Text('7-9')),
              ButtonSegment(value: '10-12', label: Text('10-12')),
            ],
            selected: {_selectedAgeGroup},
            onSelectionChanged: (set) =>
                setState(() => _selectedAgeGroup = set.first),
          ),
          const RahmaSectionTitle('التحديات'),
          if (scenarios.isEmpty)
            const RahmaEmptyState(
              title: 'لا يوجد تحد لهذا العمر حالياً',
              message: 'جرّب فئة عمرية أخرى أو انتظر تحديث المحتوى المحلي.',
              icon: Icons.extension_rounded,
            )
          else
            ...scenarios.map(
              (s) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Rahma3DCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              s.title,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                          const Icon(
                            Icons.stars_rounded,
                            color: RahmaColors.gold,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        s.question,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 14),
                      for (var i = 0; i < s.options.length; i++)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: FilledButton.tonal(
                            onPressed: () => _answer(s, i),
                            child: Text(s.options[i]),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _answer(LocalGameScenario scenario, int index) {
    final correct = index == scenario.answer;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(correct ? 'أحسنت!' : 'حاول مرة أخرى'),
        content: Text(scenario.explanation),
        actions: [
          RahmaPrimaryButton(
            onPressed: () {
              Navigator.pop(context);
              if (correct) setState(() => _score += 10);
            },
            label: 'متابعة',
            icon: Icons.arrow_back_rounded,
          ),
        ],
      ),
    );
  }
}
