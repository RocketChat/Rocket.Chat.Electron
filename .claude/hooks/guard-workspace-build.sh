#!/bin/bash
# Deny running yarn/npm build inside a workspace directory (AGENTS.md: use root
# 'yarn workspaces:build' instead — running build inside a workspace dir creates
# incorrect output structures).

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

DENY_REASON="AGENTS.md: never run yarn build inside workspace directories — use root 'yarn workspaces:build'."

# Pattern 1: cd into a workspaces/<name> dir (anywhere in a &&/; chained command)
# followed later by a yarn/npm build invocation.
if echo "$LOWER" | grep -Eq 'cd[[:space:]]+[^&;]*workspaces/[^[:space:]]+' \
  && echo "$LOWER" | grep -Eq '(yarn|npm)[[:space:]]+(run[[:space:]]+)?build'; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$DENY_REASON\"}}"
  exit 0
fi

# Pattern 2: yarn workspace <name> build --cwd workspaces/...
if echo "$LOWER" | grep -Eq 'yarn[[:space:]]+workspace[[:space:]]+[^[:space:]]+[[:space:]]+build' \
  && echo "$LOWER" | grep -Eq -- '--cwd[[:space:]]+workspaces/'; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$DENY_REASON\"}}"
  exit 0
fi

exit 0
