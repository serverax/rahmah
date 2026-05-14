import 'package:flutter/material.dart';
import '../config.dart';

class DuaScreen extends StatelessWidget {
  const DuaScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('الأذكار والدعاء')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              RahmaConfig.isApiConfigured
                  ? 'الأدعية غير متاحة بعد — قيد المراجعة.'
                  : 'الخدمة غير مهيأة بعد.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
}
