#!/usr/bin/env bash
# Builds the packaged macOS app for the E2EE search harness.
#
#   build-macos.sh            builds from $DESKTOP_DIR (default: this repository)
#
# The app gets its own product name, $APP_NAME (default "Rocket.Chat R3m").
# The product name sets the keychain item "<name> Safe Storage" and the user
# data folder, so the test never touches the production keychain item
# "Rocket.Chat Safe Storage" or the production profile. productName stays
# "Rocket.Chat" so the bundle keeps its name and afterPack can flip the fuses.
#
# Signing: electron-builder signs with the Developer ID identity that it finds
# in the keychain. The app is not notarized (no FORCE_NOTARIZE). Set
# MAC_SIGN=adhoc for an ad-hoc signature when no identity is available. An
# ad-hoc signature can make macOS ask for the keychain password, and the test
# stops when a keychain dialog shows.
#
# It prints the path of the app on the last line.

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

APP_NAME="${APP_NAME:-Rocket.Chat R3m}"
OUT="$HARNESS_STATE_DIR/mac-dist"
case "$(uname -m)" in
  arm64) ARCH=arm64; APP_DIR="$OUT/mac-arm64" ;;
  *) ARCH=x64; APP_DIR="$OUT/mac" ;;
esac

if [[ "$APP_NAME" == "Rocket.Chat" ]]; then
  echo "APP_NAME must not be Rocket.Chat: that is the production name" >&2
  exit 2
fi

sign_args=()
if [[ "${MAC_SIGN:-}" == adhoc ]]; then
  sign_args=(-c.mac.identity=-)
fi

cd "$DESKTOP_DIR"
log "building $DESKTOP_DIR ($(git rev-parse --short HEAD 2>/dev/null || echo unknown))"
NODE_ENV=production yarn build
rm -rf "$APP_DIR"
npx electron-builder --mac dir "--$ARCH" --publish never \
  -c.productName=Rocket.Chat \
  -c.extraMetadata.productName="$APP_NAME" \
  -c.directories.output="$OUT" \
  ${sign_args[@]+"${sign_args[@]}"}

codesign -dv "$APP_DIR/Rocket.Chat.app" 2>&1 | grep -E '^(Authority|TeamIdentifier|Signature)=' | head -3 || true
echo "$APP_DIR/Rocket.Chat.app"
