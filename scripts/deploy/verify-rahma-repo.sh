#!/usr/bin/env bash
# verify-rahma-repo.sh — refuse to run anywhere except serverax/rahmah on main.
# Pure-bash; no kubectl, no apply, no network calls. Safe to run on any host.
set -euo pipefail

EXPECTED_REPO_SUFFIX="serverax/rahmah"
EXPECTED_BRANCH="main"

cd "$(dirname "$0")/../.." # repo root

CURRENT_DIR="$(pwd)"
BRANCH="$(git branch --show-current 2>/dev/null || true)"
REMOTE_URL="$(git config --get remote.origin.url 2>/dev/null || true)"

echo "[verify-rahma-repo] dir    = $CURRENT_DIR"
echo "[verify-rahma-repo] branch = $BRANCH"
echo "[verify-rahma-repo] remote = $REMOTE_URL"

if [[ "$BRANCH" != "$EXPECTED_BRANCH" ]]; then
  echo "[verify-rahma-repo] ERROR: branch is '$BRANCH', expected '$EXPECTED_BRANCH'" >&2
  exit 2
fi

if [[ "$REMOTE_URL" != *"$EXPECTED_REPO_SUFFIX"* ]]; then
  echo "[verify-rahma-repo] ERROR: remote url '$REMOTE_URL' does not contain '$EXPECTED_REPO_SUFFIX'" >&2
  exit 2
fi

# Cross-project guards — if the working tree contains a path that belongs to
# another project, refuse.
if [[ -d "$CURRENT_DIR/iterlaw" ]] || [[ -d "$CURRENT_DIR/rightsnow" ]] || [[ -d "$CURRENT_DIR/ordinox" ]]; then
  echo "[verify-rahma-repo] ERROR: cross-project directory detected in working tree" >&2
  exit 2
fi

echo "[verify-rahma-repo] OK — Rahma/Sakina repo, main branch"
