# Rahma RAG & Algorithm HLD/LLD

## 1. RAG High-Level Design

### Purpose
RAG (Retrieval-Augmented Generation) in Rahma is strictly for **retrieving** curated Islamic content and citations. It is NOT for generating new religious rulings.

### Principles
- **Source Registry:** Only "reviewed" and "trusted" sources are queryable.
- **Citation Gate:** Every retrieved item must carry valid metadata.
- **No-Answer State:** If no high-confidence source matches, the system must truthfully state "no answer found".

## 2. RAG Low-Level Design

### Retrieval Contract
Request:
- `query`: User question string.
- `source_type`: Filter (Quran, Hadith, etc.).
- `reviewed_only`: Boolean (True by default for public).

Response:
- `status`: `found` | `no_answer` | `needs_review`.
- `citations`: Array of `{ citation_type, label, text, url }`.
- `confidence`: Scoring 0.0 - 1.0.

### Readiness Status
Reported via `/ready.rag`:
- `configured`: Boolean.
- `source_count`: Number of active indexed sources.
- `mode`: `foundation_only` | `production`.

## 3. Algorithm High-Level Design

### Purpose
Deterministic recommendation and scoring logic to enhance the user experience without sensitive profiling or addictive loops.

### Use Cases
- **Daily Ibadah:** Suggests adhkar or reading based on time/category.
- **Hasanat Game:** Evaluates scenario choices based on fixed Islamic ethics rules.
- **Library:** Recommends related approved articles.

## 4. Algorithm Low-Level Design

### Interfaces
- `recommendScenario(age_band)`: Returns a random but appropriate scenario from the approved pool.
- `scoreHasanat(choice)`: Returns a score and Arabic feedback.
- `recommendLibrary(tags)`: Returns top 3 approved matches.

### Safety Rules
- **No Streak Pressure:** No "guilt" messages for missing a day.
- **Positive Reinforcement:** "حديقة الحسنات" (Garden of Deeds) focus.
- **Transparency:** Every recommendation must have a `reason` field explaining why it was shown.

## 5. Verification
- **Deterministic Tests:** Same input must always produce the same recommendation.
- **LQA Audit:** Feedback strings must be polite and formally correct.
- **Safety Audit:** No "shaming" or "exclusionary" algorithms.
