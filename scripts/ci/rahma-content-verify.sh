#!/usr/bin/env bash
set -euo pipefail

trap 'echo "FAIL: rahma-content-verify.sh" >&2' ERR

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"

node scripts/content/validate-source-registry.js
node scripts/content/test-unapproved-source-block.js
node scripts/content/build-mobile-offline-export.js
node scripts/content/test-quran-full.js

if [[ -f backend/app/package.json ]]; then
  (cd backend/app && npm install && npm test)
fi

echo "PASS: rahma-content-verify.sh"
