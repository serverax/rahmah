import 'package:flutter/material.dart';

class DonationScreen extends StatelessWidget {
  const DonationScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('التبرعات (الصدقة)')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'خدمة التبرع غير مُفعّلة بعد. لم يتم اختيار مزود دفع بعد. '
              'لن يتم تحصيل أي مبلغ.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
}
