# Rahma — Children's Game Content Schema

**Date:** 2026-05-14

## File location

All game content lives under `apps/web/public/content/child-game/`
(when added) or is inlined in `apps/web/public/child-game.html` for the
current vanilla scaffold. Future framework swap should move content to a
JSON-per-scenario layout under that path.

## Scenario JSON shape

```json
{
  "scenario_id": "salah-order-1",
  "module": "salah_order",
  "title_ar": "ترتيب الصلوات اليومية",
  "instruction_ar": "اسحب كل صلاة إلى مكانها الصحيح بالترتيب.",
  "items": [
    { "id": "fajr",    "label_ar": "الفجر",    "order": 1 },
    { "id": "dhuhr",   "label_ar": "الظهر",    "order": 2 },
    { "id": "asr",     "label_ar": "العصر",    "order": 3 },
    { "id": "maghrib", "label_ar": "المغرب",   "order": 4 },
    { "id": "isha",    "label_ar": "العشاء",   "order": 5 }
  ],
  "feedback": {
    "correct_ar":   "أحسنت! بإذن الله نواصل.",
    "incorrect_ar": "حاول مرة أخرى — الترتيب يبدأ بالفجر."
  },
  "source": {
    "type": "fiqh_note",
    "label_ar": "أركان الإسلام — ترتيب الصلوات",
    "approved": true
  },
  "is_test_fixture": false
}
```

## Quiz scenario JSON shape

```json
{
  "scenario_id": "dua-match-1",
  "module": "dua_matching",
  "title_ar": "اختر الدعاء المناسب",
  "instruction_ar": "اختر الدعاء الذي نقوله عند دخول المنزل.",
  "options": [
    { "id": "a", "label_ar": "بسم الله ولجنا، وبسم الله خرجنا، وعلى الله ربنا توكلنا" },
    { "id": "b", "label_ar": "اللهم باسمك أموت وأحيا" },
    { "id": "c", "label_ar": "الحمد لله رب العالمين" }
  ],
  "correct_option_id": "a",
  "feedback": {
    "correct_ar":   "أحسنت — هذا الدعاء عند دخول المنزل.",
    "incorrect_ar": "هذا دعاء آخر. حاول مرة أخرى."
  },
  "source": {
    "type": "dua",
    "label_ar": "حصن المسلم — أدعية المنزل",
    "approved": true
  }
}
```

## Field rules

| Field | Rule |
|---|---|
| `scenario_id` | unique, kebab-case, ≤ 64 chars |
| `module` | one of: `salah_order`, `wudu_steps`, `dua_matching`, `surah_recognition`, `manners_quiz`, `ramadan_tasks`, `prophet_stories` |
| `title_ar` / `instruction_ar` | Arabic only; ≤ 200 chars |
| `items` / `options` | 3–7 entries; each `label_ar` ≤ 120 chars |
| `feedback.*_ar` | Arabic only; encouragement language only |
| `source` | required when content comes from a real Islamic source; must be `approved: true` to ship to production; fixture content must set `approved: false` and `is_test_fixture: true` |
| `is_test_fixture` | default `false`; production load refuses any scenario with `true` |

## Loader contract

The game loader (frontend code) must:

1. Validate the JSON against the shape above; refuse to render invalid items.
2. Drop any scenario where `source.approved === false` in production
   mode (only show approved-source content).
3. Save progress locally only as
   `{ scenario_id, attempts, correct, updated_at }`.
4. Never send free-text from the child to the server.

## Audit trail

Every content add / edit / remove is logged in `audit_events`
(migration 008) with:

```
event_type: 'children_game.content_change'
target_kind: 'children_game_scenario'
target_id:   <scenario uuid>
metadata_json: { scenario_id, action, reviewer_email_hash }
```
