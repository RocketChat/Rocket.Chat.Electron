#!/usr/bin/env bash
# Runs the whole E2EE search harness: server up, database reset, seed, and
# the packaged macOS test.
#
#   run-all.sh [--reuse] [APP]
#
# --reuse keeps the database and the world of the last seed, so the server
# does not restart (seed.mjs then only checks that the world exists).
# APP is passed to macos-packaged.sh (default: the last build, or a new one).
# The exit code is the exit code of the packaged test.

set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

REUSE=0
if [[ "${1:-}" == --reuse ]]; then
  REUSE=1
  shift
fi

started="$(now_s)"
bash "$HARNESS_DIR/server.sh" up || exit 1
if [[ $REUSE == 0 ]]; then
  bash "$HARNESS_DIR/server.sh" reset || exit 1
fi
node "$HARNESS_DIR/seed.mjs" --port "$HARNESS_PORT" || exit 1
bash "$HARNESS_DIR/macos-packaged.sh" "$@"
code=$?
log "run-all finished in $(( $(now_s) - started )) s with exit code $code"
exit $code
