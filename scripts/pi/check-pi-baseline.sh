#!/usr/bin/env bash

set -euo pipefail

print_section() {
  printf '\n== %s ==\n' "$1"
}

run_if_present() {
  local command_name="$1"
  shift

  if command -v "$command_name" >/dev/null 2>&1; then
    "$@"
  else
    printf 'missing: %s\n' "$command_name"
  fi
}

print_section "Timestamp"
date --iso-8601=seconds || true

print_section "OS"
run_if_present uname uname -a
if [[ -f /etc/os-release ]]; then
  cat /etc/os-release
fi

print_section "Chromium"
run_if_present chromium-browser chromium-browser --version
run_if_present chromium chromium --version
run_if_present google-chrome google-chrome --version

print_section "Session"
printf 'XDG_SESSION_TYPE=%s\n' "${XDG_SESSION_TYPE:-unknown}"
printf 'XDG_CURRENT_DESKTOP=%s\n' "${XDG_CURRENT_DESKTOP:-unknown}"
printf 'DISPLAY=%s\n' "${DISPLAY:-unset}"
printf 'WAYLAND_DISPLAY=%s\n' "${WAYLAND_DISPLAY:-unset}"

print_section "Camera Devices"
run_if_present v4l2-ctl v4l2-ctl --list-devices

print_section "GPU / GL"
run_if_present vcgencmd vcgencmd get_config int
run_if_present glxinfo glxinfo -B

print_section "Systemd User Services"
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user --no-pager --full status sony-showcase-local.service || true
else
  printf 'missing: systemctl\n'
fi
