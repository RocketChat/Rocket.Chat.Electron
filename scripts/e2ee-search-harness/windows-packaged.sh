#!/usr/bin/env bash
# Tests the E2EE local search in a packaged Windows x64 build against the
# harness server on this Mac. It runs on the Mac and drives a Windows host
# over SSH.
#
#   windows-packaged.sh [--build]
#
# Environment:
#   WINDOWS_HOST      required. The SSH destination of the Windows host
#                     (user@host, or a host name from ~/.ssh/config). The
#                     login must work without a password prompt.
#   WINDOWS_DIR       the work folder on the host (default
#                     C:\e2ee-search-harness). No spaces.
#   WINDOWS_NODE_DIR  a folder with node.exe (Node.js 22.18 or later) to put
#                     first in PATH on the host. Leave it empty when node is
#                     in PATH. No spaces.
#   WINDOWS_CDP_PORT  the remote debugging port of the app (default 9446).
#                     The same port is forwarded to this Mac.
#   HARNESS_STATE_DIR the state folder of the checkout that ran server.sh up.
#                     Set it when you run this script from another checkout:
#                     only that state file holds the admin password.
#   WINDOWS_WORLD     the name of the test world (default win).
#   APP_NAME          the product name of the test app (default
#                     "Rocket.Chat R3m").
#
# The test uses its own world on the same server (see seed.mjs --world), so
# it never changes the world of the macOS test. It never resets the server.
#
# Steps:
#   1. seed.mjs --world makes the world when it is missing.
#   2. The PowerShell helpers in windows/ go to $WINDOWS_DIR\harness.
#   3. With --build, or when the host has no build, the working tree of
#      $DESKTOP_DIR (tracked files and untracked files that git does not
#      ignore) goes to the host, and windows/build.ps1 builds
#      $WINDOWS_DIR\dist\win-unpacked there.
#   4. One SSH connection holds two tunnels: the host reaches the server as
#      $HARNESS_HOST:$HARNESS_PORT (a reverse tunnel), and this Mac reaches
#      the CDP port of the app.
#   5. The app starts with a new profile in $WINDOWS_DIR\profile, and app.mjs
#      drives it through CDP, as in macos-packaged.sh.
#
# Checks a, b, e and e.index are the same as in macos-packaged.sh. Check c
# closes the app through CDP (Browser.close) instead of a SIGTERM. Check d
# ends every process of the app with Stop-Process -Force instead of a
# SIGKILL. Check f.dpapi replaces the keychain check f: key.bin must be
# wrapped by the DPAPI-protected key of the profile.
#
# It prints one PASS or FAIL line for each check and a summary line, and
# exits 1 when a check fails. Logs and captures go to
# $HARNESS_STATE_DIR/runs/win-<timestamp>/.

set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

APP_NAME="${APP_NAME:-Rocket.Chat R3m}"
DEFAULT_WINDOWS_DIR='C:\e2ee-search-harness'
WINDOWS_HOST="${WINDOWS_HOST:-}"
WINDOWS_DIR="${WINDOWS_DIR:-$DEFAULT_WINDOWS_DIR}"
WINDOWS_NODE_DIR="${WINDOWS_NODE_DIR:-}"
WINDOWS_CDP_PORT="${WINDOWS_CDP_PORT:-9446}"
WINDOWS_WORLD="${WINDOWS_WORLD:-win}"
INDEX_TIMEOUT_S="${INDEX_TIMEOUT_S:-600}"
URL="$(server_url)"
WORLD_KEY="$HARNESS_PORT-$WINDOWS_WORLD"
REMOTE_HARNESS="$WINDOWS_DIR\\harness"
# The web client starts the history crawler only after 60 s without input.
IDLE_GATE_S=60

BUILD=0
case "${1:-}" in
  --build) BUILD=1 ;;
  '') ;;
  *)
    echo "usage: $0 [--build]" >&2
    exit 2
    ;;
esac

windows_path_re='^[A-Za-z]:\\[A-Za-z0-9._\\-]+$'
app_name_re='^[A-Za-z0-9._ -]+$'
if [[ -z "$WINDOWS_HOST" ]]; then
  echo "set WINDOWS_HOST to the SSH destination of the Windows host" >&2
  exit 2
fi
if [[ ! "$WINDOWS_DIR" =~ $windows_path_re ]]; then
  echo "WINDOWS_DIR must be an absolute Windows path with no spaces: '$WINDOWS_DIR'" >&2
  exit 2
fi
if [[ -n "$WINDOWS_NODE_DIR" && ! "$WINDOWS_NODE_DIR" =~ $windows_path_re ]]; then
  echo "WINDOWS_NODE_DIR must be an absolute Windows path with no spaces: '$WINDOWS_NODE_DIR'" >&2
  exit 2
fi
if [[ "$APP_NAME" == "Rocket.Chat" || ! "$APP_NAME" =~ $app_name_re ]]; then
  echo "APP_NAME must not be Rocket.Chat (the production name) and must hold only letters, digits, spaces, dots, dashes and underscores" >&2
  exit 2
fi
if [[ ! "$WINDOWS_CDP_PORT" =~ ^[0-9]+$ ]]; then
  echo "WINDOWS_CDP_PORT must be a port number" >&2
  exit 2
fi
if [[ ! "$WINDOWS_WORLD" =~ ^[a-z0-9]{1,16}$ ]]; then
  echo "WINDOWS_WORLD must be 1 to 16 lower-case letters or digits" >&2
  exit 2
fi
# The reverse tunnel gives the host the server on its own loopback address,
# so the server URL must use a loopback name.
if [[ "$HARNESS_HOST" != localhost && "$HARNESS_HOST" != 127.0.0.1 ]]; then
  echo "HARNESS_HOST must be localhost or 127.0.0.1 for the Windows test" >&2
  exit 2
fi

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=20)
NODE_ARG=()
[[ -n "$WINDOWS_NODE_DIR" ]] && NODE_ARG=(-NodeDir "$WINDOWS_NODE_DIR")

# Runs a command on the host. The default shell of the host can be cmd or
# PowerShell: every command here works in both.
# The command expands on this Mac on purpose.
# shellcheck disable=SC2029
win() { ssh "${SSH_OPTS[@]}" "$WINDOWS_HOST" "$@"; }

# winps <helper> [args]: runs windows/<helper>.ps1 on the host with -Root.
# Quote an argument with spaces as "\"text\"".
winps() {
  local script="$1"
  shift
  win "powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $REMOTE_HARNESS\\$script.ps1 -Root $WINDOWS_DIR $*" | tr -d '\r'
}

# scp takes C:/dir/file on a Windows host.
scp_path() { echo "${1//\\//}"; }

app_name_arg="\"$APP_NAME\""

if ! curl -sf -m 5 "$URL/api/info" >/dev/null; then
  echo "no server at $URL: run server.sh up" >&2
  exit 2
fi
if lsof -nP -iTCP:"$WINDOWS_CDP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $WINDOWS_CDP_PORT is in use on this Mac: set WINDOWS_CDP_PORT" >&2
  exit 2
fi
if ! win "echo connected" >/dev/null; then
  echo "cannot open an SSH session to $WINDOWS_HOST" >&2
  exit 2
fi

node "$HARNESS_DIR/seed.mjs" --port "$HARNESS_PORT" --world "$WINDOWS_WORLD" || exit 1
if ! state_get "worlds.$WORLD_KEY.group.rid" >/dev/null; then
  echo "no seeded world $WORLD_KEY in the state file" >&2
  exit 2
fi

RUN_DIR="$HARNESS_STATE_DIR/runs/win-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
RESULTS="$RUN_DIR/results.txt"
: >"$RESULTS"
log "host $WINDOWS_HOST, folder $WINDOWS_DIR, app $APP_NAME, server $URL, world $WORLD_KEY, run folder $RUN_DIR"

win "powershell -NoProfile -Command New-Item -ItemType Directory -Force -Path $REMOTE_HARNESS" >/dev/null || exit 1
scp "${SSH_OPTS[@]}" -q "$HARNESS_DIR"/windows/*.ps1 "$HARNESS_DIR/windows/keycheck.mjs" \
  "$WINDOWS_HOST:$(scp_path "$REMOTE_HARNESS")/" || exit 1

has_build="$(win "powershell -NoProfile -Command Test-Path $WINDOWS_DIR\\dist\\win-unpacked\\Rocket.Chat.exe" | tr -d '\r')"
if [[ $BUILD == 1 || "$has_build" != True ]]; then
  tarball="$HARNESS_STATE_DIR/windows-src.tar"
  log "packing $DESKTOP_DIR ($(git -C "$DESKTOP_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown), with uncommitted changes)"
  (
    cd "$DESKTOP_DIR" || exit 1
    git ls-files -z -co --exclude-standard |
      while IFS= read -r -d '' file; do
        # A tracked file that the working tree deleted is not packed.
    # COPYFILE_DISABLE keeps the macOS metadata files (._*) out of the tar.
        [[ -e "$file" || -L "$file" ]] && printf '%s\0' "$file"
      done |
      COPYFILE_DISABLE=1 tar -cf "$tarball" --null -T -
  ) || exit 1
  scp "${SSH_OPTS[@]}" -q "$tarball" "$WINDOWS_HOST:$(scp_path "$WINDOWS_DIR")/src.tar" || exit 1
  log "building on $WINDOWS_HOST (yarn install, build, electron-builder); this takes some minutes"
  winps build -AppName "$app_name_arg" ${NODE_ARG[@]+"${NODE_ARG[@]}"} | tee "$RUN_DIR/build.txt"
  code=${PIPESTATUS[0]}
  if [[ $code != 0 ]]; then
    echo "the build on $WINDOWS_HOST failed with exit code $code: see $RUN_DIR/build.txt" >&2
    exit 1
  fi
fi

check() { echo "$2 $1 $3" | tee -a "$RESULTS"; }

driver() {
  node "$HARNESS_DIR/app.mjs" "$@" --cdp-port "$WINDOWS_CDP_PORT" \
    --port "$HARNESS_PORT" --world "$WINDOWS_WORLD"
}

field() {
  python3 -c 'import json, sys
value = json.loads(sys.argv[1])
for key in sys.argv[2].split("."):
    value = value.get(key) if isinstance(value, dict) else None
print(value if isinstance(value, str) else json.dumps(value))' "$1" "$2" 2>/dev/null
}

TUNNEL=""
APP_JOB=""
APP_OUT=""
APP_STARTED_AT=0
STOPPED=""

# shellcheck disable=SC2329 # called by the EXIT trap
cleanup() {
  if [[ -n "$APP_JOB" ]]; then
    winps stop >/dev/null 2>&1
    wait "$APP_JOB" 2>/dev/null
  fi
  [[ -n "$TUNNEL" ]] && kill "$TUNNEL" 2>/dev/null
}
trap cleanup EXIT

# start_app <tag>: starts the app in a background SSH session, which ends
# when the app exits, and waits until its CDP port answers.
start_app() {
  local tag="$1"
  APP_OUT="$RUN_DIR/app-$tag.txt"
  APP_STARTED_AT="$(now_s)"
  winps start -Port "$WINDOWS_CDP_PORT" -Tag "$tag" >"$APP_OUT" 2>&1 &
  APP_JOB=$!
  for _ in $(seq 1 60); do
    curl -sf -m 2 "http://127.0.0.1:$WINDOWS_CDP_PORT/json/version" >/dev/null && return 0
    sleep 1
  done
  return 1
}

# Waits until start.ps1 reported the exit of the app.
wait_exit() {
  for _ in $(seq 1 "$1"); do
    grep -q '^EXITED' "$APP_OUT" 2>/dev/null && return 0
    sleep 1
  done
  return 1
}

# stop_app quit|kill <tag>: stops the app and sets STOPPED to quit, killed
# or quit-timeout-killed. quit closes the app through CDP. kill ends every
# process at once, so no quit handler runs.
stop_app() {
  local how="$1" tag="$2"
  if [[ -z "$APP_JOB" ]]; then
    STOPPED=none
    return
  fi
  if [[ "$how" == quit ]]; then
    driver quit >"$RUN_DIR/quit-$tag.json" 2>&1
    if wait_exit 60 && grep -q '^EXITED .*left=0' "$APP_OUT"; then
      STOPPED=quit
    else
      winps stop >>"$RUN_DIR/quit-$tag.json" 2>&1
      wait_exit 20
      STOPPED=quit-timeout-killed
    fi
  else
    winps stop >"$RUN_DIR/kill-$tag.txt" 2>&1
    wait_exit 20
    STOPPED=killed
  fi
  wait "$APP_JOB" 2>/dev/null
  APP_JOB=""
}

log_lines() {
  winps logs -AppName "$app_name_arg" | sed -nE 's/^LINES ([0-9]+).*/\1/p'
}

# The store that the main process logged at the last index open after line $1.
store_since() {
  local line
  line="$(winps logs -AppName "$app_name_arg" -From "$1" | tee "$RUN_DIR/log-since-$1.txt" |
    grep -E 'index opened|file store did not open' | tail -1)"
  case "$line" in
    *'file store did not open'*) echo snapshot-fallback ;;
    *"'file'"* | *'"file"'* | *'store: file'*) echo file ;;
    *snapshot*) echo snapshot ;;
    '') echo none ;;
    *) echo "unknown" ;;
  esac
}

fetch_main_log() {
  winps logs -AppName "$app_name_arg" -Copy >/dev/null 2>&1
  scp "${SSH_OPTS[@]}" -q "$WINDOWS_HOST:$(scp_path "$WINDOWS_DIR")/run/main.log" \
    "$RUN_DIR/main.log" 2>/dev/null
}

summary() {
  stop_app quit end
  fetch_main_log
  local pass fail
  pass="$(grep -c '^PASS' "$RESULTS")"
  fail="$(grep -c '^FAIL' "$RESULTS")"
  echo "SUMMARY $([[ $fail == 0 && $pass -gt 0 ]] && echo PASS || echo FAIL): $pass passed, $fail failed; run folder $RUN_DIR"
  [[ $fail == 0 && $pass -gt 0 ]] && exit 0
  exit 1
}

# restart_check <id> <quit|kill>: stops the app, starts it, and checks that
# the index opens from disk before the crawler could refill it.
restart_check() {
  local id="$1" how="$2" mark out at_rest store elapsed
  stop_app "$how" "before-$id"
  mark="$(log_lines)"
  if ! start_app "$id"; then
    check "$id" FAIL "the app did not start again: no CDP on port $WINDOWS_CDP_PORT in 60 s"
    return
  fi
  out="$(driver after-restart --timeout "$IDLE_GATE_S")"
  elapsed=$(($(now_s) - APP_STARTED_AT))
  echo "$out" >"$RUN_DIR/after-restart-$how.json"
  at_rest="$(driver at-rest)"
  echo "$at_rest" >"$RUN_DIR/at-rest-$how.json"
  store="$(store_since "${mark:-0}")"
  local ok=1
  [[ "$STOPPED" == quit || "$STOPPED" == killed ]] || ok=0
  [[ "$(field "$out" ok)" == true ]] || ok=0
  [[ "$(field "$at_rest" atRest)" == encrypted ]] || ok=0
  [[ "$store" == file ]] || ok=0
  [[ $elapsed -lt $IDLE_GATE_S ]] || ok=0
  check "$id" "$([[ $ok == 1 ]] && echo PASS || echo FAIL)" \
    "$how stop ($STOPPED) and restart: store=$store atRest=$(field "$at_rest" atRest) docs_at_open=$(field "$out" docs) oldest_needle_found=$(field "$out" found) found_after=${elapsed}s (crawler idle gate ${IDLE_GATE_S}s)"
}

ssh "${SSH_OPTS[@]}" -o ExitOnForwardFailure=yes -N \
  -R "127.0.0.1:$HARNESS_PORT:127.0.0.1:$HARNESS_PORT" \
  -L "127.0.0.1:$WINDOWS_CDP_PORT:127.0.0.1:$WINDOWS_CDP_PORT" \
  "$WINDOWS_HOST" &
TUNNEL=$!
sleep 3
if ! kill -0 "$TUNNEL" 2>/dev/null; then
  echo "the SSH tunnel to $WINDOWS_HOST failed: is port $HARNESS_PORT in use on the host?" >&2
  exit 1
fi

winps stop >"$RUN_DIR/stop-leftovers.txt" 2>&1
winps profile -AppName "$app_name_arg" -Url "$URL" | tee "$RUN_DIR/profile.txt"
if ! grep -q '^server reachable: 200' "$RUN_DIR/profile.txt"; then
  check setup FAIL "the host does not reach $URL through the tunnel: $(grep '^server reachable' "$RUN_DIR/profile.txt")"
  summary
fi

if ! start_app first; then
  check setup FAIL "the app did not start: no CDP on port $WINDOWS_CDP_PORT in 60 s"
  summary
fi
out="$(driver setup)"
echo "$out" >"$RUN_DIR/setup.json"
if [[ "$(field "$out" ok)" != true ]]; then
  check setup FAIL "login, E2E unlock or opt-in failed: $out"
  summary
fi
log "A logged in, E2E unlocked, local search opt-in on; waiting for the crawler"

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

restart_check c quit
restart_check d kill

stop_app quit end
if [[ "$STOPPED" != quit ]]; then
  log "the final stop was $STOPPED"
fi
words="$(state_get "worlds.$WORLD_KEY.needles" |
  python3 -c 'import json,sys; print(",".join(n["word"] for n in json.load(sys.stdin)))')"
control_token="$HARNESS_HOST:$HARNESS_PORT"
winps post -AppName "$app_name_arg" -Words "\"$words\"" -Control "\"$control_token\"" ${NODE_ARG[@]+"${NODE_ARG[@]}"} \
  >"$RUN_DIR/post.txt" 2>&1
grep -E '^(HIT|SCAN|CONTROL)' "$RUN_DIR/post.txt" >"$RUN_DIR/canary-scan.txt"

needle_hits="$(grep -c '^HIT' "$RUN_DIR/post.txt")"
scan_errors="$(grep -cE '^SCAN [^ ]+ exit=2' "$RUN_DIR/post.txt")"
scan_count="$(grep -c '^SCAN' "$RUN_DIR/post.txt")"
control_hits="$(sed -nE 's/^CONTROL exit=[0-9]+ hits=([0-9]+)$/\1/p' "$RUN_DIR/post.txt")"
# Where the hits are: the search index, the web client storage, or other.
hit_places="$(awk '/^HIT/ { place = "other" }
  /\/e2ee-search\// { place = "search-index" }
  /\/IndexedDB\// { place = "webclient-IndexedDB" }
  /\/Local Storage\// { place = "webclient-LocalStorage" }
  /^HIT/ { count[$2 "@" place]++ }
  END { for (k in count) printf "%s:%d ", k, count[k] }' "$RUN_DIR/post.txt")"
check e "$([[ $scan_count -gt 0 && $scan_errors == 0 && $needle_hits == 0 && ${control_hits:-0} -gt 0 ]] && echo PASS || echo FAIL)" \
  "canary scan of the profile and the app data folder: needle hits=$needle_hits ${hit_places:+(${hit_places% }) }scan errors=$scan_errors control '$control_token' hits=${control_hits:-none}"

index_files="$(sed -nE 's/^INDEXFILES ([0-9]+)$/\1/p' "$RUN_DIR/post.txt")"
index_hits="$(grep -c '^HIT.*/e2ee-search/' "$RUN_DIR/post.txt")"
check e.index "$([[ ${index_files:-0} -gt 0 && $index_hits == 0 ]] && echo PASS || echo FAIL)" \
  "canary scan of the search index folder only: needle hits=$index_hits in ${index_files:-0} files"

key_files="$(sed -nE 's/^KEYFILES ([0-9]+)$/\1/p' "$RUN_DIR/post.txt")"
key_json="$(sed -nE 's/^KEY (\{.*\})$/\1/p' "$RUN_DIR/post.txt" | head -1)"
key_ok=0
if [[ "$key_files" == 1 &&
  "$(field "$key_json" localStateKeyPrefix)" == DPAPI &&
  "$(field "$key_json" dpapiUnprotectOk)" == true &&
  "$(field "$key_json" keyBinPrefix)" == v10 &&
  "$(field "$key_json" keyBinHoldsPlainKw1)" == false &&
  "$(field "$key_json" gcmAuthOk)" == true &&
  "$(field "$key_json" plainStartsWithKw1)" == true ]]; then
  key_ok=1
fi
check f.dpapi "$([[ $key_ok == 1 ]] && echo PASS || echo FAIL)" \
  "key.bin wrapped by the DPAPI-protected key of the profile: key.bin files=${key_files:-0} ${key_json:-no key check}"

summary
