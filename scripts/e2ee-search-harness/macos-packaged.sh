#!/usr/bin/env bash
# Tests the E2EE local search in the packaged macOS app against the harness
# server, with the world that seed.mjs made.
#
#   macos-packaged.sh [APP]
#
# APP is a packaged Rocket.Chat.app with its own product name (see
# build-macos.sh). Without APP, the script uses the last build in the state
# folder, and builds one when there is none.
#
# The script deletes only the user data and the logs of $APP_NAME, starts
# the app in the background (`open -g`, no focus), and drives it through CDP
# only. It prints one PASS or FAIL line for each check and a summary line,
# and exits 1 when a check fails. Logs and captures go to
# $HARNESS_STATE_DIR/runs/<timestamp>/.
#
# It stops at once when a keychain dialog (SecurityAgent) shows. Never click
# "Always Allow" in such a dialog: report it.

set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

APP_NAME="${APP_NAME:-Rocket.Chat R3m}"
CDP_PORT="${CDP_PORT:-9444}"
INDEX_TIMEOUT_S="${INDEX_TIMEOUT_S:-600}"
URL="$(server_url)"
PROFILE="$HOME/Library/Application Support/$APP_NAME"
LOGS="$HOME/Library/Logs/$APP_NAME"
# The web client starts the history crawler only after 60 s without input.
IDLE_GATE_S=60

if [[ "$(uname -s)" != Darwin ]]; then
  echo "macos-packaged.sh runs on macOS only" >&2
  exit 2
fi
if [[ "$APP_NAME" == "Rocket.Chat" ]]; then
  echo "APP_NAME must not be Rocket.Chat: that is the production name" >&2
  exit 2
fi

APP="${1:-}"
if [[ -z "$APP" ]]; then
  case "$(uname -m)" in
    arm64) APP="$HARNESS_STATE_DIR/mac-dist/mac-arm64/Rocket.Chat.app" ;;
    *) APP="$HARNESS_STATE_DIR/mac-dist/mac/Rocket.Chat.app" ;;
  esac
  if [[ ! -d "$APP" ]]; then
    APP="$(bash "$HARNESS_DIR/build-macos.sh" | tail -1)" || exit 1
  fi
fi
APP="$(cd "$APP" && pwd)"
BINARY="$APP/Contents/MacOS/Rocket.Chat"

RUN_DIR="$HARNESS_STATE_DIR/runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
RESULTS="$RUN_DIR/results.txt"
: >"$RESULTS"

# Writes one result line: check <id> <PASS|FAIL> <text>.
check() {
  local line="$2 $1 $3"
  echo "$line" | tee -a "$RESULTS"
}

prod_item_hash() {
  security dump-keychain -a 2>/dev/null | python3 -c '
import hashlib, sys
blocks = sys.stdin.read().split("keychain: ")
item = [b for b in blocks if "\"svce\"<blob>=\"Rocket.Chat Safe Storage\"" in b]
print(len(item), hashlib.sha256("".join(item).encode()).hexdigest()[:12])'
}

DIALOG_SEEN=0
dialog_check() {
  if pgrep -x SecurityAgent >/dev/null; then
    DIALOG_SEEN=1
    check f FAIL "a keychain dialog (SecurityAgent) showed: stopped"
    stop_app KILL
    summary
  fi
}

app_pid() { pgrep -f "^$BINARY" | head -1; }

APP_STARTED_AT=0
start_app() {
  APP_STARTED_AT="$(now_s)"
  open -g -n "$APP" --args --remote-debugging-port="$CDP_PORT"
  for _ in $(seq 1 30); do [[ -n "$(app_pid)" ]] && break; sleep 1; done
  dialog_check
}

# stop_app TERM: app.quit() through the signal handler, which saves the
# index. stop_app KILL: no quit handler runs.
stop_app() {
  local signal="${1:-TERM}" pid
  pid="$(app_pid)"
  if [[ -n "$pid" ]]; then
    kill "-$signal" "$pid" 2>/dev/null
    for _ in $(seq 1 30); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  fi
  pkill "-$signal" -f "^$APP/Contents/" 2>/dev/null
  sleep 2
  pkill -KILL -f "^$APP/Contents/" 2>/dev/null
  return 0
}

driver() { node "$HARNESS_DIR/app.mjs" "$@" --cdp-port "$CDP_PORT" --port "$HARNESS_PORT"; }

log_lines() { wc -l <"$LOGS/main.log" 2>/dev/null | tr -d ' ' || echo 0; }

# The store that the main process logged at the last index open after line $1.
store_since() {
  local line
  line="$(tail -n +"$(($1 + 1))" "$LOGS/main.log" 2>/dev/null |
    grep -E 'index opened|file store did not open' | tail -1)"
  case "$line" in
    *'file store did not open'*) echo snapshot-fallback ;;
    *"'file'"* | *'"file"'* | *'store: file'*) echo file ;;
    *snapshot*) echo snapshot ;;
    '') echo none ;;
    *) echo "unknown" ;;
  esac
}

field() {
  python3 -c 'import json, sys
value = json.loads(sys.argv[1])
for key in sys.argv[2].split("."):
    value = value.get(key) if isinstance(value, dict) else None
print(value if isinstance(value, str) else json.dumps(value))' "$1" "$2" 2>/dev/null
}

summary() {
  stop_app TERM
  cp "$LOGS/main.log" "$RUN_DIR/main.log" 2>/dev/null
  echo "production item after: $(prod_item_hash)" >>"$RUN_DIR/keychain.txt"
  local pass fail
  pass="$(grep -c '^PASS' "$RESULTS")"
  fail="$(grep -c '^FAIL' "$RESULTS")"
  echo "SUMMARY $([[ $fail == 0 && $pass -gt 0 ]] && echo PASS || echo FAIL): $pass passed, $fail failed; run folder $RUN_DIR"
  [[ $fail == 0 && $pass -gt 0 ]] && exit 0
  exit 1
}

# restart_check <id> <TERM|KILL>: stops the app with the signal, starts it,
# and checks that the index opens from disk before the crawler could refill
# it.
restart_check() {
  local id="$1" signal="$2" mark out at_rest store elapsed
  mark="$(log_lines)"
  stop_app "$signal"
  start_app
  out="$(driver after-restart --timeout "$IDLE_GATE_S")"
  elapsed=$(( $(now_s) - APP_STARTED_AT ))
  echo "$out" >"$RUN_DIR/after-restart-$signal.json"
  at_rest="$(driver at-rest)"
  echo "$at_rest" >"$RUN_DIR/at-rest-$signal.json"
  store="$(store_since "$mark")"
  local ok=1
  [[ "$(field "$out" ok)" == true ]] || ok=0
  [[ "$(field "$at_rest" atRest)" == encrypted ]] || ok=0
  [[ "$store" == file ]] || ok=0
  [[ $elapsed -lt $IDLE_GATE_S ]] || ok=0
  check "$id" "$([[ $ok == 1 ]] && echo PASS || echo FAIL)" \
    "SIG$signal restart: store=$store atRest=$(field "$at_rest" atRest) docs_at_open=$(field "$out" docs) oldest_needle_found=$(field "$out" found) found_after=${elapsed}s (crawler idle gate ${IDLE_GATE_S}s)"
  dialog_check
}

if [[ -n "$(app_pid)" ]]; then
  echo "the app at $APP is already running: quit it first" >&2
  exit 2
fi
if ! curl -sf -m 5 "$URL/api/info" >/dev/null; then
  echo "no server at $URL: run server.sh up" >&2
  exit 2
fi
if ! state_get "worlds.$HARNESS_PORT.group.rid" >/dev/null; then
  echo "no seeded world for $URL: run seed.mjs" >&2
  exit 2
fi

log "app $APP ($APP_NAME), server $URL, run folder $RUN_DIR"
codesign -dv "$APP" 2>&1 | grep -E '^(Authority|TeamIdentifier)=' | head -2 >"$RUN_DIR/codesign.txt"
PROD_BEFORE="$(prod_item_hash)"
echo "production item before: $PROD_BEFORE" >"$RUN_DIR/keychain.txt"

rm -rf "$PROFILE" "$LOGS"
mkdir -p "$PROFILE"
echo "{\"Server\":\"$URL\"}" >"$PROFILE/servers.json"

start_app

# Before E2E unlock the web client has no wrap key. An open without it must
# stay sealed: no index opens and no file of the index or of its key is made.
out="$(driver sealed)"
echo "$out" >"$RUN_DIR/sealed.json"
sealed_files="$(find "$PROFILE" -path "$PROFILE/e2ee-search*" -type f 2>/dev/null | wc -l | tr -d ' ')"
check g "$([[ "$(field "$out" ok)" == true && $sealed_files == 0 ]] && echo PASS || echo FAIL)" \
  "sealed before E2E unlock: open locked=$(field "$out" locked), search fails locked=$(field "$out" searchLocked), e2ee-search files=$sealed_files"
dialog_check

out="$(driver setup)"
echo "$out" >"$RUN_DIR/setup.json"
if [[ "$(field "$out" ok)" != true ]]; then
  check setup FAIL "login, E2E unlock or opt-in failed: $out"
  summary
fi
log "A logged in, E2E unlocked, local search opt-in on; waiting for the crawler"
dialog_check

out="$(driver wait-index --timeout "$INDEX_TIMEOUT_S")"
echo "$out" >"$RUN_DIR/wait-index.json"
if [[ "$(field "$out" ok)" != true ]]; then
  check a FAIL "the crawler did not index every needle in ${INDEX_TIMEOUT_S}s: $(echo "$out" | cut -c1-300)"
  summary
fi
log "crawler indexed every needle after $(field "$out" elapsedS)s"

out="$(driver search)"
echo "$out" >"$RUN_DIR/search.json"
check a "$([[ "$(field "$out" ok)" == true ]] && echo PASS || echo FAIL)" \
  "bridge search: $(field "$out" summary)"

out="$(driver ui-search --out "$RUN_DIR/search-panel.png")"
echo "$out" >"$RUN_DIR/ui-search.json"
check b "$([[ "$(field "$out" ok)" == true ]] && echo PASS || echo FAIL)" \
  "search panel shows the $(field "$out" needle) hit ($(field "$out" hits) hits), screenshot $RUN_DIR/search-panel.png"
dialog_check

restart_check c TERM
restart_check d KILL

stop_app TERM
cp "$LOGS/main.log" "$RUN_DIR/main.log" 2>/dev/null
scan_fail=0
: >"$RUN_DIR/canary-scan.txt"
for word in $(state_get "worlds.$HARNESS_PORT.needles" | python3 -c 'import json,sys; print(" ".join(n["word"] for n in json.load(sys.stdin)))'); do
  for dir in "$PROFILE" "$LOGS"; do
    node "$HARNESS_DIR/canary-scan.mjs" --dir "$dir" --token "$word" 2>>"$RUN_DIR/canary-scan.log" |
      sed "s|^HIT|HIT $word|" >>"$RUN_DIR/canary-scan.txt"
    # Exit 1 is a hit, exit 2 a scan error: both fail the check.
    [[ ${PIPESTATUS[0]} == 0 ]] || scan_fail=1
  done
done
needle_hits="$(grep -c '^HIT' "$RUN_DIR/canary-scan.txt")"
# Where the hits are: the search index, the web client storage, or other.
hit_places="$(awk '/^HIT/ { place = "other" }
  /\/e2ee-search\// { place = "search-index" }
  /\/IndexedDB\// { place = "webclient-IndexedDB" }
  /\/Local Storage\// { place = "webclient-LocalStorage" }
  /^HIT/ { count[$2 "@" place]++ }
  END { for (k in count) printf "%s:%d ", k, count[k] }' "$RUN_DIR/canary-scan.txt")"
control_token="$HARNESS_HOST:$HARNESS_PORT"
node "$HARNESS_DIR/canary-scan.mjs" --dir "$PROFILE" --token "$control_token" >"$RUN_DIR/canary-control.txt" 2>&1
control_hits="$(grep -c '^HIT' "$RUN_DIR/canary-control.txt")"
check e "$([[ $scan_fail == 0 && $needle_hits == 0 && $control_hits -gt 0 ]] && echo PASS || echo FAIL)" \
  "canary scan of the whole profile and logs: needle hits=$needle_hits ${hit_places:+(${hit_places% }) }control '$control_token' hits=$control_hits"
index_files="$(find "$PROFILE/e2ee-search" -type f 2>/dev/null | wc -l | tr -d ' ')"
index_hits="$(grep -c '^HIT.*/e2ee-search/' "$RUN_DIR/canary-scan.txt")"
check e.index "$([[ $index_files -gt 0 && $index_hits == 0 ]] && echo PASS || echo FAIL)" \
  "canary scan of the search index folder only: needle hits=$index_hits in $index_files files"

PROD_AFTER="$(prod_item_hash)"
check f "$([[ "$PROD_BEFORE" == "$PROD_AFTER" && $DIALOG_SEEN == 0 ]] && echo PASS || echo FAIL)" \
  "production keychain item unchanged (before $PROD_BEFORE, after $PROD_AFTER), keychain dialog seen: $([[ $DIALOG_SEEN == 1 ]] && echo yes || echo no)"

summary
