import 'package:flutter/material.dart';
import '../api/rahma_api_client.dart';

class AskSheikhScreen extends StatefulWidget {
  const AskSheikhScreen({super.key});

  @override
  State<AskSheikhScreen> createState() => _AskSheikhScreenState();
}

class _AskSheikhScreenState extends State<AskSheikhScreen> {
  final _api = RahmaApiClient();
  final _controller = TextEditingController();
  bool _isSubmitting = false;
  late Future<Map<String, dynamic>> _publicQAFuture;

  @override
  void initState() {
    super.initState();
    _publicQAFuture = _api.listPublicQA();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('اسأل الشيخ حسن')),
        body: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            _buildSubmissionForm(),
            const Divider(height: 48),
            _buildPublicAnswersList(),
          ],
        ),
      );

  Widget _buildSubmissionForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'يمكنك طرح سؤالك الشرعي هنا وسيتم الرد عليه من قبل الشيخ بعد المراجعة.',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _controller,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            labelText: 'اكتب سؤالك بوضوح...',
            alignLabelWithHint: true,
          ),
          maxLines: 5,
          maxLength: 1000,
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submit,
          style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
          child: _isSubmitting ? const CircularProgressIndicator() : const Text('إرسال السؤال'),
        ),
      ],
    );
  }

  Widget _buildPublicAnswersList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('الإجابات العامة الأخيرة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        FutureBuilder<Map<String, dynamic>>(
          future: _publicQAFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError) return Text('خطأ في تحميل الإجابات: ${snapshot.error}');
            
            final List items = snapshot.data!['items'] ?? [];
            if (items.isEmpty) return const Text('لا توجد إجابات عامة حالياً.');

            return Column(
              children: items.map((item) => Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: ExpansionTile(
                  title: Text(item['title_ar'] ?? item['question_text_ar'] ?? ''),
                  subtitle: Text(item['category_id']?.toString() ?? ''),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(item['answer_text_ar'] ?? 'بانتظار الإجابة...', style: const TextStyle(height: 1.5)),
                    ),
                  ],
                ),
              )).toList(),
            );
          },
        ),
      ],
    );
  }
  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() => _isSubmitting = true);
    try {
      final res = await _api.submitQuestion(text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم إرسال سؤالك بنجاح. سيتم إخطارك عند الإجابة.')));
        _controller.clear();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('خطأ: $e')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}
