import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../widgets/rahma_widgets.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _routeNext();
  }

  Future<void> _routeNext() async {
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    final prefs = await SharedPreferences.getInstance();
    final onboardingDone = prefs.getBool('rahma_onboarding_complete') ?? false;
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(
      onboardingDone ? '/app' : '/onboarding',
    );
  }

  @override
  Widget build(BuildContext context) {
    return RahmaScaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Rahma3DCard(
            padding: const EdgeInsets.all(28),
            gradient: const LinearGradient(
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
              colors: [RahmaColors.emerald, RahmaColors.deepEmerald],
            ),
            borderColor: RahmaColors.gold.withValues(alpha: 0.28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        RahmaColors.gold.withValues(alpha: 0.34),
                        RahmaColors.gold.withValues(alpha: 0.08),
                      ],
                    ),
                  ),
                  child: const Icon(
                    Icons.brightness_3_rounded,
                    size: 54,
                    color: RahmaColors.moonWhite,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'رحمة',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'رفيقك اليومي للقرآن، الأذكار، الصلاة، والسؤال الموثوق',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.82),
                      ),
                ),
                const SizedBox(height: 22),
                const CircularProgressIndicator(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
