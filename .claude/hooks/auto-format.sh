#!/bin/bash
# Auto-fix files after Edit/Write: ESLint (--fix) for scripts, then Prettier.
# Only touches files inside a checkout of this repository (main or worktree);
# files in other repos keep their own formatting. ESLint errors that --fix
# cannot resolve are returned to the model as additionalContext.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

FILE_DIR=$(dirname "$FILE_PATH")
CHECKOUT=$(git -C "$FILE_DIR" rev-parse --show-toplevel 2>/dev/null) || exit 0
FILE_REPO=$(git -C "$FILE_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
PROJECT_REPO=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
if [ -z "$FILE_REPO" ] || [ "$FILE_REPO" != "$PROJECT_REPO" ]; then
  exit 0
fi

BIN="$CHECKOUT/node_modules/.bin"
[ -d "$BIN" ] || BIN="$CLAUDE_PROJECT_DIR/node_modules/.bin"

LINT_ERRORS=""
if [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx || "$FILE_PATH" == *.js || "$FILE_PATH" == *.jsx ]] && [ -x "$CHECKOUT/node_modules/.bin/eslint" ]; then
  LINT_ERRORS=$(cd "$CHECKOUT" && node_modules/.bin/eslint --fix --quiet --format unix "$FILE_PATH" 2>&1 | head -20)
fi

if [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx || "$FILE_PATH" == *.js || "$FILE_PATH" == *.jsx || "$FILE_PATH" == *.json || "$FILE_PATH" == *.css || "$FILE_PATH" == *.md ]]; then
  "$BIN/prettier" --write "$FILE_PATH" >/dev/null 2>&1 || true
fi

if [ -n "$LINT_ERRORS" ]; then
  jq -n --arg ctx "$(printf 'ESLint errors left after --fix in %s:\n%s' "$FILE_PATH" "$LINT_ERRORS")" \
    '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
fi

exit 0
