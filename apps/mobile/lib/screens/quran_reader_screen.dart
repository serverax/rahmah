import 'package:flutter/material.dart';
import '../api/rahma_api_client.dart';

class QuranReaderScreen extends StatefulWidget {
  const QuranReaderScreen({super.key, required this.surahId, required this.surahName});

  final int surahId;
  final String surahName;

  @override
  State<QuranReaderScreen> createState() => _QuranReaderScreenState();
}

class _QuranReaderScreenState extends State<QuranReaderScreen> {
  final _api = RahmaApiClient();
  late Future<Map<String, dynamic>> _detailFuture;
  late Future<Map<String, dynamic>> _statusFuture;

  @override
  void initState() {
    super.initState();
    _detailFuture = _api.quranSurahDetail(widget.surahId);
    _statusFuture = _api.get('/api/quran/status'); // Manual call for status
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(widget.surahName),
        ),
        body: Column(
          children: [
            _buildStatusHeader(),
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                future: _detailFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('خطأ: ${snapshot.error}'));
                  }
                  final data = snapshot.data!;
                  final List ayahs = data['ayahs'] ?? [];

                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: ayahs.length,
                    separatorBuilder: (context, i) => const Divider(),
                    itemBuilder: (context, i) {
                      final a = ayahs[i];
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            a['text_uthmani'] ?? '',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontFamily: 'Amiri',
                              fontSize: 24,
                              height: 2.0,
                            ),
                            textDirection: TextDirection.rtl,
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('آية ${a['ayah_number']}', style: Theme.of(context).textTheme.bodySmall),
                              IconButton(
                                icon: const Icon(Icons.bookmark_border, size: 20),
                                onPressed: () {
                                  // TODO: Bookmark
                                },
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      );

  Widget _buildStatusHeader() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _statusFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();
        final data = snapshot.data!;
        if (data['is_sample_mode'] == true) {
          return Container(
            color: Colors.orange.shade100,
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            child: Text(
              data['sample_note_ar'] ?? 'وضع العينة: المحتوى محدود.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }
}
