import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/rahma_api_client.dart';
import '../widgets/rahma_widgets.dart';

/// Production Azan settings: preview only when API reports `playback_allowed`.
class AzanAudioSettingsScreen extends StatefulWidget {
  const AzanAudioSettingsScreen({super.key, this.apiClient});

  final RahmaApiClient? apiClient;

  @override
  State<AzanAudioSettingsScreen> createState() =>
      _AzanAudioSettingsScreenState();
}

class _AzanAudioSettingsScreenState extends State<AzanAudioSettingsScreen> {
  static const _noApprovedMessage = 'لم يتم اعتماد ملف الأذان بعد';

  final _player = AudioPlayer();
  final _api = RahmaApiClient();

  RahmaApiClient get api => widget.apiClient ?? _api;

  bool _loading = true;
  String? _selectedId;
  String? _playingId;
  List<Map<String, dynamic>> _playableOptions = [];
  String? _blocker;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final savedId = prefs.getString('selected_azan_id');
    if (!api.isConfigured) {
      if (mounted) {
        setState(() {
          _loading = false;
          _playableOptions = [];
          _blocker = 'api_not_configured';
          _selectedId = savedId;
        });
      }
      return;
    }
    try {
      final body = await api.azanAudioOptions();
      final raw = body['options'];
      final options = raw is List
          ? raw
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList()
          : <Map<String, dynamic>>[];
      final playable =
          options.where((o) => o['playback_allowed'] == true).toList();
      final defaultId = body['default_azan_id'] as String?;
      String? selected = savedId;
      if (selected == null || !playable.any((o) => o['id'] == selected)) {
        selected =
            playable.isNotEmpty ? playable.first['id'] as String? : defaultId;
      }
      if (mounted) {
        setState(() {
          _loading = false;
          _playableOptions = playable;
          _blocker = body['blocker'] as String?;
          _selectedId = selected;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _playableOptions = [];
          _blocker = 'fetch_failed';
          _selectedId = savedId;
        });
      }
    }
  }

  Future<void> _savePreference(String id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_azan_id', id);
    if (mounted) setState(() => _selectedId = id);
  }

  @override
  Widget build(BuildContext context) {
    final hasApproved = _playableOptions.isNotEmpty;
    return RahmaScaffold(
      title: 'إعدادات صوت الأذان',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          RahmaPrayerHeroCard(
            title: 'صوت الأذان',
            subtitle: hasApproved
                ? 'معاينة الأصوات المعتمدة من الخادم فقط.'
                : _noApprovedMessage,
            nextPrayer: 'المعاينة',
            countdown: hasApproved ? 'صوت معتمد' : 'بانتظار الاعتماد',
            trailing: Icon(
              hasApproved ? Icons.volume_up_rounded : Icons.volume_off_rounded,
              color: hasApproved ? RahmaColors.warmGold : Colors.grey,
              size: 54,
            ),
          ),
          const SizedBox(height: 14),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (!hasApproved) ...[
            const RahmaSectionTitle('الأصوات المتاحة'),
            RahmaStateCard(
              title: _noApprovedMessage,
              message: _blocker != null && _blocker!.isNotEmpty
                  ? 'السبب: $_blocker'
                  : 'لن تُعرض معاينة ولا يُشغَّل أذان حتى يعتمد فريق المحتوى ملفاً واحداً على الأقل.',
              icon: Icons.info_outline_rounded,
              tone: RahmaStateTone.empty,
            ),
          ] else ...[
            const RahmaSectionTitle('الأصوات المتاحة'),
            ..._playableOptions.map(_buildOptionTile),
            const RahmaSectionTitle('الاعتماد'),
            const RahmaStateCard(
              title: 'أذان معتمد للإنتاج',
              message:
                  'تم التحقق من المصدر والترخيص والهاش على الخادم. المعاينة متاحة للصوت المعتمد فقط.',
              icon: Icons.verified_rounded,
              tone: RahmaStateTone.empty,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOptionTile(Map<String, dynamic> opt) {
    final id = opt['id'] as String? ?? '';
    final title = opt['title_ar'] as String? ?? id;
    final status = opt['review_status'] as String? ?? 'verified';
    final path = opt['file_path'] as String? ?? '';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Rahma3DCard(
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(title),
          subtitle: Text(status),
          leading: Icon(
            _selectedId == id
                ? Icons.radio_button_checked
                : Icons.radio_button_off_outlined,
            color: RahmaColors.gold,
          ),
          trailing: IconButton(
            icon: Icon(
              _playingId == id
                  ? Icons.stop_circle_rounded
                  : Icons.play_circle_fill_rounded,
              size: 32,
            ),
            color: RahmaColors.gold,
            tooltip: 'معاينة',
            onPressed: path.isEmpty ? null : () => _togglePreview(id, path),
          ),
          onTap: () => _savePreference(id),
        ),
      ),
    );
  }

  Future<void> _togglePreview(String id, String path) async {
    if (!_playableOptions.any((o) => o['id'] == id)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text(_noApprovedMessage)),
        );
      }
      return;
    }
    if (_playingId == id) {
      await _player.stop();
      if (mounted) setState(() => _playingId = null);
      return;
    }
    await _player.stop();
    try {
      await _player.play(AssetSource(path.replaceFirst('assets/', '')));
      if (mounted) setState(() => _playingId = id);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'تعذر تشغيل المعاينة. تأكد من وجود الملف على الجهاز.',
            ),
          ),
        );
      }
    }
  }
}
