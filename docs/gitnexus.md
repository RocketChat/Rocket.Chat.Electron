# GitNexus

How to keep the GitNexus index of this repository healthy, and how its tools
behave when you work in a linked worktree. The rules for using it (impact
before an edit, `detect_changes` before a commit) are in
[AGENTS.md](../AGENTS.md).

## Reindex

- Reindex only from the main checkout, at a quiet point, with
  `node .gitnexus/run.cjs analyze --index-only`. No `.gitnexus/run.cjs` yet?
  Run `npx gitnexus analyze --index-only` (if npm 11 crashes, run
  `npm i -g gitnexus`, see #1939).
- Do not run `analyze` inside a linked worktree. It registers a second index
  under the same name, `Rocket.Chat.Electron`. Lookups by that name then fail
  with "Multiple registered repos match", and the extra index goes stale. To
  remove one, run `gitnexus clean --force` in that worktree.
- `--index-only` skips every generated file. Without it, `analyze` rewrites
  the generated skills in `.claude/skills/gitnexus/`.
- `.gitnexusrc` sets `skipAgentsMd`, so that `analyze` does not rewrite the
  GitNexus block of `AGENTS.md` and does not create a root `CLAUDE.md`. Keep
  that setting. A GitNexus version that ignores `.gitnexusrc` creates
  `CLAUDE.md`. Remove it if that happens.
- Keep the quiet point. A background `analyze` was suspected of dropping
  freshly staged files and of restarting a running `yarn start`. Upstream
  could not reproduce it (GitNexus #2906).

## Linked worktrees

The MCP server serves the index of the main checkout, and it diffs the
checkout that the session was started from. This stays true when you edit
files in a linked worktree.

- Pass `repo: "Rocket.Chat.Electron"` to every repo-scoped tool. Do not pass
  it to `list_repos`, which takes only `limit` and `offset`. A session started
  inside a worktree can fail without it.
- Pass `worktree: "<absolute worktree path>"` to `detect_changes`. Without it,
  a session started in the main checkout diffs the main checkout and misses
  every change in the worktree.
- `query`, `context` and `impact` describe the main checkout at its indexed
  commit. `list_repos` shows that commit and how far it is behind. For a
  symbol that your branch adds or changes, read the source.
- `detect_changes` maps changed lines to symbols through that same index. A
  stale index can name the wrong symbol, so reindex the main checkout before a
  review that depends on exact symbols.
- `compare` runs `git diff <base_ref>` against the working tree. A stale local
  `dev`, or an `origin/dev` that moved past the branch point, adds changes
  that are not yours to the result. Pass the merge base:
  `git fetch origin dev && git merge-base origin/dev HEAD`.

## Resources and skills

| Resource                                              | Use for                                  |
| ----------------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/Rocket.Chat.Electron/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/Rocket.Chat.Electron/clusters`       | All functional areas                     |
| `gitnexus://repo/Rocket.Chat.Electron/processes`      | All execution flows                      |
| `gitnexus://repo/Rocket.Chat.Electron/process/{name}` | Step-by-step execution trace             |

The generated skills explain each tool:

| Task                                         | Skill                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Understand architecture / "How does X work?" | [gitnexus-exploring](../.claude/skills/gitnexus/gitnexus-exploring/SKILL.md)             |
| Blast radius / "What breaks if I change X?"  | [gitnexus-impact-analysis](../.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md) |
| Trace bugs / "Why is X failing?"             | [gitnexus-debugging](../.claude/skills/gitnexus/gitnexus-debugging/SKILL.md)             |
| Rename / extract / split / refactor          | [gitnexus-refactoring](../.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md)         |
| Tools, resources, schema reference           | [gitnexus-guide](../.claude/skills/gitnexus/gitnexus-guide/SKILL.md)                     |
| Index, status, clean, wiki CLI commands      | [gitnexus-cli](../.claude/skills/gitnexus/gitnexus-cli/SKILL.md)                         |
