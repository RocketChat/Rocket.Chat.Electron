#!/bin/bash
# Rocket.Chat Desktop - Linux Display Server Wrapper
# Ensures proper display server selection before Chromium initializes.
# See docs/linux-wayland-bug-postmortem.md for technical details.

set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"
BINARY="$SCRIPT_DIR/rocketchat-desktop.bin"

EXTRA_ARGS=""

should_force_x11() {
    [[ "${XDG_SESSION_TYPE:-}" != "wayland" ]] && return 0
    [[ -z "${WAYLAND_DISPLAY:-}" ]] && return 0

    local runtime_dir="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
    local socket="$runtime_dir/$WAYLAND_DISPLAY"
    [[ ! -S "$socket" ]] && return 0

    return 1
}

# Check if a Wayland socket exists at one of the known locations.
# This handles SSH/remote sessions (XDG_SESSION_TYPE=tty) connecting to a
# Wayland desktop — the socket is real but env vars don't reflect it.
detect_wayland_socket() {
    local runtime_dir="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
    [[ -S "$runtime_dir/wayland-0" ]] && return 0
    [[ -S "$runtime_dir/wayland-1" ]] && return 0
    return 1
}

if should_force_x11; then
    if detect_wayland_socket; then
        # Wayland socket exists even though session type doesn't say Wayland
        # (e.g. SSH/tty session to a Wayland desktop). Use Wayland explicitly.
        EXTRA_ARGS="--ozone-platform=wayland"
    else
        EXTRA_ARGS="--ozone-platform=x11"
    fi
fi

exec "$BINARY" $EXTRA_ARGS "$@"
