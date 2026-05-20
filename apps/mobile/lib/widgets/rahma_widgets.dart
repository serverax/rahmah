library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/rahma_theme.dart';

class RahmaColors {
  static const emerald = RahmaTheme.emerald;
  static const deepEmerald = RahmaTheme.deepEmerald;
  static const teal = RahmaTheme.teal;
  static const gold = RahmaTheme.gold;
  static const warmGold = RahmaTheme.warmGold;
  static const sand = RahmaTheme.sand;
  static const cream = RahmaTheme.cream;
  static const moonWhite = RahmaTheme.moonWhite;
  static const night = RahmaTheme.night;
  static const nightSoft = RahmaTheme.nightSoft;
  static const mist = RahmaTheme.mist;
  static const calmBlue = RahmaTheme.calmBlue;
  static const mutedRed = RahmaTheme.mutedRed;
  static const amber = RahmaTheme.amber;
}

class RahmaScaffold extends StatelessWidget {
  const RahmaScaffold({
    super.key,
    this.title,
    this.subtitle,
    this.actions,
    required this.body,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.extendBodyBehindAppBar = true,
    this.appBar,
  });

  final String? title;
  final String? subtitle;
  final List<Widget>? actions;
  final Widget body;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final bool extendBodyBehindAppBar;
  final PreferredSizeWidget? appBar;

  @override
  Widget build(BuildContext context) {
    final resolvedAppBar = appBar ??
        (title == null
            ? null
            : AppBar(
                backgroundColor: Colors.transparent,
                elevation: 0,
                titleSpacing: 20,
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title!),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                      ),
                  ],
                ),
                actions: actions,
              ));

    return Scaffold(
      extendBodyBehindAppBar: extendBodyBehindAppBar,
      backgroundColor: Colors.transparent,
      appBar: resolvedAppBar,
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const RahmaFloatingIslamicBackground(),
          SafeArea(
            child: body,
          ),
        ],
      ),
    );
  }
}

class RahmaFloatingIslamicBackground extends StatelessWidget {
  const RahmaFloatingIslamicBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            Color(0xFF041211),
            Color(0xFF071F1D),
            Color(0xFF0A352F),
            Color(0xFF061615),
          ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          PositionedDirectional(
            top: -60,
            end: -30,
            child: _GlowOrb(
              color: RahmaColors.gold.withValues(alpha: 0.26),
              size: 200,
            ),
          ),
          PositionedDirectional(
            top: 72,
            start: -44,
            child: _GlowOrb(
              color: RahmaColors.teal.withValues(alpha: 0.18),
              size: 150,
            ),
          ),
          PositionedDirectional(
            bottom: -34,
            end: -26,
            child: _GlowOrb(
              color: RahmaColors.calmBlue.withValues(alpha: 0.13),
              size: 180,
            ),
          ),
          Positioned.fill(
            child: Opacity(
              opacity: 0.30,
              child: CustomPaint(painter: _IslamicPatternPainter()),
            ),
          ),
          PositionedDirectional(
            top: 20,
            end: 24,
            child: _FloatingIcon(
              icon: Icons.dark_mode_rounded,
              color: RahmaColors.moonWhite.withValues(alpha: 0.85),
              accent: RahmaColors.gold.withValues(alpha: 0.28),
              size: 68,
            ),
          ),
          PositionedDirectional(
            bottom: 90,
            start: 18,
            child: _FloatingIcon(
              icon: Icons.emoji_objects_outlined,
              color: RahmaColors.gold.withValues(alpha: 0.85),
              accent: RahmaColors.teal.withValues(alpha: 0.26),
              size: 74,
            ),
          ),
        ],
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.color, required this.size});
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
        ),
      );
}

class _FloatingIcon extends StatelessWidget {
  const _FloatingIcon({
    required this.icon,
    required this.color,
    required this.accent,
    required this.size,
  });

  final IconData icon;
  final Color color;
  final Color accent;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: -0.08,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(size * 0.32),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              accent.withValues(alpha: 0.75),
              color.withValues(alpha: 0.2),
            ],
          ),
          border: Border.all(color: color.withValues(alpha: 0.26)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.18),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Icon(icon, color: color, size: size * 0.48),
      ),
    );
  }
}

class _IslamicPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = RahmaColors.gold.withValues(alpha: 0.12);
    final center = Offset(size.width * 0.5, size.height * 0.45);
    final radius = math.min(size.width, size.height) * 0.34;
    for (var i = 0; i < 8; i++) {
      final angle = i * math.pi / 4;
      final p1 = center + Offset(math.cos(angle), math.sin(angle)) * radius;
      final p2 = center +
          Offset(math.cos(angle + math.pi / 8), math.sin(angle + math.pi / 8)) *
              (radius * 0.82);
      canvas.drawLine(p1, p2, paint);
    }
    canvas.drawCircle(center, radius * 0.45, paint);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(size.width * 0.18, size.height * 0.22),
          width: 90,
          height: 44,
        ),
        const Radius.circular(22),
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class Rahma3DCard extends StatelessWidget {
  const Rahma3DCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.gradient,
    this.borderColor,
    this.margin,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Gradient? gradient;
  final Color? borderColor;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final decoration = BoxDecoration(
      gradient: gradient ??
          LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: dark
                ? [
                    const Color(0xFF163A33).withValues(alpha: 0.88),
                    const Color(0xFF0C2320).withValues(alpha: 0.92),
                  ]
                : [
                    Colors.white.withValues(alpha: 0.82),
                    RahmaColors.moonWhite.withValues(alpha: 0.90),
                  ],
          ),
      borderRadius: BorderRadius.circular(26),
      border: Border.all(
        color: borderColor ??
            (dark
                ? RahmaColors.gold.withValues(alpha: 0.24)
                : RahmaColors.teal.withValues(alpha: 0.16)),
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: dark ? 0.36 : 0.12),
          blurRadius: 28,
          offset: const Offset(0, 16),
        ),
      ],
    );

    final content = Container(
      width: double.infinity,
      margin: margin,
      padding: padding,
      decoration: decoration,
      child: child,
    );
    if (onTap == null) return content;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(26),
        onTap: onTap,
        child: content,
      ),
    );
  }
}

class RahmaLuxuryIslamicHero extends StatelessWidget {
  const RahmaLuxuryIslamicHero({
    super.key,
    this.title = 'السلام عليكم ورحمة الله',
    this.subtitle = 'مرحباً بك في تطبيق رحمة',
    this.badge = 'رحمة',
  });

  final String title;
  final String subtitle;
  final String badge;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 292,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(34),
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            Color(0xFF061615),
            Color(0xFF092A28),
            Color(0xFF0E4D3F),
          ],
        ),
        border: Border.all(color: RahmaColors.gold.withValues(alpha: 0.42)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.32),
            blurRadius: 38,
            offset: const Offset(0, 22),
          ),
          BoxShadow(
            color: RahmaColors.gold.withValues(alpha: 0.18),
            blurRadius: 44,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Positioned.fill(
              child: CustomPaint(painter: _LuxuryPatternPainter()),
            ),
            PositionedDirectional(
              top: -80,
              start: -60,
              child: _GlowOrb(
                color: RahmaColors.gold.withValues(alpha: 0.35),
                size: 230,
              ),
            ),
            PositionedDirectional(
              bottom: -120,
              end: -50,
              child: _GlowOrb(
                color: RahmaColors.teal.withValues(alpha: 0.30),
                size: 260,
              ),
            ),
            PositionedDirectional(
              top: 14,
              end: 18,
              child: CustomPaint(
                size: const Size(68, 94),
                painter: _LuxuryLanternPainter(),
              ),
            ),
            PositionedDirectional(
              bottom: 14,
              end: 6,
              child: Transform(
                alignment: Alignment.center,
                transform: Matrix4.identity()
                  ..setEntry(3, 2, 0.001)
                  ..rotateY(-0.18)
                  ..rotateZ(-0.02),
                child: CustomPaint(
                  size: const Size(150, 152),
                  painter: _MihrabQuranPainter(),
                ),
              ),
            ),
            PositionedDirectional(
              top: 18,
              start: 16,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.nightlight_round,
                    color: RahmaColors.warmGold,
                    size: 20,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    badge,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: RahmaColors.warmGold,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ],
              ),
            ),
            PositionedDirectional(
              start: 18,
              end: 120,
              top: 78,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    textDirection: TextDirection.rtl,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: RahmaColors.moonWhite,
                      fontWeight: FontWeight.w900,
                      height: 1.18,
                      shadows: [
                        Shadow(
                          color: Colors.black.withValues(alpha: 0.38),
                          blurRadius: 14,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    subtitle,
                    textDirection: TextDirection.rtl,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: RahmaColors.warmGold,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 16),
                  const RahmaServiceStatusPill(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class RahmaLuxuryPrayerCard extends StatelessWidget {
  const RahmaLuxuryPrayerCard({
    super.key,
    this.prayerName = 'العصر',
    this.time = '03:45 م',
  });

  final String prayerName;
  final String time;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            RahmaColors.moonWhite.withValues(alpha: 0.22),
            RahmaColors.deepEmerald.withValues(alpha: 0.78),
            RahmaColors.night.withValues(alpha: 0.92),
          ],
        ),
        border: Border.all(color: RahmaColors.gold.withValues(alpha: 0.46)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 28,
            offset: const Offset(0, 18),
          ),
          BoxShadow(
            color: RahmaColors.gold.withValues(alpha: 0.14),
            blurRadius: 34,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        children: [
          PositionedDirectional(
            end: 18,
            top: 8,
            child: Icon(
              Icons.account_balance_rounded,
              color: RahmaColors.gold.withValues(alpha: 0.20),
              size: 96,
            ),
          ),
          PositionedDirectional(
            start: 8,
            bottom: -18,
            child: _GlowOrb(
              color: RahmaColors.gold.withValues(alpha: 0.30),
              size: 130,
            ),
          ),
          Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const RadialGradient(
                    colors: [RahmaColors.warmGold, RahmaColors.gold],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: RahmaColors.gold.withValues(alpha: 0.28),
                      blurRadius: 22,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.access_time_filled_rounded,
                  color: RahmaColors.deepEmerald,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'الصلاة القادمة: $prayerName',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: RahmaColors.moonWhite,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'توقيت محلي قابل للتحديث',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color:
                                RahmaColors.moonWhite.withValues(alpha: 0.70),
                          ),
                    ),
                  ],
                ),
              ),
              Text(
                time,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: RahmaColors.warmGold,
                  fontWeight: FontWeight.w900,
                  shadows: [
                    Shadow(
                      color: RahmaColors.gold.withValues(alpha: 0.48),
                      blurRadius: 18,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class RahmaServiceStatusPill extends StatelessWidget {
  const RahmaServiceStatusPill({super.key});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          color: RahmaColors.moonWhite.withValues(alpha: 0.10),
          border: Border.all(color: RahmaColors.gold.withValues(alpha: 0.34)),
          boxShadow: [
            BoxShadow(
              color: RahmaColors.gold.withValues(alpha: 0.12),
              blurRadius: 18,
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(
              Icons.hourglass_top_rounded,
              color: RahmaColors.warmGold,
              size: 16,
            ),
            const SizedBox(width: 7),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'غير متاح مؤقتاً',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: RahmaColors.warmGold,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  Text(
                    'سيتم تفعيل الخدمة قريباً بإذن الله',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: RahmaColors.moonWhite.withValues(alpha: 0.78),
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class RahmaLuxuryFeatureCard extends StatelessWidget {
  const RahmaLuxuryFeatureCard({
    super.key,
    required this.title,
    required this.description,
    required this.icon,
    this.onTap,
  });

  final String title;
  final String description;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: 1,
      duration: const Duration(milliseconds: 160),
      child: Rahma3DCard(
        onTap: onTap,
        padding: const EdgeInsets.all(16),
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            RahmaColors.moonWhite.withValues(alpha: 0.12),
            const Color(0xFF123B35).withValues(alpha: 0.90),
            const Color(0xFF061615).withValues(alpha: 0.96),
          ],
        ),
        borderColor: RahmaColors.gold.withValues(alpha: 0.46),
        child: Stack(
          children: [
            PositionedDirectional(
              bottom: -30,
              start: -24,
              child: Icon(
                Icons.auto_awesome_rounded,
                color: RahmaColors.gold.withValues(alpha: 0.10),
                size: 86,
              ),
            ),
            PositionedDirectional(
              top: -24,
              end: -18,
              child: _GlowOrb(
                color: RahmaColors.gold.withValues(alpha: 0.20),
                size: 96,
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    gradient: const LinearGradient(
                      colors: [RahmaColors.deepEmerald, RahmaColors.emerald],
                    ),
                    border: Border.all(
                      color: RahmaColors.gold.withValues(alpha: 0.45),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: RahmaColors.emerald.withValues(alpha: 0.28),
                        blurRadius: 18,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Icon(icon, color: RahmaColors.warmGold, size: 28),
                ),
                Container(
                  height: 3,
                  width: 54,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(99),
                    gradient: const LinearGradient(
                      colors: [RahmaColors.gold, RahmaColors.warmGold],
                    ),
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: RahmaColors.moonWhite,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color:
                                RahmaColors.moonWhite.withValues(alpha: 0.74),
                            height: 1.35,
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LuxuryPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = RahmaColors.gold.withValues(alpha: 0.13);
    const step = 34.0;
    for (var y = -step; y < size.height + step; y += step) {
      for (var x = -step; x < size.width + step; x += step) {
        final c = Offset(x, y);
        final path = Path()
          ..moveTo(c.dx, c.dy - 12)
          ..lineTo(c.dx + 12, c.dy)
          ..lineTo(c.dx, c.dy + 12)
          ..lineTo(c.dx - 12, c.dy)
          ..close();
        canvas.drawPath(path, paint);
        canvas.drawCircle(c, 4, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _LuxuryLanternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final gold = Paint()
      ..shader = const LinearGradient(
        colors: [RahmaColors.warmGold, RahmaColors.gold],
      ).createShader(Offset.zero & size);
    final glass = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          RahmaColors.moonWhite.withValues(alpha: 0.50),
          RahmaColors.gold.withValues(alpha: 0.20),
        ],
      ).createShader(Offset.zero & size);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = RahmaColors.gold.withValues(alpha: 0.8);
    canvas.drawLine(
      Offset(size.width / 2, 0),
      Offset(size.width / 2, 12),
      stroke,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(size.width * 0.26, 12, size.width * 0.48, 12),
        const Radius.circular(8),
      ),
      gold,
    );
    final body = Path()
      ..moveTo(size.width * 0.24, 26)
      ..quadraticBezierTo(
        size.width * 0.08,
        size.height * 0.48,
        size.width * 0.30,
        size.height * 0.78,
      )
      ..lineTo(size.width * 0.70, size.height * 0.78)
      ..quadraticBezierTo(
        size.width * 0.92,
        size.height * 0.48,
        size.width * 0.76,
        26,
      )
      ..close();
    canvas.drawPath(body, glass);
    canvas.drawPath(body, stroke);
    canvas.drawCircle(
      Offset(size.width / 2, size.height * 0.52),
      10,
      Paint()..color = RahmaColors.warmGold.withValues(alpha: 0.55),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * 0.30,
          size.height * 0.78,
          size.width * 0.40,
          9,
        ),
        const Radius.circular(7),
      ),
      gold,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _MihrabQuranPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final arch = Path()
      ..moveTo(size.width * 0.18, size.height)
      ..lineTo(size.width * 0.18, size.height * 0.46)
      ..quadraticBezierTo(
        size.width * 0.50,
        -size.height * 0.08,
        size.width * 0.82,
        size.height * 0.46,
      )
      ..lineTo(size.width * 0.82, size.height)
      ..close();
    canvas.drawShadow(arch, Colors.black.withValues(alpha: 0.50), 14, true);
    canvas.drawPath(
      arch,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [RahmaColors.gold, RahmaColors.deepEmerald],
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(
      arch,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = RahmaColors.warmGold.withValues(alpha: 0.85),
    );
    final bookRect = Rect.fromLTWH(
      size.width * 0.22,
      size.height * 0.58,
      size.width * 0.56,
      size.height * 0.28,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(bookRect, const Radius.circular(10)),
      Paint()
        ..shader = const LinearGradient(
          colors: [Color(0xFF153D35), Color(0xFF09231F)],
        ).createShader(bookRect),
    );
    canvas.drawLine(
      Offset(size.width * 0.50, size.height * 0.60),
      Offset(size.width * 0.50, size.height * 0.84),
      Paint()
        ..color = RahmaColors.gold.withValues(alpha: 0.75)
        ..strokeWidth = 2,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * 0.32,
          size.height * 0.67,
          size.width * 0.36,
          8,
        ),
        const Radius.circular(5),
      ),
      Paint()..color = RahmaColors.warmGold.withValues(alpha: 0.75),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class RahmaPrimaryButton extends StatelessWidget {
  const RahmaPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final child = icon == null
        ? Text(label)
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18),
              const SizedBox(width: 8),
              Text(label),
            ],
          );
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: child,
    );
  }
}

class RahmaStatusBadge extends StatelessWidget {
  const RahmaStatusBadge({
    super.key,
    required this.label,
    this.icon,
    this.backgroundColor,
    this.foregroundColor,
  });

  final String label;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    final fg = foregroundColor ?? Theme.of(context).colorScheme.onSurface;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: backgroundColor ??
            fg.withValues(
              alpha:
                  Theme.of(context).brightness == Brightness.dark ? 0.14 : 0.08,
            ),
        border: Border.all(color: fg.withValues(alpha: 0.16)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: fg),
            const SizedBox(width: 6),
          ],
          Flexible(
            fit: FlexFit.loose,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: fg, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class RahmaCitationBox extends StatelessWidget {
  const RahmaCitationBox({
    super.key,
    required this.title,
    required this.citations,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<String> citations;

  @override
  Widget build(BuildContext context) {
    return Rahma3DCard(
      padding: const EdgeInsets.all(16),
      gradient: LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [
          RahmaColors.moonWhite.withValues(alpha: 0.10),
          const Color(0xFF123B35).withValues(alpha: 0.84),
          const Color(0xFF061615).withValues(alpha: 0.92),
        ],
      ),
      borderColor: RahmaColors.gold.withValues(alpha: 0.32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: RahmaColors.moonWhite,
                  fontWeight: FontWeight.w900,
                ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: RahmaColors.moonWhite.withValues(alpha: 0.74),
                  ),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: citations
                .map(
                  (citation) => Chip(
                    backgroundColor: RahmaColors.gold.withValues(alpha: 0.16),
                    side: BorderSide(
                      color: RahmaColors.gold.withValues(alpha: 0.28),
                    ),
                    label: Text(citation),
                    avatar: const Icon(
                      Icons.link,
                      size: 16,
                      color: RahmaColors.warmGold,
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class RahmaRagCitation {
  const RahmaRagCitation({
    required this.sourceId,
    required this.sourceTitle,
    required this.sourceType,
    required this.referenceLabel,
    this.url,
    this.localReference,
  });

  final String sourceId;
  final String sourceTitle;
  final String sourceType;
  final String referenceLabel;
  final String? url;
  final String? localReference;

  factory RahmaRagCitation.fromJson(Map<String, dynamic> json) {
    String readStr(String key) => String.fromCharCodes(
          (json[key] ?? '').toString().runes.where((r) => r != 0),
        ).trim();
    return RahmaRagCitation(
      sourceId: readStr('source_id'),
      sourceTitle: readStr('source_title'),
      sourceType: readStr('source_type'),
      referenceLabel: readStr('reference_label'),
      url: readStr('url').isEmpty ? null : readStr('url'),
      localReference: readStr('local_reference').isEmpty
          ? null
          : readStr('local_reference'),
    );
  }
}

class RahmaRagAnswerCard extends StatelessWidget {
  const RahmaRagAnswerCard({
    super.key,
    required this.safetyStatus,
    this.answer,
    this.intent,
    this.citations = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  final String safetyStatus;
  final String? answer;
  final String? intent;
  final List<RahmaRagCitation> citations;
  final bool isLoading;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const RahmaStateCard(
        title: 'جارٍ البحث في المصادر المعتمدة',
        message: 'لا يتم إنشاء إجابة دينية من الذاكرة. نتحقق من المصدر أولاً.',
        icon: Icons.hourglass_top_rounded,
        tone: RahmaStateTone.loading,
      );
    }
    if (errorMessage != null) {
      return RahmaStateCard(
        title: 'تعذّر الاتصال الآمن',
        message: errorMessage!,
        icon: Icons.wifi_off_rounded,
        tone: RahmaStateTone.error,
      );
    }

    final normalized = safetyStatus.trim();
    if (normalized.isEmpty) {
      return const RahmaStateCard(
        title: 'ابدأ بسؤال واضح',
        message: 'اكتب سؤالاً قصيراً، وستظهر الإجابة فقط إذا وُجد مصدر معتمد.',
        icon: Icons.search_rounded,
        tone: RahmaStateTone.empty,
      );
    }

    if (normalized == 'scholar_review_required') {
      return const RahmaStateCard(
        title: 'تحتاج مراجعة الشيخ',
        message:
            'هذا السؤال عالي الحساسية أو فتوى شخصية. لن تعرض رحمة جواباً آلياً غير موثق.',
        icon: Icons.verified_user_rounded,
        tone: RahmaStateTone.warning,
      );
    }
    if (normalized == 'blocked_prompt_injection') {
      return const RahmaStateCard(
        title: 'تم حظر الطلب',
        message:
            'يحتوي الطلب على تعليمات غير آمنة أو محاولة تجاوز قواعد المصادر.',
        icon: Icons.shield_rounded,
        tone: RahmaStateTone.blocked,
      );
    }
    if (normalized == 'low_confidence' ||
        normalized == 'citation_missing' ||
        normalized == 'insufficient_sources' ||
        normalized == 'unapproved_source') {
      return RahmaStateCard(
        title: 'لا توجد إجابة موثوقة كافية',
        message: normalized == 'citation_missing'
            ? 'تم رفض الإجابة لأن بيانات المصدر أو الإحالة غير مكتملة.'
            : 'لم نجد مصدراً معتمداً كافياً للإجابة بثقة.',
        icon: Icons.source_outlined,
        tone: RahmaStateTone.warning,
      );
    }

    return Rahma3DCard(
      borderColor: RahmaColors.gold.withValues(alpha: 0.34),
      gradient: LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [
          RahmaColors.moonWhite.withValues(alpha: 0.12),
          const Color(0xFF123B35).withValues(alpha: 0.88),
          const Color(0xFF061615).withValues(alpha: 0.95),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const RahmaStatusBadge(
                label: 'مصادر موثقة',
                icon: Icons.verified_rounded,
                foregroundColor: RahmaColors.teal,
              ),
              if (intent != null && intent!.isNotEmpty)
                RahmaStatusBadge(
                  label: intent!,
                  icon: Icons.category_rounded,
                  foregroundColor: RahmaColors.gold,
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            answer ?? 'تم العثور على مصدر معتمد، لكن نص الإجابة غير متاح.',
            textDirection: TextDirection.rtl,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: RahmaColors.moonWhite,
                  height: 1.8,
                ),
          ),
          const SizedBox(height: 16),
          Text(
            'المصادر والإحالات',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: RahmaColors.warmGold,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          if (citations.isEmpty)
            const RahmaStateCard(
              title: 'لا توجد إحالة',
              message: 'تم رفض أي جواب ديني لا يحمل إحالة واضحة.',
              icon: Icons.link_off_rounded,
              tone: RahmaStateTone.warning,
              compact: true,
            )
          else
            ...citations.map(
              (citation) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _CitationTile(citation: citation),
              ),
            ),
        ],
      ),
    );
  }
}

class _CitationTile extends StatelessWidget {
  const _CitationTile({required this.citation});
  final RahmaRagCitation citation;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: RahmaColors.moonWhite.withValues(alpha: 0.08),
          border: Border.all(color: RahmaColors.gold.withValues(alpha: 0.24)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              citation.sourceTitle.isEmpty
                  ? citation.sourceId
                  : citation.sourceTitle,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: RahmaColors.moonWhite,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                RahmaStatusBadge(
                  label: citation.sourceType,
                  icon: Icons.library_books_rounded,
                  foregroundColor: RahmaColors.teal,
                ),
                RahmaStatusBadge(
                  label: citation.referenceLabel,
                  icon: Icons.bookmark_rounded,
                  foregroundColor: RahmaColors.gold,
                ),
              ],
            ),
            if ((citation.localReference ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                citation.localReference!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: RahmaColors.moonWhite.withValues(alpha: 0.70),
                    ),
              ),
            ],
          ],
        ),
      );
}

enum RahmaStateTone { loading, empty, warning, blocked, error }

class RahmaStateCard extends StatelessWidget {
  const RahmaStateCard({
    super.key,
    required this.title,
    required this.message,
    required this.icon,
    required this.tone,
    this.compact = false,
  });

  final String title;
  final String message;
  final IconData icon;
  final RahmaStateTone tone;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final color = switch (tone) {
      RahmaStateTone.loading => RahmaColors.calmBlue,
      RahmaStateTone.empty => RahmaColors.teal,
      RahmaStateTone.warning => RahmaColors.amber,
      RahmaStateTone.blocked => RahmaColors.mutedRed,
      RahmaStateTone.error => RahmaColors.mutedRed,
    };
    return Rahma3DCard(
      padding: EdgeInsets.all(compact ? 12 : 16),
      borderColor: color.withValues(alpha: 0.28),
      gradient: LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [
          color.withValues(alpha: 0.13),
          const Color(0xFF123B35).withValues(alpha: 0.86),
          const Color(0xFF061615).withValues(alpha: 0.93),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: compact ? 24 : 32),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(color: color, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 6),
                Text(
                  message,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: RahmaColors.moonWhite.withValues(alpha: 0.78),
                        height: 1.55,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class RahmaPrayerHeroCard extends StatelessWidget {
  const RahmaPrayerHeroCard({
    super.key,
    required this.title,
    required this.countdown,
    required this.nextPrayer,
    required this.subtitle,
    required this.trailing,
  });

  final String title;
  final String countdown;
  final String nextPrayer;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Rahma3DCard(
      padding: const EdgeInsets.all(22),
      gradient: const LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [RahmaColors.emerald, RahmaColors.deepEmerald],
      ),
      borderColor: RahmaColors.gold.withValues(alpha: 0.30),
      child: Stack(
        children: [
          PositionedDirectional(
            end: -8,
            top: -20,
            child: Text(
              '☾',
              style: TextStyle(
                fontSize: 92,
                color: RahmaColors.gold.withValues(alpha: 0.14),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                height: 1.15,
                              ),
                    ),
                  ),
                  trailing,
                ],
              ),
              const SizedBox(height: 10),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withValues(alpha: 0.82),
                    ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      nextPrayer,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: RahmaColors.moonWhite,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  Text(
                    countdown,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: RahmaColors.gold,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class RahmaQuranAyahCard extends StatelessWidget {
  const RahmaQuranAyahCard({
    super.key,
    required this.ayah,
    required this.reference,
    this.translation,
  });

  final String ayah;
  final String reference;
  final String? translation;

  @override
  Widget build(BuildContext context) {
    return Rahma3DCard(
      padding: const EdgeInsets.all(18),
      gradient: LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [
          RahmaColors.moonWhite.withValues(alpha: 0.14),
          const Color(0xFF123B35).withValues(alpha: 0.88),
          const Color(0xFF061615).withValues(alpha: 0.94),
        ],
      ),
      borderColor: RahmaColors.gold.withValues(alpha: 0.38),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ayah,
            textAlign: TextAlign.right,
            textDirection: TextDirection.rtl,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: RahmaColors.moonWhite,
                  height: 2.0,
                  fontWeight: FontWeight.w700,
                ),
          ),
          if (translation != null) ...[
            const SizedBox(height: 12),
            Text(
              translation!,
              textDirection: TextDirection.rtl,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: RahmaColors.moonWhite.withValues(alpha: 0.78),
                    height: 1.75,
                  ),
            ),
          ],
          const SizedBox(height: 14),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: RahmaStatusBadge(
              label: reference,
              icon: Icons.auto_stories_rounded,
              backgroundColor: RahmaColors.gold.withValues(alpha: 0.14),
              foregroundColor: RahmaColors.gold,
            ),
          ),
        ],
      ),
    );
  }
}

class RahmaAdhkarCounter extends StatelessWidget {
  const RahmaAdhkarCounter({
    super.key,
    required this.label,
    required this.count,
    required this.onIncrement,
    this.onReset,
  });

  final String label;
  final int count;
  final VoidCallback onIncrement;
  final VoidCallback? onReset;

  @override
  Widget build(BuildContext context) {
    return Rahma3DCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 6),
                Text(
                  'تسبيح محلي بسيط دون اتصال.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          _CounterBubble(value: count),
          const SizedBox(width: 12),
          Column(
            children: [
              RahmaPrimaryButton(
                label: 'تسبيح',
                onPressed: onIncrement,
                icon: Icons.add,
              ),
              if (onReset != null) ...[
                const SizedBox(height: 8),
                TextButton(onPressed: onReset, child: const Text('إعادة')),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _CounterBubble extends StatelessWidget {
  const _CounterBubble({required this.value});
  final int value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const RadialGradient(
          colors: [RahmaColors.warmGold, RahmaColors.gold],
        ),
        boxShadow: [
          BoxShadow(
            color: RahmaColors.gold.withValues(alpha: 0.36),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Text(
        '$value',
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: RahmaColors.deepEmerald,
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

class RahmaAskSheikhCard extends StatelessWidget {
  const RahmaAskSheikhCard({
    super.key,
    required this.status,
    required this.questionHint,
    required this.onTap,
  });

  final String status;
  final String questionHint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Rahma3DCard(
      onTap: onTap,
      gradient: LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [
          RahmaColors.moonWhite.withValues(alpha: 0.12),
          const Color(0xFF123B35).withValues(alpha: 0.90),
          const Color(0xFF061615).withValues(alpha: 0.96),
        ],
      ),
      borderColor: RahmaColors.gold.withValues(alpha: 0.40),
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          const Icon(Icons.forum_rounded, size: 34, color: RahmaColors.gold),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'اسأل الشيخ حسن',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: RahmaColors.moonWhite,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  questionHint,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: RahmaColors.moonWhite.withValues(alpha: 0.76),
                        height: 1.5,
                      ),
                ),
                const SizedBox(height: 8),
                RahmaStatusBadge(label: status, icon: Icons.verified_outlined),
              ],
            ),
          ),
          const Icon(Icons.chevron_left, color: RahmaColors.warmGold),
        ],
      ),
    );
  }
}

class RahmaChildrenGameCard extends StatelessWidget {
  const RahmaChildrenGameCard({
    super.key,
    required this.points,
    required this.level,
    required this.onTap,
  });

  final int points;
  final String level;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Rahma3DCard(
      onTap: onTap,
      gradient: const LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [Color(0xFF1B4C67), Color(0xFF112437)],
      ),
      borderColor: RahmaColors.calmBlue.withValues(alpha: 0.28),
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [RahmaColors.gold, RahmaColors.warmGold],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: RahmaColors.gold.withValues(alpha: 0.26),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.star_rounded,
                  color: RahmaColors.deepEmerald,
                  size: 34,
                ),
              ),
              PositionedDirectional(
                end: -6,
                top: -4,
                child: Icon(
                  Icons.auto_awesome_rounded,
                  size: 16,
                  color: RahmaColors.moonWhite.withValues(alpha: 0.8),
                ),
              ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'لعبة الأطفال الإسلامية',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  'المستوى: $level',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.84),
                      ),
                ),
                const SizedBox(height: 8),
                RahmaStatusBadge(
                  label: 'النقاط $points',
                  icon: Icons.emoji_events_outlined,
                  backgroundColor: RahmaColors.gold.withValues(alpha: 0.16),
                  foregroundColor: RahmaColors.warmGold,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_left, color: Colors.white),
        ],
      ),
    );
  }
}

class RahmaEmptyState extends StatelessWidget {
  const RahmaEmptyState({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.info_outline_rounded,
    this.onRetry,
  });

  final String title;
  final String message;
  final IconData icon;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Rahma3DCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 42, color: RahmaColors.gold),
                const SizedBox(height: 14),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(height: 1.6),
                ),
                if (onRetry != null) ...[
                  const SizedBox(height: 16),
                  RahmaPrimaryButton(
                    label: 'إعادة المحاولة',
                    onPressed: onRetry,
                    icon: Icons.refresh_rounded,
                  ),
                ],
              ],
            ),
          ),
        ),
      );
}

class RahmaOfflineBanner extends StatelessWidget {
  const RahmaOfflineBanner({
    super.key,
    this.message = 'أنت تستخدم المحتوى المحلي الآمن حتى يتم تفعيل الاتصال.',
  });

  final String message;

  @override
  Widget build(BuildContext context) => Rahma3DCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            RahmaColors.gold.withValues(alpha: 0.16),
            const Color(0xFF123B35).withValues(alpha: 0.82),
            const Color(0xFF061615).withValues(alpha: 0.90),
          ],
        ),
        borderColor: RahmaColors.gold.withValues(alpha: 0.38),
        child: Row(
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 18,
              color: RahmaColors.gold,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: RahmaColors.moonWhite.withValues(alpha: 0.78),
                    ),
              ),
            ),
          ],
        ),
      );
}

class RahmaSectionTitle extends StatelessWidget {
  const RahmaSectionTitle(this.title, {super.key, this.action});
  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 22, bottom: 10),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: RahmaColors.moonWhite,
                  fontWeight: FontWeight.w900,
                  shadows: [
                    Shadow(
                      color: Colors.black.withValues(alpha: 0.32),
                      blurRadius: 10,
                    ),
                  ],
                ),
              ),
            ),
            if (action != null) action!,
          ],
        ),
      );
}

class RahmaPremiumCard extends StatelessWidget {
  const RahmaPremiumCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.margin,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) => Rahma3DCard(
        padding: padding,
        onTap: onTap,
        margin: margin,
        child: child,
      );
}

class RahmaHeroPanel extends StatelessWidget {
  const RahmaHeroPanel({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon,
    this.action,
    this.statusBadge,
  });
  final String title;
  final String subtitle;
  final Widget? icon;
  final Widget? action;
  final Widget? statusBadge;

  @override
  Widget build(BuildContext context) => Rahma3DCard(
        padding: const EdgeInsets.all(22),
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [RahmaColors.emerald, RahmaColors.deepEmerald],
        ),
        borderColor: RahmaColors.gold.withValues(alpha: 0.30),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isNarrow = constraints.maxWidth < 360;
            final titleStyle =
                Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      height: 1.15,
                    );
            final bodyStyle = Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withValues(alpha: 0.82),
                );
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (icon != null) ...[
                      icon!,
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: titleStyle),
                          const SizedBox(height: 8),
                          if (statusBadge != null) statusBadge!,
                        ],
                      ),
                    ),
                    if (action != null && !isNarrow) ...[
                      const SizedBox(width: 12),
                      action!,
                    ],
                  ],
                ),
                const SizedBox(height: 12),
                Text(subtitle, style: bodyStyle),
                if (action != null && isNarrow) ...[
                  const SizedBox(height: 14),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: action!,
                  ),
                ],
              ],
            );
          },
        ),
      );
}

String friendlyError(Object? error) =>
    'المحتوى غير متوفر حالياً. يمكنك استخدام المحتوى المحلي حتى يتم استعادة الاتصال.';
