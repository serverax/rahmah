import 'package:flutter/material.dart';

class ChildrenGameScreen extends StatelessWidget {
  const ChildrenGameScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('حديقة الحسنات')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'لعبة الأطفال الإسلامية تعمل محلياً بدون الحاجة إلى اتصال. '
              'لا يتم جمع أي بيانات شخصية من الطفل.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
}
