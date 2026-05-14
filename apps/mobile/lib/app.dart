/// Rahma mobile app root widget — Arabic-RTL, single public endpoint.
///
/// The router is intentionally minimal: a small fixed set of screens. No
/// public website, no public admin dashboard. The app shell renders even
/// when the API is not configured — most screens fall back to offline /
/// "not yet configured" copy.
library;

import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'screens/ask_sheikh_screen.dart';
import 'screens/children_game_screen.dart';
import 'screens/donation_screen.dart';
import 'screens/dua_screen.dart';
import 'screens/hadith_screen.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/quran_screen.dart';
import 'screens/settings_screen.dart';

class RahmaApp extends StatelessWidget {
  const RahmaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rahma',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child ?? const SizedBox.shrink(),
      ),
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
      ),
      initialRoute: '/onboarding',
      routes: {
        '/onboarding': (_) => const OnboardingScreen(),
        '/home':       (_) => const HomeScreen(),
        '/quran':      (_) => const QuranScreen(),
        '/hadith':     (_) => const HadithScreen(),
        '/dua':        (_) => const DuaScreen(),
        '/ask':        (_) => const AskSheikhScreen(),
        '/game':       (_) => const ChildrenGameScreen(),
        '/donations':  (_) => const DonationScreen(),
        '/settings':   (_) => const SettingsScreen(),
      },
    );
  }
}
