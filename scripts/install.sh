#!/usr/bin/env bash
set -e

OWNER="sumching51us-gif"
REPO="macstone"
API_URL="https://api.github.com/repos/${OWNER}/${REPO}/releases/latest"
APP_DISPLAY_NAME="AnyStone"
TARGET="/Applications/${APP_DISPLAY_NAME}.app"
CACHE_DIR="${HOME}/Library/Caches/macstone-installer"

echo "==> Checking latest release of macstone..."

# Detect platform
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "Error: This installer currently only supports macOS."
  echo "Please download the appropriate release manually from:"
  echo "  https://github.com/${OWNER}/${REPO}/releases/latest"
  exit 1
fi

# Fetch latest release info
RELEASE_JSON=$(curl -sL "${API_URL}")
VERSION=$(echo "${RELEASE_JSON}" | grep '"tag_name":' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')
VERSION_NUMBER="${VERSION#v}"

if [[ -z "$VERSION" ]]; then
  echo "Error: Failed to fetch latest release info."
  exit 1
fi

echo "==> Latest version: ${VERSION}"

LOCAL_VERSION=""
if [[ -d "$TARGET" ]]; then
  LOCAL_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "${TARGET}/Contents/Info.plist" 2>/dev/null || true)
fi

version_ge() {
  awk -v current="$1" -v latest="$2" '
    BEGIN {
      split(current, a, ".")
      split(latest, b, ".")
      for (i = 1; i <= 4; i++) {
        av = a[i] == "" ? 0 : a[i] + 0
        bv = b[i] == "" ? 0 : b[i] + 0
        if (av > bv) exit 0
        if (av < bv) exit 1
      }
      exit 0
    }
  '
}

if [[ -n "$LOCAL_VERSION" ]]; then
  echo "==> Installed version: ${LOCAL_VERSION}"
  if version_ge "$LOCAL_VERSION" "$VERSION_NUMBER"; then
    echo "==> ${APP_DISPLAY_NAME} is already up to date."
    exit 0
  fi
fi

ARCH=$(uname -m)
case "$ARCH" in
  arm64) ASSET_ARCH="arm64" ;;
  x86_64) ASSET_ARCH="x64" ;;
  *)
    echo "Error: Unsupported macOS architecture: ${ARCH}"
    exit 1
    ;;
esac

ASSET_URLS=$(echo "${RELEASE_JSON}" | grep '"browser_download_url":' | grep -oE 'https://[^"]+')

# Prefer the architecture-specific zip because it is smaller and easier to install.
ASSET_URL=$(echo "${ASSET_URLS}" | grep -E "mac-${ASSET_ARCH}\.zip$" | head -n 1)
if [[ -z "$ASSET_URL" ]]; then
  ASSET_URL=$(echo "${ASSET_URLS}" | grep -E "mac.*${ASSET_ARCH}.*\.dmg$" | head -n 1)
fi
if [[ -z "$ASSET_URL" ]]; then
  ASSET_URL=$(echo "${ASSET_URLS}" | grep -E "mac.*\.dmg$" | head -n 1)
fi

if [[ -z "$ASSET_URL" ]]; then
  echo "Error: Could not find a macOS release asset for ${ASSET_ARCH}."
  exit 1
fi

FILENAME=$(basename "${ASSET_URL}")
mkdir -p "${CACHE_DIR}"
TMP_DIR=$(mktemp -d)
DOWNLOAD_PATH="${CACHE_DIR}/${FILENAME}"

echo "==> Downloading ${FILENAME}..."
if ! curl -fL --retry 3 --continue-at - -o "${DOWNLOAD_PATH}" "${ASSET_URL}"; then
  echo "==> Resuming failed; retrying a clean download..."
  rm -f "${DOWNLOAD_PATH}"
  curl -fL --retry 3 -o "${DOWNLOAD_PATH}" "${ASSET_URL}"
fi

APP_NAME=""
MOUNT_POINT=""

cleanup() {
  if [[ -n "$MOUNT_POINT" ]]; then
    hdiutil detach "${MOUNT_POINT}" -quiet || true
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

if [[ "$FILENAME" == *.zip ]]; then
  echo "==> Extracting ZIP..."
  ditto -x -k "${DOWNLOAD_PATH}" "${TMP_DIR}/unpacked"
  APP_NAME=$(find "${TMP_DIR}/unpacked" -maxdepth 3 -name '*.app' -type d | head -n 1)
elif [[ "$FILENAME" == *.dmg ]]; then
  echo "==> Mounting DMG..."
  MOUNT_POINT=$(hdiutil attach -nobrowse -noautoopen "${DOWNLOAD_PATH}" | grep -oE '/Volumes/[^$]+' | tail -n 1)
  if [[ -z "$MOUNT_POINT" ]]; then
    echo "Error: Failed to mount DMG."
    exit 1
  fi
  APP_NAME=$(find "${MOUNT_POINT}" -maxdepth 1 -name '*.app' -type d | head -n 1)
else
  echo "Error: Unsupported release asset: ${FILENAME}"
  exit 1
fi

if [[ -z "$APP_NAME" ]]; then
  echo "Error: No .app found in release asset."
  exit 1
fi
APP_BASENAME=$(basename "${APP_NAME}")
if [[ "$APP_BASENAME" != *.app ]]; then
  echo "Error: No .app found in release asset."
  exit 1
fi

TARGET="/Applications/${APP_BASENAME}"
BACKUP="${TARGET}.previous"

if pgrep -x "${APP_DISPLAY_NAME}" >/dev/null 2>&1; then
  echo "==> Asking ${APP_DISPLAY_NAME} to quit..."
  osascript -e "tell application \"${APP_DISPLAY_NAME}\" to quit" >/dev/null 2>&1 || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if ! pgrep -x "${APP_DISPLAY_NAME}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  if pgrep -x "${APP_DISPLAY_NAME}" >/dev/null 2>&1; then
    echo "Error: ${APP_DISPLAY_NAME} is still running. Quit it and run this installer again."
    exit 1
  fi
fi

run_installer_cmd() {
  if [[ -w "/Applications" ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

if [[ -d "$TARGET" ]]; then
  echo "==> Backing up existing ${APP_BASENAME}..."
  run_installer_cmd rm -rf "$BACKUP"
  run_installer_cmd mv "$TARGET" "$BACKUP"
fi

echo "==> Installing ${APP_BASENAME} to /Applications..."
if ! run_installer_cmd ditto "${APP_NAME}" "$TARGET"; then
  echo "Error: Installation failed."
  if [[ -d "$BACKUP" ]]; then
    echo "==> Restoring previous installation..."
    run_installer_cmd rm -rf "$TARGET"
    run_installer_cmd mv "$BACKUP" "$TARGET"
  fi
  exit 1
fi

if [[ -d "$BACKUP" ]]; then
  run_installer_cmd rm -rf "$BACKUP"
fi

echo ""
echo "✅ macstone ${VERSION} has been installed to ${TARGET}"
echo "   You can now open it from Launchpad or Spotlight (Cmd+Space)."
echo ""
echo "   First launch may show a security warning. If so, go to:"
echo "   System Settings → Privacy & Security → Open Anyway"
