#!/usr/bin/env bash
set -e

OWNER="sumching51us-gif"
REPO="macstone"
API_URL="https://api.github.com/repos/${OWNER}/${REPO}/releases/latest"

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

if [[ -z "$VERSION" ]]; then
  echo "Error: Failed to fetch latest release info."
  exit 1
fi

echo "==> Latest version: ${VERSION}"

# Find matching dmg asset
ASSET_URL=$(echo "${RELEASE_JSON}" | grep '"browser_download_url":' | grep -oE 'https://[^"]+\.dmg' | grep "mac" | head -n 1)

if [[ -z "$ASSET_URL" ]]; then
  echo "Error: Could not find macOS .dmg asset in latest release."
  exit 1
fi

FILENAME=$(basename "${ASSET_URL}")
TMP_DIR=$(mktemp -d)
TMP_DMG="${TMP_DIR}/${FILENAME}"

echo "==> Downloading ${FILENAME}..."
curl -fSL -o "${TMP_DMG}" "${ASSET_URL}"

echo "==> Mounting DMG..."
MOUNT_POINT=$(hdiutil attach -nobrowse -noautoopen "${TMP_DMG}" | grep -oE '/Volumes/[^$]+' | tail -n 1)

if [[ -z "$MOUNT_POINT" ]]; then
  echo "Error: Failed to mount DMG."
  rm -rf "${TMP_DIR}"
  exit 1
fi

APP_NAME=$(find "${MOUNT_POINT}" -maxdepth 1 -name '*.app' | head -n 1)

if [[ -z "$APP_NAME" ]]; then
  echo "Error: No .app found in DMG."
  hdiutil detach "${MOUNT_POINT}" -quiet || true
  rm -rf "${TMP_DIR}"
  exit 1
fi

APP_BASENAME=$(basename "${APP_NAME}")
TARGET="/Applications/${APP_BASENAME}"

# Remove existing app if present
if [[ -d "$TARGET" ]]; then
  echo "==> Removing existing ${APP_BASENAME}..."
  rm -rf "$TARGET"
fi

echo "==> Installing ${APP_BASENAME} to /Applications..."
cp -R "${APP_NAME}" "/Applications/"

echo "==> Unmounting DMG..."
hdiutil detach "${MOUNT_POINT}" -quiet || true

echo "==> Cleaning up..."
rm -rf "${TMP_DIR}"

echo ""
echo "✅ macstone ${VERSION} has been installed to ${TARGET}"
echo "   You can now open it from Launchpad or Spotlight (Cmd+Space)."
echo ""
echo "   First launch may show a security warning. If so, go to:"
echo "   System Settings → Privacy & Security → Open Anyway"
