# Rahma Local LLM and RAG Safety Architecture

Rahma uses two separate paths:

1. Deterministic algorithm path
- Prayer times, Qibla, Hijri approximation, Quran normalization/search, children scoring, source approval, content freshness, and sync state.
- These are code paths and must not call an LLM.

2. RAG-assisted Sheikh drafting path
- Exact approved cache answer first.
- Approved source chunks only: `source_approved=true`, `license_status=approved`, citation present.
- Local LLM may draft only from provided chunks.
- Citation validation is mandatory.
- Drafts require Sheikh/Admin review before public publication.
- No approved context means refusal: `لا أستطيع الإجابة بثقة بدون مصدر معتمد. سيتم تحويل السؤال للمراجعة.`

## Default local model
`qwen2.5:0.5b-instruct-q5_0`

## Helper model
`smollm2:360m-instruct-q4_0`, for summarisation/rewording only, never independent Islamic rulings.

## Cluster endpoint
`http://ollama.ordinox-ai.svc.cluster.local:11434`

No public ingress should be created for Ollama.
