/// Rahma — Material 3 theme (light + dark).
library;

import 'package:flutter/material.dart';

class RahmaTheme {
  static const _seed = Color(0xFF0F766E);

  static ThemeData light() => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: ColorScheme.fromSeed(seedColor: _seed, brightness: Brightness.light),
      );

  static ThemeData dark() => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(seedColor: _seed, brightness: Brightness.dark),
      );
}
