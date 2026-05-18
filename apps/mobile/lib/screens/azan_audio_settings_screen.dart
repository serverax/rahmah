import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/rahma_api_client.dart';

class AzanAudioSettingsScreen extends StatefulWidget {
  const AzanAudioSettingsScreen({super.key});

  @override
  State<AzanAudioSettingsScreen> createState() => _AzanAudioSettingsScreenState();
}

class _AzanAudioSettingsScreenState extends State<AzanAudioSettingsScreen> {
  final _api = RahmaApiClient();
  final _player = AudioPlayer();
  late Future<Map<String, dynamic>> _optionsFuture;
  String? _selectedId;
  String? _playingId;

  @override
  void initState() {
    super.initState();
    _optionsFuture = _api.azanAudioOptions();
    _loadPreference();
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _loadPreference() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _selectedId = prefs.getString('selected_azan_id');
      });
    }
  }

  Future<void> _savePreference(String id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_azan_id', id);
    if (mounted) {
      setState(() => _selectedId = id);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('إعدادات صوت الأذان')),
        body: FutureBuilder<Map<String, dynamic>>(
          future: _optionsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError) return Center(child: Text('خطأ: ${snapshot.error}'));

            final data = snapshot.data!;
            final List options = data['options'] ?? [];
            final bool configured = data['configured'] == true;

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (!configured)
                  _buildPendingNotice(data['blocker'] ?? 'الأصوات غير مفعلة بعد.'),
                
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text('اختر صوت الأذان للتنبيهات:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),

                ...options.map((opt) => _buildOptionTile(opt)),

                const Divider(height: 32),
                const ListTile(
                  leading: Icon(Icons.info_outline),
                  title: Text('تنبيه'),
                  subtitle: Text('هذا الإعداد يغير صوت الأذان عند استخدامه في التنبيهات. تأكد من منح أذونات الإشعارات.'),
                ),
              ],
            );
          },
        ),
      );

  Widget _buildPendingNotice(String blocker) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.amber.shade50, border: Border.all(color: Colors.amber.shade300), borderRadius: BorderRadius.circular(8)),
      child: Column(
        children: [
          const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 32),
          const SizedBox(height: 8),
          Text(blocker, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildOptionTile(Map opt) {
    final id = opt['id'];
    final bool isSelected = _selectedId == id;
    final bool isPlaying = _playingId == id;
    final bool approved = opt['approved'] == true;

    return Card(
      elevation: isSelected ? 4 : 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isSelected ? BorderSide(color: Theme.of(context).primaryColor, width: 2) : BorderSide.none,
      ),
      child: ListTile(
        onTap: () => _savePreference(id),
        title: Text(opt['title_ar'] ?? ''),
        subtitle: Text(opt['title_en'] ?? ''),
        leading: Radio<String>(
          value: id,
          groupValue: _selectedId,
          onChanged: (val) => _savePreference(val!),
        ),
        trailing: IconButton(
          icon: Icon(isPlaying ? Icons.stop_circle : Icons.play_circle_fill, size: 32),
          color: approved ? Theme.of(context).primaryColor : Colors.grey,
          tooltip: approved ? 'معاينة' : 'غير متوفر للمعاينة (بانتظار الاعتماد)',
          onPressed: approved ? () => _togglePreview(id, opt['file_path'], approved) : null,
        ),
      ),
    );
  }

  Future<void> _togglePreview(String id, String? path, bool approved) async {
    if (!approved) return;
    
    if (_playingId == id) {
      await _player.stop();
      if (mounted) setState(() => _playingId = null);
    } else {
      await _player.stop();
      try {
        if (path != null) {
          // AssetSource assumes assets/ prefix is NOT included in the path for some versions,
          // but our metadata has 'assets/audio/azan/...'.
          // audioplayers 6.x AssetSource('audio/azan/...') is correct.
          final assetPath = path.replaceFirst('assets/', '');
          await _player.play(AssetSource(assetPath));
          if (mounted) setState(() => _playingId = id);
        }
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('خطأ في التشغيل: $e')));
      }
    }
  }
}
