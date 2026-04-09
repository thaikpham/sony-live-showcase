#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/showcase-config.sh"

INSTALL_USER="${SHOWCASE_INSTALL_USER:-$(showcase_config_get "install_user" "${SUDO_USER:-${USER}}")}"
INSTALL_UID="$(id -u "${INSTALL_USER}")"
UPDATE_MODE="${SHOWCASE_UPDATE_MODE:-$(showcase_config_get "update.mode" "git")}"
UPDATE_REMOTE="${SHOWCASE_UPDATE_REMOTE:-$(showcase_config_get "update.git_remote" "origin")}"
UPDATE_BRANCH="${SHOWCASE_UPDATE_BRANCH:-$(showcase_config_get "update.git_branch" "main")}"
RESTART_BROWSER="${SHOWCASE_RESTART_BROWSER:-0}"

run_systemctl_user() {
  local runtime_dir="/run/user/${INSTALL_UID}"

  if [[ "${EUID}" -ne 0 && "${INSTALL_USER}" == "${USER}" ]]; then
    systemctl --user restart sony-showcase-local.service
    return
  fi

  if [[ -d "${runtime_dir}" ]]; then
    sudo -u "${INSTALL_USER}" XDG_RUNTIME_DIR="${runtime_dir}" systemctl --user restart sony-showcase-local.service
    return
  fi

  printf 'Could not restart sony-showcase-local.service automatically for %s.\n' "${INSTALL_USER}" >&2
}

if [[ "${UPDATE_MODE}" == "git" ]]; then
  if [[ ! -d "${REPO_DIR}/.git" ]]; then
    printf 'Update mode is git but %s is not a git checkout.\n' "${REPO_DIR}" >&2
    exit 1
  fi

  git -C "${REPO_DIR}" fetch "${UPDATE_REMOTE}" "${UPDATE_BRANCH}"
  git -C "${REPO_DIR}" checkout "${UPDATE_BRANCH}"
  git -C "${REPO_DIR}" pull --ff-only "${UPDATE_REMOTE}" "${UPDATE_BRANCH}"
fi

export PATH="${HOME}/.local/share/pnpm:${PATH}"

if ! command -v pnpm >/dev/null 2>&1; then
  printf 'pnpm is required to update kiosk.\n' >&2
  exit 1
fi

pnpm --dir "${REPO_DIR}" install --frozen-lockfile || pnpm --dir "${REPO_DIR}" install
pnpm --dir "${REPO_DIR}" run build:kiosk
run_systemctl_user

if [[ "${RESTART_BROWSER}" == "1" ]]; then
  pkill -f 'chromium|chrome' || true
fi

printf 'Kiosk update complete for %s (%s).\n' "${INSTALL_USER}" "${UPDATE_BRANCH}"
