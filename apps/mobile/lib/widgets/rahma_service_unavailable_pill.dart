import 'package:flutter/material.dart';

import 'rahma_widgets.dart';

/// Premium in-screen status when live API/backend is temporarily unavailable.
class RahmaServiceUnavailablePill extends StatelessWidget {
  const RahmaServiceUnavailablePill({super.key});

  @override
  Widget build(BuildContext context) => Rahma3DCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            RahmaColors.gold.withValues(alpha: 0.18),
            RahmaColors.teal.withValues(alpha: 0.08),
          ],
        ),
        borderColor: RahmaColors.gold.withValues(alpha: 0.38),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 10,
              height: 10,
              margin: const EdgeInsets.only(top: 6),
              decoration: const BoxDecoration(
                color: RahmaColors.gold,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'غير متاح مؤقتاً',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: RahmaColors.deepEmerald,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'سيتم تفعيل الخدمة قريباً بإذن الله',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}
