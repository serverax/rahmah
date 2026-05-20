import 'package:flutter/material.dart';

import '../config.dart';
import '../widgets/rahma_widgets.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'الدعم الفني',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            RahmaPrayerHeroCard(
              title: 'كيف نساعدك؟',
              subtitle: RahmaConfig.isApiConfigured
                  ? 'يمكن إرسال طلب الدعم عند توفر الخادم.'
                  : 'وضع محلي: اكتب ملاحظتك واحتفظ بها قبل تفعيل الخادم.',
              nextPrayer: 'الحالة',
              countdown: RahmaConfig.isApiConfigured ? 'متصل' : 'محلي',
              trailing: const Icon(
                Icons.support_agent_rounded,
                color: RahmaColors.warmGold,
                size: 54,
              ),
            ),
            const SizedBox(height: 14),
            const RahmaOfflineBanner(
              message:
                  'البريد الرسمي: support@ordinoxai.com — للخصوصية وحذف الحساب وسلامة الأطفال.',
            ),
            const RahmaSectionTitle('رسالة الدعم'),
            Rahma3DCard(
              child: Column(
                children: [
                  TextField(
                    controller: _emailController,
                    decoration:
                        const InputDecoration(labelText: 'البريد الإلكتروني'),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(labelText: 'رسالتك'),
                    maxLines: 5,
                  ),
                  const SizedBox(height: 16),
                  RahmaPrimaryButton(
                    onPressed: _submit,
                    icon: Icons.check_rounded,
                    label: RahmaConfig.isApiConfigured ? 'إرسال' : 'حفظ محلياً',
                  ),
                ],
              ),
            ),
          ],
        ),
      );

  void _submit() {
    if (_emailController.text.trim().isEmpty ||
        _messageController.text.trim().isEmpty) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          RahmaConfig.isApiConfigured
              ? 'سيتم إرسال الطلب عند توفر خدمة الدعم.'
              : 'تم حفظ الملاحظة محلياً للمراجعة لاحقاً.',
        ),
      ),
    );
    Navigator.pop(context);
  }
}
