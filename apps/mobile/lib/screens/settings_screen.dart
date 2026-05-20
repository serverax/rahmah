import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';
import '../services/notification_service.dart';
import '../widgets/rahma_widgets.dart';
import 'compliance_info_screen.dart';
import 'support_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _notify = NotificationService();
  bool _azanEnabled = false;
  bool _locationEnabled = false;
  String _method = 'أم القرى';
  String _madhab = 'الشافعي/المالكي/الحنبلي';
  final Map<String, bool> _prayerAlerts = {
    'Fajr': true,
    'Dhuhr': true,
    'Asr': true,
    'Maghrib': true,
    'Isha': true,
  };

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _azanEnabled = prefs.getBool('azan_alerts_enabled') ?? false;
      _locationEnabled = prefs.getBool('location_enabled') ?? false;
      _method = prefs.getString('prayer_method') ?? _method;
      _madhab = prefs.getString('madhab') ?? _madhab;
      for (final key in _prayerAlerts.keys) {
        _prayerAlerts[key] = prefs.getBool('alert_$key') ?? true;
      }
    });
  }

  Future<void> _saveAzanToggle(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('azan_alerts_enabled', value);
    setState(() => _azanEnabled = value);
    if (value) {
      final permitted = await _notify.requestPermissions();
      if (!permitted && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('يمكن تفعيل الإشعارات من إعدادات النظام في أي وقت.'),
          ),
        );
      }
    }
  }

  Future<void> _savePrayerAlert(String prayer, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('alert_$prayer', value);
    setState(() => _prayerAlerts[prayer] = value);
  }

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'الإعدادات',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            RahmaPrayerHeroCard(
              title: 'إعداد رحمة بهدوء',
              subtitle:
                  'تحكم في الأذان، الخصوصية، اللغة، ووضع المحتوى المحلي بدون رسائل تقنية.',
              nextPrayer: 'الوضع',
              countdown: RahmaConfig.isApiConfigured ? 'متصل بالخادم' : 'محلي',
              trailing: const Icon(
                Icons.tune_rounded,
                color: RahmaColors.warmGold,
                size: 54,
              ),
            ),
            const SizedBox(height: 14),
            RahmaOfflineBanner(
              message: RahmaConfig.isApiConfigured
                  ? 'الاتصال بالخادم مفعّل.'
                  : 'وضع محلي: لم يتم ضبط عنوان API بعد.',
            ),
            const RahmaSectionTitle('الأذان والتنبيهات'),
            Rahma3DCard(
              child: Column(
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('تنبيهات الأذان'),
                    subtitle: const Text(
                      'اختبرها على جهاز حقيقي قبل اعتماد الإصدار.',
                    ),
                    value: _azanEnabled,
                    onChanged: _saveAzanToggle,
                  ),
                  if (_azanEnabled)
                    ..._prayerAlerts.keys.map(
                      (p) => CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(_prayerName(p)),
                        value: _prayerAlerts[p],
                        onChanged: (val) => _savePrayerAlert(p, val ?? false),
                      ),
                    ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading:
                        const Icon(Icons.audiotrack, color: RahmaColors.gold),
                    title: const Text('صوت الأذان'),
                    subtitle: const Text('اختيار ومعاينة الصوت المعتمد'),
                    trailing: const Icon(Icons.chevron_left),
                    onTap: () =>
                        Navigator.pushNamed(context, '/settings/azan-audio'),
                  ),
                ],
              ),
            ),
            const RahmaSectionTitle('الصلاة والموقع'),
            Rahma3DCard(
              child: Column(
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('خدمات الموقع'),
                    subtitle: const Text('يمكن استخدام موقع يدوي عند رفض GPS.'),
                    value: _locationEnabled,
                    onChanged: (val) async {
                      final prefs = await SharedPreferences.getInstance();
                      await prefs.setBool('location_enabled', val);
                      setState(() => _locationEnabled = val);
                    },
                  ),
                  _optionTile('طريقة الحساب', _method, const [
                    'أم القرى',
                    'رابطة العالم الإسلامي',
                    'الهيئة المصرية',
                  ], (v) async {
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.setString('prayer_method', v);
                    setState(() => _method = v);
                  }),
                  _optionTile('المذهب للعصر', _madhab,
                      const ['الشافعي/المالكي/الحنبلي', 'الحنفي'], (v) async {
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.setString('madhab', v);
                    setState(() => _madhab = v);
                  }),
                ],
              ),
            ),
            const RahmaSectionTitle('الوضع المحلي والخصوصية'),
            Rahma3DCard(
              child: Column(
                children: [
                  _infoTile(
                    Icons.cloud_off,
                    'حالة المحتوى',
                    RahmaConfig.isApiConfigured
                        ? 'متصل بالخادم'
                        : 'محتوى محلي محدود',
                  ),
                  _infoTile(
                    Icons.notifications_active,
                    'اختبار الإشعارات',
                    'يلزم اختبار الجهاز: مفتوح، خلفية، مقفل، بعد إعادة التشغيل',
                  ),
                  _infoTile(
                    Icons.battery_saver,
                    'تحسين البطارية',
                    'أوقف التقييد للتنبيهات الدقيقة إذا لزم الأمر',
                  ),
                  _infoTile(
                    Icons.privacy_tip,
                    'الخصوصية',
                    'لا ترسل بيانات شخصية عند غياب الاتصال. طلبات الحذف تحتاج الخادم.',
                  ),
                ],
              ),
            ),
            const RahmaSectionTitle('الخصوصية والامتثال'),
            Rahma3DCard(
              child: Column(
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(
                      Icons.policy_outlined,
                      color: RahmaColors.gold,
                    ),
                    title: const Text('الخصوصية والتنبيهات الشرعية'),
                    subtitle: const Text(
                      'سياسة الخصوصية، سلامة الأطفال، وليس فتوى رسمية',
                    ),
                    trailing: const Icon(Icons.chevron_left),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ComplianceInfoScreen(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const RahmaSectionTitle('الدعم'),
            Rahma3DCard(
              child: Column(
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(
                      Icons.support_agent,
                      color: RahmaColors.gold,
                    ),
                    title: const Text('الدعم الفني'),
                    subtitle: const Text('معلومات مساعدة وتواصل'),
                    trailing: const Icon(Icons.chevron_left),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SupportScreen()),
                    ),
                  ),
                  _infoTile(
                    Icons.info_outline,
                    'الإصدار',
                    '${RahmaConfig.buildFlavor} 0.1.0+1',
                  ),
                  if (RahmaConfig.buildFlavor == 'internal-test')
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(
                        Icons.auto_graph_rounded,
                        color: RahmaColors.gold,
                      ),
                      title: const Text('مركز التحسين'),
                      subtitle:
                          const Text('لوحة داخلية لا تظهر للمستخدمين العاديين'),
                      trailing: const Icon(Icons.chevron_left),
                      onTap: () =>
                          Navigator.pushNamed(context, '/improvement-center'),
                    ),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _optionTile(
    String title,
    String value,
    List<String> options,
    ValueChanged<String> onChanged,
  ) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title),
      subtitle: Text(value),
      trailing: const Icon(Icons.expand_more),
      onTap: () => showModalBottomSheet(
        context: context,
        builder: (_) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: options
                .map(
                  (o) => ListTile(
                    title: Text(o),
                    trailing: value == o
                        ? const Icon(
                            Icons.check_circle,
                            color: RahmaColors.gold,
                          )
                        : null,
                    onTap: () {
                      onChanged(o);
                      Navigator.pop(context);
                    },
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
  }

  Widget _infoTile(IconData icon, String title, String subtitle) => ListTile(
        contentPadding: EdgeInsets.zero,
        leading: Icon(icon, color: RahmaColors.gold),
        title: Text(title),
        subtitle: Text(subtitle),
      );

  String _prayerName(String p) => switch (p) {
        'Fajr' => 'الفجر',
        'Dhuhr' => 'الظهر',
        'Asr' => 'العصر',
        'Maghrib' => 'المغرب',
        _ => 'العشاء',
      };
}
