/// Rahma mobile app root widget — Arabic-RTL, single public endpoint.
///
/// Light + dark themes via [ThemeMode.system]. Bottom-nav shell wraps
/// the 5 primary tabs; deep routes (e.g. /game, /donations) are
/// stack-pushed from the relevant tab.
library;

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'nav/bottom_nav.dart';
import 'screens/ask_sheikh_screen.dart';
import 'screens/children_game_screen.dart';
import 'screens/donation_screen.dart';
import 'screens/dua_screen.dart';
import 'screens/hadith_screen.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/quran_screen.dart';
import 'screens/settings_screen.dart';
import 'theme/rahma_theme.dart';

class RahmaApp extends StatefulWidget {
  const RahmaApp({super.key});
  @override
  State<RahmaApp> createState() => _RahmaAppState();
}

class _RahmaAppState extends State<RahmaApp> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final tabs = <Widget>[
      const HomeScreen(),
      const DuaScreen(),
      const AskSheikhScreen(),
      const QuranScreen(),
      const SettingsScreen(),
    ];
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
      themeMode: ThemeMode.system,
      theme: RahmaTheme.light(),
      darkTheme: RahmaTheme.dark(),
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child ?? const SizedBox.shrink(),
      ),
      home: Scaffold(
        body: tabs[_tab],
        bottomNavigationBar: RahmaBottomNav(
          currentIndex: _tab,
          onTap: (i) => setState(() => _tab = i),
        ),
      ),
      routes: {
        '/onboarding': (_) => const OnboardingScreen(),
        '/hadith':     (_) => const HadithScreen(),
        '/game':       (_) => const ChildrenGameScreen(),
        '/donations':  (_) => const DonationScreen(),
      },
    );
  }
}
