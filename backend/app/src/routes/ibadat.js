import { classify } from '../safety/scope-classifier.js';
import { lookupSources } from '../safety/source-store.js';
import { validateSourcesForAnswer } from '../safety/citation-validator.js';

// Frozen response bodies — wording is contractual (see
// docs/AI_FATWA_SAFETY_POLICY_AR.md). Do not edit without an explicit
// safety-policy update + test update.
const BLOCKED_BODY = Object.freeze({
  answer: 'لا أملك جواباً موثقاً لهذا السؤال حالياً. يرجى الرجوع إلى عالم موثوق.',
  category: 'غير مؤكد',
  confidence: 'low',
  sources: [],
  blocked: true,
  reason: 'insufficient_verified_sources',
});

const OUT_OF_SCOPE_BODY = Object.freeze({
  answer:
    'هذا المساعد مخصص للعبادات فقط (طهارة، صلاة، صيام، زكاة، حج، عمرة، أذكار، قرآن، نوافل، رمضان). لمسائل من هذا النوع يُرجى مراجعة عالم موثوق.',
  category: 'خارج النطاق',
  confidence: 'low',
  sources: [],
  blocked: true,
  reason: 'out_of_scope',
});

const askSchema = {
  body: {
    type: 'object',
    required: ['question'],
    additionalProperties: false,
    properties: {
      question: { type: 'string', minLength: 1, maxLength: 1000 },
      language: { type: 'string', enum: ['ar'] },
      scope:    { type: 'string', enum: ['ibadat'] },
    },
  },
};

export default async function ibadatRoute(fastify) {
  fastify.post('/ask', { schema: askSchema }, async (req, reply) => {
    const { question, language } = req.body;

    // 1. Scope filter
    const cls = classify(question);
    if (!cls.inScope) {
      return reply.send(OUT_OF_SCOPE_BODY);
    }

    // 2. Candidate sources (empty by default until repo is wired)
    const candidates = await lookupSources(question, cls.category, language || 'ar', 4);

    // 3. Citation gate — only approved + cited + non-empty pass
    const gate = validateSourcesForAnswer(candidates);

    // 4. Sprint 5 contract: even when the gate passes, this route does NOT
    //    generate answer text. Answer generation is sprint 14/15. We
    //    therefore ALWAYS respond with the blocked fallback shape — but we
    //    surface the structured reason so future sprints can wire in
    //    constrained generation without changing the API surface.
    //
    //    If the gate passed (sources were valid) we still block, but we
    //    record the candidate count via the response `reason` so future
    //    sprints can flip the switch atomically. We do NOT echo source
    //    bodies until generation lands.
    if (!gate.canAnswer) {
      return reply.send(BLOCKED_BODY);
    }
    return reply.send(
      Object.freeze({
        ...BLOCKED_BODY,
        reason: 'answer_generation_not_enabled',
      }),
    );
  });
}
