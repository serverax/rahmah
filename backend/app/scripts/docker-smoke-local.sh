#!/usr/bin/env bash
# =============================================================================
# backend/app/scripts/docker-smoke-local.sh
# -----------------------------------------------------------------------------
# Runs the LOCAL Sakina backend container and probes /health and /ready over
# real HTTP. This is NOT a cluster deployment.
#
# By default DATABASE_URL is NOT passed to the container — /ready should
# report database.configured=false.
#
# Optional mode: set DATABASE_URL in the environment of THIS script
# (e.g. `DATABASE_URL=postgres://... bash docker-smoke-local.sh`) and the
# variable will be forwarded to the container. The script does NOT echo
# the value anywhere, and it asserts that /ready does not return any
# `postgres://` or `postgresql://` substring (DSN leak guard).
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

readonly IMAGE="ghcr.io/serverax/rahmah/sakina-backend:0.1.0-local"
readonly CONTAINER="sakina-backend-smoke-$$"
readonly HOST_PORT="${SAKINA_SMOKE_PORT:-3331}"
readonly CONTAINER_PORT=3000

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
die()   { red "FATAL: $*"; cleanup; exit 1; }

cleanup() {
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

command -v docker >/dev/null 2>&1 || die "docker not found in PATH."
command -v curl   >/dev/null 2>&1 || die "curl not found in PATH."

# Confirm image exists locally — refuse to silently pull from anywhere.
docker image inspect "${IMAGE}" >/dev/null 2>&1 \
  || die "Image ${IMAGE} not present locally. Run docker-build-local.sh first."

bold "== Sakina backend: local Docker smoke =="
echo "Image    : ${IMAGE}"
echo "Container: ${CONTAINER}"
echo "Host port: ${HOST_PORT} -> container ${CONTAINER_PORT}"

ENV_ARGS=()
if [[ -n "${DATABASE_URL:-}" ]]; then
  yellow "DATABASE_URL is set; forwarding to container (value will NOT be printed)."
  ENV_ARGS+=("-e" "DATABASE_URL=${DATABASE_URL}")
else
  echo "DATABASE_URL not set (expected /ready database.configured=false)."
fi

docker run -d \
  --name "${CONTAINER}" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -e NODE_ENV=staging \
  "${ENV_ARGS[@]}" \
  "${IMAGE}" >/dev/null

# Wait for /health to respond — up to ~15s.
yellow "Waiting for /health to respond..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${HOST_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

bold "[/health]"
HEALTH_BODY="$(curl -fsS "http://127.0.0.1:${HOST_PORT}/health")"
echo "${HEALTH_BODY}"
echo "${HEALTH_BODY}" | grep -q '"ok":true'        || die "/health did not contain ok:true"
echo "${HEALTH_BODY}" | grep -q '"status":"healthy"' || die "/health did not contain status:healthy"

bold "[/ready]"
READY_BODY="$(curl -fsS "http://127.0.0.1:${HOST_PORT}/ready")"
echo "${READY_BODY}"
echo "${READY_BODY}" | grep -q '"ok":true' || die "/ready did not contain ok:true"
echo "${READY_BODY}" | grep -q '"scope":"ibadat"' || die "/ready missing ibadat scope"
echo "${READY_BODY}" | grep -q '"source_required":true' || die "/ready missing source_required:true"
echo "${READY_BODY}" | grep -q '"answer_without_source_blocked":true' || die "/ready missing answer_without_source_blocked:true"

# DSN leak guard: even when DATABASE_URL is set, /ready must NEVER echo it.
if echo "${READY_BODY}" | grep -Eq "postgres://|postgresql://"; then
  die "/ready response contained a DSN substring — DATABASE_URL leaked."
fi

# Expected configured flag depending on env.
if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "${READY_BODY}" | grep -q '"configured":true'  || die "/ready expected database.configured=true when DATABASE_URL is set"
else
  echo "${READY_BODY}" | grep -q '"configured":false' || die "/ready expected database.configured=false when DATABASE_URL not set"
fi

green "Smoke checks passed against running container."
