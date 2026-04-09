#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DIST_DIR="${SHOWCASE_DIST_DIR:-${REPO_DIR}/dist}"
HOST="${SHOWCASE_LOCAL_HOST:-127.0.0.1}"
PORT="${SHOWCASE_LOCAL_PORT:-4174}"

if [[ ! -d "${DIST_DIR}" ]]; then
  printf 'dist directory not found: %s\n' "${DIST_DIR}" >&2
  printf 'run pnpm build before starting the local kiosk server.\n' >&2
  exit 1
fi

exec python3 -m http.server "${PORT}" --bind "${HOST}" --directory "${DIST_DIR}"

