#!/bin/bash
# Set proper permissions for Chrome sandbox
# This is required for the sandbox to work correctly in newer Electron versions
if [ -f "/opt/Rocket.Chat/chrome-sandbox" ]; then
  chmod 4755 "/opt/Rocket.Chat/chrome-sandbox"
fi
exit 0
