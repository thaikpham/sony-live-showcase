#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEFAULT_RELEASE_ID="$(date +%Y%m%d)-kiosk-release"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

RELEASE_ID="${1:-${SHOWCASE_RELEASE_ID:-${DEFAULT_RELEASE_ID}}}"
BUNDLE_ROOT="${SHOWCASE_RELEASE_BUNDLE_ROOT:-${REPO_DIR}/dist/production-release}"
BUNDLE_DIR="${BUNDLE_ROOT}/${RELEASE_ID}"
GOLDEN_IMAGE_SOURCE="${SHOWCASE_GOLDEN_IMAGE_SOURCE:-}"
PI_IMAGER_SOURCE="${SHOWCASE_PI_IMAGER_SOURCE:-}"

mkdir -p \
  "${BUNDLE_DIR}/00-imager" \
  "${BUNDLE_DIR}/01-golden-image" \
  "${BUNDLE_DIR}/02-store-configs" \
  "${BUNDLE_DIR}/03-staff-guide" \
  "${BUNDLE_DIR}/04-release-notes" \
  "${BUNDLE_DIR}/05-checklists"

cp -f "${REPO_DIR}/docs/quick-start-store-staff.md" "${BUNDLE_DIR}/03-staff-guide/quick-start-store-staff.md"
cp -f "${REPO_DIR}/docs/release-notes-template.md" "${BUNDLE_DIR}/04-release-notes/release-notes-template.md"
cp -f "${REPO_DIR}/docs/production-release-checklist.md" "${BUNDLE_DIR}/05-checklists/production-release-checklist.md"
cp -f "${REPO_DIR}/config/device.template.json" "${BUNDLE_DIR}/02-store-configs/device.template.json"

cat > "${BUNDLE_DIR}/README.md" <<EOF
# Sony Showcase Production Release Bundle

Release ID: ${RELEASE_ID}
Generated at: $(date --iso-8601=seconds)

## Folder layout

- \`00-imager/\`: place Raspberry Pi Imager or the approved flashing tool here
- \`01-golden-image/\`: place the tested golden image here
- \`02-store-configs/\`: place \`showcase-device.json\` files for each store here
- \`03-staff-guide/\`: store-facing quick start guide
- \`04-release-notes/\`: release notes for this bundle
- \`05-checklists/\`: production validation checklist

## Suggested final contents

- \`00-imager/Raspberry Pi Imager\`
- \`01-golden-image/golden-image-<version>.img.xz\`
- \`02-store-configs/showcase-device-<store>-<kiosk>.json\`
- \`03-staff-guide/quick-start-store-staff.md\`
- \`04-release-notes/release-notes-template.md\`
- \`05-checklists/production-release-checklist.md\`
EOF

if [[ -n "${GOLDEN_IMAGE_SOURCE}" && -f "${GOLDEN_IMAGE_SOURCE}" ]]; then
  cp -f "${GOLDEN_IMAGE_SOURCE}" "${BUNDLE_DIR}/01-golden-image/"
fi

if [[ -n "${PI_IMAGER_SOURCE}" && -f "${PI_IMAGER_SOURCE}" ]]; then
  cp -f "${PI_IMAGER_SOURCE}" "${BUNDLE_DIR}/00-imager/"
fi

printf 'Created production release bundle: %s\n' "${BUNDLE_DIR}"
