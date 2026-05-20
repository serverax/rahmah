import 'package:flutter/material.dart';

import '../config.dart';
import '../widgets/rahma_widgets.dart';

class ImprovementCenterScreen extends StatelessWidget {
  const ImprovementCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    if (RahmaConfig.buildFlavor != 'internal-test') {
      return const RahmaScaffold(
        title: 'مركز التحسين',
        body: RahmaEmptyState(
          title: 'هذه الصفحة داخلية فقط',
          message:
              'مركز التحسين متاح للمديرين الداخليين فقط، وليس للمستخدمين العامين.',
          icon: Icons.lock_outline_rounded,
        ),
      );
    }

    final proposals = [
      const _ProposalRow(
        title: 'إضافة محتوى أوفلاين لسور القرآن المفقودة',
        area: 'Quran / Library',
        priority: 88,
        risk: 34,
        status: 'needs_review',
        evidence: 'users keep seeing offline gaps when API is empty',
      ),
      const _ProposalRow(
        title: 'تقليل الرسائل التقنية في حالة عدم تهيئة API',
        area: 'Home / Ask Sheikh Hasan',
        priority: 92,
        risk: 48,
        status: 'approved_for_planning',
        evidence: 'api_not_configured text surfaced to end users',
      ),
      const _ProposalRow(
        title: 'تحسين RTL والهوامش في الشاشات القديمة',
        area: 'Settings / Support',
        priority: 73,
        risk: 22,
        status: 'drafted',
        evidence: 'small width layout edge cases',
      ),
    ];

    return RahmaScaffold(
      title: 'مركز التحسين',
      subtitle: 'مسودات مقترحات التحسين تُعرض للمراجعة البشرية فقط.',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          const RahmaPrayerHeroCard(
            title: 'Rahma Improvement Center',
            subtitle:
                'يرصد التراجع في التجربة، ويقترح تحسينات، ولا ينشر شيئاً بلا موافقة بشرية.',
            nextPrayer: 'الحالة',
            countdown: 'مراجعة بشرية',
            trailing: Icon(
              Icons.auto_graph_rounded,
              color: RahmaColors.warmGold,
              size: 54,
            ),
          ),
          const SizedBox(height: 14),
          const RahmaOfflineBanner(
            message:
                'القرارات هنا داخلية وآمنة. لا يتم نشر أي تحسين أو شيفرة قبل الموافقة.',
          ),
          const RahmaSectionTitle('الإشارات المكتشفة'),
          const Rahma3DCard(
            child: Column(
              children: [
                _SignalLine(label: 'عمليات بحث فاشلة', value: '14'),
                _SignalLine(label: 'أسئلة بدون إجابة معتمدة', value: '9'),
                _SignalLine(label: 'أخطاء واجهة / RTL', value: '5'),
                _SignalLine(label: 'فشل مزامنة أوفلاين', value: '3'),
              ],
            ),
          ),
          const RahmaSectionTitle('المقترحات'),
          ...proposals.map(
            (proposal) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Rahma3DCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            proposal.title,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                        RahmaStatusBadge(
                          label: proposal.status,
                          icon: Icons.verified_outlined,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text('المجال: ${proposal.area}'),
                    const SizedBox(height: 6),
                    Text(
                      'الأولوية: ${proposal.priority}/100  •  المخاطر: ${proposal.risk}/100',
                    ),
                    const SizedBox(height: 8),
                    Text(
                      proposal.evidence,
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(height: 1.5),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        RahmaPrimaryButton(
                          label: 'اعتماد للتخطيط',
                          onPressed: () {},
                          icon: Icons.check_rounded,
                        ),
                        OutlinedButton(
                          onPressed: () {},
                          child: const Text('رفض مع سبب'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const RahmaSectionTitle('سجل المراجعة'),
          const Rahma3DCard(
            child: Column(
              children: [
                _SignalLine(
                  label: '2026-05-18',
                  value: 'drafted → needs_review',
                ),
                _SignalLine(
                  label: '2026-05-18',
                  value: 'needs_review → approved_for_planning',
                ),
                _SignalLine(label: '2026-05-18', value: 'audit logged'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProposalRow {
  const _ProposalRow({
    required this.title,
    required this.area,
    required this.priority,
    required this.risk,
    required this.status,
    required this.evidence,
  });

  final String title;
  final String area;
  final int priority;
  final int risk;
  final String status;
  final String evidence;
}

class _SignalLine extends StatelessWidget {
  const _SignalLine({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Expanded(child: Text(label)),
            const SizedBox(width: 12),
            Text(
              value,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      );
}
