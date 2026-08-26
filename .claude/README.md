# .claude/

Claude Code configuration for this repo: hook wiring (`settings.json`),
automation scripts (`hooks/`), reusable workflows (`skills/`), and
specialized review/scout roles (`agents/`).

## settings.json

Wires hooks to Claude Code lifecycle events (`PreToolUse`, `PostToolUse`) by
tool matcher, and pre-grants a small set of read-only/safe permissions
(GitNexus MCP tools, `yarn test`, `yarn lint`, `npx tsc --noEmit`).

## hooks/

Shell scripts invoked automatically by `settings.json`. Each reads the tool
call as JSON on stdin (`jq` to extract fields) and either allows, asks, or
denies via the hook JSON protocol.

| Hook                       | Purpose                                                                            | Trigger                                  |
| -------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| `block-sensitive-files.sh` | Deny edits to lock files and `.env*`                                               | `PreToolUse` on `Edit\|Write`            |
| `require-impact.sh`        | Ask for confirmation when editing TS source without a recent GitNexus impact check | `PreToolUse` on `Edit\|Write`            |
| `guard-workspace-build.sh` | Deny `yarn`/`npm build` run inside a workspace directory                           | `PreToolUse` on `Bash`                   |
| `auto-format.sh`           | Run Prettier on the edited file                                                    | `PostToolUse` on `Edit\|Write`           |
| `i18n-parity.sh`           | Report i18n key parity vs `en.i18n.json` after a locale edit                       | `PostToolUse` on `Edit\|Write`           |
| `typecheck.sh`             | Run `tsc --noEmit` after editing a `.ts`/`.tsx` file                               | `PostToolUse` on `Edit\|Write` (async)   |
| `mark-impact.sh`           | Record a timestamp marker when GitNexus impact analysis runs                       | `PostToolUse` on `mcp__gitnexus__impact` |
| `clean-action-dist.sh`     | Remove the nested `desktop-release-action/dist/dist` after a workspace build       | `PostToolUse` on `Bash`                  |

`require-impact.sh` and `mark-impact.sh` enforce the AGENTS.md/CLAUDE.md rule
"run impact analysis before editing any symbol" — `mark-impact.sh` timestamps
a real GitNexus `impact` call, `require-impact.sh` asks for confirmation if
no such call happened in the last 15 minutes. `guard-workspace-build.sh` and
`clean-action-dist.sh` enforce the AGENTS.md "Patches And Builds" rules
(never `yarn build` inside a workspace dir; strip the nested
`desktop-release-action` dist after a workspace-wide build).
`i18n-parity.sh` reports translation gaps after `en.i18n.json` changes
because developers edit only the English source during a feature and
translate other locales at the end via the `i18n-translate` skill.

### Disabling a hook locally

Hook entries merge across settings levels (user, project, local) rather than
replacing each other, so re-declaring a hook in `.claude/settings.local.json`
adds a duplicate — it does not override or remove the project's copy. To
disable one hook, delete its entry from `.claude/settings.json` directly. To
turn off all hooks for one run regardless of what the project settings say,
pass `--settings '{"disableAllHooks": true}'`; to disable them for a session,
set `"disableAllHooks": true` in `.claude/settings.local.json` (gitignored,
not committed).

## skills/

Invocable multi-step workflows (`SKILL.md` with `name`/`description`
frontmatter; `disable-model-invocation: true` means the skill only runs when
explicitly asked for, not auto-triggered by description match).

| Skill              | Purpose                                                                                            | Invocation                                          |
| ------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `new-spec`         | Scaffold a Jest spec in the correct runner path and verify discovery                               | model-invoked or explicit ask                       |
| `pr-check`         | Pre-PR gate: `detect_changes`, lint, targeted tests, i18n parity, packaging/QA, drafts the PR body | model-invoked or explicit ask                       |
| `qa-pack`          | Author/update a `qa/<feature-slug>/` pack from a diff and validate it                              | model-invoked or explicit ask                       |
| `package-smoke`    | Run installer smoke tests (MSI VM, Linux AppImage/deb) via `watcher`                               | explicit ask only                                   |
| `ship-release`     | Ship a release end-to-end, gated on user approval at every irreversible step                       | `/ship-release`, "ship release X.Y.Z"               |
| `electron-build`   | Build and test the Electron app with worktree isolation                                            | model-invoked or explicit ask                       |
| `electron-bump`    | Upgrade the Electron version with migration plan and impact analysis                               | "bump electron", `/electron-bump`                   |
| `i18n-audit`       | Audit translation completeness across all language files                                           | model-invoked or explicit ask                       |
| `i18n-translate`   | Translate new `en.i18n.json` keys into every other locale at feature completion                     | explicit ask only                                    |
| `new-ipc-channel`  | Scaffold a new IPC channel with proper TypeScript types                                            | model-invoked or explicit ask                       |
| `release-notes`    | Generate release notes from git history between tags                                               | model-invoked or explicit ask                       |
| `boot-wedge-debug` | Debug the intermittent webview boot wedge via boot-watchdog logs and live CDP                      | wedge/throbber symptom mentioned                    |
| `dev-app-verify`   | Drive and screenshot the running dev app for UI runtime verification                               | UI change needs visual verification                 |
| `gitnexus/*`       | GitNexus CLI/exploration/debugging/refactoring/impact-analysis reference                           | vendored/regenerated by GitNexus — do not hand-edit |

## agents/

Subagents dispatched for a scoped, read-only pass. The three without YAML
frontmatter (`i18n-validator`, `cross-platform-validator`,
`test-coverage-gap`) are plain-markdown checklists meant to be read and
followed inline rather than dispatched as a model/tools-scoped subagent.

| Agent                        | Purpose                                                                                                            | Dispatch on                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `electron-security-reviewer` | Reviews a diff for Electron trust-boundary issues (IPC, `webPreferences`, `will-navigate`, external URLs, certs)   | main process, preload, IPC, `BrowserWindow`/webview, protocol/deep-link, downloads, notifications, external URLs |
| `postmortem-miner`           | Searches `docs/postmortem-*.md`, `KNOWN_ISSUES.md`, `docs/*-flow.md` for a symptom and returns matched root causes | before any debugging arc                                                                                         |
| `release-readiness`          | Pre-release gate: version/tag consistency, release notes, CI credential expiry, Windows arch matrix, doc drift     | before `ship-release`'s first approval gate                                                                      |
| `i18n-validator`             | Validate translation key completeness across language files                                                        | any `src/i18n/` file modified                                                                                    |
| `cross-platform-validator`   | Review changes for Windows/macOS/Linux compatibility issues                                                        | cross-platform-sensitive code changes                                                                            |
| `test-coverage-gap`          | Identify and prioritize source files/modules lacking test coverage                                                 | coverage review requests                                                                                         |
