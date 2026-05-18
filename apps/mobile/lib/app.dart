import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'nav/bottom_nav.dart';
import 'screens/home_screen.dart';
import 'screens/quran_screen.dart';
import 'screens/ask_sheikh_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/hadith_screen.dart';
import 'screens/children_game_screen.dart';
import 'screens/donation_screen.dart';
import 'screens/dua_screen.dart';
import 'screens/library_screen.dart';
import 'screens/azan_audio_settings_screen.dart';
import 'theme/rahma_theme.dart';

class RahmaApp extends StatelessWidget {
  const RahmaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rahma',
      debugShowCheckedModeBanner: false,
      theme: RahmaTheme.light(),
      darkTheme: RahmaTheme.dark(),
      themeMode: ThemeMode.system,
      // Arabic/RTL first
      locale: const Locale('ar'),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ar'),
        Locale('en'),
      ],

      initialRoute: '/',
      routes: {
        '/':           (_) => const BottomNavShell(),
        '/home':        (_) => const HomeScreen(),
        '/quran':       (_) => const QuranScreen(),
        '/ask':         (_) => const AskSheikhScreen(),
        '/dua':         (_) => const DuaScreen(),
        '/library':     (_) => const IslamicLibraryScreen(),
        '/settings':    (_) => const SettingsScreen(),
        '/onboarding':  (_) => const OnboardingScreen(),
        '/hadith':      (_) => const HadithScreen(),
        '/game':        (_) => const ChildrenGameScreen(),
        '/donations':   (_) => const DonationScreen(),
        '/settings/azan-audio': (_) => const AzanAudioSettingsScreen(),
      },
    );
  }
}

class BottomNavShell extends StatefulWidget {
  const BottomNavShell({super.key});

  @override
  State<BottomNavShell> createState() => _BottomNavShellState();
}

class _BottomNavShellState extends State<BottomNavShell> {
  int _index = 0;

  final _screens = const [
    HomeScreen(),
    DuaScreen(),
    AskSheikhScreen(),
    IslamicLibraryScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: _screens,
      ),
      bottomNavigationBar: RahmaBottomNav(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
      ),
    );
  }
}
