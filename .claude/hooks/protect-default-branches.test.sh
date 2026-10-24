#!/bin/bash
# Tests for protect-default-branches.sh against real temporary git repos.
# Usage: bash .claude/hooks/protect-default-branches.test.sh [path/to/hook]
# Set HOOK_SHELL=/bin/bash to run the hook under the macOS system bash 3.2.

HOOK="${1:-$(cd "$(dirname "$0")" && pwd)/protect-default-branches.sh}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
git() { command git -c user.name=test -c user.email=test@example.com "$@"; }

MAIN="$TMP/main"
WT="$TMP/wt-feature"
git init -q -b dev "$MAIN"
git -C "$MAIN" commit -q --allow-empty -m init
git -C "$MAIN" worktree add -q -b feature/x "$WT"

PASS=0
FAIL=0

# run_case <name> <expect allow|deny> <payload cwd> <command> [env...]
run_case() {
  local NAME="$1" EXPECT="$2" CWD="$3" CMD="$4"
  shift 4
  local PAYLOAD OUT GOT
  PAYLOAD=$(jq -n --arg cmd "$CMD" --arg cwd "$CWD" \
    '{tool_input: {command: $cmd}} + (if $cwd == "" then {} else {cwd: $cwd} end)')
  OUT=$(cd "$MAIN" && echo "$PAYLOAD" | env CLAUDE_PROJECT_DIR="$MAIN" "$@" "${HOOK_SHELL:-bash}" "$HOOK")
  if echo "$OUT" | grep -q '"permissionDecision":"deny"'; then GOT=deny; else GOT=allow; fi
  if [ "$GOT" = "$EXPECT" ]; then
    PASS=$((PASS + 1))
    echo "ok   - $NAME ($GOT)"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL - $NAME (expected $EXPECT, got $GOT)"
  fi
}

run_case "cd into feature worktree, main checkout on dev" allow "$MAIN" "cd $WT && git commit -m x"
run_case "cd into feature worktree with ';'" allow "$MAIN" "cd $WT; git commit -m x"
run_case "git -C feature worktree, main checkout on dev" allow "$MAIN" "git -C $WT commit -m x"
run_case "git -C quoted path" allow "$MAIN" "git -C \"$WT\" commit -m x"
run_case "relative cd from payload cwd" allow "$MAIN" "cd ../wt-feature && git commit -m x"
run_case "tilde path" allow "$MAIN" "git -C ~/wt-feature commit -m x" HOME="$TMP"
run_case "payload cwd on feature branch" allow "$WT" "git commit -m x"
run_case "commit -C <rev> is not a directory" allow "$WT" "git commit -C HEAD"
run_case "git -C checkout on dev" deny "$WT" "git -C $MAIN commit -m x"
run_case "cd into checkout on dev" deny "$WT" "cd $MAIN && git commit -m x"
run_case "git -C wins over cd" deny "$MAIN" "cd $WT && git -C $MAIN commit -m x"
run_case "chained -C resolves from the previous -C" deny "$WT" "git -C $MAIN -C . commit -m x"
run_case "chained relative -C reaches feature worktree" allow "$MAIN" "git -C $TMP -C wt-feature commit -m x"
run_case "payload cwd on dev" deny "$MAIN" "git commit -m x"
run_case "no payload cwd falls back to project dir" deny "" "git commit -m x"
run_case "missing path falls back to project dir" deny "$WT" "cd $TMP/missing && git commit -m x"
run_case "push HEAD:dev from feature worktree" deny "$WT" "git push origin HEAD:dev"
run_case "git -C push HEAD:dev" deny "$MAIN" "git -C $WT push origin HEAD:dev"
run_case "force-push to dev" deny "$WT" "git push -f origin dev"
run_case "push feature branch from worktree" allow "$MAIN" "cd $WT && git push -u origin feature/x"
run_case "commit --help on dev" allow "$MAIN" "git commit --help"
run_case "HOOK_TEST_BRANCH override" deny "$WT" "git commit -m x" HOOK_TEST_BRANCH=dev
run_case "env prefix before git on dev" deny "$MAIN" "FOO=1 git commit -m x"
run_case "command git on dev" deny "$MAIN" "command git commit -m x"
run_case "subshell git on dev" deny "$MAIN" "(git commit -m x)"
run_case "'git commit' inside an argument on dev" allow "$MAIN" "gh pr edit 1 --body 'adds the git commit hash'"
run_case "'git push origin dev' inside an argument" allow "$WT" "echo 'run git push origin dev later'"
run_case "'git commit' in a heredoc line on dev" allow "$MAIN" "cat > notes.md <<'EOF'
the git commit hash and the git push flow
EOF"
run_case "git after a prose command still checked" deny "$MAIN" "echo 'the git commit hash'; git commit -m x"

echo "$PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]
