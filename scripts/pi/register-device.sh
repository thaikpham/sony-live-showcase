#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/showcase-config.sh"

read_device_model() {
  if [[ -f /sys/firmware/devicetree/base/model ]]; then
    tr -d '\0' < /sys/firmware/devicetree/base/model
    return
  fi

  printf 'unknown\n'
}

read_device_serial() {
  if [[ -r /proc/cpuinfo ]]; then
    awk '/Serial/ { print $3; exit }' /proc/cpuinfo
    return
  fi

  printf '\n'
}

pick_registration_state_dir() {
  if [[ "${EUID}" -eq 0 ]]; then
    printf '/var/lib/sony-showcase\n'
    return
  fi

  printf '%s\n' "${HOME}/.local/state/sony-showcase"
}

DEVICE_SERIAL="$(read_device_serial)"
DEVICE_MODEL="$(read_device_model)"
DEVICE_HOSTNAME="$(hostname)"
STORE_ID="$(showcase_config_get "store_id" "")"
DEVICE_ID="$(showcase_config_get "device_id" "")"
REGISTRATION_ENDPOINT="$(showcase_config_get "registration.endpoint_url" "")"
REGISTRATION_TOKEN="$(showcase_config_get "registration.auth_token" "")"
REGISTRATION_STATE_DIR="$(pick_registration_state_dir)"
REGISTRATION_OUTPUT_PATH="${REGISTRATION_STATE_DIR}/device-registration.json"

if [[ -z "${DEVICE_ID}" ]]; then
  if [[ -n "${DEVICE_SERIAL}" ]]; then
    DEVICE_ID="sony-${DEVICE_SERIAL}"
  else
    DEVICE_ID="sony-${DEVICE_HOSTNAME}"
  fi

  showcase_config_set "device_id" "${DEVICE_ID}" "string"
fi

mkdir -p "${REGISTRATION_STATE_DIR}"

python3 - "${REGISTRATION_OUTPUT_PATH}" "${DEVICE_ID}" "${STORE_ID}" "${DEVICE_HOSTNAME}" "${DEVICE_MODEL}" "${DEVICE_SERIAL}" <<'PY'
import json
import pathlib
import socket
import subprocess
import sys
from datetime import datetime, timezone

output_path = pathlib.Path(sys.argv[1])
device_id = sys.argv[2]
store_id = sys.argv[3]
hostname = sys.argv[4]
model = sys.argv[5]
serial = sys.argv[6]

def run_command(command: list[str]) -> str:
    try:
        return subprocess.check_output(command, text=True).strip()
    except Exception:
        return ""

payload = {
    "device_id": device_id,
    "store_id": store_id or None,
    "hostname": hostname,
    "model": model or None,
    "serial": serial or None,
    "machine_id": pathlib.Path("/etc/machine-id").read_text().strip() if pathlib.Path("/etc/machine-id").exists() else None,
    "ip_addresses": [value for value in run_command(["hostname", "-I"]).split() if value],
    "mac_addresses": [],
    "timestamp": datetime.now(timezone.utc).isoformat(),
}

for line in run_command(["ip", "-o", "link"]).splitlines():
    if "link/" not in line:
        continue
    parts = line.split()
    if len(parts) < 17:
        continue
    candidate = parts[15]
    if candidate and candidate != "00:00:00:00:00:00":
        payload["mac_addresses"].append(candidate)

output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(payload, indent=2, ensure_ascii=False))
PY

if [[ -n "${REGISTRATION_ENDPOINT}" ]]; then
  CURL_HEADERS=(-H "Content-Type: application/json")

  if [[ -n "${REGISTRATION_TOKEN}" ]]; then
    CURL_HEADERS+=(-H "Authorization: Bearer ${REGISTRATION_TOKEN}")
  fi

  curl --fail --silent --show-error \
    -X POST \
    "${CURL_HEADERS[@]}" \
    --data @"${REGISTRATION_OUTPUT_PATH}" \
    "${REGISTRATION_ENDPOINT}"
fi

printf 'Wrote device registration: %s\n' "${REGISTRATION_OUTPUT_PATH}"
