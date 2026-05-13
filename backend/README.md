# Backend — islamic-ai-mobile-app

خادم API للتطبيق. الإطار المقترح: FastAPI (Python) أو NestJS (TypeScript).

## نقاط النهاية المخططة

- `POST /api/ibadat/ask` — السؤال للمساعد (تمر عبر بوابة السلامة).
- `GET  /api/prayer-times?lat=&lng=&method=` — مواقيت الصلاة.
- `GET  /api/quran/surah/:id` — سورة كاملة.
- `GET  /api/adhkar/:category` — أذكار حسب الفئة.

## مخطط الطلب لـ `POST /api/ibadat/ask`
```json
{
  "question": "هل يجوز تأخير صلاة العشاء؟",
  "language": "ar",
  "scope": "ibadat"
}
```

## استجابة مقبولة
```json
{
  "answer": "...",
  "category": "الصلاة",
  "confidence": "high",
  "sources": [
    { "title": "مصدر شرعي موثوق", "reference": "رابط أو مرجع داخلي" }
  ],
  "disclaimer": "هذه إجابة إرشادية عامة، وليست فتوى شخصية."
}
```

## استجابة محجوبة
```json
{
  "answer": "لا أملك جواباً موثقاً لهذا السؤال حالياً. يرجى الرجوع إلى عالم موثوق.",
  "category": "غير مؤكد",
  "confidence": "low",
  "sources": [],
  "blocked": true
}
```

## أسرار

تُقرأ من متغيرات بيئة فقط. ملف `.env.example` (سيُضاف في Sprint 13) **لا يحوي مفاتيح حقيقية**.

## الحالة

> الخادم غير مُنفَّذ بعد. هذه الوثيقة عقد التصميم لـSprint 13-15.
