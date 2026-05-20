import 'package:flutter/material.dart';

import '../api/rahma_api_client.dart';
import '../config.dart';
import '../offline/local_content.dart';
import '../widgets/rahma_service_unavailable_pill.dart';
import '../widgets/rahma_widgets.dart';

class AskSheikhScreen extends StatefulWidget {
  const AskSheikhScreen({super.key});

  @override
  State<AskSheikhScreen> createState() => _AskSheikhScreenState();
}

class _AskSheikhScreenState extends State<AskSheikhScreen> {
  final _api = RahmaApiClient();
  final _controller = TextEditingController();
  String _category = 'فقه';
  bool _isSubmitting = false;
  bool _isRagLoading = false;
  String _ragSafetyStatus = '';
  String? _ragAnswer;
  String? _ragIntent;
  String? _ragError;
  List<RahmaRagCitation> _ragCitations = const [];

  static const _categories = ['قرآن', 'حديث', 'فقه', 'أسرة', 'أطفال', 'عام'];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RahmaScaffold(
        title: 'اسأل الشيخ حسن',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            const RahmaLuxuryIslamicHero(
              title: 'اسأل الشيخ حسن',
              subtitle: 'إجابة موثقة بالمصادر ومراجعة عند الحاجة',
              badge: 'اسأل بثقة',
            ),
            const SizedBox(height: 14),
            if (!RahmaConfig.isApiConfigured)
              const RahmaServiceUnavailablePill(),
            const RahmaOfflineBanner(
              message:
                  'لن نعرض أخطاء تقنية. تُحفظ المسودات محلياً عند غياب الاتصال.',
            ),
            const RahmaSectionTitle('اكتب سؤالك'),
            Rahma3DCard(
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: [
                  RahmaColors.moonWhite.withValues(alpha: 0.12),
                  const Color(0xFF123B35).withValues(alpha: 0.88),
                  const Color(0xFF061615).withValues(alpha: 0.95),
                ],
              ),
              borderColor: RahmaColors.gold.withValues(alpha: 0.40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _controller,
                    maxLines: 5,
                    maxLength: 1000,
                    style: const TextStyle(color: RahmaColors.moonWhite),
                    decoration: InputDecoration(
                      labelText: 'اكتب السؤال بوضوح وبدون بيانات حساسة',
                      labelStyle: TextStyle(
                        color: RahmaColors.moonWhite.withValues(alpha: 0.72),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: BorderSide(
                          color: RahmaColors.gold.withValues(alpha: 0.28),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: const BorderSide(
                          color: RahmaColors.warmGold,
                          width: 1.4,
                        ),
                      ),
                      filled: true,
                      fillColor: RahmaColors.night.withValues(alpha: 0.22),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _categories
                        .map(
                          (item) => ChoiceChip(
                            label: Text(item),
                            selected: _category == item,
                            onSelected: (_) => setState(() => _category = item),
                            selectedColor:
                                RahmaColors.gold.withValues(alpha: 0.22),
                            backgroundColor:
                                RahmaColors.moonWhite.withValues(alpha: 0.10),
                            side: BorderSide(
                              color: RahmaColors.gold.withValues(alpha: 0.28),
                            ),
                            labelStyle: TextStyle(
                              color: _category == item
                                  ? RahmaColors.warmGold
                                  : RahmaColors.moonWhite,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      RahmaPrimaryButton(
                        onPressed: _isRagLoading ? null : _askApprovedSources,
                        icon: Icons.source_rounded,
                        label: 'بحث بالمصادر',
                      ),
                      RahmaPrimaryButton(
                        onPressed: _isSubmitting ? null : _submit,
                        icon: Icons.send_rounded,
                        label: RahmaConfig.isApiConfigured
                            ? 'إرسال للشيخ'
                            : 'حفظ كمسودة محلية',
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const RahmaSectionTitle('نتيجة المصادر المعتمدة'),
            RahmaRagAnswerCard(
              safetyStatus: _ragSafetyStatus,
              answer: _ragAnswer,
              intent: _ragIntent,
              citations: _ragCitations,
              isLoading: _isRagLoading,
              errorMessage: _ragError,
            ),
            const RahmaSectionTitle('الشروط'),
            const RahmaCitationBox(
              title: 'المعرفة الموثوقة',
              subtitle:
                  'نسخة رحمة تطلب الدليل أولاً، ثم ترفع المسودة للمراجعة البشرية قبل النشر العام.',
              citations: ['القرآن', 'الحديث المعتمد', 'المصدر العلمي المراجع'],
            ),
            const RahmaSectionTitle('إجابات عامة محفوظة'),
            ...LocalContent.publicAnswers.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Rahma3DCard(
                  gradient: LinearGradient(
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                    colors: [
                      RahmaColors.moonWhite.withValues(alpha: 0.10),
                      const Color(0xFF123B35).withValues(alpha: 0.84),
                      const Color(0xFF061615).withValues(alpha: 0.92),
                    ],
                  ),
                  borderColor: RahmaColors.gold.withValues(alpha: 0.30),
                  child: ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    iconColor: RahmaColors.warmGold,
                    collapsedIconColor: RahmaColors.warmGold,
                    title: Text(
                      item.question,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: RahmaColors.moonWhite,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    subtitle: Text(
                      item.category,
                      style: TextStyle(
                        color: RahmaColors.moonWhite.withValues(alpha: 0.66),
                      ),
                    ),
                    children: [
                      Align(
                        alignment: Alignment.centerRight,
                        child: Text(
                          item.answer,
                          textDirection: TextDirection.rtl,
                          style:
                              Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: RahmaColors.moonWhite
                                        .withValues(alpha: 0.80),
                                  ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const RahmaStatusBadge(
                        label: 'Approved public cache',
                        icon: Icons.verified_outlined,
                        foregroundColor: RahmaColors.teal,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const RahmaSectionTitle('تنبيه شرعي'),
            const RahmaPremiumCard(
              child: Text(
                'هذا القسم للتثقيف المنضبط. لا تشارك بيانات شخصية أو أسرية حساسة، ولا تعتمد على الرد الآلي وحده في المسائل الخاصة أو النوازل.',
              ),
            ),
          ],
        ),
      );

  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() => _isSubmitting = true);
    try {
      if (RahmaConfig.isApiConfigured) {
        final response = await _api.submitQuestion(text, displayPref: 'ar');
        if (!mounted) return;
        if (response['ok'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'تم استلام السؤال (${response['question_id'] ?? '—'}).',
              ),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                response['error']?.toString() ?? 'تعذر حفظ السؤال في الخادم.',
              ),
            ),
          );
          return;
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content:
                  Text('تم حفظ السؤال كمسودة محلية حتى يتم تفعيل الاتصال.'),
            ),
          );
        }
      }
      _controller.clear();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'تعذر الإرسال حالياً. احتفظنا بتجربة آمنة بدون تفاصيل تقنية.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _askApprovedSources() async {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      setState(() {
        _ragSafetyStatus = '';
        _ragError = null;
      });
      return;
    }
    if (!RahmaConfig.isApiConfigured) {
      setState(() {
        _ragSafetyStatus = 'insufficient_sources';
        _ragAnswer = null;
        _ragIntent = null;
        _ragError = null;
        _ragCitations = const [];
      });
      return;
    }
    setState(() {
      _isRagLoading = true;
      _ragError = null;
      _ragSafetyStatus = '';
      _ragAnswer = null;
      _ragCitations = const [];
    });
    try {
      final response = await _api.ragQuery(text);
      final citations = (response['citations'] as List? ?? const [])
          .whereType<Map>()
          .map(
            (item) => RahmaRagCitation.fromJson(
              item.map((key, value) => MapEntry(key.toString(), value)),
            ),
          )
          .toList();
      if (!mounted) return;
      setState(() {
        _ragSafetyStatus =
            (response['safety_status'] ?? 'system_error').toString();
        _ragAnswer = (response['answer_ar'] as String?) ??
            (response['answer'] as String?);
        _ragIntent = response['intent'] as String?;
        _ragCitations = citations;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _ragError = friendlyError(error);
      });
    } finally {
      if (mounted) setState(() => _isRagLoading = false);
    }
  }
}
