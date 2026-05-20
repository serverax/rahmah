# Rahma Hadith and Adhkar Source Approval Checklist

No Hadith or Adhkar dataset may be bundled offline until every item below is complete.

## Required evidence
- Exact dataset URL and maintainer.
- License text or written permission covering mobile offline redistribution.
- Attribution wording required by the source.
- Version/date/hash of imported source file.
- For Hadith: collection name, edition, chapter mapping, hadith numbers, grading source, and translation license.
- For Adhkar: source book, reference labels, repeat counts, and verification reviewer.
- Import script must preserve canonical Arabic text and store normalized search text separately.
- Validation must reject missing references, duplicate IDs, unapproved source IDs, and license_status other than `approved`.

## Current status
| Source | Type | Status | Reason |
|---|---|---:|---|
| Hisnul Muslim verified datasets | Adhkar | needs_review | Exact redistributable dataset/license not selected. |
| Sunnah.com/public hadith datasets | Hadith | needs_review | API/data redistribution and translation/grading rights need confirmation. |
| Any scraped website content | Hadith/Adhkar | blocked | Scraping copyrighted content is not allowed. |

## Approval states
- `approved`: legal and scholarly review complete; offline bundle allowed.
- `needs_review`: may be referenced in planning but must not be bundled.
- `blocked`: must not be used.
