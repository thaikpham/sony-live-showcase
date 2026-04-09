#!/usr/bin/env bash

SHOWCASE_CONFIG_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHOWCASE_CONFIG_REPO_DIR="$(cd "${SHOWCASE_CONFIG_LIB_DIR}/../.." && pwd)"
SHOWCASE_DEVICE_CONFIG_PATH="${SHOWCASE_DEVICE_CONFIG_PATH:-${SHOWCASE_CONFIG_REPO_DIR}/config/device.json}"

showcase_config_get() {
  local key="$1"
  local default_value="${2:-}"

  python3 - "${SHOWCASE_DEVICE_CONFIG_PATH}" "${key}" "${default_value}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
key = sys.argv[2]
default = sys.argv[3]

if not path.exists():
    print(default)
    raise SystemExit(0)

try:
    data = json.loads(path.read_text())
except Exception:
    print(default)
    raise SystemExit(0)

current = data
for part in key.split("."):
    if isinstance(current, dict) and part in current:
        current = current[part]
    else:
        print(default)
        raise SystemExit(0)

if current is None:
    print(default)
elif isinstance(current, bool):
    print("1" if current else "0")
elif isinstance(current, (dict, list)):
    print(json.dumps(current, ensure_ascii=False))
else:
    print(current)
PY
}

showcase_config_set() {
  local key="$1"
  local value="$2"
  local value_type="${3:-string}"

  python3 - "${SHOWCASE_DEVICE_CONFIG_PATH}" "${key}" "${value}" "${value_type}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
key = sys.argv[2].split(".")
value = sys.argv[3]
value_type = sys.argv[4]

if path.exists():
    try:
        data = json.loads(path.read_text())
    except Exception:
        data = {}
else:
    data = {}

current = data
for part in key[:-1]:
    if not isinstance(current.get(part), dict):
        current[part] = {}
    current = current[part]

if value_type == "bool":
    parsed = value.lower() in {"1", "true", "yes", "on"}
elif value_type == "json":
    parsed = json.loads(value)
elif value_type == "null":
    parsed = None
else:
    parsed = value

current[key[-1]] = parsed
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
PY
}

showcase_find_boot_override_config() {
  local candidate

  for candidate in \
    "/boot/firmware/showcase-device.json" \
    "/boot/showcase-device.json" \
    "/boot/firmware/sony-showcase-device.json" \
    "/boot/sony-showcase-device.json"; do
    if [[ -f "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done

  return 1
}
