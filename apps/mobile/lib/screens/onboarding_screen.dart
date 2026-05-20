import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../widgets/rahma_widgets.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _pages = [
    _OnboardingItem(
      icon: Icons.menu_book_rounded,
      title: 'القرآن وعبادتك اليومية',
      body:
          'رحمة يبدأ من القرآن والذكر ومحتوى محلي آمن يعمل بسلاسة حتى قبل تفعيل الخادم.',
    ),
    _OnboardingItem(
      icon: Icons.schedule_rounded,
      title: 'الصلاة، القبلة، والأذكار',
      body:
          'حسابات محلية هادئة، وواجهات RTL واضحة، وتنبيهات أذان تُختبر على جهاز حقيقي.',
    ),
    _OnboardingItem(
      icon: Icons.verified_user_rounded,
      title: 'اسأل الشيخ حسن بمصادر موثوقة',
      body:
          'المساعد يراجع الأدلة أولاً، ثم يرفع المسودة للمراجعة قبل أن تظهر للعامة.',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RahmaScaffold(
      body: Padding(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 20),
        child: Column(
          children: [
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: _complete,
                child: const Text('تخطي'),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (value) => setState(() => _page = value),
                itemCount: _pages.length,
                itemBuilder: (_, index) {
                  final item = _pages[index];
                  return Center(
                    child: Rahma3DCard(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 84,
                            height: 84,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: [
                                  RahmaColors.gold,
                                  RahmaColors.warmGold,
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color:
                                      RahmaColors.gold.withValues(alpha: 0.28),
                                  blurRadius: 18,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Icon(
                              item.icon,
                              color: RahmaColors.deepEmerald,
                              size: 40,
                            ),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            item.title,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            item.body,
                            style: Theme.of(context)
                                .textTheme
                                .bodyLarge
                                ?.copyWith(height: 1.8),
                          ),
                          const SizedBox(height: 18),
                          const RahmaStatusBadge(
                            label:
                                'خصوصية أولاً - محتوى عربي RTL - مصادر موثوقة',
                            icon: Icons.verified_outlined,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _pages.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _page == index ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _page == index
                        ? RahmaColors.gold
                        : RahmaColors.gold.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 18),
            RahmaPrimaryButton(
              label: _page == _pages.length - 1 ? 'بدء الاستخدام' : 'متابعة',
              icon: Icons.arrow_back_rounded,
              onPressed: () {
                if (_page == _pages.length - 1) {
                  _complete();
                } else {
                  _controller.nextPage(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOut,
                  );
                }
              },
            ),
            const SizedBox(height: 10),
            Text(
              'لن نعرض أخطاء تقنية للمستخدم. المحتوى المحلي يبقى متاحاً عند غياب الاتصال.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _complete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('rahma_onboarding_complete', true);
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/app');
  }
}

class _OnboardingItem {
  const _OnboardingItem({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;
}
