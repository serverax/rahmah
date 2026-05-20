#!/usr/bin/env bash
set -euo pipefail

trap 'echo "FAIL: rahma-local-verify.sh" >&2' ERR

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"

echo "PASS: repo root ${repo_root}"
git status -sb

node scripts/content/validate-source-registry.js
node scripts/content/test-unapproved-source-block.js
node scripts/content/build-mobile-offline-export.js
node scripts/content/test-quran-full.js

cd apps/mobile
flutter pub get
flutter analyze
flutter test

echo "PASS: rahma-local-verify.sh"
