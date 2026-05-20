/// Rahma — premium Islamic Material 3 theme.
library;

import 'package:flutter/material.dart';

class RahmaTheme {
  static const emerald = Color(0xFF0F5D4A);
  static const deepEmerald = Color(0xFF0A2E28);
  static const teal = Color(0xFF0E7C66);
  static const gold = Color(0xFFD8A441);
  static const warmGold = Color(0xFFE8C97D);
  static const sand = Color(0xFFF3E7D0);
  static const cream = Color(0xFFFFF8EA);
  static const moonWhite = Color(0xFFF8F5EC);
  static const night = Color(0xFF071B1A);
  static const nightSoft = Color(0xFF0D2522);
  static const mist = Color(0xFFE8F1EC);
  static const calmBlue = Color(0xFF2F80ED);
  static const mutedRed = Color(0xFFC94C4C);
  static const amber = Color(0xFFE8A928);
  static const surfaceDark = Color(0xFF112B27);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: emerald,
      brightness: Brightness.light,
      surface: cream,
      primary: emerald,
      secondary: gold,
    ).copyWith(
      tertiary: calmBlue,
      error: mutedRed,
    );
    return _base(scheme).copyWith(
      scaffoldBackgroundColor: cream,
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: deepEmerald,
      ),
    );
  }

  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
      seedColor: emerald,
      brightness: Brightness.dark,
      surface: surfaceDark,
      primary: gold,
      secondary: warmGold,
    ).copyWith(
      tertiary: calmBlue,
      error: mutedRed,
    );
    return _base(scheme).copyWith(
      scaffoldBackgroundColor: night,
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: moonWhite,
      ),
    );
  }

  static ThemeData _base(ColorScheme scheme) => ThemeData(
        useMaterial3: true,
        colorScheme: scheme,
        fontFamily: 'Noto Naskh Arabic',
        fontFamilyFallback: const ['Amiri', 'Segoe UI', 'Roboto', 'Arial'],
        textTheme: Typography.material2021().black.copyWith(
              displaySmall: const TextStyle(
                fontWeight: FontWeight.w900,
                letterSpacing: 0,
                height: 1.1,
              ),
              headlineSmall: const TextStyle(
                fontWeight: FontWeight.w800,
                letterSpacing: 0,
                height: 1.2,
              ),
              titleLarge: const TextStyle(
                fontWeight: FontWeight.w800,
                letterSpacing: 0,
                height: 1.2,
              ),
              titleMedium: const TextStyle(
                fontWeight: FontWeight.w700,
                letterSpacing: 0,
                height: 1.25,
              ),
              bodyLarge: const TextStyle(
                height: 1.6,
                letterSpacing: 0,
              ),
              bodyMedium: const TextStyle(
                height: 1.55,
                letterSpacing: 0,
              ),
              bodySmall: const TextStyle(
                height: 1.45,
                letterSpacing: 0,
              ),
            ),
        cardTheme: CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        ),
        navigationBarTheme: NavigationBarThemeData(
          height: 78,
          backgroundColor: scheme.surface.withValues(alpha: 0.82),
          indicatorColor: scheme.primary.withValues(alpha: 0.16),
          labelTextStyle: WidgetStateProperty.all(
            const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0),
          ),
        ),
        chipTheme: ChipThemeData(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          labelStyle: const TextStyle(fontWeight: FontWeight.w700),
          side: BorderSide(color: scheme.primary.withValues(alpha: 0.16)),
          backgroundColor: scheme.surface.withValues(alpha: 0.74),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size(0, 48),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: scheme.surface.withValues(alpha: 0.78),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(
              color: scheme.primary.withValues(alpha: 0.55),
              width: 1.2,
            ),
          ),
        ),
        iconTheme: IconThemeData(color: scheme.primary),
        dividerTheme: DividerThemeData(
          color: scheme.outlineVariant.withValues(alpha: 0.25),
        ),
      );
}
