#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"

git status -sb
git rev-parse HEAD
git diff --stat

if [[ -f apps/mobile/build/app/outputs/flutter-apk/app-debug.apk ]]; then
  sha256sum apps/mobile/build/app/outputs/flutter-apk/app-debug.apk
fi
if [[ -f apps/mobile/build/app/outputs/flutter-apk/app-release.apk ]]; then
  sha256sum apps/mobile/build/app/outputs/flutter-apk/app-release.apk
fi

echo "PASS: rahma-release-evidence.sh"
