import 'package:flutter/material.dart';
import '../api/rahma_api_client.dart';

class LibraryDetailScreen extends StatefulWidget {
  const LibraryDetailScreen({super.key, required this.itemId});

  final dynamic itemId;

  @override
  State<LibraryDetailScreen> createState() => _LibraryDetailScreenState();
}

class _LibraryDetailScreenState extends State<LibraryDetailScreen> {
  final _api = RahmaApiClient();
  late Future<Map<String, dynamic>> _detailFuture;

  @override
  void initState() {
    super.initState();
    _detailFuture = _api.get('/api/library/items/${widget.itemId}');
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('تفاصيل المحتوى'),
        ),
        body: FutureBuilder<Map<String, dynamic>>(
          future: _detailFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('خطأ: ${snapshot.error}'));
            }
            final data = snapshot.data!;

            return ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text(data['title_ar'] ?? '', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.verified, color: Colors.green, size: 16),
                    const SizedBox(width: 4),
                    Text('محتوى معتمد', style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    Text(data['category'] ?? '', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
                const Divider(height: 32),
                Text(
                  data['content'] ?? '',
                  style: const TextStyle(fontSize: 18, height: 1.6),
                  textDirection: TextDirection.rtl,
                ),
                const SizedBox(height: 32),
                if (data['source_name_ar'] != null) ...[
                  const Text('المصدر:', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(data['source_name_ar'], style: Theme.of(context).textTheme.bodySmall),
                ],
                if (data['citations'] != null) ...[
                  const SizedBox(height: 8),
                  const Text('الاستشهادات:', style: TextStyle(fontWeight: FontWeight.bold)),
                  ...(data['citations'] as List).map((c) => Text('• $c', style: Theme.of(context).textTheme.bodySmall)),
                ],
              ],
            );
          },
        ),
      );
}
