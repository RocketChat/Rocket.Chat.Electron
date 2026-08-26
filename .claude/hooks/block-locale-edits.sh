#!/bin/bash
# Block edits to non-English locale files; translations sync from Lingohub.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only applies to locale JSON files under src/i18n/
[[ "$FILE_PATH" == *"/src/i18n/"*.i18n.json || "$FILE_PATH" == src/i18n/*.i18n.json ]] || exit 0

BASENAME=$(basename "$FILE_PATH")

if [ "$BASENAME" != "en.i18n.json" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Non-English locales are managed by Lingohub; edit en.i18n.json only (translations sync from Lingohub)."}}'
  exit 0
fi

exit 0
