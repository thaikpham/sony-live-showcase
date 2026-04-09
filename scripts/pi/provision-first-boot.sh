#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/showcase-config.sh"

INSTALL_USER="${SHOWCASE_INSTALL_USER:-$(showcase_config_get "install_user" "${SUDO_USER:-${USER}}")}"
INSTALL_HOME="$(getent passwd "${INSTALL_USER}" | cut -d: -f6)"
DESIRED_HOSTNAME="$(showcase_config_get "hostname" "")"
DESIRED_TIMEZONE="$(showcase_config_get "timezone" "")"
ENABLE_SSH="$(showcase_config_get "first_boot.enable_ssh" "1")"
POLICY_DIR="${SHOWCASE_POLICY_DIR:-}"
AUTOSTART_FILE="${INSTALL_HOME}/.config/autostart/sony-showcase-kiosk.desktop"
USER_SERVICE_FILE="${INSTALL_HOME}/.config/systemd/user/sony-showcase-local.service"
BOOT_OVERRIDE_CONFIG="$(showcase_find_boot_override_config || true)"

copy_boot_override_config() {
  if [[ -z "${BOOT_OVERRIDE_CONFIG}" ]]; then
    return
  fi

  install -d "$(dirname "${SHOWCASE_DEVICE_CONFIG_PATH}")"

  if ! cmp -s "${BOOT_OVERRIDE_CONFIG}" "${SHOWCASE_DEVICE_CONFIG_PATH}" 2>/dev/null; then
    install -m 0644 "${BOOT_OVERRIDE_CONFIG}" "${SHOWCASE_DEVICE_CONFIG_PATH}"
    printf 'Applied boot override config: %s -> %s\n' "${BOOT_OVERRIDE_CONFIG}" "${SHOWCASE_DEVICE_CONFIG_PATH}"
  fi
}

ensure_ssh_enabled() {
  if [[ "${ENABLE_SSH}" != "1" || "${EUID}" -ne 0 ]]; then
    return
  fi

  if systemctl list-unit-files ssh.service >/dev/null 2>&1; then
    systemctl enable ssh.service >/dev/null 2>&1 || true
    systemctl restart ssh.service >/dev/null 2>&1 || true
    return
  fi

  if systemctl list-unit-files sshd.service >/dev/null 2>&1; then
    systemctl enable sshd.service >/dev/null 2>&1 || true
    systemctl restart sshd.service >/dev/null 2>&1 || true
  fi
}

ensure_hostname() {
  if [[ -z "${DESIRED_HOSTNAME}" || "${EUID}" -ne 0 ]]; then
    return
  fi

  local current_hostname
  current_hostname="$(hostname)"

  if [[ "${current_hostname}" != "${DESIRED_HOSTNAME}" ]]; then
    hostnamectl set-hostname "${DESIRED_HOSTNAME}"
    printf 'Updated hostname: %s -> %s\n' "${current_hostname}" "${DESIRED_HOSTNAME}"
  fi
}

ensure_timezone() {
  if [[ -z "${DESIRED_TIMEZONE}" || "${EUID}" -ne 0 ]]; then
    return
  fi

  local current_timezone
  current_timezone="$(timedatectl show --property=Timezone --value 2>/dev/null || true)"

  if [[ "${current_timezone}" != "${DESIRED_TIMEZONE}" ]]; then
    timedatectl set-timezone "${DESIRED_TIMEZONE}" || true
    printf 'Updated timezone: %s -> %s\n' "${current_timezone:-unset}" "${DESIRED_TIMEZONE}"
  fi
}

ensure_kiosk_installation() {
  if [[ -f "${AUTOSTART_FILE}" && -f "${USER_SERVICE_FILE}" ]]; then
    return
  fi

  printf 'Kiosk user files missing. Reinstalling user services for %s.\n' "${INSTALL_USER}"
  SHOWCASE_INSTALL_USER="${INSTALL_USER}" \
    SHOWCASE_INSTALL_APT_DEPS=0 \
    SHOWCASE_POLICY_DIR="${POLICY_DIR}" \
    bash "${SCRIPT_DIR}/install-kiosk.sh"
}

copy_boot_override_config
ensure_hostname
ensure_timezone
ensure_ssh_enabled
ensure_kiosk_installation
bash "${SCRIPT_DIR}/register-device.sh"
