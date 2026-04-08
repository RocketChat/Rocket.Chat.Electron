#!/bin/bash
# Block edits to sensitive files (lock files, env files)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

case "$BASENAME" in
  yarn.lock|package-lock.json|pnpm-lock.yaml)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Lock files should not be edited directly. Run yarn/npm install instead."}}' >&2
    exit 2
    ;;
  .env|.env.local|.env.production)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Environment files contain secrets and should not be edited by Claude."}}' >&2
    exit 2
    ;;
esac

exit 0
