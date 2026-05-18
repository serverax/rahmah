import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../api/rahma_api_client.dart';
import 'support_screen.dart';
import '../services/notification_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _api = RahmaApiClient();
  final _notify = NotificationService();

  bool _azanEnabled = false;
  bool _locationEnabled = false;
  Map<String, bool> _prayerAlerts = {
    'Fajr': true,
    'Dhuhr': true,
    'Asr': true,
    'Maghrib': true,
    'Isha': true,
  };
  String _selectedLanguage = 'العربية';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _azanEnabled = prefs.getBool('azan_alerts_enabled') ?? false;
        _locationEnabled = prefs.getBool('location_enabled') ?? false;
        for (var key in _prayerAlerts.keys) {
          _prayerAlerts[key] = prefs.getBool('alert_$key') ?? true;
        }
      });
    }
  }

  Future<void> _saveAzanToggle(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('azan_alerts_enabled', value);
    setState(() => _azanEnabled = value);
    if (value) {
      final permitted = await _notify.requestPermissions();
      if (!permitted && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى تفعيل أذونات الإشعارات من إعدادات النظام.')),
        );
      }
    }
    _triggerReschedule();
  }

  Future<void> _savePrayerAlert(String prayer, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('alert_$prayer', value);
    setState(() => _prayerAlerts[prayer] = value);
    _triggerReschedule();
  }

  void _triggerReschedule() {
    // In a real app, we'd fetch current prayer times from cache/API here and call _notify.scheduleDailyPrayerTimes
    // For now, this is wired to state changes.
  }

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
              onChanged: _saveAzanToggle,
            ),
            if (_azanEnabled) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: _prayerAlerts.keys.map((p) => CheckboxListTile(
                    title: Text(p == 'Fajr' ? 'الفجر' :
                                p == 'Dhuhr' ? 'الظهر' :
                                p == 'Asr' ? 'العصر' :
                                p == 'Maghrib' ? 'المغرب' : 'العشاء'),
                    value: _prayerAlerts[p],
                    onChanged: (val) => _savePrayerAlert(p, val!),
                  )).toList(),
                ),
              ),
            ],
            ListTile(
              title: const Text('صوت الأذان'),
              subtitle: const Text('اختيار صوت الأذان للمعاينة والتنبيهات'),
              trailing: const Icon(Icons.audiotrack),
              onTap: () {
                Navigator.pushNamed(context, '/settings/azan-audio');
              },
            ),
            SwitchListTile(
              title: const Text('خدمات الموقع'),
              subtitle: const Text('استخدام GPS لتحديد أوقات الصلاة والمساجد'),
              value: _locationEnabled,
              onChanged: (val) async {
                final prefs = await SharedPreferences.getInstance();
                await prefs.setBool('location_enabled', val);
                setState(() => _locationEnabled = val);
              },
            ),
            const Divider(),
            _buildSectionHeader('المعلومات القانونية والخصوصية'),
            ListTile(
              title: const Text('سياسة الخصوصية'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () => _openDoc('/api/privacy/status', 'سياسة الخصوصية'),
            ),
            ListTile(
              title: const Text('شروط الاستخدام'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () => _openDoc('/api/terms/status', 'شروط الاستخدام'),
            ),
            ListTile(
              title: const Text('سلامة الأطفال'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () => _openDoc('/api/privacy/child-safety', 'سلامة الأطفال'),
            ),
            const Divider(),
            _buildSectionHeader('الدعم والحساب'),
            ListTile(
              title: const Text('الدعم الفني'),
              trailing: const Icon(Icons.contact_support),
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (c) => const SupportScreen()));
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

  void _openDoc(String endpoint, String title) {
    Navigator.push(context, MaterialPageRoute(builder: (c) => _DocLoaderScreen(endpoint: endpoint, title: title)));
  }

  void _showDeleteAccountDialog(BuildContext context) {
    final emailController = TextEditingController();
    showDialog(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('تأكيد حذف الحساب'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('يرجى إدخال بريدك الإلكتروني لتأكيد طلب الحذف. سيتم التواصل معك للتحقق.'),
            const SizedBox(height: 16),
            TextField(controller: emailController, decoration: const InputDecoration(labelText: 'البريد الإلكتروني')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              final email = emailController.text.trim();
              if (email.isEmpty) return;
              try {
                await _api.postJson('/api/privacy/delete-account-request', {'email': email});
                if (mounted) Navigator.pop(c);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم استلام الطلب')));
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('خطأ: $e')));
              }
            },
            child: const Text('إرسال الطلب', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _DocLoaderScreen extends StatelessWidget {
  const _DocLoaderScreen({required this.endpoint, required this.title});
  final String endpoint;
  final String title;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(title)),
        body: FutureBuilder<Map<String, dynamic>>(
          future: RahmaApiClient().get(endpoint),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError) return Center(child: Text('خطأ: ${snapshot.error}'));
            
            final data = snapshot.data!;
            // Handle different JSON structures for privacy/terms/child-safety
            final content = data['privacy']?['body_ar'] ?? data['terms']?['body_ar'] ?? data['child_safety']?['body_ar'] ?? '';
            
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Text(content, style: const TextStyle(fontSize: 16, height: 1.6), textDirection: TextDirection.rtl),
            );
          },
        ),
      );
}
