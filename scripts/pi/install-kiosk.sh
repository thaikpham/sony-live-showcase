#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/showcase-config.sh"

INSTALL_USER="${SHOWCASE_INSTALL_USER:-$(showcase_config_get "install_user" "${SUDO_USER:-${USER}}")}"
INSTALL_UID="$(id -u "${INSTALL_USER}")"
INSTALL_HOME="$(getent passwd "${INSTALL_USER}" | cut -d: -f6)"
AUTOSTART_DIR="${INSTALL_HOME}/.config/autostart"
SYSTEMD_USER_DIR="${INSTALL_HOME}/.config/systemd/user"
POLICY_TARGET_DIR="${SHOWCASE_POLICY_DIR:-}"
INSTALL_APT_DEPS="${SHOWCASE_INSTALL_APT_DEPS:-1}"
SYSTEMD_SYSTEM_DIR="${SHOWCASE_SYSTEMD_DIR:-/etc/systemd/system}"
PROVISION_SERVICE_PATH="${SYSTEMD_SYSTEM_DIR}/sony-showcase-provision.service"

maybe_install_apt_packages() {
  if [[ "${INSTALL_APT_DEPS}" != "1" ]]; then
    return
  fi

  if [[ ! -f /etc/os-release ]]; then
    return
  fi

  # shellcheck disable=SC1091
  . /etc/os-release
  local distro_id="${ID:-}"
  local distro_like="${ID_LIKE:-}"

  if [[ "${distro_id}" != "debian" && "${distro_id}" != "raspbian" && "${distro_like}" != *"debian"* ]]; then
    return
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    return
  fi

  if [[ "${EUID}" -ne 0 ]]; then
    printf 'Skipping apt dependency install because root privileges are required.\n'
    return
  fi

  apt-get update
  apt-get install -y v4l-utils x11-xserver-utils mesa-utils curl
}

run_systemctl_user() {
  local runtime_dir="/run/user/${INSTALL_UID}"

  if [[ "${EUID}" -ne 0 && "${INSTALL_USER}" == "${USER}" ]]; then
    systemctl --user daemon-reload
    systemctl --user enable --now sony-showcase-local.service
    return
  fi

  if [[ ! -d "${runtime_dir}" ]]; then
    printf 'Skipping automatic systemctl --user enable because %s is unavailable.\n' "${runtime_dir}"
    printf 'Log in to the %s desktop session and run:\n' "${INSTALL_USER}"
    printf '  systemctl --user daemon-reload\n'
    printf '  systemctl --user enable --now sony-showcase-local.service\n'
    return
  fi

  sudo -u "${INSTALL_USER}" XDG_RUNTIME_DIR="${runtime_dir}" systemctl --user daemon-reload
  sudo -u "${INSTALL_USER}" XDG_RUNTIME_DIR="${runtime_dir}" systemctl --user enable --now sony-showcase-local.service
}

if [[ -z "${INSTALL_HOME}" ]]; then
  printf 'Unable to resolve home directory for install user: %s\n' "${INSTALL_USER}" >&2
  exit 1
fi

maybe_install_apt_packages

mkdir -p "${AUTOSTART_DIR}" "${SYSTEMD_USER_DIR}"

cat > "${AUTOSTART_DIR}/sony-showcase-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Sony Showcase Kiosk
Comment=Autostart Sony Livestream Showcase booth
Exec=/usr/bin/env bash -lc 'cd "${REPO_DIR}" && "${REPO_DIR}/scripts/pi/kiosk-launcher.sh"'
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

cat > "${SYSTEMD_USER_DIR}/sony-showcase-local.service" <<EOF
[Unit]
Description=Sony Showcase local fallback server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${REPO_DIR}
ExecStart=/usr/bin/env bash -lc 'cd "${REPO_DIR}" && "${REPO_DIR}/scripts/pi/start-local-showcase.sh"'
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
EOF

if [[ "${EUID}" -eq 0 ]]; then
  chown -R "${INSTALL_USER}:${INSTALL_USER}" "${INSTALL_HOME}/.config"
fi

run_systemctl_user

if [[ "${EUID}" -eq 0 ]]; then
  install -d "${SYSTEMD_SYSTEM_DIR}"
  cat > "${PROVISION_SERVICE_PATH}" <<EOF
[Unit]
Description=Sony Showcase boot-time provisioning
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
Environment=SHOWCASE_INSTALL_USER=${INSTALL_USER}
Environment=SHOWCASE_INSTALL_APT_DEPS=0
Environment=SHOWCASE_POLICY_DIR=${POLICY_TARGET_DIR}
ExecStart=/usr/bin/env bash -lc 'cd "${REPO_DIR}" && "${REPO_DIR}/scripts/pi/provision-first-boot.sh"'

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable sony-showcase-provision.service
fi

if [[ -n "${POLICY_TARGET_DIR}" ]]; then
  install -d "${POLICY_TARGET_DIR}"
  install -m 0644 "${REPO_DIR}/scripts/pi/sony-showcase.policy.json" "${POLICY_TARGET_DIR}/sony-showcase.json"
fi

printf 'Install user: %s\n' "${INSTALL_USER}"
printf 'Installed kiosk desktop entry: %s\n' "${AUTOSTART_DIR}/sony-showcase-kiosk.desktop"
printf 'Installed local fallback service: %s\n' "${SYSTEMD_USER_DIR}/sony-showcase-local.service"
if [[ "${EUID}" -eq 0 ]]; then
  printf 'Installed boot-time provisioning service: %s\n' "${PROVISION_SERVICE_PATH}"
fi
printf 'v4l2 audit command: v4l2-ctl --list-devices\n'

if [[ -n "${POLICY_TARGET_DIR}" ]]; then
  printf 'Installed Chromium policy: %s\n' "${POLICY_TARGET_DIR}/sony-showcase.json"
else
  printf 'Chromium policy not copied. Re-run with SHOWCASE_POLICY_DIR=/etc/chromium/policies/managed under sudo if needed.\n'
fi
