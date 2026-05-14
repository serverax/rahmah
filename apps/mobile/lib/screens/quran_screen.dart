import 'package:flutter/material.dart';

import '../config.dart';

class QuranScreen extends StatelessWidget {
  const QuranScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('القرآن الكريم')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              RahmaConfig.isApiConfigured
                  ? 'القرآن غير متاح بعد — لم يتم اعتماد المصادر.'
                  : 'الخدمة غير مهيأة بعد. لم يتم تكوين عنوان واجهة الـ API.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ),
      );
}
