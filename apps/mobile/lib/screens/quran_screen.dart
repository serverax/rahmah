import 'package:flutter/material.dart';
import '../nav/sync_status_indicator.dart';
import '../api/rahma_api_client.dart';
import 'quran_reader_screen.dart';

class QuranScreen extends StatefulWidget {
  const QuranScreen({super.key});

  @override
  State<QuranScreen> createState() => _QuranScreenState();
}

class _QuranScreenState extends State<QuranScreen> {
  final _api = RahmaApiClient();
  late Future<Map<String, dynamic>> _surahsFuture;

  @override
  void initState() {
    super.initState();
    _surahsFuture = _api.quranSurahs();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('القرآن الكريم'),
          actions: const [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SyncStatusIndicator(isOnline: true, isSyncing: false),
            ),
          ],
        ),
        body: FutureBuilder<Map<String, dynamic>>(
          future: _surahsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text('خطأ: ${snapshot.error}', textAlign: TextAlign.center)));
            }
            final data = snapshot.data!;
            final List items = data['items'] ?? [];

            if (items.isEmpty) {
              return const Center(child: Text('لا توجد سور متاحة حالياً.'));
            }

            return ListView.builder(
              itemCount: items.length,
              itemBuilder: (context, i) {
                final s = items[i];
                return ListTile(
                  leading: CircleAvatar(child: Text('${s['id']}')),
                  title: Text(s['name_ar'] ?? ''),
                  subtitle: Text(s['name_en'] ?? ''),
                  trailing: const Icon(Icons.chevron_left),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => QuranReaderScreen(
                          surahId: s['id'],
                          surahName: s['name_ar'] ?? '',
                        ),
                      ),
                    );
                  },
                );
              },
            );
          },
        ),
      );
}
