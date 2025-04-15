#!/bin/sh

set -e

# Set owner to root and permissions to 4755 for chrome-sandbox
# Use || true to prevent errors if the file doesn't exist (e.g., during upgrades)
# or if permissions are already correct.
chown root:root "/opt/Rocket.Chat/chrome-sandbox" || true
chmod 4755 "/opt/Rocket.Chat/chrome-sandbox" || true

exit 0
