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
# `yarn dev` is the Vite dev server of the checkout (apps/meteor/vite/dev.mjs).
# It builds the workspace packages, then runs the Meteor server on METEOR_PORT
# (default: $HARNESS_METEOR_PORT, else PORT+10; Meteor also uses the next
# port) and Vite on PORT. The browser talks only to Vite, which proxies the
# server routes (/api, /websocket and others) to Meteor. ROOT_URL is the Vite
# origin.
#
#   up      starts MongoDB and the server in the background, creates the
#           admin user from the state file, skips the setup wizard, and waits
#           until /api/info answers (at most $SERVER_WAIT_S seconds, default
#           1200). It prints the start time. Each wait is a step (see the
#           `step` function of common.sh): when a wait passes its limit, the
#           script stops the processes that this call started.
#   down    stops only the processes that `up` started (from their pid files).
#   status  prints whether the processes run and what /api/info answers.
#   reset   deletes the database of this server only. A running server is
#           stopped first and started again after.

# Some functions run only through `step` or the step timeout trap.
# shellcheck disable=SC2329
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

COMMAND="${1:-}"
CORE_DIR="${2:-${ROCKETCHAT_CORE_DIR:-}}"
PORT="${3:-$HARNESS_PORT}"
MONGO_PORT=$((PORT + 1))
METEOR_PORT="${HARNESS_METEOR_PORT:-$((PORT + 10))}"
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

# A pid can belong to another process after a reboot or a long pause. The
# start time of the process tells the process that up started apart.
proc_start() { ps -o lstart= -p "$1" 2>/dev/null | sed 's/^ *//;s/ *$//'; }
record_pid() {
  echo "$2" >"$SERVER_DIR/$1.pid"
  proc_start "$2" >"$SERVER_DIR/$1.started"
}
remove_pid() { rm -f "$SERVER_DIR/$1.pid" "$SERVER_DIR/$1.started"; }

# Tells whether a process accepts connections on a local TCP port.
port_listening() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
  fi
}

# The pid and every descendant of it.
tree_pids() {
  local pid="$1" child
  echo "$pid"
  for child in $(pgrep -P "$pid" 2>/dev/null); do tree_pids "$child"; done
}

stop_tree() {
  local name="$1" pid pids started
  pid="$(read_pid "$name")"
  if pid_alive "$pid"; then
    started="$(cat "$SERVER_DIR/$name.started" 2>/dev/null)"
    if [[ -z "$started" || "$started" != "$(proc_start "$pid")" ]]; then
      log "not stopping $name: pid $pid is not the process that up started"
      remove_pid "$name"
      return 0
    fi
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
  remove_pid "$name"
}

api_info() { curl -sf -m 5 "$URL/api/info" 2>/dev/null; }

# The processes that this call of the script started, so a step that passes
# its limit stops only those.
STARTED_MONGOD=0
STARTED_METEOR=0
on_step_timeout() {
  echo "the server did not get ready in time: see $SERVER_DIR/mongod.log and $SERVER_DIR/meteor.log" >&2
  [[ $STARTED_METEOR == 1 ]] && stop_tree meteor
  [[ $STARTED_MONGOD == 1 ]] && stop_tree mongod
  return 0
}

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
  echo "  yarn dev: $(pid_alive "$meteor" && echo "running (pid $meteor), Meteor on port $METEOR_PORT" || echo stopped)"
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
  if curl -s -m 2 -o /dev/null "http://127.0.0.1:$METEOR_PORT/"; then
    echo "another process answers on the Meteor port $METEOR_PORT: set HARNESS_METEOR_PORT" >&2
    exit 1
  fi
  mkdir -p "$DB_DIR"
  node "$HARNESS_DIR/state.mjs" init
  local start mongod
  start="$(now_s)"

  if ! pid_alive "$(read_pid mongod)"; then
    if port_listening "$MONGO_PORT"; then
      echo "port $MONGO_PORT already has a listener: stop it or choose another PORT (this server's MongoDB uses PORT+1)" >&2
      exit 1
    fi
    mongod="$(find_mongod)"
    if [[ -z "$mongod" ]]; then
      echo "no mongod found: set MONGOD_BIN" >&2
      exit 1
    fi
    nohup "$mongod" --dbpath "$DB_DIR" --port "$MONGO_PORT" --bind_ip 127.0.0.1 \
      --replSet rs0 >"$SERVER_DIR/mongod.log" 2>&1 &
    record_pid mongod "$!"
    STARTED_MONGOD=1
    log "mongod started on port $MONGO_PORT (pid $!)"
  fi
  if ! step mongo-ready 3 120 wait_mongo_ready; then
    pid_alive "$(read_pid mongod)" || remove_pid mongod
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
      METEOR_PORT="$METEOR_PORT" \
      MONGO_URL="$mongo_url" \
      MONGO_OPLOG_URL="$oplog_url" \
      ADMIN_USERNAME="$(state_get admin.username)" \
      ADMIN_PASS="$(state_get admin.password)" \
      ADMIN_EMAIL="$(state_get admin.email)" \
      ADMIN_EMAIL_VERIFIED=true \
      OVERWRITE_SETTING_Show_Setup_Wizard=completed \
      yarn dev
  ) >"$SERVER_DIR/meteor.log" 2>&1 &
  record_pid meteor "$!"
  STARTED_METEOR=1
  log "yarn dev started from $CORE_DIR: Vite on port $PORT, Meteor on port $METEOR_PORT (pid $!), log $SERVER_DIR/meteor.log"

  # SERVER_WAIT_S is the default limit of this step.
  step server-ready 106 "$SERVER_WAIT_S" wait_server_ready || exit 1
  step client-ready 10 300 wait_client_ready || exit 1
  log "server up at $URL after $(( $(now_s) - start )) s"
}

wait_mongo_ready() {
  for _ in $(seq 1 60); do
    pid_alive "$(read_pid mongod)" || return 1
    if init_replica_set 2>/dev/null; then return 0; fi
    sleep 1
  done
  return 1
}

# Waits until /api/info answers. The limit of the step ends the wait.
wait_server_ready() {
  while :; do
    [[ -n "$(api_info)" ]] && return 0
    if ! pid_alive "$(read_pid meteor)"; then
      remove_pid meteor
      echo "meteor exited: see $SERVER_DIR/meteor.log" >&2
      tail -20 "$SERVER_DIR/meteor.log" >&2
      return 1
    fi
    sleep 5
  done
}

# Checks that Vite serves the page with its client entry, and the files of
# the browser E2EE search worker (links in public/ to the worker build). A
# core that is not on the Vite dev server, or a missing worker build, fails
# here and not in the first test.
wait_client_ready() {
  local page wasm_magic
  page="$(curl -sf -m 120 "$URL/home")" || { echo "Vite did not serve the page" >&2; return 1; }
  if [[ "$page" != *'/entry.ts'* ]]; then
    echo "the page has no Vite entry (/entry.ts): is the core on the Vite dev server?" >&2
    return 1
  fi
  curl -sf -m 120 -o /dev/null "$URL/entry.ts" || { echo "Vite did not serve /entry.ts" >&2; return 1; }
  curl -sf -m 30 -o /dev/null "$URL/workers/e2ee-search/worker.mjs" ||
    { echo "no E2EE search worker at /workers/e2ee-search/worker.mjs: build @rocket.chat/e2ee-search-worker" >&2; return 1; }
  wasm_magic="$(curl -sf -m 30 "$URL/workers/e2ee-search/sqlite3.wasm" | head -c 4 | od -An -tx1 | tr -d ' \n')"
  if [[ "$wasm_magic" != 0061736d ]]; then
    echo "/workers/e2ee-search/sqlite3.wasm is not a WASM file (magic '$wasm_magic')" >&2
    return 1
  fi
}

cmd_down() {
  stop_tree meteor
  stop_tree mongod
  log "server $URL stopped"
}

cmd_reset() {
  local was_up=0
  pid_alive "$(read_pid meteor)" && was_up=1
  step server-stop 5 120 cmd_down
  step database-delete 2 120 rm -rf "$DB_DIR"
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
