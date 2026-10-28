# shellcheck shell=bash
# Shared settings for the E2EE search harness. Source this file; do not run it.
#
# Every value comes from the environment, from an argument or from a default
# relative to the repository root. An optional file
# "$HARNESS_STATE_DIR/env" can set the values for one machine (for example
# ROCKETCHAT_CORE_DIR). The harness never writes that file.

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HARNESS_DIR/../.." && pwd)"
HARNESS_STATE_DIR="${HARNESS_STATE_DIR:-$REPO_ROOT/.localdev/e2ee-search-harness}"

if [[ -f "$HARNESS_STATE_DIR/env" ]]; then
  # shellcheck disable=SC1091
  source "$HARNESS_STATE_DIR/env"
fi

HARNESS_PORT="${HARNESS_PORT:-3500}"
HARNESS_HOST="${HARNESS_HOST:-localhost}"
# The desktop checkout that the packaged app is built from.
DESKTOP_DIR="${DESKTOP_DIR:-$REPO_ROOT}"
STATE_FILE="$HARNESS_STATE_DIR/state.json"

export HARNESS_STATE_DIR HARNESS_PORT HARNESS_HOST DESKTOP_DIR STATE_FILE

server_url() { echo "http://$HARNESS_HOST:${1:-$HARNESS_PORT}"; }

# Reads one value from the state file: state_get <dotted.path> [port].
state_get() { node "$HARNESS_DIR/state.mjs" get "$@"; }

now_s() { date +%s; }

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
