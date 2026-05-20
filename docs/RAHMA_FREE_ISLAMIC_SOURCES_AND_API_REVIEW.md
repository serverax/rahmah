# Rahma Free Islamic Sources And API Review

Scope: research-only review for Rahma. No source is ingested into live production by this report.

## Decision Summary

Recommended sources for Rahma are limited to items with clear source provenance, readable attribution requirements, and a path for manual approval. Everything else is blocked or dev-only until the legal / authenticity / attribution review is complete.

### Tanzil Quran Text

- Provider: Tanzil Project
- URL: https://tanzil.net/docs/Text_License
- Content type: Quran
- Language: ar
- Licence status: approved
- Attribution required: true
- Offline storage allowed: true
- Commercial use allowed: true
- Authenticity level: high
- Approval status: APPROVED_FOR_REVIEW
- Notes: Canonical Quran text source. Verbatim preservation only. Do not alter Arabic text.

### Quran.com / Quran Foundation API

- Provider: Quran Foundation
- URL: https://api-docs.quran.com/
- Content type: Quran
- Language: ar
- Licence status: pending
- Attribution required: true
- Offline storage allowed: unknown
- Commercial use allowed: unknown
- Authenticity level: high
- Approval status: DEV_ONLY
- Notes: Token-gated access. API repo is MIT-licensed, but content-level licensing and per-field attribution still need manual review.

### Al Quran Cloud API

- Provider: Islamic Network
- URL: https://alquran.cloud/
- Content type: Quran
- Language: ar
- Licence status: approved
- Attribution required: true
- Offline storage allowed: true
- Commercial use allowed: unknown
- Authenticity level: high
- Approval status: APPROVED_FOR_REVIEW
- Notes: Open-source/open-media service. Keep attribution and terms on file before ingesting.

### fawazahmed0/quran-api

- Provider: fawazahmed0
- URL: https://github.com/fawazahmed0/quran-api
- Content type: Quran
- Language: multi
- Licence status: approved
- Attribution required: true
- Offline storage allowed: true
- Commercial use allowed: true
- Authenticity level: medium
- Approval status: DEV_ONLY
- Notes: Unlicense repo, but editions/translations must be checked individually before approval.

### risan/quran-json

- Provider: risan
- URL: https://github.com/risan/quran-json
- Content type: Quran
- Language: multi
- Licence status: approved
- Attribution required: true
- Offline storage allowed: true
- Commercial use allowed: true
- Authenticity level: high
- Approval status: APPROVED_FOR_REVIEW
- Notes: CC-BY-SA-4.0 packaging with explicit Quran text provenance. Share-alike obligations apply.

### fawazahmed0/hadith-api

- Provider: fawazahmed0
- URL: https://github.com/fawazahmed0/hadith-api
- Content type: Hadith
- Language: multi
- Licence status: approved
- Attribution required: true
- Offline storage allowed: true
- Commercial use allowed: true
- Authenticity level: medium
- Approval status: APPROVED_FOR_REVIEW
- Notes: Free hadith API with multiple grades. Rahma must keep collection and grade metadata with every citation.

### Open Hadith Data

- Provider: mhashim6
- URL: https://github.com/mhashim6/Open-Hadith-Data
- Content type: Hadith
- Language: ar
- Licence status: pending
- Attribution required: true
- Offline storage allowed: unknown
- Commercial use allowed: unknown
- Authenticity level: medium-high
- Approval status: DEV_ONLY
- Notes: Repo includes a LICENSE file, but exact terms were not fully verified in this review.

### Sunnah.now API

- Provider: Sunnah.now
- URL: https://docs.sunnah.now/
- Content type: Hadith
- Language: multi
- Licence status: approved
- Attribution required: true
- Offline storage allowed: unknown
- Commercial use allowed: unknown
- Authenticity level: medium
- Approval status: DEV_ONLY
- Notes: Official docs exist, MIT license is documented, but the service is early access and token-gated.

### Dorar Hadith Encyclopedia

- Provider: Dorar
- URL: https://dorar.net/article/389
- Content type: Hadith
- Language: ar
- Licence status: unknown
- Attribution required: unknown
- Offline storage allowed: unknown
- Commercial use allowed: unknown
- Authenticity level: high
- Approval status: BLOCKED_DO_NOT_USE
- Notes: No clear public data licence or legal reuse path was confirmed in this review.

### AlAdhan API

- Provider: Islamic Network
- URL: https://aladhan.com/
- Content type: Prayer Times / Qibla / Hijri / Asma ul Husna
- Language: multi
- Licence status: approved
- Attribution required: true
- Offline storage allowed: true
- Commercial use allowed: unknown
- Authenticity level: high
- Approval status: APPROVED_FOR_REVIEW
- Notes: Open-source service with documented calculation methods and credits. Good candidate for Rahma prayer support.

### IslamicAPI

- Provider: zuraan
- URL: https://islamicapi.com/
- Content type: Prayer Times / Qibla / Hijri / Asma ul Husna
- Language: multi
- Licence status: pending
- Attribution required: true
- Offline storage allowed: unknown
- Commercial use allowed: unknown
- Authenticity level: medium-high
- Approval status: DEV_ONLY
- Notes: API-key gated. Terms and privacy pages exist, but Rahma should wait for a full policy review.

### UmmahAPI

- Provider: UmmahAPI
- URL: https://ummahapi.com/api/docs
- Content type: Prayer Times / Qibla / Hijri
- Language: multi
- Licence status: unknown
- Attribution required: unknown
- Offline storage allowed: unknown
- Commercial use allowed: unknown
- Authenticity level: unknown
- Approval status: BLOCKED_LICENSE_UNKNOWN
- Notes: Public licence and commercial terms were not sufficiently clear in this review.

## Output For Ingestion Control

No source in this review is auto-ingested into production. Any source that Rahma eventually ingests must still be inserted with source_approved=false by default, explicit manual approval metadata, content hash, attribution fields, and license status.

