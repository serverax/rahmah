import 'package:flutter/material.dart';
import '../api/rahma_api_client.dart';
import 'library_detail_screen.dart';

class IslamicLibraryScreen extends StatefulWidget {
  const IslamicLibraryScreen({super.key});

  @override
  State<IslamicLibraryScreen> createState() => _IslamicLibraryScreenState();
}

class _IslamicLibraryScreenState extends State<IslamicLibraryScreen> {
  final _api = RahmaApiClient();
  late Future<Map<String, dynamic>> _categoriesFuture;
  late Future<Map<String, dynamic>> _itemsFuture;
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _categoriesFuture = _api.get('/api/library/categories');
    _itemsFuture = _api.libraryItems();
  }

  void _filterByCategory(String? catId) {
    setState(() {
      _selectedCategory = catId;
      _itemsFuture = _api.libraryItems(category: catId);
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('المكتبة الإسلامية'),
        ),
        body: Column(
          children: [
            _buildCategoryBar(),
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                future: _itemsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('خطأ: ${snapshot.error}'));
                  }
                  final data = snapshot.data!;
                  final List items = data['items'] ?? [];

                  if (items.isEmpty) {
                    return const Center(child: Text('لا يوجد محتوى متاح حالياً.'));
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    itemBuilder: (context, i) {
                      final item = items[i];
                      return Card(
                        child: ListTile(
                          title: Text(item['title_ar'] ?? ''),
                          subtitle: Text(item['category'] ?? ''),
                          trailing: const Icon(Icons.chevron_left),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => LibraryDetailScreen(itemId: item['id']),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      );

  Widget _buildCategoryBar() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _categoriesFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();
        final List cats = snapshot.data!['categories'] ?? [];
        return SizedBox(
          height: 60,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            itemCount: cats.length + 1,
            itemBuilder: (context, i) {
              if (i == 0) {
                return Padding(
                  padding: const EdgeInsets.all(4.0),
                  child: FilterChip(
                    label: const Text('الكل'),
                    selected: _selectedCategory == null,
                    onSelected: (_) => _filterByCategory(null),
                  ),
                );
              }
              final c = cats[i - 1];
              return Padding(
                padding: const EdgeInsets.all(4.0),
                child: FilterChip(
                  label: Text(c['title_ar'] ?? ''),
                  selected: _selectedCategory == c['id'],
                  onSelected: (_) => _filterByCategory(c['id']),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
