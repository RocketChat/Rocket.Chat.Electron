---
id: REL418-QA-044
title: UI preview deep links load the named build
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Web UI previews
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: Deep links with develop, pr, sha, bundle, and host load the right build after one confirmation, and bad values fail with a visible message.
---

# UI preview deep links load the named build

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3525 (`pr`, `sha`, `bundle`, `host` link arguments), #3534 (`develop` argument), `performUiPreview` in `deepLinks/main.ts`.
- User-visible risk: the link loads the wrong build or workspace, skips the confirmation, or fails with no message.
- Hypothesis: with Developer Mode on, `rocketchat://ui-preview?develop` and `?pr=<n>` show the confirmation dialog for the workspace in view, and after Load UI the tab shows the "UI" badge. `host=` picks another workspace. A bad value shows a "Load UI preview" failure dialog. Failure mode: no dialog, wrong workspace, or a silent failure. This runs on every platform.
- Smallest useful proof: OS-level repro. On a `targz` install the link handler is not registered. Pass the link as the argument of the app binary.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the app with one workspace signed in. Open the Help menu and make sure Developer Mode has a check mark. Write down the workspace address. | None. | Developer Mode has a check mark. | Read the menu item state. |
| 2 | In a terminal run the command for your OS. macOS: `open 'rocketchat://ui-preview?develop'`. Windows (cmd): `start "" "rocketchat://ui-preview?develop"`. Linux: `xdg-open 'rocketchat://ui-preview?develop'`. | `rocketchat://ui-preview?develop` | The app comes to the front. A dialog titled "Load UI preview" shows `Load a different web UI for "<workspace address>"?`. The detail names `develop (ghcr.io/rocketchat/rocket.chat-web:develop)`. | Run the command and read the dialog. |
| 3 | Click Load UI. Wait 15 seconds. Hover the workspace tab. | None. | A red "UI" badge shows on the tab. The tooltip has "UI preview: develop @ <7 characters> (ghcr.io/rocketchat/rocket.chat-web:develop)". The page shows the web client, signed in. | Click Load UI, capture the tab, and read the tooltip. |
| 4 | Open the View menu and click Restore server UI. Wait for the page to reload. | None. | The badge goes away. The server UI loads. | Click the item and check the tab. |
| 5 | Run the same command with `rocketchat://ui-preview?develop=1`. Click Cancel in the dialog. | `rocketchat://ui-preview?develop=1` | The same dialog shows. After Cancel the tab has no badge. | Run, read, and click Cancel. |
| 6 | Run the command with an open pull request number: `rocketchat://ui-preview?pr=42364`. Click Cancel. | `rocketchat://ui-preview?pr=42364` | The dialog detail names `PR #42364 (ghcr.io/rocketchat/rocket.chat-web:pr-42364)`. | Run and read the dialog. |
| 7 | Run the command with a pinned commit: `rocketchat://ui-preview?pr=42364&sha=0000000000000000000000000000000000000000`. On macOS and Linux, keep the quotes around the link. Click Load UI if the dialog shows. | `rocketchat://ui-preview?pr=42364&sha=0000000000000000000000000000000000000000` | The dialog shows. After Load UI, a dialog shows. Its title is "Load UI preview". Its text is "The UI preview could not be loaded." It gives a reason that says the build "was not found". The tab has no badge. | Run, click Load UI, and read the failure dialog. |
| 8 | Run the command with a bad value: `rocketchat://ui-preview?pr=abc`. | `rocketchat://ui-preview?pr=abc` | A dialog shows. Its text is "The UI preview could not be loaded." It gives a reason that starts "Not develop, a PR number or an http(s) URL". No confirmation dialog shows. | Run and read the dialog. |
| 9 | Run the command with no source: `rocketchat://ui-preview`. | `rocketchat://ui-preview` | The same failure dialog as step 8 shows. Nothing loads. | Run and read the dialog. |
| 10 | Run the command with a host that is not a Rocket.Chat server: `rocketchat://ui-preview?develop&host=https://not-added.example.com`. | `rocketchat://ui-preview?develop&host=https://not-added.example.com` | An "Invalid Host" dialog shows (the same dialog as for a room link with a bad host). No "Load UI preview" dialog shows. Nothing loads. Record the dialog text. | Run and record the dialog text. |
| 11 | Add a second workspace. Switch to the first workspace. Run the command with the second workspace address: `rocketchat://ui-preview?develop&host=<second workspace address>`. Click Load UI. | `rocketchat://ui-preview?develop&host=<second workspace address>` | The dialog names the second workspace. After Load UI, only the second workspace tab has the "UI" badge. The first tab has none. | Run, read the dialog, and capture both tabs. |
| 12 | Open the View menu and click Restore server UI once for the second workspace (switch to it first). | None. | The badge goes away on the second tab. | Switch, click the item, and check the tab. |

## Evidence

- Screenshot of each dialog (steps 2, 6, 7, 8).
- Screenshot of both tabs after step 11.
- The terminal commands you ran.

## Failure Signals

- A link loads a build with no confirmation dialog.
- The badge shows on the wrong workspace.
- A bad link shows no message.
- A link works with Developer Mode on but loads on a second click only.
