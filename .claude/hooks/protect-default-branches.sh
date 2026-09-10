#!/bin/bash
# Deny direct commits/pushes to dev/master and force-pushes to dev/master
# (AGENTS.md: never commit or push directly to dev/master — create a branch,
# test, open a PR).

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

# Force-push to dev/master is always denied, regardless of current branch.
if echo "$LOWER" | grep -Eq 'git[[:space:]]+push' \
  && echo "$LOWER" | grep -Eq -- '(--force|-f\b)' \
  && echo "$LOWER" | grep -Eq '(origin[[:space:]]+(dev|master)\b|:(dev|master)\b)'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Force-pushing dev/master is not allowed."}}'
  exit 0
fi

# Only care about actual commit/push subcommands, not --help/log/etc.
IS_COMMIT=$(echo "$LOWER" | grep -Eq 'git[[:space:]]+commit([[:space:]]|$)' && echo 1 || echo 0)
IS_PUSH=$(echo "$LOWER" | grep -Eq 'git[[:space:]]+push([[:space:]]|$)' && echo 1 || echo 0)

# grep -E has no lookahead; strip --help invocations explicitly so
# 'git commit --help' / 'git push --help' don't trip the guard.
if echo "$LOWER" | grep -Eq -- '(commit|push)[[:space:]].*--help'; then
  IS_COMMIT=0
  IS_PUSH=0
fi

if [ "$IS_COMMIT" != "1" ] && [ "$IS_PUSH" != "1" ]; then
  exit 0
fi

BRANCH="${HOOK_TEST_BRANCH:-$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)}"

if [ "$BRANCH" = "dev" ] || [ "$BRANCH" = "master" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"AGENTS.md: never commit or push directly to dev/master — create a branch and open a PR."}}'
  exit 0
fi

exit 0
