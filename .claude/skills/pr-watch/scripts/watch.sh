#!/usr/bin/env bash
# Poll a PR's checks and CodeRabbit activity, printing one line per event.
# Designed to run under the Claude Code Monitor tool: every stdout line is an
# event, and the script exits once every required check has finished.
#
#   watch.sh <pr-number> [--once] [--interval <seconds>]
#
# Events:
#   CHECK <name>: <bucket>        a check appeared or changed state
#   COMMENT <path>:<line> <text>  new CodeRabbit inline review comment
#   REVIEW <text>                 new CodeRabbit review summary (actionable count)
#   DONE CI green | DONE CI finished with failures   followed by the final list
#
# Required checks default to this repo's platform test matrix. Override with
# PR_WATCH_REQUIRED="name one,name two".
set -u

pr="${1:-}"
[ -n "$pr" ] || { echo "usage: watch.sh <pr-number> [--once] [--interval <seconds>]" >&2; exit 2; }
shift
once=0
interval=60
while [ $# -gt 0 ]; do
  case "$1" in
    --once) once=1 ;;
    --interval) interval="${2:-60}"; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

repo="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)"
[ -n "$repo" ] || { echo "cannot resolve repository via gh repo view" >&2; exit 2; }

required="${PR_WATCH_REQUIRED:-check (macos-latest),check (ubuntu-latest),check (windows-latest)}"

# Comments are reported from launch time onward; PR_WATCH_SINCE (ISO 8601 UTC)
# moves the window back, mainly for testing the comment output format.
since="${PR_WATCH_SINCE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
prev=""

strip() {
  # One JSON string in, one flat text line out: drop collapsed <details>
  # blocks and HTML comments, strip tags and markdown links, collapse
  # whitespace, cap for a notification.
  jq -r 'gsub("<details>[\\s\\S]*?</details>"; "") | gsub("<!--[\\s\\S]*?-->"; "") | gsub("<[^>]*>"; "") | gsub("!\\[[^\\]]*\\]\\([^)]*\\)"; "") | gsub("\\[([^\\]]*)\\]\\([^)]*\\)"; "\\1") | gsub("\\s+"; " ") | .[0:240]'
}

while true; do
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  cur="$(gh pr checks "$pr" -R "$repo" --json name,bucket 2>/dev/null | jq -r '.[] | "\(.name): \(.bucket)"' | sort)" || true
  if [ "$cur" != "$prev" ]; then
    comm -13 <(printf '%s\n' "$prev") <(printf '%s\n' "$cur") | grep -v '^$' | sed 's/^/CHECK /'
    prev="$cur"
  fi

  # -c keeps each comment as one JSON string (newlines escaped), so one
  # comment becomes exactly one event line.
  gh api "repos/$repo/pulls/$pr/comments?since=$since" 2>/dev/null \
    | jq -c '.[] | select(.user.login | test("coderabbit"; "i")) | "\(.path):\(.line // .original_line) \(.body)"' \
    | while IFS= read -r js; do printf 'COMMENT %s\n' "$(printf '%s' "$js" | strip)"; done

  # CodeRabbit edits its summary comment in place, so `since` matches it on
  # every update; only report when the actionable line actually changed.
  review="$(gh api "repos/$repo/issues/$pr/comments?since=$since" 2>/dev/null \
    | jq -r '.[] | select(.user.login | test("coderabbit"; "i")) | .body' \
    | grep -iE 'actionable comments|no actionable' | tail -1 | jq -Rs . | strip)"
  if [ -n "$review" ] && [ "$review" != "${last_review:-}" ]; then
    printf 'REVIEW %s\n' "$review"
    last_review="$review"
  fi

  since="$now"

  missing=0
  IFS=',' read -r -a req <<< "$required"
  for name in "${req[@]}"; do
    printf '%s\n' "$cur" | grep -qF "$name: " || missing=1
  done
  if [ "$missing" -eq 0 ] && ! printf '%s\n' "$cur" | grep -qE ': pending$'; then
    if printf '%s\n' "$cur" | grep -qE ': (fail|cancel)'; then echo "DONE CI finished with failures"; else echo "DONE CI green"; fi
    printf '%s\n' "$cur"
    exit 0
  fi

  [ "$once" -eq 1 ] && exit 0
  sleep "$interval"
done
