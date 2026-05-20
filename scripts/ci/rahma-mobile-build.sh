#!/usr/bin/env bash
set -euo pipefail

trap 'echo "FAIL: rahma-mobile-build.sh" >&2' ERR

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}/apps/mobile"

flutter pub get
flutter analyze
flutter test
flutter build apk --debug
flutter build apk --release

sha256sum build/app/outputs/flutter-apk/app-debug.apk
sha256sum build/app/outputs/flutter-apk/app-release.apk

echo "PASS: rahma-mobile-build.sh"
