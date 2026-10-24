#!/bin/bash
# After building desktop-release-action via a workspace-wide build, remove the
# nested dist/dist directory (AGENTS.md: the action only needs
# workspaces/desktop-release-action/dist/index.js).

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

if [[ "$COMMAND" != *"workspaces:build"* && "$COMMAND" != *"workspaces foreach"* ]]; then
  exit 0
fi

NESTED_DIST="${CLAUDE_PROJECT_DIR:-.}/workspaces/desktop-release-action/dist/dist"

if [ -d "$NESTED_DIST" ]; then
  rm -rf "$NESTED_DIST"
  echo "Removed nested workspaces/desktop-release-action/dist/dist (AGENTS.md)"
fi

exit 0
