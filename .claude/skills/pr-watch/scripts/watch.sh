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
# PR_WATCH_REQUIRED="name one;name two".
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

required="${PR_WATCH_REQUIRED:-test (macos-latest, 1);test (macos-latest, 2);test (ubuntu-24.04-arm, 1);test (ubuntu-24.04-arm, 2);test (windows-latest, 1);test (windows-latest, 2)}"

# Comments are reported from launch time onward; PR_WATCH_SINCE (ISO 8601 UTC)
# moves the window back, mainly for testing the comment output format.
since="${PR_WATCH_SINCE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
# Each endpoint keeps its own window, so a failed fetch of one does not
# skip or repeat the comments of the other.
since_inline="$since"
since_issue="$since"
prev=""

strip() {
  # One JSON string in, one flat text line out: drop collapsed <details>
  # blocks and HTML comments, strip tags and markdown links, collapse
  # whitespace, cap for a notification.
  jq -r 'gsub("<details>[\\s\\S]*?</details>"; "") | gsub("<!--[\\s\\S]*?-->"; "") | gsub("<[^>]*>"; "") | gsub("!\\[[^\\]]*\\]\\([^)]*\\)"; "") | gsub("\\[([^\\]]*)\\]\\([^)]*\\)"; "\\1") | gsub("\\s+"; " ") | .[0:240]'
}

while true; do
  # Taken before the fetches, so a comment created during a fetch falls
  # inside the next window.
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  # gh pr checks exits non-zero while checks are pending or failing, so its
  # exit code cannot tell a failed fetch. Accept only a JSON array, and keep
  # the previous state otherwise.
  checks="$(gh pr checks "$pr" -R "$repo" --json name,bucket 2>/dev/null)"
  if printf '%s' "$checks" | jq -e 'type == "array"' >/dev/null 2>&1; then
    cur="$(printf '%s' "$checks" | jq -r '.[] | "\(.name): \(.bucket)"' | sort)"
  else
    cur="$prev"
  fi
  if [ "$cur" != "$prev" ]; then
    comm -13 <(printf '%s\n' "$prev") <(printf '%s\n' "$cur") | grep -v '^$' | sed 's/^/CHECK /'
    prev="$cur"
  fi

  # Advance a window only after every page of its fetch succeeds, so a
  # failed poll retries the same window instead of losing its comments.
  # --paginate prints one JSON array per page, and `.[]` reads each one.
  # -c keeps each comment as one JSON string (newlines escaped), so one
  # comment becomes exactly one event line.
  if inline="$(gh api --paginate "repos/$repo/pulls/$pr/comments?since=$since_inline&per_page=100" 2>/dev/null)"; then
    printf '%s' "$inline" \
      | jq -c '.[] | select(.user.login | test("coderabbit"; "i")) | "\(.path):\(.line // .original_line) \(.body)"' \
      | while IFS= read -r js; do printf 'COMMENT %s\n' "$(printf '%s' "$js" | strip)"; done
    since_inline="$now"
  fi

  # CodeRabbit edits its summary comment in place, so `since` matches it on
  # every update; only report when the actionable line actually changed.
  if issue="$(gh api --paginate "repos/$repo/issues/$pr/comments?since=$since_issue&per_page=100" 2>/dev/null)"; then
    review="$(printf '%s' "$issue" \
      | jq -r '.[] | select(.user.login | test("coderabbit"; "i")) | .body' \
      | grep -iE 'actionable comments|no actionable' | tail -1 | jq -Rs . | strip)"
    if [ -n "$review" ] && [ "$review" != "${last_review:-}" ]; then
      printf 'REVIEW %s\n' "$review"
      last_review="$review"
    fi
    since_issue="$now"
  fi

  missing=0
  IFS=';' read -r -a req <<< "$required"
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
