#!/usr/bin/env bash
# =============================================================================
# backend/app/scripts/db-ready-smoke-local.sh
# -----------------------------------------------------------------------------
# Starts the backend on the host (not in Docker), with the operator's
# DATABASE_URL, and prints ONLY the DB readiness booleans returned by /ready.
#
# This script:
#   - never echoes the DATABASE_URL value
#   - prints only `database.configured`, `database.connected`, `database.checked`,
#     and `database.error_type`
#   - asserts /ready response does not contain any DSN substring
#
# Optional: set $SAKINA_LOCAL_PORT (default 3332). Set $DATABASE_URL externally
# (e.g. `DATABASE_URL='postgres://...' bash this-script.sh`).
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly PORT="${SAKINA_LOCAL_PORT:-3332}"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
die()   { red "FATAL: $*"; cleanup; exit 1; }

PID=""
cleanup() {
  if [[ -n "${PID}" ]]; then
    kill "${PID}" 2>/dev/null || true
    wait "${PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

command -v node >/dev/null 2>&1 || die "node not found in PATH."
command -v curl >/dev/null 2>&1 || die "curl not found in PATH."

bold "== Sakina backend: local /ready DB smoke =="
echo "App dir : ${APP_DIR}"
echo "Port    : ${PORT}"
if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL: <set, value not printed>"
else
  echo "DATABASE_URL: <unset>"
fi

cd "${APP_DIR}"
# Start the server in the background, detached from this script's stdin.
# We pass DATABASE_URL through ONLY if it was set in the environment.
PORT="${PORT}" node src/index.js >/tmp/sakina-local-smoke.log 2>&1 &
PID=$!

# Wait for /health to respond.
yellow "Waiting for /health to respond..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

READY_BODY="$(curl -fsS "http://127.0.0.1:${PORT}/ready")" || die "/ready did not respond"

# DSN leak guard.
if echo "${READY_BODY}" | grep -Eq "postgres://|postgresql://"; then
  die "/ready response contained a DSN substring. Aborting."
fi

bold "DB booleans (only):"
# Extract just the database.{configured,connected,checked,error_type} fields
# using a portable grep/sed pipeline. We do not pipe the whole JSON to stdout.
echo "${READY_BODY}" \
  | tr ',{' '\n' \
  | grep -E '"(configured|connected|checked|error_type)"' \
  | sed 's/^[ \t]*//'

green "Done. No DSN leaked."
