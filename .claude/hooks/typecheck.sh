#!/bin/bash
# Type-check the checkout (main or worktree) that owns an edited .ts/.tsx file.
# Runs as an asyncRewake hook: edits never wait on tsc, and errors reach the
# model by exiting 2 with them on stderr. Async hook stdout is discarded.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

FILE_DIR=$(dirname "$FILE_PATH")
CHECKOUT=$(git -C "$FILE_DIR" rev-parse --show-toplevel 2>/dev/null) || exit 0
FILE_REPO=$(git -C "$FILE_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
PROJECT_REPO=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
if [ -z "$FILE_REPO" ] || [ "$FILE_REPO" != "$PROJECT_REPO" ]; then
  exit 0
fi

# A worktree without node_modules cannot resolve types; skip rather than
# report thousands of missing-module errors.
cd "$CHECKOUT" 2>/dev/null && [ -x node_modules/.bin/tsc ] || exit 0

# Latest edit wins: a run superseded by a newer edit stays silent, so a
# multi-step refactor reports only the state after its last edit.
STAMP="${TMPDIR:-/tmp}/claude-typecheck-$(echo "$CHECKOUT" | cksum | cut -d' ' -f1)"
TOKEN="$$.$RANDOM"
echo "$TOKEN" > "$STAMP"

# TypeScript doesn't support single-file checking well, so check the project.
ERRORS=$(node_modules/.bin/tsc --noEmit --pretty false 2>&1 | head -20)

if [ -n "$ERRORS" ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$TOKEN" ]; then
  printf 'tsc --noEmit in %s (after editing %s):\n%s\n' "$CHECKOUT" "$FILE_PATH" "$ERRORS" >&2
  exit 2
fi

exit 0
