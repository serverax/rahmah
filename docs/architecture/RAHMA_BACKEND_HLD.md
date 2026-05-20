# Rahma Backend High-Level Design

## Components

- Mobile app
- Web/admin panel
- API backend
- Postgres database
- Redis cache
- RAG service
- Ollama local LLM
- Notification worker
- Object storage
- Admin review workflow
- Content approval workflow
- K3s namespaces
- CI/CD
- App store compliance

## Flow

Mobile App -> Rahma API -> Auth / Prayer / Quran / Hadith / Dua / Children / Ask Sheikh -> Postgres + Redis -> RAG service -> Ollama only when approved sources exist -> Citation guard -> Review queue if uncertain