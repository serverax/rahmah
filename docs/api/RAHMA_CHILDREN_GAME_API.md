# Rahma — Children's Game API

**Date:** 2026-05-14

Local-first. The mobile app stores everything on the device under
`rahma.child.progress`. Server-side backup is opt-in and stores only
opaque counters.

## Endpoints

### Game status

```http
GET /api/game/status
```

```json
{
  "ok": true,
  "enabled": true,
  "local_first": true,
  "server_backup_available": false,
  "scenarios_modules": [
    "salah_order","wudu_steps","dua_matching",
    "surah_recognition","manners_quiz","ramadan_tasks","prophet_stories"
  ],
  "safe_message_ar": "لعبة الأطفال محفوظة محلياً، ولا يتم جمع أي بيانات شخصية للطفل."
}
```

### Submit progress (opt-in only)

```http
POST /api/game/progress
{ "scenario_id": "salah-order-1", "attempts_count": 3, "correct_count": 2 }
```

Validation:

- `scenario_id` required, 1–64 chars.
- `attempts_count`, `correct_count` 0–10000.
- Returns `400` for missing scenario_id.

Response when DB not configured:

```json
{
  "ok": true,
  "status": "local_only",
  "persisted": false,
  "message_ar": "تم حفظ التقدم محلياً. لن يتم إرسال أي بيانات إلى الخادم قبل تفعيل المزامنة."
}
```

## Strict NEVER list

- **Never** sends child's name / age / photo / phone / address.
- **Never** sends raw text of an answer.
- **Never** opens a chat between children.
- **Never** opens an external URL from inside the game flow.
- **Never** uses analytics or third-party SDKs.

## Wali (guardian) toggle

The privacy page exposes a switch that disables the children's section.
When disabled, the mobile app must refuse to render `child-game.html`
and refuse to call `POST /api/game/progress`.

## Audit

When the server-side path is enabled (operator decision), every progress
write is mirrored to `wasm_rule_engine_audit` with the rule decision so a
reviewer can confirm no PII reaches the row.

## See also

- Game design: `docs/game/RAHMA_CHILDREN_GAME_DESIGN.md`
- Safety: `docs/game/RAHMA_CHILDREN_GAME_SAFETY.md`
- Schema: `docs/game/RAHMA_CHILDREN_GAME_CONTENT_SCHEMA.md`
