#!/usr/bin/env bash
# =============================================================================
# backend/app/scripts/docker-build-local.sh
# -----------------------------------------------------------------------------
# Builds the Sakina backend container image LOCALLY.
# Tag:   ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local
# Notes: No push. No secrets. Image is NOT signed and NOT published.
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

readonly IMAGE="ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local"

# Resolve repo root regardless of where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
die()   { red "FATAL: $*"; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker not found in PATH."

bold "== Sakina backend: local Docker build =="
echo "Image: ${IMAGE}"
echo "Context: ${APP_DIR}"

cd "${APP_DIR}"
docker build \
  --pull \
  --tag "${IMAGE}" \
  --label "org.opencontainers.image.title=Sakina Backend" \
  --label "org.opencontainers.image.source=https://github.com/serverax/rahmah" \
  --label "org.opencontainers.image.revision=$(git -C "${APP_DIR}" rev-parse HEAD 2>/dev/null || echo 'unknown')" \
  .

ID="$(docker image inspect "${IMAGE}" --format '{{.Id}}')"
green "Built ${IMAGE}"
green "Image ID: ${ID}"
