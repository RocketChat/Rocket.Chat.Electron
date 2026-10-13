#!/bin/bash
# Deny direct commits/pushes to dev/master/release/*, any push refspec that
# targets them, and force-pushes to dev/master (AGENTS.md: never commit or
# push directly to those branches — create a branch, test, open a PR).

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')
# 'git' plus any global options before the subcommand ('git -C <path> push').
# LOWER turns '-C' into '-c', so one branch covers both option arguments.
GIT_PREFIX='git([[:space:]]+(-c[[:space:]]+[^[:space:]]+|-[^[:space:]]+))*[[:space:]]+'

# Force-push to dev/master is always denied, regardless of current branch.
if echo "$LOWER" | grep -Eq "${GIT_PREFIX}push" \
  && echo "$LOWER" | grep -Eq -- '(--force|-f\b)' \
  && echo "$LOWER" | grep -Eq '(origin[[:space:]]+(dev|master)\b|:(dev|master)\b)'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Force-pushing dev/master is not allowed."}}'
  exit 0
fi

# Any push refspec whose destination is dev/master/release/*, from any branch
# (e.g. 'git push origin HEAD:dev', 'git push origin dev', 'origin :master').
set -f
while IFS= read -r PUSH_CMD; do
  SEEN_REMOTE=0
  for WORD in ${PUSH_CMD#git*[[:space:]]push}; do
    case "$WORD" in -*) continue ;; esac
    if [ "$SEEN_REMOTE" = "0" ]; then SEEN_REMOTE=1; continue; fi
    DEST="${WORD#+}"
    DEST="${DEST##*:}"
    DEST="${DEST#refs/heads/}"
    case "$DEST" in
      dev|master|release/*)
        echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"AGENTS.md: never push directly to dev/master/release/* — push a branch and open a PR."}}'
        exit 0
        ;;
    esac
  done
done < <(echo "$LOWER" | grep -oE "${GIT_PREFIX}push[^;&|]*")
set +f

# Only care about actual commit/push subcommands, not --help/log/etc.
IS_COMMIT=$(echo "$LOWER" | grep -Eq "${GIT_PREFIX}commit([[:space:]]|\$)" && echo 1 || echo 0)
IS_PUSH=$(echo "$LOWER" | grep -Eq "${GIT_PREFIX}push([[:space:]]|\$)" && echo 1 || echo 0)

# grep -E has no lookahead; strip --help invocations explicitly so
# 'git commit --help' / 'git push --help' don't trip the guard.
if echo "$LOWER" | grep -Eq -- '(commit|push)[[:space:]].*--help'; then
  IS_COMMIT=0
  IS_PUSH=0
fi

if [ "$IS_COMMIT" != "1" ] && [ "$IS_PUSH" != "1" ]; then
  exit 0
fi

# Read the branch from the directory the command runs in, not from the
# project root: a commit in a linked worktree (or 'git -C <worktree>') must
# not be judged by the branch of the main checkout. Order: 'git -C <path>',
# then a leading 'cd <path>', then the payload cwd, then CLAUDE_PROJECT_DIR.
PAYLOAD_CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
BASE_DIR="${PAYLOAD_CWD:-${CLAUDE_PROJECT_DIR:-.}}"

TOKEN_RE="^[[:space:]]*(\"[^\"]*\"|'[^']*'|[^[:space:]\"']+)"
next_token() {
  TOKEN=""
  [[ "$REST" =~ $TOKEN_RE ]] || return 1
  TOKEN="${BASH_REMATCH[1]}"
  REST="${REST:${#BASH_REMATCH[0]}}"
  TOKEN="${TOKEN#[\"\']}"
  TOKEN="${TOKEN%[\"\']}"
}

resolve_path() {
  local P="$1" FROM="$2"
  # The patterns match the literal text of the command, so no expansion.
  # shellcheck disable=SC2088,SC2016
  case "$P" in
    "~") P="$HOME" ;;
    "~/"*) P="$HOME/${P#\~/}" ;;
    '$HOME'|'${HOME}') P="$HOME" ;;
    '$HOME/'*) P="$HOME/${P#\$HOME/}" ;;
    '${HOME}/'*) P="$HOME/${P#\$\{HOME\}/}" ;;
  esac
  case "$P" in
    /*) echo "$P" ;;
    *) echo "$FROM/$P" ;;
  esac
}

CD_DIR=""
GIT_DIR_ARG=""
set -f
while IFS= read -r SEGMENT; do
  REST="$SEGMENT"
  next_token || continue
  [ "$TOKEN" = "(" ] && { next_token || continue; }
  TOKEN="${TOKEN#(}"
  if [ "$TOKEN" = "cd" ] || [ "$TOKEN" = "pushd" ]; then
    next_token
    [ "$TOKEN" = "--" ] && next_token
    CD_DIR=$(resolve_path "${TOKEN:-~}" "${CD_DIR:-$BASE_DIR}")
    continue
  fi
  # Find the git executable in the segment ('FOO=1 git', 'command git').
  while [ -n "$TOKEN" ] && [ "${TOKEN##*/}" != "git" ]; do
    next_token || TOKEN=""
  done
  [ -z "$TOKEN" ] && continue
  SEG_C=""
  SUBCOMMAND=""
  while next_token; do
    case "$TOKEN" in
      # Git resolves each -C relative to the previous one.
      -C) next_token && SEG_C=$(resolve_path "$TOKEN" "${SEG_C:-${CD_DIR:-$BASE_DIR}}") ;;
      -c) next_token ;;
      -*) ;;
      *) SUBCOMMAND="$TOKEN"; break ;;
    esac
  done
  case "$SUBCOMMAND" in
    commit|push)
      [ -n "$SEG_C" ] && GIT_DIR_ARG="$SEG_C"
      break
      ;;
  esac
done < <(printf '%s\n' "${COMMAND//[&|;]/$'\n'}")
set +f

TARGET_DIR="${GIT_DIR_ARG:-${CD_DIR:-$BASE_DIR}}"
# A path that does not exist falls back to the project root, as before.
[ -d "$TARGET_DIR" ] || TARGET_DIR="${CLAUDE_PROJECT_DIR:-.}"

BRANCH="${HOOK_TEST_BRANCH:-$(git -C "$TARGET_DIR" branch --show-current 2>/dev/null)}"

case "$BRANCH" in
  dev|master|release/*)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"AGENTS.md: never commit or push directly to dev/master/release/* — create a branch and open a PR."}}'
    exit 0
    ;;
esac

exit 0
