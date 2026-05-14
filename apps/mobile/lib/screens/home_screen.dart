import 'package:flutter/material.dart';

class _Tile {
  const _Tile(this.title, this.route, this.icon);
  final String title;
  final String route;
  final IconData icon;
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
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
        appBar: AppBar(title: const Text('رحمة — الرئيسية')),
        body: GridView.builder(
          padding: const EdgeInsets.all(16),
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
      );
}
