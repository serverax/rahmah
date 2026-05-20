import 'package:flutter/material.dart';

import '../widgets/rahma_widgets.dart';

/// In-app compliance summaries (mirrors public web pages at rahma.app).
class ComplianceInfoScreen extends StatelessWidget {
  const ComplianceInfoScreen({super.key});

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'الخصوصية والامتثال',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: const [
            RahmaSectionTitle('الخصوصية | Privacy'),
            RahmaStateCard(
              title: 'سياسة الخصوصية',
              message:
                  'نقلّل جمع البيانات. الموقع اختياري للصلاة. لا نبيع بياناتكم. '
                  'Privacy: minimal data, optional location, no sale of personal data.',
              icon: Icons.privacy_tip_outlined,
              tone: RahmaStateTone.empty,
            ),
            RahmaSectionTitle('إرشاد شرعي | Islamic guidance'),
            RahmaStateCard(
              title: 'ليس فتوى رسمية',
              message:
                  'رحمة تقدّم إرشاداً تعليمياً من مصادر معتمدة. المسائل الحساسة تتطلب مراجعة عالم. '
                  'Educational guidance only — not a formal fatwa.',
              icon: Icons.menu_book_outlined,
              tone: RahmaStateTone.warning,
            ),
            RahmaSectionTitle('سلامة الأطفال | Child safety'),
            RahmaStateCard(
              title: 'وضع الطفل',
              message:
                  'لا دردشة بين الأطفال، لا ملف عام، ولا جمع بيانات تعريفية من الطفل. '
                  'Children mode: no UGC chat, no public child profiles.',
              icon: Icons.child_care_outlined,
              tone: RahmaStateTone.empty,
            ),
            RahmaSectionTitle('الدعم | Support'),
            RahmaStateCard(
              title: 'support@ordinoxai.com',
              message:
                  'للدعم، الخصوصية، أو حذف الحساب راسلونا على support@ordinoxai.com',
              icon: Icons.mail_outline,
              tone: RahmaStateTone.empty,
            ),
          ],
        ),
      );
}
