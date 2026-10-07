# Known Issues

## Electron 42 macOS `desktopCapturer.getSources()` — 3s cap, empty results under repeated calls

- Status: Confirmed (Electron 42.5.0, macOS, hardware measurement 2026-07-14).
- Symptom: The screen picker intermittently shows "No windows found" / "No screens found"
  seconds after it lists sources. Screen share is denied with "selected source no longer
  available" right after the user picks a valid source.
- Root cause: The Electron macOS ScreenCaptureKit rewrite made `getSources()` unbounded-slow
  (~24s observed under Electron 41.9). Upstream then bounded it at ~3s and it returns whatever
  arrived (hang fix, electron/electron#51128 lineage). The DCHECK crash fix electron/electron#50960
  shipped in 42.0.1. Under Electron 42.5.0, back-to-back calls return `[]` ~75% of the time
  and mostly-empty thumbnails otherwise. Combined `types: ['window','screen']` calls always
  hit the 3s cap. `['screen']`-only calls complete in ~700ms and never flake. Paced (≥4s gap)
  alternating per-type calls never return empty.
- Workaround (implemented in src/screenSharing/desktopCapturerCache.ts): per-type cache
  buckets, ≥4s cooldown between enumerations, an empty result never overwrites a non-empty
  bucket, and a per-id thumbnail merge. Post-selection validation reads the cache and does not
  enumerate again (src/screenSharing/ScreenSharingRequestTracker.ts).
- Follow-up: adopt `setDisplayMediaRequestHandler(..., { useSystemPicker: true })` (native
  SCContentSharingPicker) on macOS 15+. This removes `getSources` from the flow entirely.
  It is experimental. Gate it on `isDisplayMediaSystemPickerAvailable()`. Audio caveat: electron#44685.
- Affected files: src/screenSharing/desktopCapturerCache.ts,
  src/screenSharing/ScreenSharingRequestTracker.ts, src/screenSharing/screenSharePicker.tsx.

## Fuselage modern `Select` portals focus to body — breaks `:hover`/`:focus-within` on parent rows

- Status: Confirmed (fuselage 0.78, react-aria 3.48).
- Symptom: A CSS row highlight on a Fuselage `Field` uses `:hover` or `:focus-within`.
  The highlight disappears while a child `<Select>` dropdown is open, even when the pointer is over the row.
- Root cause: The modern `Select` (`Select` -> `SelectAria` -> react-aria `useSelect`) renders
  its open listbox inside a react-aria `Overlay` portaled to `document.body`. The overlay is MODAL:
  an underlay div covers the page, and a FocusScope moves DOM focus into the portaled listbox.
  The focused node and the hovered surface are both OUTSIDE the `Field` subtree. Therefore
  neither `:hover` nor `:focus-within` scoped to `.rcx-field` can match. (Legacy `SelectLegacy`/
  `SelectFiltered` use a `.rcx-select__focus` anchor + PositionAnimated and behave differently.)
- Bundle refs (node_modules/@rocket.chat/fuselage/dist/fuselage.development.js):
  8181 Select, 8230-8244 SelectAria, 8429-8438 SelectTrigger (`.rcx-select` button),
  7745-7754 Popover/Overlay portal-to-body + modal underlay.
- Workaround: Do not depend on CSS pseudo-classes on the parent for the "control is open" state.
  Use a React wrapper that latches the highlight on `pointerdown` inside the row and clears
  it on a document-level `pointerdown` outside the row.
- Affected files: any row that uses Fuselage `Select`. The repository does not contain the
  `src/ui/components/SettingsView/settingRowHover.ts` wrapper that this entry first named.

## RTL auto-cleanup vs manual `document.body.innerHTML = ''` in `afterEach` orphans portal anchors

- Status: Confirmed (RTL 14.3.1, @kayahr/jest-electron-runner, single shared `src/.jest/setup.ts`).
- Symptom: A renderer spec that renders a portal/anchor component (e.g. TooltipProvider ->
  TooltipPortal -> createAnchor's `#tooltip-root`) crashes the ENTIRE `yarn test:coverage` run with
  `process.exit(1)` from `src/.jest/setup.ts` (uncaughtException handler). The stack starts in
  React `safelyCallDestroy` / `commitPassiveUnmountInsideDeletedTreeOnFiber`. The thrown error is
  `NotFoundError: The node to be removed is not a child of this node` from
  `document.body.removeChild(a)` in `src/ui/components/utils/createAnchor.ts`.
- Root cause: A spec adds `afterEach(() => { document.body.innerHTML = ''; })`. Jest runs afterEach
  hooks LIFO. RTL's auto-cleanup `afterEach(cleanup)` is registered at import time, so it runs LAST.
  The manual `innerHTML=''` runs FIRST. It removes the body-appended portal anchors WITHOUT going
  through their `deleteAnchor`/effect-cleanup path. Then RTL `cleanup()` unmounts the React tree.
  The unmount effect of the portal calls `removeChild` on the already-detached node, and it throws.
  The shared setup converts any uncaughtException into `process.exit(1)`. One orphaned anchor
  therefore kills the whole run.
- Workaround / rule: Do NOT manually wipe `document.body.innerHTML` in renderer-spec `afterEach`. RTL
  auto-cleanup already unmounts the React tree and lets components remove their own anchors. If a
  test needs a clean body, call the `unmount()` of the render result explicitly.
- Affected files: src/ui/components/utils/TooltipProvider.spec.tsx,
  src/ui/components/utils/ReparentingContainer.spec.tsx, src/ui/components/utils/createAnchor.ts,
  src/ui/components/utils/TooltipPortal.tsx, src/.jest/setup.ts.

## No certificate pinning for the auto-updater (CORE-1128) — accepted risk, not a gap

- Status: Resolved as risk acceptance (2022 pentest finding CORE-1128, no code change).
- Symptom: N/A — this entry documents a deliberate decision, not an observed bug.
- Context: CORE-1128 flagged "Missing Certificate Pinning for Connections and autoUpdater
  Mechanism." The update feed is GitHub Releases (`electron-builder.json`: provider `github`,
  owner `RocketChat`, repo `Rocket.Chat.Electron`). Update artifacts come from
  `objects.githubusercontent.com`. GitHub controls the TLS certificate of that domain and
  rotates it on its own schedule, with no advance notice to Rocket.Chat.
- Root cause / rationale: electron-updater has no built-in certificate-pinning configuration.
  The only available hook is `session.setCertificateVerifyProc()` via `getNetSession()`.
  The public `autoUpdater` singleton does not expose it. Pinning would therefore require access to
  electron-updater internals. It would be fragile across version upgrades. More importantly,
  electron-updater verifies downloaded update artifacts on two platforms. Windows uses
  `verifyUpdateCodeSignature`. macOS uses the code-signature validation of the system
  updater. A network-level MITM attacker cannot get a forged build installed there even
  without TLS pinning. The attacker would need a validly-signed Rocket.Chat build, a
  materially higher bar than a CA compromise. AppImage is different: electron-updater
  checks the downloaded file only against the sha512 checksum in the update manifest
  (`latest-linux.yml`), and the project does not use signed update manifests. An attacker
  who can replace both the manifest and the AppImage on the TLS path can install a
  forged AppImage. This Linux gap is accepted together with the decision below. GitHub has previously
  rotated certificates on `objects.githubusercontent.com` in ways that broke clients with
  pinned certs/CAs (see GitHub community discussion #50963 on release downloads that failed after a
  cert rotation). Hacker News also discussed incidents of GitHub User Content certificate expiry.
  If Rocket.Chat pins any cert or CA on this GitHub-hosted domain, a future GitHub-side
  rotation may silently break auto-update for every user. Rocket.Chat cannot fix that. The result
  is a full auto-update outage until a new client version ships through some other channel.
- Decision: Do not implement certificate pinning for the auto-updater. Pinning would mitigate
  one risk: CA compromise or MITM on the update channel. HTTPS, the system trust store and
  code-signature verification of the downloaded artifact (Windows and macOS) already cover
  most of that risk.
  The blast radius of a stale or broken pin exceeds the risk it would remove.
- Affected files: electron-builder.json (update feed config). No source changes made.

## `prefers-reduced-motion` diverges across CI runners — `getComputedStyle` transition assertions are platform-flaky

- Status: Confirmed (GitHub-hosted `windows-latest`/`macos-latest` runners, PR #3443 and #3449
  CI runs). Local dev Macs and the `ubuntu-latest`/xvfb runner are unaffected.
- Symptom: A renderer spec asserts on a CSS transition/animation property with
  `getComputedStyle(element).transitionDuration` (or similar). It passes locally and on Linux CI.
  It fails or reports a different value on GitHub-hosted Windows and macOS runners.
- Root cause: `getComputedStyle` resolves the live cascade. It evaluates the
  `prefers-reduced-motion` media query against the actual OS-level accessibility
  setting of the runner. GitHub-hosted Windows and macOS runner images report
  `prefers-reduced-motion: reduce` at the OS level. The `ubuntu-latest` + xvfb runner and local
  developer Macs report `no-preference`. A component that opts out of animation under reduced
  motion therefore renders different computed transition values on each CI platform. The
  assertion checks the OS setting of the runner, not the logic of the component.
- Workaround: Do not assert transition/animation values with `getComputedStyle` in specs. Read
  the parsed CSSOM directly instead. Walk `document.styleSheets`. Find the plain style rule and
  the `@media (prefers-reduced-motion: reduce)` override rule that target the emotion-generated
  class of the element. Both rules exist in the CSSOM whichever value the media query resolves to
  on that runner, so the assertion is deterministic on every platform. See
  `findTransitionRulesForElement` in
  `src/ui/components/TopBar/DownloadsIndicator.spec.tsx` (~lines 80-138) for the pattern.
- Affected files: src/ui/components/TopBar/DownloadsIndicator.spec.tsx.
- Reference: PR #3443 (introduced the animated percentage slot), PR #3449 (documented after CI
  runs showed the divergence).

## Jest test run sits near Node's default 2 GB heap ceiling

- Status: Mitigated, not fixed. The ceiling is raised. The underlying accumulation remains.
- Symptom: The `Test` step dies with
  `FATAL ERROR: Ineffective mark-compacts near heap limit - JavaScript heap out of memory`
  and `exit code 255`, typically on `check (macos-latest)` first. It happens after most or all
  suites report PASS and none report FAILED. Observed at 2038.0/2051.6 MB with
  `current mu = 0.040` (V8 spends ~96% of its time in GC before it gives up).
- Root cause: `@kayahr/jest-electron-runner` spawns a detached Electron child for each test
  target. It registers a teardown closure for each child in a module-level `DISPOSABLES` set.
  The run drains that set only at the very end. `--maxWorkers=1` (required by the
  runner) makes every suite share one process, so worker recycling reclaims nothing. Each
  retained closure keeps the context of its child reachable. `--coverage` inflates the retained
  set of each suite further. This is why `yarn test:coverage` (validate-pr) tips over
  before `yarn test` does. macOS fails first: it is the slowest arm64 runner and has the largest
  retained set.
- Workaround: `NODE_OPTIONS: --max-old-space-size=6144` on the `Test` step in
  `.github/workflows/validate-pr.yml` (GitHub-hosted runners have >= 7 GB). Also, the `test` /
  `test:coverage` scripts no longer use `--detectOpenHandles`, because it retains async resource
  references by design in order to report them. It remains available as `yarn test:debug` for
  debugging handles.
- `validate-pr.yml` shards the suite (`--shard=N/2`, CORE-2657). Each test job therefore retains
  only half of the children of the suite, which roughly halves the peak of each job.
- Expect this to recur as the suite grows. The higher ceiling gives headroom. It does not
  stop the accumulation. If it returns, do NOT raise the number again. The real fix is upstream:
  dispose each child when its target finishes, not at the end of the run. Note that
  `workerIdleMemoryLimit` does NOT help. Jest recycles _worker processes_ after a test, and
  at `--maxWorkers=1` with this custom runner there is no worker to recycle.
- Affected files: .github/workflows/validate-pr.yml, package.json, patches/@kayahr+jest-electron-runner+29.14.0.patch.
- Reference: PR #3452. Failing run 31515022528 (`check (macos-latest)`). It turned green after the
  fix in run 31515403323 (macOS 16m32s, 1721 tests, 0 failures).

## Rocket.Chat presence Meteor methods: `UserPresence:setDefaultStatus` deprecated for 9.0.0

- Status: Not a blocker. We use the non-deprecated `setUserStatus` instead, so nothing is
  scheduled to break. This entry exists so nobody rediscovers the constraint.
- Detail: `apps/meteor/server/meteor-methods/users/userPresence.ts` logs
  `methodDeprecationLogger.method('UserPresence:setDefaultStatus', '9.0.0', '/v1/users.setStatus')`.
  The method still works on 8.x. Rocket.Chat 9.0.0 will remove it, and the REST
  endpoint `/v1/users.setStatus` replaces it.
- Why we did not use it anyway: it takes `status` only, so it cannot set a custom status
  message. `Meteor.call('setUserStatus', statusType, statusText)`
  (`apps/meteor/server/meteor-methods/users/setUserStatus.ts`) sets both in one call and is not
  deprecated. It throws real errors (`error-not-allowed`,
  `error-status-not-allowed`) and does not return `undefined` silently. It is also on the
  DDP fast-path bypass list (`apps/meteor/client/meteor/overrides/ddpOverREST.ts`), so it has
  no latency penalty compared with the deprecated method.
- Gotcha to remember: `setUserStatus` is rate limited to **1 call/sec/user**
  (`RateLimiter.limitMethod('setUserStatus', 1, 1000, ...)`). Any UI that drives it — e.g.
  the tray presence selector — must debounce. Otherwise the server rejects the second rapid pick.
- Second gotcha: `statusDefault` does NOT track these writes. Both methods route through
  `Presence.setStatus`, which moves `status`. `statusDefault` stays put. Read `status` for
  anything the user sees, including a "currently selected" checkmark.
- Affected files: src/injected.ts (presence read/write bridge), src/ui/main/trayIcon.ts.
- Reference: CORE-2525. Checked against Rocket.Chat @ 8.8.0-develop source and confirmed
  live against open.rocket.chat (server 8.8).
