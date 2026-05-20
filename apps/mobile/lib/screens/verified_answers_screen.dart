import 'package:flutter/material.dart';

import '../api/rahma_api_client.dart';
import '../config.dart';
import '../offline/local_content.dart';
import '../widgets/rahma_service_unavailable_pill.dart';
import '../widgets/rahma_widgets.dart';

class VerifiedAnswersScreen extends StatefulWidget {
  const VerifiedAnswersScreen({super.key, this.apiClient});

  final RahmaApiClient? apiClient;

  @override
  State<VerifiedAnswersScreen> createState() => _VerifiedAnswersScreenState();
}

class _VerifiedAnswersScreenState extends State<VerifiedAnswersScreen> {
  final _api = RahmaApiClient();
  bool _loading = true;
  bool _usedFallback = false;
  List<_PublicAnswerItem> _items = [];

  RahmaApiClient get api => widget.apiClient ?? _api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!api.isConfigured) {
      if (mounted) {
        setState(() {
          _loading = false;
          _usedFallback = true;
          _items = LocalContent.publicAnswers
              .map(
                (e) => _PublicAnswerItem(
                  question: e.question,
                  answer: e.answer,
                  category: e.category,
                ),
              )
              .toList();
        });
      }
      return;
    }
    try {
      final body = await api.listPublicQA(lang: 'ar');
      final raw = body['items'];
      final items = raw is List
          ? raw
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .map(
                (row) => _PublicAnswerItem(
                  question: row['question'] as String? ?? '',
                  answer: row['answer'] as String? ?? '',
                  category: row['category'] as String? ?? 'عام',
                ),
              )
              .where((e) => e.question.isNotEmpty && e.answer.isNotEmpty)
              .toList()
          : <_PublicAnswerItem>[];
      if (mounted) {
        setState(() {
          _loading = false;
          _usedFallback = items.isEmpty;
          _items = items.isNotEmpty
              ? items
              : LocalContent.publicAnswers
                  .map(
                    (e) => _PublicAnswerItem(
                      question: e.question,
                      answer: e.answer,
                      category: e.category,
                    ),
                  )
                  .toList();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _usedFallback = true;
          _items = LocalContent.publicAnswers
              .map(
                (e) => _PublicAnswerItem(
                  question: e.question,
                  answer: e.answer,
                  category: e.category,
                ),
              )
              .toList();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'إجابات موثقة',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            if (!RahmaConfig.isApiConfigured)
              const RahmaServiceUnavailablePill(),
            if (_usedFallback && RahmaConfig.isApiConfigured)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: RahmaServiceUnavailablePill(),
              ),
            const RahmaSectionTitle('إجابات معتمدة'),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_items.isEmpty)
              const RahmaStateCard(
                title: 'لا توجد إجابات منشورة',
                message: 'لم تُنشر إجابات معتمدة بعد.',
                icon: Icons.info_outline_rounded,
                tone: RahmaStateTone.empty,
              )
            else
              ..._items.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Rahma3DCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Chip(label: Text(item.category)),
                        const SizedBox(height: 8),
                        Text(
                          item.question,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item.answer,
                          style: Theme.of(context).textTheme.bodyLarge,
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

class _PublicAnswerItem {
  const _PublicAnswerItem({
    required this.question,
    required this.answer,
    required this.category,
  });

  final String question;
  final String answer;
  final String category;
}
