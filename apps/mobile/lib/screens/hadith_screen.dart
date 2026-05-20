import 'package:flutter/material.dart';

import '../widgets/rahma_widgets.dart';

class HadithScreen extends StatelessWidget {
  const HadithScreen({super.key});

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'الحديث الشريف',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: const [
            RahmaOfflineBanner(
              message:
                  'وحدة الحديث في وضع تأسيسي. لن نعرض أحاديث غير موثقة أو غير معتمدة.',
            ),
            SizedBox(height: 14),
            RahmaEmptyState(
              title: 'مصادر الحديث قيد الاعتماد',
              message:
                  'سيظهر المحتوى بعد ربط قاعدة مصادر موثقة مع التخريج. حالياً يمكنك استخدام الأذكار والدعاء والقرآن المحلي.',
              icon: Icons.history_edu_rounded,
            ),
          ],
        ),
      );
}
