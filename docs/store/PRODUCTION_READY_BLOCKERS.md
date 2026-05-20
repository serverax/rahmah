# Production Ready Blockers

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Rahma now distinguishes Android store readiness from full backend production readiness:

- `mobile_store_ready`: whether the Android release can be submitted to Google Play.
- `backend_production_ready`: whether the full backend stack is production-ready.
- Existing `/ready.production_ready`: remains full backend production readiness and must stay `false` until every backend gate passes.

## Current `/ready` Blockers

| Blocker | Why it exists | Blocks Google Play? | Blocks backend production? | Exact fix | Status |
|---|---|---:|---:|---|---|
| `NO_DOMAIN_AVAILABLE` | Rahma has no real domain yet. | Yes | No | Register/configure a real domain and DNS. | BLOCKER |
| `PUBLIC_PRIVACY_POLICY_HTTPS_URL_NOT_AVAILABLE` | Only temporary HTTP/IP legal-page plan exists. | Yes | No | Serve privacy policy on a real HTTPS domain. | BLOCKER |
| `PUBLIC_SUPPORT_HTTPS_URL_NOT_AVAILABLE` | Only temporary HTTP/IP support-page plan exists. | Yes | No | Serve support page on a real HTTPS domain. | BLOCKER |
| `pgvector_not_ready` | Local DB uses JSONB fallback embeddings; pgvector extension absent. | No, if RAG fallback disclosed and works. | Yes for full semantic vector production. | Install pgvector and migrate vector column/index. | BACKEND_BLOCKER |
| `redis_not_ready` / `redis_url_missing` | Redis not configured in current readiness env. | No for local mobile MVP if not required. | Yes | Configure Redis URL and verify reachability. | BACKEND_BLOCKER |
| `auth_not_ready` / `auth_not_configured` | Production auth secrets/provider not configured. | Partial: blocks account features if enabled. | Yes | Configure production auth and session secrets. | BACKEND_BLOCKER |
| `azan_audio_not_production_ready` | Audio files were invalid text/HTML and removed. | No if audio playback disabled and listing does not claim audio. | Yes if Azan audio is advertised as production feature. | Add valid licensed audio, hash, metadata, device playback test. | FEATURE_DISABLED |
| `push_notifications_not_ready` | FCM/APNs/real-device notification scheduling not verified. | Yes if push/Azan notifications are advertised. | Yes | Configure push, test Android 13+ permission and scheduling. | BLOCKER |
| `wasm_not_ready` / `wasm_execution_not_proven` | WASM bridge URLs and execution proof not configured. | No if backend not required for store MVP. | Yes | Configure WASM modules or formally approve disabled mode. | BACKEND_BLOCKER |
| `app_store_compliance_pending` | App-store compliance env remains pending. | Yes | No | Set only after public URLs and store docs are final. | BLOCKER |
| `app_store_compliance_not_ready` | Pages/docs still blocked by deployment/public URL verification. | Yes | No | Deploy pages and rerun readiness. | BLOCKER |
| `donations_provider_not_configured` | Donation provider disabled. | No if donation feature stays disabled. | No unless donation is a required production feature. | Configure lawful provider or keep disabled. | DISABLED |

## Current Decision

`production_ready` must remain `false`.

Google Play readiness can become `PASS_GOOGLE_PLAY_READY` only after:

1. A real HTTPS domain exists and public legal/support URLs resolve.
2. Physical Android smoke test passes.
3. Notification claims are either tested or disabled from store claims.
4. Azan audio remains disabled or a valid licensed asset is verified.
