# Rahma — Mobile Build-Time Configuration

The mobile app reads configuration ONLY via `--dart-define` at build
time. There is no runtime `.env` file shipped with the app.

## Variables

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `RAHMA_API_BASE` | string | `""` | Final API hostname. **Empty default refuses network.** |
| `RAHMA_BUILD_FLAVOR` | string | `internal-test` | One of `internal-test`, `staging`, `release`. Affects splash badge color only. |

## How they reach Dart

```dart
class RahmaConfig {
  static const String apiBase = String.fromEnvironment(
    'RAHMA_API_BASE',
    defaultValue: '',
  );
}
```

Compile-time constants are baked into the binary; runtime cannot
change them. This is intentional — it prevents the app from being
silently re-pointed to a fake host.

## CI matrix

| Flavor | RAHMA_API_BASE | When |
|---|---|---|
| internal-test | empty (or operator-supplied test host) | PR builds, smoke tests |
| staging | operator-supplied staging host | TestFlight / Closed Track |
| release | final production host | App Store / Play Store builds |

## Hard rules

- The mobile app NEVER hardcodes a hostname.
- The mobile app NEVER reads a hostname from cleartext on disk.
- The mobile app NEVER fetches a hostname from a third-party config service.
- A release build with `RAHMA_API_BASE=""` is REFUSED by the mobile CI
  (when authored): the workflow's `flutter build` step inspects
  `RAHMA_API_BASE` and fails if empty in `release` flavor.
