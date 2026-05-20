# Azan Audio License And Verification

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

## Current Release Decision

Status: `AZAN_AUDIO_DISABLED_FOR_RELEASE`

Rahma must not ship Azan audio playback in the current release. The previously referenced local files were removed because they were not playable audio:

- `apps/mobile/assets/audio/azan/beautiful_adhan_cc0.mp3` started with text: `File not found`.
- `apps/mobile/assets/audio/azan/makkah_azan_public_domain.mp3` started with HTML: `<!DOCTYPE html>`.

The metadata now marks the previous candidate as `approved=false` and `review_status=blocked_invalid_audio_file`.

## License Rule

Azan audio can be enabled only when all of the following are true:

1. The source and license allow app distribution.
2. The license evidence URL is recorded.
3. The binary audio file exists locally.
4. The file header is a valid audio container/header such as MP3, WAV, OGG, or M4A.
5. The SHA-256 hash matches metadata.
6. Duration is readable.
7. Playback is tested on a real Android device.

## Verification Script

Run:

```powershell
cd F:\rahma
node scripts/content/verify-azan-audio-assets.js
```

Expected current output label:

`AZAN_AUDIO_DISABLED_FOR_RELEASE`

This is acceptable for Google Play only if the app clearly disables audio playback and keeps prayer/Azan text notifications without broken audio preview.
