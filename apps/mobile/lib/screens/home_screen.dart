import 'package:flutter/material.dart';
import '../nav/sync_status_indicator.dart';
import '../api/rahma_api_client.dart';
import '../services/location_service.dart';

class _Tile {
  const _Tile(this.title, this.route, this.icon);
  final String title;
  final String route;
  final IconData icon;
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = RahmaApiClient();
  final _locationService = LocationService();
  Future<Map<String, dynamic>>? _prayerFuture;
  LocationResult? _currentLocation;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  Future<void> _refreshData() async {
    final loc = await _locationService.getCurrentLocation();
    if (mounted) {
      setState(() {
        _currentLocation = loc;
        _prayerFuture = _api.prayerTimes(loc.latitude, loc.longitude);
      });
    }
  }

  static const _tiles = [
    _Tile('القرآن', '/quran', Icons.menu_book),
    _Tile('الحديث', '/hadith', Icons.history_edu),
    _Tile('الأذكار والدعاء', '/dua', Icons.spa),
    _Tile('اسأل الشيخ', '/ask', Icons.question_answer),
    _Tile('لعبة الأطفال', '/game', Icons.toys),
    _Tile('التبرعات', '/donations', Icons.volunteer_activism),
    _Tile('الإعدادات', '/settings', Icons.settings),
  ];

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('رحمة — الرئيسية'),
          actions: const [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SyncStatusIndicator(isOnline: true, isSyncing: false),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: _refreshData,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildPrayerSummary(),
              const SizedBox(height: 24),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: _tiles.length,
                itemBuilder: (context, i) {
                  final t = _tiles[i];
                  return Card(
                    child: InkWell(
                      onTap: () => Navigator.pushNamed(context, t.route),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(t.icon, size: 40),
                            const SizedBox(height: 8),
                            Text(t.title, textAlign: TextAlign.center),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      );

  Widget _buildPrayerSummary() {
    if (_prayerFuture == null) {
      return const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())));
    }

    return FutureBuilder<Map<String, dynamic>>(
      future: _prayerFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())));
        }
        if (snapshot.hasError) {
          return Card(child: Padding(padding: const EdgeInsets.all(16), child: Text('خطأ في الاتصال: ${snapshot.error}')));
        }
        final data = snapshot.data!;
        final next = data['next_prayer'] ?? {};

        String sourceLabel = '';
        switch (_currentLocation?.source) {
          case 'gps': sourceLabel = 'إحداثيات GPS'; break;
          case 'manual': sourceLabel = 'موقع يدوي'; break;
          case 'stored': sourceLabel = 'موقع محفوظ'; break;
          case 'fallback': sourceLabel = 'موقع افتراضي (مكة)'; break;
        }

        return Card(
          color: Theme.of(context).colorScheme.primaryContainer,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text('الصلاة القادمة: ${next['next'] ?? '--'}', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(next['time'] ?? '--:--', style: Theme.of(context).textTheme.displayMedium),
                const SizedBox(height: 8),
                Text('يتبقى ${next['countdown'] ?? '--'}', style: Theme.of(context).textTheme.bodyMedium),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('الموقع: $sourceLabel', style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic)),
                        if (_currentLocation?.error != null)
                          Text('تنبيه: ${_currentLocation!.error}', style: const TextStyle(fontSize: 10, color: Colors.red)),
                      ],
                    ),
                    TextButton.icon(
                      onPressed: _showManualLocationDialog,
                      icon: const Icon(Icons.edit_location, size: 14),
                      label: const Text('تغيير', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }  void _showManualLocationDialog() {
    final latController = TextEditingController();
    final lngController = TextEditingController();
    showDialog(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('تحديد الموقع يدوياً'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: latController, decoration: const InputDecoration(labelText: 'خط العرض (Latitude)'), keyboardType: TextInputType.number),
            TextField(controller: lngController, decoration: const InputDecoration(labelText: 'خط الطول (Longitude)'), keyboardType: TextInputType.number),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              final lat = double.tryParse(latController.text);
              final lng = double.tryParse(lngController.text);
              if (lat != null && lng != null) {
                await _locationService.saveLocation(lat, lng, 'manual');
                if (mounted) {
                  Navigator.pop(c);
                  _refreshData();
                }
              }
            },
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
  }
}
