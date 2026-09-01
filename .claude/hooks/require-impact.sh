#!/bin/bash
# Ask for confirmation when editing TS source without a recent GitNexus impact check

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only applies to TypeScript source files
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# Must be under src/
[[ "$FILE_PATH" == *"/src/"* || "$FILE_PATH" == src/* ]] || exit 0

BASENAME=$(basename "$FILE_PATH")

# Skip spec files
case "$BASENAME" in
  *.spec.ts|*.spec.tsx|*.main.spec.ts)
    exit 0
    ;;
esac

# Skip .d.ts files
[[ "$BASENAME" == *.d.ts ]] && exit 0

# Skip i18n files
[[ "$FILE_PATH" == *"/src/i18n/"* || "$FILE_PATH" == src/i18n/* ]] && exit 0

MARKER_FILE="${CLAUDE_PROJECT_DIR:-.}/.localdev/impact-marker"

if [ ! -f "$MARKER_FILE" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"No GitNexus impact analysis in the last 15 min (CLAUDE.md: run impact({target, direction:\"upstream\"}) before editing a symbol). Approve to edit anyway."}}'
  exit 0
fi

MARKER_TIME=$(awk '{print $1}' "$MARKER_FILE" 2>/dev/null)
NOW=$(date +%s)

if [ -z "$MARKER_TIME" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"No GitNexus impact analysis in the last 15 min (CLAUDE.md: run impact({target, direction:\"upstream\"}) before editing a symbol). Approve to edit anyway."}}'
  exit 0
fi

AGE=$((NOW - MARKER_TIME))

if [ "$AGE" -gt 900 ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"No GitNexus impact analysis in the last 15 min (CLAUDE.md: run impact({target, direction:\"upstream\"}) before editing a symbol). Approve to edit anyway."}}'
  exit 0
fi

exit 0
