---
name: pr-watch
description: Use when a branch was just pushed or a PR is open and the user wants to know when CI is green, when a check fails, or when CodeRabbit posts new comments, without anyone polling by hand. Triggers include "watch CI", "monitor the PR", "tell me when checks pass", "raise a watcher on CI", "wait for CI", or a request to keep an eye on review comments after a push.
---

# PR Watch

Watch one PR until every required check has finished, surfacing check state
changes and new CodeRabbit comments as they happen. Read-only: this skill
never commits, never pushes unless told to, and never replies to or resolves
review threads.

## Core rule

One harness `Monitor` running `scripts/watch.sh`. Not a haiku `watcher`
agent, not a foreground `sleep` loop, not repeated `gh pr checks` calls by
hand. AGENTIC.md § Async dispatch records why: a haiku watcher cannot hold a
multi-minute poll and returns early claiming it is still monitoring, and
manual polling burns a full turn per check. The Monitor tool holds the wait
and delivers each event as a notification.

## Steps

### 1. Resolve the PR and confirm it is pushed

```bash
pr=$(gh pr view --json number --jq '.number')   # or the number the user gave
git status -sb | head -1                          # look for "ahead N"
```

If the branch is ahead of its upstream, stop and say so. Push only when the
user's request explicitly included pushing (for example "push and watch").
Never commit here; that is the `commit` skill's job.

### 2. Arm exactly one monitor

Check `TaskList`/`ListAgents` first. If a monitor for this PR is already
running, do not arm another.

```
Monitor({
  command: "bash .claude/skills/pr-watch/scripts/watch.sh <pr>",
  description: "PR <pr> CI checks and CodeRabbit comments",
  timeout_ms: 3600000,
  persistent: false,
})
```

The script exits on its own when all required checks (default: the three
`check (<os>-latest)` jobs; override with `PR_WATCH_REQUIRED`) are no longer
pending. Run `bash .claude/skills/pr-watch/scripts/watch.sh <pr> --once` to
see the current snapshot without waiting.

### 3. Relay events, one line each

| Event line                       | What to tell the user                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `CHECK <name>: pending`          | A check started. One sentence per notification, however many CHECK lines it carries.                        |
| `CHECK <name>: pass`             | Passed. Same rule: one sentence per notification naming what passed and what is still pending.              |
| `CHECK <name>: fail` / `cancel`  | Failed. Go to step 4 now, do not wait for the rest.                                                         |
| `COMMENT <path>:<line> ...`      | CodeRabbit inline comment. Summarize in one sentence and name `/coderabbit-triage` as the way to act on it. |
| `REVIEW ...`                     | CodeRabbit summary. Report the actionable count only.                                                       |
| `DONE CI green`                  | Final table of every check and its state. Stop.                                                             |
| `DONE CI finished with failures` | Final table, then step 4.                                                                                   |

Between events, do nothing. Do not call `TaskOutput` to peek.

### 4. On a failed check

Dispatch the `ci-failure-triage` agent (read-only, haiku). Its prompt is
one line: `PR <number>, failed check "<name>", head commit <sha>`. It
returns "known flaky, rerun" or "real failure" with a verbatim log excerpt.
The monitor keeps running meanwhile; keep relaying its events. For known
flaky, offer `gh run rerun --failed <run-id>`; once the rerun starts the
existing monitor picks up the new pending state, so do not arm another. For
a real failure, report the excerpt and let the monitor run to `DONE`; fixing
the failure is a new task.

### 5. Timeout

If the monitor hits its 60 minute timeout with checks still pending, report
which checks are pending and re-arm once. Do not re-arm a third time; ask
the user instead.

## Common mistakes

| Mistake                                                     | Fix                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Dispatching a `watcher` or haiku agent to "keep monitoring" | Use `Monitor`; agents return early on long waits.                                                |
| Foreground `sleep 60; gh pr checks` loops                   | Blocked by the harness and wastes turns. Monitor only.                                           |
| Two monitors on the same PR after a resume                  | Check `TaskList` before arming.                                                                  |
| Replying to or resolving CodeRabbit threads from here       | That is `/coderabbit-triage`, which the user invokes.                                            |
| Reporting green before the platform jobs registered         | The script waits for the required checks to exist; trust `DONE`, not an early all-pass snapshot. |
| Committing or pushing "since we are watching anyway"        | Push only on explicit request; never commit.                                                     |
