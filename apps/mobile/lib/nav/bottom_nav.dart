/// Bottom navigation shell for the Rahma mobile app.
///
/// Five tabs (Arabic labels):
///   1. الرئيسية
///   2. الأذكار والدعاء
///   3. اسأل الشيخ
///   4. المكتبة
///   5. الإعدادات
///
/// Tab routes are resolved by [RahmaApp]'s router; this widget only renders
/// the BottomNavigationBar shell.
library;

import 'package:flutter/material.dart';

class RahmaBottomNav extends StatelessWidget {
  const RahmaBottomNav({super.key, required this.currentIndex, required this.onTap});
  final int currentIndex;
  final void Function(int) onTap;

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTap,
      type: BottomNavigationBarType.fixed,
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home),         label: 'الرئيسية'),
        BottomNavigationBarItem(icon: Icon(Icons.spa),          label: 'الأذكار والدعاء'),
        BottomNavigationBarItem(icon: Icon(Icons.question_answer), label: 'اسأل الشيخ'),
        BottomNavigationBarItem(icon: Icon(Icons.menu_book),    label: 'المكتبة'),
        BottomNavigationBarItem(icon: Icon(Icons.settings),     label: 'الإعدادات'),
      ],
    );
  }
}
