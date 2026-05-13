import { classify } from '../safety/scope-classifier.js';
import { lookupSources } from '../safety/source-store.js';

// Frozen response bodies — wording is contractual (see
// docs/AI_FATWA_SAFETY_POLICY_AR.md). Do not edit without an explicit
// safety-policy update + test update.
const BLOCKED_BODY = Object.freeze({
  answer: 'لا أملك جواباً موثقاً لهذا السؤال حالياً. يرجى الرجوع إلى عالم موثوق.',
  category: 'غير مؤكد',
  confidence: 'low',
  sources: [],
  blocked: true,
});

const OUT_OF_SCOPE_BODY = Object.freeze({
  answer:
    'هذا المساعد مخصص للعبادات فقط (طهارة، صلاة، صيام، زكاة، حج، عمرة، أذكار، قرآن، نوافل، رمضان). لمسائل من هذا النوع يُرجى مراجعة عالم موثوق.',
  category: 'خارج النطاق',
  confidence: 'low',
  sources: [],
  blocked: true,
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
    const { question } = req.body;

    // 1. Scope filter — only allowed ibadat categories pass.
    const cls = classify(question);
    if (!cls.inScope) {
      return reply.send(OUT_OF_SCOPE_BODY);
    }

    // 2. Source lookup. The store is intentionally empty in this scaffold;
    // it will be wired to the RAG knowledge base in Sprint 14/15.
    const sources = lookupSources(question, cls.category);

    // 3. Without trusted sources we MUST return the blocked fallback —
    // never invent an answer. This is the core safety rule.
    if (sources.length === 0) {
      return reply.send(BLOCKED_BODY);
    }

    // 4. Reserved for Sprint 15: source-backed constrained generation.
    // Even if `sources` is somehow non-empty here, this scaffold does
    // NOT generate. We fail closed.
    return reply.send(BLOCKED_BODY);
  });
}
