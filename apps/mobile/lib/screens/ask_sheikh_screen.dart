import 'package:flutter/material.dart';

import '../config.dart';

class AskSheikhScreen extends StatelessWidget {
  const AskSheikhScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('اسأل الشيخ حسن')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  RahmaConfig.isApiConfigured
                      ? 'يمكن إرسال السؤال للشيخ، وسيتم الرد بعد المراجعة.'
                      : 'الخدمة غير مهيأة بعد. لم يتم تكوين عنوان الـ API.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                if (RahmaConfig.isApiConfigured)
                  const TextField(
                    decoration: InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'اكتب سؤالك',
                    ),
                    maxLines: 4,
                    maxLength: 1000,
                  ),
              ],
            ),
          ),
        ),
      );
}
