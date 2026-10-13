# Release 4.18.0 QA Pack

This pack is the QA gate for the stable promotion of Rocket.Chat Desktop
4.18.0. It tests the installed prerelease build on each platform and package
type. It covers each change from the last stable release to `dev`.

Build under test: 4.18.0-alpha.7 (results before it was cut were measured on 4.18.0-alpha.6; see each note)

- Range: `4.17.4..origin/dev` at `acaf3a712`, merge base `729869a62`
  (the 4.17.0 bump).
- Coverage: full range. The collector found 45 commits: 27 user-facing,
  5 packaging, 7 with no runtime effect, and 6 version bumps. Each of the
  32 user-facing and packaging PRs has a flow or a written reason below.
- The skill `skills/release-qa-plan/SKILL.md` made this pack. Its collector
  checks the coverage:
  `node skills/release-qa-plan/collect-changes.mjs --check qa/release-4.18.0`.

## Run Order

Track the run with the checklist. It keeps the state when the run stops:

```sh
C=skills/release-qa-plan/checklist.mjs
node $C init   qa/release-4.18.0      # once
node $C next   qa/release-4.18.0 --target macos
node $C mark   qa/release-4.18.0 REL418-QA-001 dmg pass
node $C status qa/release-4.18.0
```

`next` gives the flows in this order: `smoke` (001 to 005), then
`release`, then `high`, then `medium`.

## Install Matrix

| Package            | OS      | Flows that run once for each package |
| ------------------ | ------- | ------------------------------------ |
| `dmg`              | macOS   | 001, 002, 003, 024, 025, 054         |
| `pkg`              | macOS   | 001, 002, 024, 025                   |
| `mas` (TestFlight) | macOS   | 001, 002, 005, 024, 025              |
| `exe` (NSIS)       | Windows | 001, 002, 003                        |
| `msi`              | Windows | 001, 002                             |
| `appx`             | Windows | 001, 005                             |
| `AppImage`         | Linux   | 001, 002, 003                        |
| `deb`              | Linux   | 001, 002                             |
| `rpm`              | Linux   | 001, 002                             |
| `snap`             | Linux   | 001, 005                             |
| `tar.gz`           | Linux   | 001                                  |

All other flows run once for each platform in their `platforms` list. Run
them on the main package of that platform: `dmg` on macOS, `exe` on
Windows, `AppImage` or `deb` on Linux. The MAS build has no in-app video
call window: calls open in the browser. Do not run 020 to 023 on `mas`.

## Reused Flows

These flows from other packs prove a change in this range. The checklist
makes items for them.

- CONF-QA-001 priority: release
- CONF-QA-002 priority: release
- CONF-QA-003 priority: high
- CONF-QA-004 priority: medium
- CONF-QA-005 priority: high
- CONF-QA-006 priority: high
- CORE-2525-QA-012 priority: high
- CORE-2525-QA-013 priority: high

## Prerequisites

| Token in `requires`                                      | What the tester prepares                                                                                                                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installed_prerelease_build`                             | The package of the build under test for the target, installed (flow 001).                                                                                                                          |
| `last_stable_4_17_4_package`                             | The 4.17.4 package of the same type, from the GitHub release 4.17.4.                                                                                                                               |
| `published_prerelease`                                   | The release owner published the build under test as a prerelease, so the Alpha update feed offers it.                                                                                                             |
| `earlier_prerelease_with_fix_4_18_0_alpha_5`             | The 4.18.0-alpha.5 `dmg`. It has the #3543 fix, so its restart runs the fixed code.                                                                                                                |
| `two_accounts_same_workspace`                            | Two accounts on one workspace, one on a second device.                                                                                                                                             |
| `logged_in_session`, `second_account_for_messages`       | A signed-in workspace and a second account that sends messages.                                                                                                                                    |
| `pexip_workspace_signed_in`, `video_calls_inside_app_on` | A workspace with the Pexip conference integration, signed in, with Settings › Video calls › "Video calls inside app" on.                                                                           |
| `pexip_sso_identity_provider`                            | A Pexip conference page that signs in through an SSO popup.                                                                                                                                        |
| `second_participant`                                     | A second person in the call, who sees the shared screen.                                                                                                                                           |
| `hardware_graphics_machine`                              | A physical machine or a VM with GPU passthrough. Screen capture does not work in a software-rendered VM.                                                                                           |
| `macos_screen_recording_not_granted`                     | Rocket.Chat is not in System Settings › Privacy & Security › Screen & System Audio Recording, or you removed it with the minus (−) button. Run `tccutil reset ScreenCapture chat.rocket` to reset it. |

Flows 037, 038, 039, and 052 also need these, as their steps say:

- 037: a Rocket.Chat server behind a reverse proxy with HTTP basic auth.
- 038: a second session that watches the presence of the test account.
- 039: a server older than 7.10.0.
- 052: a Windows machine with a redirected `%APPDATA%` folder. Without one,
  mark steps 5 to 8 `blocked`.

## Test Data

| Data                  | Used in            | Checked on | State                                                                                               |
| --------------------- | ------------------ | ---------- | --------------------------------------------------------------------------------------------------- |
| Rocket.Chat PR #42364 | 042, 044, 046, 048 | 2026-10-08 | Merged. Its preview image can be gone. Check that `Add` finds it before the run, or use an open PR. |
| Rocket.Chat PR #42601 | 042, 044, 046, 048 | 2026-10-08 | Open.                                                                                               |

## Coverage

| PR    | Change                                                                                           | Surface                                          | Platforms     | Covered by                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| #3485 | Conference http(s) popups open as sandboxed child windows (shipped in 4.17.1)                    | Video call window, SSO popup                     | all           | REL418-QA-021                                                                                                                        |
| #3490 | No override of the web client presence detection on servers 7.10.0 and later (shipped in 4.17.1) | Workspace presence                               | all           | REL418-QA-038, REL418-QA-039                                                                                                         |
| #3488 | Reset saved window sizes and positions (shipped in 4.17.1)                                       | Settings › Advanced, View menu, windows          | all           | REL418-QA-050                                                                                                                        |
| #3499 | macOS code signing: keychain password for `set-key-partition-list` (shipped in 4.17.1)           | Packaging, signing                               | macOS         | REL418-QA-001 (signature and notarization checks)                                                                                    |
| #3511 | CI test speed-up, with dependency changes in `package.json` and `yarn.lock`                           | Packaging                                        | all           | REL418-QA-001, REL418-QA-004. We expect no user-visible change.                                                                    |
| #3513 | Release workflow split into a prepare job and seven packaging jobs                               | Packaging, update feeds                          | all           | REL418-QA-001 (each package), REL418-QA-003 (update feeds), REL418-QA-005 (store packages)                                           |
| #3507 | Startup survives config write failures (shipped in 4.17.2)                                       | Startup, settings store                          | Windows       | REL418-QA-052, REL418-QA-002                                                                                                         |
| #3522 | Opt-in unread counter tray icon and macOS menu-bar count toggle (shipped in 4.17.3)              | Tray, menu bar, Settings › General               | all           | CORE-2525-QA-012, CORE-2525-QA-013                                                                                                   |
| #3525 | Load a web UI preview build into a workspace (Developer Mode)                                    | Deep link, Settings › Appearance, tab badge      | all           | REL418-QA-040, 041, 043, 044                                                                                                         |
| #3504 | Settings window has a fixed size                                                                 | Settings window                                  | all           | REL418-QA-051, REL418-QA-050                                                                                                         |
| #3523 | Conference call pages open in the video call window                                              | Deep links, workspace routing, video call window | all           | REL418-QA-020, CONF-QA-001 to CONF-QA-006                                                                                            |
| #3510 | Video call window methods move to `RocketChatDesktop.videoCall`                                  | Call window bridge                               | all           | REL418-QA-022, REL418-QA-023                                                                                                         |
| #3532 | Release workflow installs dependencies in the prepare job                                        | Packaging                                        | all           | REL418-QA-001                                                                                                                        |
| #3534 | Develop web UI build and tab menu "Update UI preview"                                            | Deep link, Settings, tab menu                    | all           | REL418-QA-042, 043, 044, 045                                                                                                         |
| #3536 | UI preview label, non-blocking extract, old bundle pruning                                       | Tab label, disk                                  | all           | REL418-QA-043, 045, 048                                                                                                              |
| #3535 | The main window opens each time the app starts (shipped in 4.17.4)                                        | Startup, tray, `--start-hidden`                  | all           | REL418-QA-053, REL418-QA-004                                                                                                         |
| #3541 | Saved list of web UI builds in Settings › Appearance                                             | Settings, saved state                            | all           | REL418-QA-040, 042, 043, 046                                                                                                         |
| #3543 | "Restart to update" quits the app on macOS                                                       | Updater, top bar                                 | macOS (`dmg`) | REL418-QA-054                                                                                                                        |
| #3546 | The conference page does not throw in the video call window                                      | Call window preload                              | all           | REL418-QA-022                                                                                                                        |
| #3548 | No boot-recovery reloads or request stalls in UI previews                                        | Preload, requests                                | all           | REL418-QA-047, 043, 045                                                                                                              |
| #3502 | `engines.node` aligned with the `devEngines` floor                                               | Packaging metadata                               | all           | REL418-QA-001. We expect no user-visible change.                                                                                   |
| #3533 | Recover workspace views that hang or crash                                                       | Workspace view, failure view, menus              | all           | REL418-QA-030, 031, 032. The renderer crash path has unit tests only: no tester can crash a renderer on purpose in a repeatable way. |
| #3515 | Unused log viewer code removed                                                                   | Log viewer                                       | all           | REL418-QA-056 (steps 7 to 9). We expect no user-visible change.                                                                    |
| #3516 | Unused core-shell code removed                                                                   | App start and quit                               | all           | REL418-QA-056 (steps 1 and 10), REL418-QA-004. We expect no user-visible change.                                                   |
| #3517 | Unused Jitsi bridge and video call IPC removed                                                   | Call window preload                              | all           | REL418-QA-022, REL418-QA-023. We expect no user-visible change.                                                                    |
| #3518 | go.rocket.chat links and HTTP login matching                                                     | Deep links, HTTP basic auth                      | all           | REL418-QA-036, REL418-QA-037. The certificate change has unit tests only.                                                            |
| #3519 | Windows notification replies work after the card is dismissed                                    | Windows notifications                            | Windows       | REL418-QA-055                                                                                                                        |
| #3514 | Old in-window settings and downloads views removed                                               | Settings, downloads, Window menu                 | all           | REL418-QA-056, REL418-QA-002, REL418-QA-004                                                                                          |
| #3492 | Find in page (Command+F or Ctrl+F)                                                               | Edit menu, find bar                              | all           | REL418-QA-033                                                                                                                        |
| #3491 | Audio indicator on workspace tabs, with click to mute                                            | Tab bar, tab menu                                | all           | REL418-QA-034                                                                                                                        |
| #3493 | Camera, microphone, and screen-share indicators on workspace tabs                                | Tab bar, call window                             | all           | REL418-QA-035                                                                                                                        |
| #3552 | No Screen Recording prompt at startup on macOS, and a picker hint                                | Startup, screen picker                           | macOS         | REL418-QA-024, REL418-QA-025, REL418-QA-023                                                                                          |

The PRs with no runtime effect need no flow: #3500, #3512, #3524, #3542,
#3544, #3545, and #3494 (docs, CI, and agent tooling). Version bumps:
#3531, #3537, #3547, #3549, #3551, and #3553.

## Go/No-Go Criteria

- Go: all `smoke` flows pass on macOS, Windows, and Linux. No `release`
  flow has a confirmed failure. The release owner accepts each `blocked`
  item by name.
- No-go: any other result.
- A go does not start the stable promotion. The `ship-release` skill does
  that, with its own approval gates.

## Results

The checklist (`results/checklist.md`) holds the state. Keep the evidence
files in `results/`, and write their paths in `mark --note`. Do not commit
the results.

```text
Flow ID:
Platform:
Build:
Review range: 4.17.4..origin/dev at acaf3a712
Coverage: Full requested range
Result: Pass | Fail | Blocked
Finding status: confirmed | suspected | blocked | none
Evidence:
Notes:
```
