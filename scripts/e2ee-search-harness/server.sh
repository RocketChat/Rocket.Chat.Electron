#!/usr/bin/env bash
# Runs a Rocket.Chat development server for the E2EE search harness.
#
#   server.sh up|down|status|reset [CORE_DIR] [PORT]
#
# CORE_DIR is a Rocket.Chat checkout with its dependencies installed and its
# packages built (default: $ROCKETCHAT_CORE_DIR). PORT is the server port
# (default: $HARNESS_PORT, else 3500). The server gets its own MongoDB on
# PORT+1, with its data in the state folder, so it never shares a database
# with another server.
#
#   up      starts MongoDB and the server in the background, creates the
#           admin user from the state file, skips the setup wizard, and waits
#           until /api/info answers (at most $SERVER_WAIT_S seconds, default
#           1200). It prints the start time.
#   down    stops only the processes that `up` started (from their pid files).
#   status  prints whether the processes run and what /api/info answers.
#   reset   deletes the database of this server only. A running server is
#           stopped first and started again after.

set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

COMMAND="${1:-}"
CORE_DIR="${2:-${ROCKETCHAT_CORE_DIR:-}}"
PORT="${3:-$HARNESS_PORT}"
MONGO_PORT=$((PORT + 1))
URL="$(server_url "$PORT")"
SERVER_DIR="$HARNESS_STATE_DIR/server-$PORT"
DB_DIR="$SERVER_DIR/mongo-db"
SERVER_WAIT_S="${SERVER_WAIT_S:-1200}"

usage() {
  echo "usage: $0 up|down|status|reset [CORE_DIR] [PORT]" >&2
  exit 2
}

pid_alive() { [[ -n "${1:-}" ]] && kill -0 "$1" 2>/dev/null; }
read_pid() { cat "$SERVER_DIR/$1.pid" 2>/dev/null; }

# The pid and every descendant of it.
tree_pids() {
  local pid="$1" child
  echo "$pid"
  for child in $(pgrep -P "$pid" 2>/dev/null); do tree_pids "$child"; done
}

stop_tree() {
  local name="$1" pid pids
  pid="$(read_pid "$name")"
  if pid_alive "$pid"; then
    pids="$(tree_pids "$pid" | tr '\n' ' ')"
    log "stopping $name (pids $pids)"
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null
    for _ in $(seq 1 30); do
      local alive=0
      for p in $pids; do pid_alive "$p" && alive=1; done
      [[ $alive == 0 ]] && break
      sleep 1
    done
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null
  fi
  rm -f "$SERVER_DIR/$name.pid"
}

api_info() { curl -sf -m 5 "$URL/api/info" 2>/dev/null; }

find_mongod() {
  if [[ -n "${MONGOD_BIN:-}" ]]; then echo "$MONGOD_BIN"; return; fi
  local bundled="$CORE_DIR/apps/meteor/.meteor/local/dev_bundle/mongodb/bin/mongod"
  if [[ -x "$bundled" ]]; then echo "$bundled"; return; fi
  local tool
  tool="$(ls -d "$HOME"/.meteor/packages/meteor-tool/*/mt-*/dev_bundle/mongodb/bin/mongod 2>/dev/null | tail -1)"
  if [[ -n "$tool" ]]; then echo "$tool"; return; fi
  command -v mongod
}

require_core() {
  if [[ -z "$CORE_DIR" || ! -d "$CORE_DIR/apps/meteor" ]]; then
    echo "CORE_DIR is not a Rocket.Chat checkout: '${CORE_DIR}'." >&2
    echo "Pass it as an argument or set ROCKETCHAT_CORE_DIR." >&2
    exit 2
  fi
  CORE_DIR="$(cd "$CORE_DIR" && pwd)"
}

init_replica_set() {
  # The mongodb driver of the Rocket.Chat checkout, so the harness needs no
  # extra dependency.
  CORE_DIR="$CORE_DIR" MONGO_PORT="$MONGO_PORT" node --input-type=module -e '
    import { createRequire } from "node:module";
    const require = createRequire(`${process.env.CORE_DIR}/package.json`);
    let mongodb;
    try { mongodb = require("mongodb"); }
    catch { mongodb = createRequire(`${process.env.CORE_DIR}/apps/meteor/package.json`)("mongodb"); }
    const host = `127.0.0.1:${process.env.MONGO_PORT}`;
    const client = await mongodb.MongoClient.connect(`mongodb://${host}/?directConnection=true`);
    const admin = client.db("admin");
    try {
      await admin.command({ replSetGetStatus: 1 });
    } catch {
      await admin.command({ replSetInitiate: { _id: "rs0", members: [{ _id: 0, host }] } });
    }
    for (let i = 0; i < 60; i++) {
      const hello = await admin.command({ hello: 1 });
      if (hello.isWritablePrimary) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await client.close();
  '
}

cmd_status() {
  local mongod meteor info
  mongod="$(read_pid mongod)"
  meteor="$(read_pid meteor)"
  info="$(api_info)"
  echo "server $URL"
  echo "  mongod: $(pid_alive "$mongod" && echo "running (pid $mongod)" || echo stopped)"
  echo "  meteor: $(pid_alive "$meteor" && echo "running (pid $meteor)" || echo stopped)"
  echo "  /api/info: ${info:-no answer}"
  pid_alive "$meteor" && [[ -n "$info" ]]
}

cmd_up() {
  require_core
  if pid_alive "$(read_pid meteor)" && [[ -n "$(api_info)" ]]; then
    log "server already up at $URL"
    return 0
  fi
  if [[ -z "$(read_pid meteor)" ]] && api_info >/dev/null; then
    echo "another process answers at $URL: choose another PORT" >&2
    exit 1
  fi
  mkdir -p "$DB_DIR"
  node "$HARNESS_DIR/state.mjs" init
  local start mongod
  start="$(now_s)"

  if ! pid_alive "$(read_pid mongod)"; then
    mongod="$(find_mongod)"
    if [[ -z "$mongod" ]]; then
      echo "no mongod found: set MONGOD_BIN" >&2
      exit 1
    fi
    nohup "$mongod" --dbpath "$DB_DIR" --port "$MONGO_PORT" --bind_ip 127.0.0.1 \
      --replSet rs0 >"$SERVER_DIR/mongod.log" 2>&1 &
    echo $! >"$SERVER_DIR/mongod.pid"
    log "mongod started on port $MONGO_PORT (pid $!)"
  fi
  local ready=0
  for _ in $(seq 1 60); do
    if init_replica_set 2>/dev/null; then ready=1; break; fi
    sleep 1
  done
  if [[ $ready != 1 ]]; then
    echo "MongoDB did not start: see $SERVER_DIR/mongod.log" >&2
    exit 1
  fi

  local mongo_url="mongodb://127.0.0.1:$MONGO_PORT/meteor?replicaSet=rs0&directConnection=true"
  local oplog_url="mongodb://127.0.0.1:$MONGO_PORT/local?replicaSet=rs0&directConnection=true"
  (
    cd "$CORE_DIR/apps/meteor" || exit 1
    exec nohup env \
      ROOT_URL="$URL" \
      PORT="$PORT" \
      MONGO_URL="$mongo_url" \
      MONGO_OPLOG_URL="$oplog_url" \
      ADMIN_USERNAME="$(state_get admin.username)" \
      ADMIN_PASS="$(state_get admin.password)" \
      ADMIN_EMAIL="$(state_get admin.email)" \
      ADMIN_EMAIL_VERIFIED=true \
      OVERWRITE_SETTING_Show_Setup_Wizard=completed \
      yarn dev --port "$PORT"
  ) >"$SERVER_DIR/meteor.log" 2>&1 &
  echo $! >"$SERVER_DIR/meteor.pid"
  log "meteor started from $CORE_DIR on port $PORT (pid $!), log $SERVER_DIR/meteor.log"

  local deadline=$((start + SERVER_WAIT_S))
  while [[ "$(now_s)" -lt $deadline ]]; do
    if [[ -n "$(api_info)" ]]; then
      log "server up at $URL after $(( $(now_s) - start )) s"
      return 0
    fi
    if ! pid_alive "$(read_pid meteor)"; then
      echo "meteor exited: see $SERVER_DIR/meteor.log" >&2
      tail -20 "$SERVER_DIR/meteor.log" >&2
      exit 1
    fi
    sleep 5
  done
  echo "the server did not answer in $SERVER_WAIT_S s: see $SERVER_DIR/meteor.log" >&2
  exit 1
}

cmd_down() {
  stop_tree meteor
  stop_tree mongod
  log "server $URL stopped"
}

cmd_reset() {
  local was_up=0
  pid_alive "$(read_pid meteor)" && was_up=1
  cmd_down
  rm -rf "$DB_DIR"
  node "$HARNESS_DIR/state.mjs" forget-world "$PORT"
  log "database of $URL deleted"
  if [[ $was_up == 1 ]]; then cmd_up; fi
}

case "$COMMAND" in
  up) cmd_up ;;
  down) cmd_down ;;
  status) cmd_status ;;
  reset) cmd_reset ;;
  *) usage ;;
esac
