# shellcheck shell=bash
# Shared settings for the E2EE search harness. Source this file; do not run it.
#
# Every value comes from the environment, from an argument or from a default
# relative to the repository root. An optional file
# "$HARNESS_STATE_DIR/env" can set the values for one machine (for example
# ROCKETCHAT_CORE_DIR). The harness never writes that file. A value that is
# already set in the environment wins over the file.

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HARNESS_DIR/../.." && pwd)"
HARNESS_STATE_DIR="${HARNESS_STATE_DIR:-$REPO_ROOT/.localdev/e2ee-search-harness}"
case "$HARNESS_STATE_DIR" in /*) ;; *) HARNESS_STATE_DIR="$PWD/$HARNESS_STATE_DIR" ;; esac

if [[ -f "$HARNESS_STATE_DIR/env" ]]; then
  _harness_env_before="$(export -p)"
  # shellcheck disable=SC1091
  source "$HARNESS_STATE_DIR/env"
  eval "$_harness_env_before"
  unset _harness_env_before
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

# ---------------------------------------------------------------- steps
# step <name> <expected s> <limit s> <command> [args...]
#
# Runs the command (also a shell function) in this shell, with the log lines,
# the expected time and the limit of steps.mjs. A background watchdog prints
# a "STEP slow" line every $HARNESS_STEP_SLOW_EVERY_S seconds (default 20)
# after the expected time. At the limit it prints "STEP FAIL ... timeout",
# stops the processes that the step started, and sends SIGUSR1 to the
# script. The script then runs its function on_step_timeout (when it has one)
# and exits with code 124. Processes that ran before the step starts (for
# example a tunnel or a server) are not stopped by the watchdog.
#
# STEP_PARAMS holds "k=v" words that go into the timing key, for example
# STEP_PARAMS="pause=1" step wait-index 100 600 driver wait-index.
# The step lines go to stderr, so `out="$(step ...)"` captures only the output
# of the command. The return code is the code of the command, or 124 after a
# timeout.

STEP_SCRIPT="${STEP_SCRIPT:-$(basename "${BASH_SOURCE[1]:-harness}" .sh)}"
STEP_TIMEOUT_CODE=124

_steps_node() { node "$HARNESS_DIR/steps.mjs" "$@"; }

# The pid and every descendant of it.
_step_tree() {
  local pid="$1" child
  echo "$pid"
  for child in $(pgrep -P "$pid" 2>/dev/null); do _step_tree "$child"; done
}

# Stops the children of the stepping shell that are not protected and that
# are not the watchdog, with their descendants.
_step_kill_body() {
  local shell_pid="$1" self="$2" protected="$3" child pids=""
  for child in $(pgrep -P "$shell_pid" 2>/dev/null); do
    [[ "$child" == "$self" || "$protected" == *" $child "* ]] && continue
    pids="$pids $(_step_tree "$child" | tr '\n' ' ')"
  done
  [[ -z "${pids// /}" ]] && return 0
  # shellcheck disable=SC2086 # a list of pids
  kill -TERM $pids 2>/dev/null
  local pid _
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    for pid in $pids; do kill -0 "$pid" 2>/dev/null && break; done
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.2
  done
  # shellcheck disable=SC2086 # a list of pids
  kill -KILL $pids 2>/dev/null
  return 0
}

_step_watchdog() {
  local name="$1" expected="$2" limit="$3" started="$4" shell_pid="$5"
  local protected="$6" marker="$7"
  shift 7
  local self t0 elapsed next_slow every limit_s
  # shellcheck disable=SC2016 # $PPID expands in sh
  self="${BASHPID:-$(exec sh -c 'echo "$PPID"')}"
  t0="$(now_s)"
  every="${HARNESS_STEP_SLOW_EVERY_S:-20}"
  every="${every%.*}"
  [[ "${every:-0}" -lt 1 ]] && every=1
  limit_s="${limit%.*}"
  [[ "${limit_s:-0}" -lt 1 ]] && limit_s=1
  next_slow=$((${expected%.*} + 1))
  while sleep 1; do
    # The script ended inside the step (for example an exit in a function).
    if ! kill -0 "$shell_pid" 2>/dev/null; then
      _steps_node end --script "$STEP_SCRIPT" --step "$name" --start "$started" \
        --expected "$expected" --pid "$$" --status fail \
        --reason "the script exited during the step" "$@"
      exit 0
    fi
    elapsed=$(($(now_s) - t0))
    if [[ $elapsed -ge $limit_s ]]; then
      : >"$marker"
      _steps_node end --script "$STEP_SCRIPT" --step "$name" --start "$started" \
        --expected "$expected" --pid "$$" --status timeout "$@"
      _step_kill_body "$shell_pid" "$self" "$protected"
      kill -USR1 "$shell_pid" 2>/dev/null
      [[ "$shell_pid" != "$$" ]] && kill -USR1 "$$" 2>/dev/null
      # The step read the marker when the command returned. The trap can end
      # the script before the step removes it.
      sleep 1
      rm -f "$marker"
      exit 0
    fi
    if [[ $elapsed -ge $next_slow ]]; then
      _steps_node slow --script "$STEP_SCRIPT" --step "$name" --start "$started" \
        --expected "$expected" --limit "$limit"
      next_slow=$((elapsed + every))
    fi
  done
}

step() {
  local name="$1" expected="$2" limit="$3"
  shift 3
  local -a params=()
  local word plan started shell_pid protected marker watchdog rc
  for word in ${STEP_PARAMS:-}; do params+=(--param "$word"); done
  plan="$(_steps_node begin --script "$STEP_SCRIPT" --step "$name" \
    --expected "$expected" --limit "$limit" --pid "$$" ${params[@]+"${params[@]}"})" ||
    plan="$expected $limit $(now_s)000"
  read -r expected limit started <<<"$plan"
  # The pid of this shell, also in a subshell (bash 3.2 has no BASHPID).
  # shellcheck disable=SC2016 # $PPID expands in sh
  shell_pid="${BASHPID:-$(exec sh -c 'echo "$PPID"')}"
  protected=" $(pgrep -P "$shell_pid" 2>/dev/null | tr '\n' ' ') "
  marker="${TMPDIR:-/tmp}/harness-step-$$-$RANDOM-$started"
  _step_watchdog "$name" "$expected" "$limit" "$started" "$shell_pid" \
    "$protected" "$marker" ${params[@]+"${params[@]}"} &
  watchdog=$!
  if "$@"; then rc=0; else rc=$?; fi
  if [[ -e "$marker" ]]; then
    # The watchdog stopped the command. It sends SIGUSR1 when it ends, and the
    # trap (or, in a subshell, the default action) ends the script.
    wait "$watchdog" 2>/dev/null
    rm -f "$marker"
    return "$STEP_TIMEOUT_CODE"
  fi
  kill "$watchdog" 2>/dev/null
  wait "$watchdog" 2>/dev/null
  rm -f "$marker"
  if [[ $rc == 0 ]]; then
    _steps_node end --script "$STEP_SCRIPT" --step "$name" --start "$started" \
      --expected "$expected" --pid "$$" --status "done" ${params[@]+"${params[@]}"}
  else
    _steps_node end --script "$STEP_SCRIPT" --step "$name" --start "$started" \
      --expected "$expected" --pid "$$" --status fail --reason "exit code $rc"
  fi
  return "$rc"
}

# The watchdog of a step sends SIGUSR1 at the limit. Bash runs this trap when
# the stopped command returns.
_step_on_timeout_signal() {
  trap '' USR1
  if declare -F on_step_timeout >/dev/null; then on_step_timeout; fi
  exit "$STEP_TIMEOUT_CODE"
}
trap _step_on_timeout_signal USR1
