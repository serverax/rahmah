import 'package:flutter/material.dart';
import '../api/rahma_api_client.dart';

class ChildrenGameScreen extends StatefulWidget {
  const ChildrenGameScreen({super.key});

  @override
  State<ChildrenGameScreen> createState() => _ChildrenGameScreenState();
}

class _ChildrenGameScreenState extends State<ChildrenGameScreen> {
  final _api = RahmaApiClient();
  String _selectedAgeGroup = '7-9';
  late Future<Map<String, dynamic>> _gameFuture;
  int _score = 0;

  @override
  void initState() {
    super.initState();
    _gameFuture = _api.gameStatus(ageGroup: _selectedAgeGroup);
  }

  void _changeAgeGroup(String? age) {
    if (age != null) {
      setState(() {
        _selectedAgeGroup = age;
        _gameFuture = _api.gameStatus(ageGroup: _selectedAgeGroup);
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('لعبة الأطفال الإسلامية'),
          actions: [
            Center(child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text('⭐ $_score', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            )),
          ],
        ),
        body: Column(
          children: [
            _buildAgeSelector(),
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                future: _gameFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('خطأ: ${snapshot.error}'));
                  }
                  final data = snapshot.data!;
                  final List scenarios = data['scenarios'] ?? [];

                  if (scenarios.isEmpty) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Text('لا توجد سيناريوهات متاحة لهذه الفئة العمرية حالياً.', textAlign: TextAlign.center),
                      ),
                    );
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: scenarios.length,
                    itemBuilder: (context, i) {
                      final s = scenarios[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(s['title_ar'] ?? '', style: Theme.of(context).textTheme.titleMedium),
                              const SizedBox(height: 8),
                              Text(s['body_ar'] ?? ''),
                              const SizedBox(height: 16),
                              ...(s['options_json'] as List? ?? []).map((opt) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: ElevatedButton(
                                  onPressed: () => _handleAnswer(s, opt),
                                  child: Text(opt['text_ar'] ?? ''),
                                ),
                              )),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      );

  Widget _buildAgeSelector() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: SegmentedButton<String>(
        segments: const [
          ButtonSegment(value: '4-6', label: Text('4-6')),
          ButtonSegment(value: '7-9', label: Text('7-9')),
          ButtonSegment(value: '10-12', label: Text('10-12')),
        ],
        selected: {_selectedAgeGroup},
        onSelectionChanged: (set) => _changeAgeGroup(set.first),
      ),
    );
  }

  void _handleAnswer(Map scenario, Map option) {
    final bool isCorrect = option['is_correct'] == true;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isCorrect ? 'إجابة صحيحة! 🎉' : 'حاول مرة أخرى'),
        content: Text(option['explanation_ar'] ?? ''),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              if (isCorrect) {
                setState(() => _score += 10);
                _api.postJson('/api/mobile/game/progress', {
                  'scenario_id': scenario['id'].toString(),
                  'score': 10,
                });
              }
            },
            child: const Text('موافق'),
          ),
        ],
      ),
    );
  }
}
