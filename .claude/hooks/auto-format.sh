#!/bin/bash
# Auto-format files after Edit/Write using Prettier

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Hooks fire for any path a subagent edits, including other repos — only act
# on paths inside this project.
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$FILE_PATH" in
  "$ROOT"/*) ;;
  *) exit 0 ;;
esac

if [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx || "$FILE_PATH" == *.js || "$FILE_PATH" == *.jsx || "$FILE_PATH" == *.json || "$FILE_PATH" == *.css || "$FILE_PATH" == *.md ]]; then
  npx prettier --write "$FILE_PATH" 2>/dev/null || true
fi

exit 0
