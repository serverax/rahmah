# Rahma — Mobile Offline Strategy

**Date:** 2026-05-14

## Premise

Rahma is mobile-only, primarily Arabic. Users in low-bandwidth areas
must still see Quran / Du'a / approved answers when offline. The
children's section must NEVER require the network.

## Tiers

### Always offline (no network needed)

- App shell + bottom navigation.
- Onboarding screens.
- Language picker.
- Wali toggle.
- Children's game (all 32+ scenarios fixture + counters in local hive).
- Privacy notice + Terms (static, bundled at build time as Arabic
  copy — server endpoints just mirror them).
- Settings.

### Cached offline (24h TTL)

- Approved Quran / Hadith / Du'a list responses.
- Public answers list.
- The user's own submitted-question status snapshots.

### Online-only

- Submitting a new question to Sheikh Hasan (queued locally if
  offline).
- Donation intent (provider gated; never offline-confirmed).
- Sheikh-side workflow (the operator side requires the live API).
- Account-deletion / data-export request (queued locally if offline).

## Cache invalidation

- TTL: 24h.
- Pull-to-refresh: forces immediate refresh, ignores TTL.
- Cache invalidated when `BootSnapshot.git_commit` changes — a new API
  version forces the app to refresh approved-content caches.

## Honesty rules when offline

- The app NEVER pretends an action succeeded.
- "Your question is queued" UX is shown explicitly with the queued
  status.
- "تم استلام طلبك محلياً، سيتم إرساله عند توفر اتصال." — the same
  Arabic string surfaces from the local cache, never invented at
  display time.

## What is NEVER cached offline

- Any token / session credential.
- Any DSN / secret value.
- Any unapproved religious content.
- Any item missing `citation_label_ar`.

## Storage budget

- Total hive size budget: 50 MB.
- Eviction policy: LRU on the `library_cache` box.
- The children's game scenarios are bundled with the app and counted
  against the app size, NOT the cache.

## Future: cache-warming on first install

Once the operator approves a stable corpus, the app may ship with a
pre-warmed offline pack of the top 100 hadiths / 50 duas / Al-Fatiha
+ short surahs (operator opt-in via build flavor). Until then, the
first run with a network connection populates the cache lazily.
