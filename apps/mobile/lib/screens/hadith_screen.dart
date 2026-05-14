import 'package:flutter/material.dart';
import '../config.dart';

class HadithScreen extends StatelessWidget {
  const HadithScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('الحديث الشريف')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              RahmaConfig.isApiConfigured
                  ? 'الحديث غير متاح بعد — لم يتم اعتماد المصادر.'
                  : 'الخدمة غير مهيأة بعد.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
}
