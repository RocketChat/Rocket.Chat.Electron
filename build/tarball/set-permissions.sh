#!/bin/bash
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
CHROME_SANDBOX="$SCRIPT_DIR/chrome-sandbox"
if [ -f "$CHROME_SANDBOX" ]; then
  echo "Setting chrome-sandbox permissions..."
  sudo chmod 4755 "$CHROME_SANDBOX"
  echo "Sandbox permissions successfully set."
else
  echo "Chrome sandbox file not found."
fi
