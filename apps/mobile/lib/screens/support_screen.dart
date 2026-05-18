import 'package:flutter/material.dart';
import '../api/rahma_api_client.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _api = RahmaApiClient();
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();
  bool _isSubmitting = false;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('الدعم الفني')),
        body: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text('نسعد بتواصلكم معنا لأي استفسار أو بلاغ عن مشكلة.', textAlign: TextAlign.center),
            const SizedBox(height: 24),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'البريد الإلكتروني', border: OutlineInputBorder()),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _messageController,
              decoration: const InputDecoration(labelText: 'رسالتك', border: OutlineInputBorder(), alignLabelWithHint: true),
              maxLines: 5,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
              child: _isSubmitting ? const CircularProgressIndicator() : const Text('إرسال'),
            ),
          ],
        ),
      );

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final msg = _messageController.text.trim();
    if (email.isEmpty || msg.isEmpty) return;

    setState(() => _isSubmitting = true);
    try {
      final res = await _api.postJson('/api/privacy/requests', {
        'request_type': 'contact',
        'email': email,
        'reason_ar': msg,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message_ar'] ?? 'تم الإرسال')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('خطأ: $e')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}
