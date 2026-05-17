import 'package:flutter/material.dart';
import '../config.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _azanEnabled = false;
  bool _locationEnabled = false;
  String _selectedLanguage = 'العربية';

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('الإعدادات')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildSectionHeader('تفضيلات التطبيق'),
            ListTile(
              title: const Text('لغة التطبيق'),
              subtitle: Text(_selectedLanguage),
              trailing: const Icon(Icons.language),
              onTap: () {
                // TODO: Implement language selector
              },
            ),
            SwitchListTile(
              title: const Text('تنبيهات الأذان'),
              subtitle: const Text('تفعيل الإشعارات لأوقات الصلاة'),
              value: _azanEnabled,
              onChanged: (val) => setState(() => _azanEnabled = val),
            ),
            SwitchListTile(
              title: const Text('خدمات الموقع'),
              subtitle: const Text('استخدام GPS لتحديد أوقات الصلاة والمساجد'),
              value: _locationEnabled,
              onChanged: (val) => setState(() => _locationEnabled = val),
            ),
            const Divider(),
            _buildSectionHeader('المعلومات القانونية والخصوصية'),
            ListTile(
              title: const Text('سياسة الخصوصية'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (c) => const _SimpleDocScreen(title: 'سياسة الخصوصية')));
              },
            ),
            ListTile(
              title: const Text('شروط الاستخدام'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (c) => const _SimpleDocScreen(title: 'شروط الاستخدام')));
              },
            ),
            ListTile(
              title: const Text('سلامة الأطفال'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (c) => const _SimpleDocScreen(title: 'سلامة الأطفال')));
              },
            ),
            const Divider(),
            _buildSectionHeader('الدعم والحساب'),
            ListTile(
              title: const Text('الدعم الفني'),
              trailing: const Icon(Icons.contact_support),
              onTap: () {
                // TODO: Implement support contact
              },
            ),
            ListTile(
              title: const Text('حذف الحساب والبيانات', style: TextStyle(color: Colors.red)),
              trailing: const Icon(Icons.delete_forever, color: Colors.red),
              onTap: () {
                _showDeleteAccountDialog(context);
              },
            ),
            const Divider(),
            _buildSectionHeader('معلومات النظام'),
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
          ],
        ),
      );

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal),
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('تأكيد حذف الحساب'),
        content: const Text('هل أنت متأكد من رغبتك في حذف حسابك وجميع بياناتك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c), child: const Text('إلغاء')),
          TextButton(
            onPressed: () {
              // TODO: Call deletion API
              Navigator.pop(c);
            },
            child: const Text('حذف نهائي', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _SimpleDocScreen extends StatelessWidget {
  const _SimpleDocScreen({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(title)),
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'سيتم عرض نص $title هنا بإذن الله. النسخة الكاملة متوفرة عبر موقعنا الرسمي.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ),
    ),
  );
}
