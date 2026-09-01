#!/bin/bash
# Record a timestamp marker whenever GitNexus impact analysis is run

INPUT=$(cat)
TARGET=$(echo "$INPUT" | jq -r '.tool_input.target // "unknown"' 2>/dev/null)

MARKER_DIR="${CLAUDE_PROJECT_DIR:-.}/.localdev"
mkdir -p "$MARKER_DIR" 2>/dev/null

echo "$(date +%s) $TARGET" > "$MARKER_DIR/impact-marker" 2>/dev/null

exit 0
