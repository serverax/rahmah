import 'package:flutter/material.dart';

import '../config.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('الإعدادات')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ListTile(
              title: const Text('إصدار التطبيق'),
              subtitle: Text('${RahmaConfig.buildFlavor} 0.1.0+1'),
            ),
            ListTile(
              title: const Text('عنوان الـ API'),
              subtitle: Text(
                RahmaConfig.isApiConfigured ? 'مُكوَّن' : 'غير مكوَّن — لن يتم الاتصال بالشبكة',
              ),
            ),
            const ListTile(
              title: Text('الخصوصية'),
              subtitle: Text('لا تجمع بيانات الأطفال. لا توجد إعلانات.'),
            ),
            const ListTile(
              title: Text('الإفصاح'),
              subtitle: Text(
                  'هذا تطبيق للجوال فقط. لا يوجد موقع ويب عام ولا لوحة إدارة عامة.'),
            ),
          ],
        ),
      );
}
