#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/showcase-config.sh"

SHOWCASE_CLOUD_URL="${SHOWCASE_CLOUD_URL:-$(showcase_config_get "kiosk.cloud_url" "https://sony-livestream-showcase.vercel.app/?kiosk=1")}"
SHOWCASE_LOCAL_URL="${SHOWCASE_LOCAL_URL:-$(showcase_config_get "kiosk.local_url" "http://127.0.0.1:4174/?kiosk=1")}"
SHOWCASE_PROFILE_DIR="${SHOWCASE_PROFILE_DIR:-${HOME}/.config/sony-showcase-kiosk-profile}"
SHOWCASE_PROBE_TIMEOUT_SEC="${SHOWCASE_PROBE_TIMEOUT_SEC:-5}"
SHOWCASE_RESTART_DELAY_SEC="${SHOWCASE_RESTART_DELAY_SEC:-2}"
SHOWCASE_EXTRA_FLAGS="${SHOWCASE_EXTRA_FLAGS:-$(showcase_config_get "kiosk.extra_flags" "")}"
SHOWCASE_GRAPHICS_MODE="${SHOWCASE_GRAPHICS_MODE:-$(showcase_config_get "kiosk.graphics_mode" "auto")}"
SHOWCASE_ENABLE_PI_GPU_FLAGS="${SHOWCASE_ENABLE_PI_GPU_FLAGS:-$(showcase_config_get "kiosk.enable_pi_gpu_flags" "1")}"
SHOWCASE_CHROMIUM_LOG="${SHOWCASE_CHROMIUM_LOG:-${HOME}/.cache/sony-showcase/chromium-kiosk.log}"

pick_chromium_bin() {
  if command -v chromium-browser >/dev/null 2>&1; then
    command -v chromium-browser
    return
  fi

  if command -v chromium >/dev/null 2>&1; then
    command -v chromium
    return
  fi

  if command -v google-chrome >/dev/null 2>&1; then
    command -v google-chrome
    return
  fi

  printf 'Unable to find Chromium/Chrome executable.\n' >&2
  exit 1
}

probe_url() {
  local url="$1"
  curl --silent --show-error --location --max-time "${SHOWCASE_PROBE_TIMEOUT_SEC}" --output /dev/null "${url}"
}

pick_target_url() {
  if probe_url "${SHOWCASE_CLOUD_URL}"; then
    printf '%s\n' "${SHOWCASE_CLOUD_URL}"
    return
  fi

  printf '%s\n' "${SHOWCASE_LOCAL_URL}"
}

append_if_missing() {
  local flag="$1"
  shift
  local existing

  for existing in "$@"; do
    if [[ "${existing}" == "${flag}" ]]; then
      return
    fi
  done

  CHROMIUM_FLAGS+=("${flag}")
}

configure_platform_flags() {
  case "${SHOWCASE_GRAPHICS_MODE}" in
    wayland)
      CHROMIUM_FLAGS+=("--ozone-platform=wayland" "--enable-features=UseOzonePlatform")
      ;;
    x11)
      CHROMIUM_FLAGS+=("--ozone-platform=x11" "--enable-features=UseOzonePlatform")
      ;;
    auto)
      if [[ -n "${WAYLAND_DISPLAY:-}" || "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
        CHROMIUM_FLAGS+=("--ozone-platform=wayland" "--enable-features=UseOzonePlatform")
      else
        CHROMIUM_FLAGS+=("--ozone-platform=x11")
      fi
      ;;
    none)
      ;;
    *)
      printf 'Unknown SHOWCASE_GRAPHICS_MODE=%s\n' "${SHOWCASE_GRAPHICS_MODE}" >&2
      exit 1
      ;;
  esac
}

configure_gpu_flags() {
  if [[ "${SHOWCASE_ENABLE_PI_GPU_FLAGS}" != "1" ]]; then
    return
  fi

  CHROMIUM_FLAGS+=(
    "--ignore-gpu-blocklist"
    "--enable-gpu-rasterization"
    "--enable-zero-copy"
    "--enable-native-gpu-memory-buffers"
    "--num-raster-threads=4"
  )
}

mkdir -p "${SHOWCASE_PROFILE_DIR}"
mkdir -p "$(dirname "${SHOWCASE_CHROMIUM_LOG}")"
CHROMIUM_BIN="$(pick_chromium_bin)"

while true; do
  TARGET_URL="$(pick_target_url)"
  read -r -a EXTRA_FLAGS <<< "${SHOWCASE_EXTRA_FLAGS}"
  CHROMIUM_FLAGS=(
    "--kiosk"
    "--noerrdialogs"
    "--disable-infobars"
    "--disable-session-crashed-bubble"
    "--no-first-run"
    "--start-maximized"
    "--autoplay-policy=no-user-gesture-required"
    "--use-fake-ui-for-media-stream"
    "--disable-features=Translate,MediaRouter"
    "--user-data-dir=${SHOWCASE_PROFILE_DIR}"
  )

  configure_platform_flags
  configure_gpu_flags

  "${SCRIPT_DIR}/prepare-kiosk-session.sh" || true

  append_if_missing "--password-store=basic" "${CHROMIUM_FLAGS[@]}" "${EXTRA_FLAGS[@]}"
  append_if_missing "--disk-cache-dir=${SHOWCASE_PROFILE_DIR}/cache" "${CHROMIUM_FLAGS[@]}" "${EXTRA_FLAGS[@]}"

  printf '[%s] Launching Chromium kiosk: %s\n' "$(date --iso-8601=seconds)" "${TARGET_URL}" >> "${SHOWCASE_CHROMIUM_LOG}"
  printf '[%s] Graphics mode=%s, GPU flags=%s, extra=%s\n' \
    "$(date --iso-8601=seconds)" \
    "${SHOWCASE_GRAPHICS_MODE}" \
    "${SHOWCASE_ENABLE_PI_GPU_FLAGS}" \
    "${SHOWCASE_EXTRA_FLAGS:-<none>}" >> "${SHOWCASE_CHROMIUM_LOG}"

  "${CHROMIUM_BIN}" \
    "${CHROMIUM_FLAGS[@]}" \
    "${EXTRA_FLAGS[@]}" \
    "${TARGET_URL}" >> "${SHOWCASE_CHROMIUM_LOG}" 2>&1

  sleep "${SHOWCASE_RESTART_DELAY_SEC}"
done
