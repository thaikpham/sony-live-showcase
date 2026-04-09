#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE_PATH="${SHOWCASE_TEMPLATE_PATH:-${REPO_DIR}/config/device.template.json}"
OUTPUT_DIR="${SHOWCASE_OUTPUT_DIR:-${REPO_DIR}/dist/store-configs}"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

STORE_ID="${1:-${SHOWCASE_STORE_ID:-}}"
KIOSK_NUMBER="${2:-${SHOWCASE_KIOSK_NUMBER:-01}}"
DEVICE_ID_OVERRIDE="${SHOWCASE_DEVICE_ID:-}"
HOSTNAME_OVERRIDE="${SHOWCASE_HOSTNAME:-}"
INSTALL_USER="${SHOWCASE_INSTALL_USER:-vdk}"
TIMEZONE_VALUE="${SHOWCASE_TIMEZONE:-Asia/Ho_Chi_Minh}"
CLOUD_URL="${SHOWCASE_CLOUD_URL:-https://sony-livestream-showcase.vercel.app/?kiosk=1}"
LOCAL_URL="${SHOWCASE_LOCAL_URL:-http://127.0.0.1:4174/?kiosk=1}"
GRAPHICS_MODE="${SHOWCASE_GRAPHICS_MODE:-auto}"
ENABLE_PI_GPU_FLAGS="${SHOWCASE_ENABLE_PI_GPU_FLAGS:-1}"
EXTRA_FLAGS="${SHOWCASE_EXTRA_FLAGS:-}"
UPDATE_MODE="${SHOWCASE_UPDATE_MODE:-git}"
UPDATE_REMOTE="${SHOWCASE_UPDATE_REMOTE:-origin}"
UPDATE_BRANCH="${SHOWCASE_UPDATE_BRANCH:-main}"
REGISTRATION_ENDPOINT="${SHOWCASE_REGISTRATION_ENDPOINT:-}"
REGISTRATION_TOKEN="${SHOWCASE_REGISTRATION_TOKEN:-}"

if [[ -z "${STORE_ID}" ]]; then
  printf 'Usage: %s <store-id> [kiosk-number]\n' "${0}" >&2
  printf 'Example: %s hcm-q1 03\n' "${0}" >&2
  exit 1
fi

if [[ ! -f "${TEMPLATE_PATH}" ]]; then
  printf 'Template not found: %s\n' "${TEMPLATE_PATH}" >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

DEVICE_ID="${DEVICE_ID_OVERRIDE:-${STORE_ID}-kiosk-${KIOSK_NUMBER}}"
HOSTNAME="${HOSTNAME_OVERRIDE:-sony-${STORE_ID}-${KIOSK_NUMBER}}"
OUTPUT_PATH="${OUTPUT_DIR}/showcase-device-${STORE_ID}-${KIOSK_NUMBER}.json"

python3 - "${TEMPLATE_PATH}" "${OUTPUT_PATH}" \
  "${DEVICE_ID}" "${STORE_ID}" "${HOSTNAME}" "${INSTALL_USER}" "${TIMEZONE_VALUE}" \
  "${CLOUD_URL}" "${LOCAL_URL}" "${GRAPHICS_MODE}" "${ENABLE_PI_GPU_FLAGS}" "${EXTRA_FLAGS}" \
  "${UPDATE_MODE}" "${UPDATE_REMOTE}" "${UPDATE_BRANCH}" \
  "${REGISTRATION_ENDPOINT}" "${REGISTRATION_TOKEN}" <<'PY'
import json
import pathlib
import sys

template_path = pathlib.Path(sys.argv[1])
output_path = pathlib.Path(sys.argv[2])
device_id = sys.argv[3]
store_id = sys.argv[4]
hostname = sys.argv[5]
install_user = sys.argv[6]
timezone_value = sys.argv[7]
cloud_url = sys.argv[8]
local_url = sys.argv[9]
graphics_mode = sys.argv[10]
enable_pi_gpu_flags = sys.argv[11].lower() in {"1", "true", "yes", "on"}
extra_flags = sys.argv[12]
update_mode = sys.argv[13]
update_remote = sys.argv[14]
update_branch = sys.argv[15]
registration_endpoint = sys.argv[16]
registration_token = sys.argv[17]

data = json.loads(template_path.read_text())
data["device_id"] = device_id
data["store_id"] = store_id
data["hostname"] = hostname
data["install_user"] = install_user
data["timezone"] = timezone_value
data.setdefault("kiosk", {})
data["kiosk"]["cloud_url"] = cloud_url
data["kiosk"]["local_url"] = local_url
data["kiosk"]["graphics_mode"] = graphics_mode
data["kiosk"]["enable_pi_gpu_flags"] = enable_pi_gpu_flags
data["kiosk"]["extra_flags"] = extra_flags
data.setdefault("update", {})
data["update"]["mode"] = update_mode
data["update"]["git_remote"] = update_remote
data["update"]["git_branch"] = update_branch
data.setdefault("registration", {})
data["registration"]["endpoint_url"] = registration_endpoint
data["registration"]["auth_token"] = registration_token

output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(output_path)
PY

printf 'Generated store config: %s\n' "${OUTPUT_PATH}"
