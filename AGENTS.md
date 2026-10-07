# Agent Instructions

This file is the project guide for every coding agent: Claude Code, Codex,
Cursor, Hermes, GitHub agents and others. It applies to the whole repository.
An `AGENTS.md` file in a subdirectory adds rules for the files under it.

**Keep all project guidance in this file.** The repository has no `CLAUDE.md`
on purpose. Claude Code 2.1.277 and later reads `AGENTS.md` only when no
`CLAUDE.md` exists, so a root `CLAUDE.md` hides this file from Claude Code.
Put guidance here also when a request says "add this to CLAUDE.md". If a tool
creates a root `CLAUDE.md`, move its useful content into this file and delete
`CLAUDE.md`. Claude-specific configuration lives in `.claude/` (skills, agents,
hooks, `settings.json`).

## Project Basics

- Write all new code in TypeScript strict mode, unless the request says
  otherwise.
- Run `yarn` commands from the repository root. Do not run `yarn build` inside
  a workspace directory, because it writes an incorrect output structure.
- Common commands:

  ```sh
  yarn install && yarn start   # Dev mode
  yarn build                   # Rollup compile to app/
  yarn lint && yarn test       # Lint + test
  yarn workspaces:build        # Build all workspaces
  ```

- After you build `desktop-release-action`, delete the nested dist with
  `rm -rf workspaces/desktop-release-action/dist/dist`. The action needs only
  `workspaces/desktop-release-action/dist/index.js`.
- `app/` mirrors `src/public` through the `syncPublicAssets()` rollup plugin.
  A build purges from `app/` each file that you delete from `src/public`. The
  `yarn start` watcher rebuilds and relaunches the app when a `src/public`
  asset changes.

## Branching Model

- `dev` is the default branch. ALL feature and fix PRs target `dev`, and they
  are squash-merged.
- `master` holds only released code. It advances only through a `dev`→`master`
  release PR that is merged with a true merge commit
  (`gh pr merge --merge`). NEVER squash a release PR. A squash forks the
  history permanently.
- A `release/X.Y.x` branch is the patch line for a shipped stable version.
  A fix lands on `dev` first, and then is cherry-picked onto the release
  branch. When you write a hotfix directly on a release branch, forward-port it
  to `dev` immediately with a cherry-pick PR.
- Never back-merge `master` or a `release/X.Y.x` branch into `dev`.
- Version invariant: `package.json` on `dev` always equals the newest tag cut
  from the `dev` line. The first alpha of a new cycle bumps straight to
  `X.(Y+1).0-alpha.1`.
- Details: `docs/development-and-release-flow.md` (concepts) and
  `docs/release-process.md` (exact commands).

## Patches And Builds

- The repository uses two patch systems. Put each patch in the system that
  already owns its package:
  - Yarn patch protocol: `.yarn/patches/`, configured in `package.json`. Today
    it patches `@ewsjs/xhr` and `app-builder-lib` (the macOS keychain fix from
    #3499).
  - `patch-package`: `patches/`. Today it patches
    `@kayahr/jest-electron-runner`.
- Never add an `@ewsjs/xhr` patch to `patches/`. That causes CI conflicts.
- The dev and snapshot code paths of `desktop-release-action`
  (`releaseDevelopment` / `releaseSnapshot`) are dead on purpose. Do not
  rebuild its `dist/` bundle only to delete them.
- Windows builds must include all three architectures: `x64`, `ia32` and
  `arm64`.
- Code signing uses Google Cloud KMS in two phases. This prevents MSI build
  failures from KMS CNG provider conflicts.
  1. Build the packages without signing (empty env vars).
  2. Sign the built packages with `jsign` and Google Cloud KMS.
- `electron-builder.json`'s `mac.bundleVersion` (macOS `CFBundleVersion`) is
  independent from the `version` in `package.json`. Bump it on every release
  that ships to the App Store or gets notarized. Apple requires each
  submission's `CFBundleVersion` to be higher than the last one.
  - Format: `YYMM` plus a single-digit build counter that resets to `0` each
    month. Example: the first build shipped in August 2026 is `26080`, and the
    second build in the same month is `26081`.
  - Before you increment it, read the current value and the date of its last
    bump (`git log -p --follow -- electron-builder.json`). Do not guess.
- `yarn build-assets` re-encodes every PNG and ICO that it touches, also when
  the source did not change. Commit only the assets whose SVG or component
  changed, and `git checkout --` the rest. Otherwise byte noise floods the
  diff.

## Releases And Tagging

- **Create release tags only with `yarn release:tag`.** Do not tag with a
  manual `git tag` and `git push`. The script (`scripts/release-tag.ts`) checks
  the version, the channel and the allowed remote refs, and it fails closed.
  A manual tag skips all of those checks.
- Tag the squashed merge commit or bump commit on the branch that the channel
  expects. That is `dev` for a prerelease, and `master` or a `release/X.Y.x` branch
  for a stable release. Never tag a pre-merge bump commit on an unmerged
  branch, because that ships the wrong tree.
- When a guard fires, treat it as a real finding: report it and fix the cause.
  Use `--force` or `--allow-unverified-ref` only when the release owner
  explicitly agrees.
- A fresh worktree has no `node_modules`, and the script fails with
  `Couldn't find the node_modules state file (findPackageLocation)`. Run
  `yarn install` in the worktree. Never tag by hand to work around it.
- A tag name is the bare version (`4.16.0`, no `v` prefix). It MUST equal the
  `version` in `package.json`, because the auto-updater feed derives from that
  version.
- A tag push starts `build-release.yml`, which always creates a draft release
  for a human to review and publish. The workflow has a `prepare` job (creates
  the draft) and seven parallel packaging jobs.
  - Only ONE packaging job per platform may set
    `upload_update_metadata: 'true'` (nsis, dmg, AppImage). The `latest*.yml`
    that a job uploads lists only the files that the job built. A second
    uploader replaces the file with a partial list and breaks auto-update.
  - `workflow_dispatch` on that workflow is a signed dry run that creates no
    release. Run it before you trust a change to the workflow or the action
    with a real tag. The action reads its `mode`, `targets` and
    `upload_update_metadata` inputs from
    `workspaces/desktop-release-action/action.yml`.
- Full reference (guard table, overrides, channel rules, flags):
  `docs/release-process.md`. The `ship-release` skill drives the end-to-end
  flow: notes, bump PR, merge, tag, CI, asset matrix and Jira release sync.

## UI Work

- Use Fuselage components from `@rocket.chat/fuselage` for UI work, unless the
  design needs something that Fuselage does not provide.
- Check `Theme.d.ts` for valid color tokens before you use a Fuselage color.
- For usage patterns, see the
  [Fuselage Storybook](https://rocketchat.github.io/fuselage) and the
  [Rocket.Chat main repo](https://github.com/RocketChat/Rocket.Chat).
- Check library props, APIs and tokens in the official docs or the local
  `.d.ts` files. Do not assume them.
- Read `docs/desktop-ui-guidelines.md` before you style tab bar or titlebar
  controls, draw custom SVG artwork, or pick color or animation tokens. It
  holds the token semantics and traps, and the Fuselage geometry and timing
  facts. It also holds the button-dimming and SVG transform-origin pitfalls,
  and the layout rules from PRs #3441/#3443.
- Tray icons show status only, by default, on macOS, Windows and Linux. Each
  platform has six states: `default`, `presence-{online,away,busy,offline}`
  and `disconnected` (`src/ui/main/icons.ts`).
  - The unread count shows on the Windows taskbar overlay (`rootWindow.ts`
    `setOverlayIcon`), in the macOS menu-bar title and in the Linux tray
    tooltip.
  - The opt-in `isTrayIconUnreadCounterEnabled` setting (#3484) replaces
    presence with the pre-4.17 badge assets: `notification-{dot,1..9,plus-9}`,
    and `notificationTemplate` on macOS. Regenerate them with
    `yarn build-assets --unread-counter`. The disconnected state still wins.
  - The macOS-only `isMenuBarUnreadCountEnabled` setting (CORE-2703, default
    on) hides the number in the menu-bar title. It does not change the Dock
    badge.
- Presence bullets reuse the Fuselage `StatusBullet` glyphs:
  `src/ui/icons/PresenceBullet.tsx` (filled / clock cut-out / bar cut-out /
  hollow ring) and `DisconnectedBadge.tsx` (filled amber with a bold `!`).
  Any overlay with transparent cut-outs or a hollow shape MUST pass the
  `cutout` prop of `AppIcon` (`PresenceBulletCutout`). Otherwise the rocket
  shows through the holes.
- Tray-menu bullet icons are 12pt assets under `src/public/images/presence/`.
  They match the 12px Fuselage bullet next to 14px text. Regenerate them with
  `yarn build-assets --presence-menu-icons`.

## Testing

- Spec names and locations decide which Jest project runs a spec
  (`testMatch` in `jest.config.js`):
  - Main-process specs live under `src/<module>/main/` (named
    `*.main.spec.ts` by convention), or they are named
    `src/<module>/main.spec.ts`. The `main/` directory selects the
    main-process runner, not the `.main.spec.ts` suffix.
  - Renderer specs (`*.spec.ts` / `*.spec.tsx`) live in a nested path such as
    `src/<module>/<subdir>/*.spec.ts(x)`, or they are named
    `src/<module>/renderer.spec.ts(x)`. Jest does not discover any other flat
    `src/<module>/*.spec.ts` file.
  - Specs under `scripts/` run in their own Jest project, with
    `testEnvironment: 'node'`.
  - When you are not sure that Jest finds a new spec, run
    `yarn test --listTests --runTestsByPath <file>`.
- Tests run on Windows, macOS and Linux CI. Make each change and each spec
  work on all three platforms.
- For platform-specific APIs, prefer optional chaining and fallbacks to
  mocks:

  ```typescript
  // PREFERRED — works on all platforms without mocks
  const uid = process.getuid?.() ?? 1000;
  const runtimeDir =
    process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 1000}`;
  ```

  Mock only when defensive code is not possible. These POSIX-only APIs (undefined on Windows) need
  it: `process.getuid()`, `process.getgid()`, `process.geteuid()` and
  `process.getegid()`.

- UI changes need runtime or visual verification, because component tests
  cannot see paint. A clipped SVG passes every DOM assertion.
  - Use the `dev-app-verify` skill (`skills/dev-app-verify/SKILL.md`) to drive
    and screenshot the running `yarn start` app through the port-9339
    inspector.
  - Use the Developer Mode menu items `Simulate Update Flow`,
    `Simulate Download` and `Simulate Disconnected` to run those flows without
    real downloads or updates.
  - `Simulate Disconnected` is a Developer menu checkbox. It forces the
    presence connection of the active workspace to `disconnected` on the read
    side only, and the real connection stays up. Use it to check the
    disconnected tray icon and menu line without a network drop.
- You CANNOT test screen capture, WebRTC or portal behavior in a
  software-rendered VM. Chromium gates the PipeWire capture path on hardware
  GL, and the gate moves between Electron versions. Test on hardware GL (GPU
  passthrough or a physical machine). Assert at the dbus level
  (`org.freedesktop.portal.ScreenCast` requests), not on dialog visibility,
  which is flaky across portal and boot states. Full story:
  `docs/postmortem-screen-picker-startup-enumeration.md`.

### Test runner and CI speed

- `@kayahr/jest-electron-runner` simulates the Electron environment. It forces
  `--maxWorkers=1` and spawns one Electron process per spec file. The only CI
  parallelism is the cross-job `--shard`, and since the transform fix that
  spawn is most of each shard's ~3 min. Do NOT try more workers, other runner
  classes or a faster transformer to cut that floor.
- ts-jest runs transpile-only (`tsconfig: { isolatedModules: true }` inline in
  `jest.config.js`, with `tsconfig.json` unchanged). Do NOT switch back to
  `preset: 'ts-jest'`. That default builds a type-checking Program per spec
  file, CI has no warm Jest cache, and the Test step became 4× slower.
  `tsc --noEmit` in `yarn lint` catches type errors in specs.
- Do NOT switch the transformer to `@swc/jest` before you fix the two spec
  patterns that it breaks. The measured gain is ~20 s per shard. Story:
  `docs/postmortem-validate-pr-ci-speed.md`.
  - An assignment onto `require(mod).fn` fails, because swc emits read-only
    getters.
  - A read of a `const` inside a `jest.mock` factory fails, because swc's
    hoisting hits the temporal dead zone.
- `jest.config.js` excludes 18 preload/renderer specs under `--coverage`.
  Keep at least one CI leg on plain `yarn test` (today: the windows and macos
  shards). Otherwise those specs gate nothing.
- validate-pr runs the ubuntu shards on `ubuntu-24.04-arm`.
  - Cache keys MUST include `runner.arch`, because both architectures report
    `runner.os == Linux`.
  - The test job sets `PUPPETEER_SKIP_DOWNLOAD`, because the puppeteer
    postinstall has no arm64 Linux Chromium. Only `yarn build-assets` uses
    puppeteer.
- Before you blame the CI runners for a slowdown, compare the per-step
  timings (`gh run view <id> --json jobs`) across months. In Sep 2026 the
  Windows Test step had grown from 1 min to 27 min only from suite growth and
  per-file type-checking. The runners did not change.

## Windows Notifications

- A Windows Action Center card stays repliable with no time limit. Electron
  emits the JS `close` event when the banner times out
  (`NotificationDismissed(should_destroy=false)`), and a call to `close()` on
  the instance does NOT remove the card.
  - Keep per-notification state (reply routing, target webContents, preload
    event handlers) until the app decides that the notification is finished.
    Keep that state bounded.
  - Do NOT tie that state to a `close` or dismiss signal. If you do, the app
    drops replies that the user types later.
- The web client closes every desktop notification 10s after it shows it
  (`useNotification.ts`). The server never sends `duration`, so the client
  always uses that fallback. Expect that close while the card is still on
  screen.
- Only reply and action-button interactions carry activation arguments
  (`type=...&tag=<id>`, read through `Notification.handleActivation`, win32).
  A click on the toast body carries none and arrives ONLY as the instance
  `click` event. Keep that listener unconditional.
- `Notification.handleActivation` REPLACES the stored callback. It does not
  add one. A debug probe that registers its own handler silently unregisters
  the app's handler. Do not use such a probe to observe production behavior.
- Enter does NOT submit a toast reply. Only the Reply button of the toast
  does, and the card closes on submit whether or not the app received the
  reply. To check a reply, query the server for the message. Do not trust the
  UI.
- Log dropped activations through `loggers.notifications`
  (`src/logging/scopes.ts`). Packaged builds do not show `console.warn` from
  the main process, so a dropped reply would leave no trace in the field.
- Full investigation history:
  `docs/postmortem-notification-quick-reply-sup-1097.md`.

## Startup Debugging

- For the first ~60 s, `yarn start` relaunches Electron once per rollup bundle
  (each `writeBundle` restarts the app). Until `waiting for changes` prints,
  the tray or menu-bar icon flickers or is absent. Judge the tray state only
  after that line.
- Before you judge the tray, `pkill` orphaned worktree Electrons. A leftover
  instance keeps port 9339 and shows a second menu-bar icon.

## QA Flow Authoring

Before you create or change a QA asset under `qa/`, read `qa/AGENTS.md`. It
holds the authoring rules, the template and the validation commands. For a QA
pass on a Desktop PR, branch or release candidate, follow
`skills/desktop-qa-flows/SKILL.md`.

## Code Style

- TypeScript strict mode.
- React functional components with hooks.
- Redux actions follow the FSA (Flux Standard Action) shape.
- File names: camelCase for files, PascalCase for components.
- Write self-documenting code with clear names. Add a comment only when the
  code cannot say why.
- Prefer an edit to an existing file over a new abstraction. Add an
  abstraction only when it removes real complexity or matches an existing
  pattern.

## Git And Verification

- Commit or push only when the user explicitly asks for it. "Fix this" does
  NOT mean "commit it".
- Never commit directly to `master`, `dev` or `release/X.Y.x`. Create a
  branch, test, and open a PR.
- Read-only git operations (status, diff, log) need no permission.
- Show what you will commit before you commit.

### Worktrees

Use a worktree, so that you do not disturb another working directory. Start
it from the current remote `dev`, because a local `dev` can be stale:

```bash
mkdir -p ../Rocket.Chat.Electron-worktrees
git fetch origin dev
git worktree add ../Rocket.Chat.Electron-worktrees/feature-name -b new-branch origin/dev
```

### Working Principles

- **Understand before you change.** Find out WHY the code is written that way.
  Working code is correct until proven otherwise. If you are not sure, ASK.
- **Verify your work.** Run the tests and the type check (`npx tsc --noEmit`),
  and show that the change works. Start with the narrowest meaningful check.
  Broaden the checks when the risk or the shared behavior justifies it. Never
  mark a task done before you prove that it works.
- **Diagnose before you iterate.** When an approach fails, find WHY before you
  try the next one. Do not cycle blindly through 3 or more approaches.
- **Check libraries.** Read the official docs and the `.d.ts` files in
  `node_modules/`. Never assume that a prop, token or API works.

## Writing

- Do not use subjective descriptors ("smart", "excellent", "dumb").
- Use measurable descriptions: "reduced memory usage", "improved by X%".
- Never invent metrics: no estimated time spent, no speculated user counts.
  Use only numbers from real logs, error messages or documented sources.
- PR descriptions: use straightforward language, and focus on what changed
  and why.
- PR descriptions and commit bodies are public. Do not include internal
  references: Jira or Zoho Desk links and ticket text, customer names, support
  conversations. Do not include notes about local developer tools either
  (GitNexus, agent workflow, ledgers). A bare Jira key in the title or subject is the accepted
  convention. Everything else about the ticket stays internal.
- Write instructions for agents (this file, nested `AGENTS.md` files, skills)
  in short active sentences: one instruction per sentence, and no semicolons.

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Rocket.Chat.Electron**. Use the
GitNexus MCP tools to understand code, assess impact and navigate safely. Read
`gitnexus://repo/Rocket.Chat.Electron/context` for the current index stats and
staleness. If GitNexus is not available, do not block on it. Use local code
search, tests and careful review instead.

## Reindex

- Reindex only from the main checkout, at a quiet point, with
  `node .gitnexus/run.cjs analyze --index-only`. No `.gitnexus/run.cjs` yet?
  Run `npx gitnexus analyze --index-only` (if npm 11 crashes, run
  `npm i -g gitnexus`, see #1939).
  - Do not run `analyze` inside a linked worktree. It registers a second
    index under the same name, `Rocket.Chat.Electron`. Lookups by that name
    then fail with "Multiple registered repos match", and the extra index
    goes stale. To remove one, run `gitnexus clean --force` in that worktree.
  - `--index-only` skips every generated file. Without it, `analyze`
    rewrites the generated skills in `.claude/skills/gitnexus/`.
  - `.gitnexusrc` sets `skipAgentsMd`, so that `analyze` does not rewrite this
    block and does not create a root `CLAUDE.md`. Keep that setting. A
    GitNexus version that ignores `.gitnexusrc` creates `CLAUDE.md`. Delete
    it if that happens.
  - Keep the quiet point. A background `analyze` was suspected of dropping
    freshly staged files and of restarting a running `yarn start`. Upstream
    could not reproduce it (GitNexus #2906).

## Worktrees

The MCP server serves the index of the main checkout, and it diffs the
checkout that the session was started from. This stays true when you edit
files in a linked worktree.

- Pass `repo: "Rocket.Chat.Electron"` to every repo-scoped tool. Do not pass
  it to `list_repos`, which takes only `limit` and `offset`. A session started
  inside a worktree can fail without it.
- Pass `worktree: "<absolute worktree path>"` to `detect_changes`. Without
  it, a session started in the main checkout diffs the main checkout and
  misses every change in the worktree.
- `query`, `context` and `impact` describe the main checkout at its indexed
  commit. `list_repos` shows that commit and how far it is behind. For a
  symbol that your branch adds or changes, read the source.
- `detect_changes` maps changed lines to symbols through that same index. A
  stale index can name the wrong symbol, so reindex the main checkout before
  a review that depends on exact symbols.

## Always Do

- **MUST run impact analysis before you edit any symbol.** Before you change a
  function, class or method, run
  `impact({target: "symbolName", direction: "upstream"})`. Report the blast
  radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before you commit**, to check that your
  changes affect only the expected symbols and execution flows.
  - For a regression review against the branch point, pass the merge base:
    run `git fetch origin dev && git merge-base origin/dev HEAD`, then
    `detect_changes({scope: "compare", base_ref: "<merge-base sha>"})`.
  - `compare` runs `git diff <base_ref>` against the working tree. A stale
    local `dev`, or an `origin/dev` that moved past the branch point, adds
    changes that are not yours to the result.
- **MUST warn the user** when impact analysis returns HIGH or CRITICAL risk,
  before you continue with the edits.
- To explore unfamiliar code, use `query({query: "concept"})` to find
  execution flows, not grep. It returns results grouped by process and ranked
  by relevance.
- For full context on one symbol (callers, callees, the execution flows that
  it is part of), use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class or method before you run `impact` on it.
- NEVER ignore a HIGH or CRITICAL risk warning from impact analysis.
- NEVER rename symbols with find-and-replace. Use `rename`, which understands
  the call graph.
- NEVER commit changes before you run `detect_changes()` to check the affected
  scope.

## Resources

| Resource                                              | Use for                                  |
| ----------------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/Rocket.Chat.Electron/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/Rocket.Chat.Electron/clusters`       | All functional areas                     |
| `gitnexus://repo/Rocket.Chat.Electron/processes`      | All execution flows                      |
| `gitnexus://repo/Rocket.Chat.Electron/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
