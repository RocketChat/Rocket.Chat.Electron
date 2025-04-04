#!/bin/bash
# Fix chrome-sandbox permissions for AppImage
APPDIR="$(dirname "$(readlink -f "$0")")"
CHROME_SANDBOX="$APPDIR/chrome-sandbox"
if [ -f "$CHROME_SANDBOX" ]; then
  # First try to set SUID flag
  chmod 4755 "$CHROME_SANDBOX" 2>/dev/null || true
  # If that fails, disable sandbox as a fallback
  if [ "$(stat -c %a "$CHROME_SANDBOX")" != "4755" ]; then
    export ELECTRON_NO_SANDBOX=true
  fi
fi
# Execute the app
exec "$APPDIR/rocketchat-desktop" "$@"
