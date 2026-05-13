# استراتيجية فروع Git — islamic-ai-mobile-app

## الفروع الرئيسية
- `main`: محمي. لا push مباشر. يقبل فقط PR بعد مراجعة + CI أخضر.
- `develop`: فرع التكامل اليومي.

## فروع العمل
- `feature/sprint-NN-<slug>`: لميزة ضمن سبرنت.
- `fix/<slug>`: لإصلاح خلل.
- `chore/<slug>`: لتحديثات بنية أو أدوات.
- `docs/<slug>`: لتحديثات وثائق.

## قواعد الدمج
- كل PR مرتبط بـsprint من `CLAUDE_CODE_SPRINTS_AR.md`.
- مراجعة الكود إلزامية + مراجعة شرعية لأي محتوى ديني.
- لا force-push على `main`/`develop`.

## الإصدارات
- وسوم `vX.Y.Z` على `main` فقط بعد اجتياز Sprint 19 (QA).
- إصدارات بيتا: `vX.Y.Z-beta.N`.

## GitHub Actions (مخطط)
- `ci.yml`: lint + tests للـmobile, backend, ai-rag على كل PR.
- `security.yml`: secret scan + dependency audit أسبوعياً.
- `release.yml`: بناء بيتا عند tag — لا أسرار في الكود؛ تُحقن من المنصة.

> لم تُفعَّل أي workflow بأسرار حقيقية. الملفات هياكل فقط حتى Sprint 0 يكتمل التأسيس.
