---
id: CONF-QA-004
title: A workspace stuck on the meeting screen recovers after updating
platforms: [windows, macos, linux]
priority: regression
qase:
  suite: Conference call window
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [machine_stuck_on_older_build, installed_branch_build]
test_links: []
expected_result: After installing this build over a stuck installation, the workspace opens on a normal page without being removed and re-added.
---

# Stuck Workspace Recovers After Updating

## Review Basis

- Comparison range: `dev` to `fix/conference-deep-link-video-window`.
- Changed surface: Restoring the saved last page on startup
  (`isConferencePageUrl` in `src/servers/common.ts`, `ServerPane.tsx`).
- User-visible risk: Users already stuck on the meeting screen stay stuck even
  after updating, and still have to remove and re-add the workspace.
- Hypothesis: A saved conference page is ignored on startup, so the workspace
  opens at its home page.
- Smallest useful proof: Upgrade a stuck installation in place.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | On a machine with the previous Rocket.Chat Desktop version, get stuck: open a scheduled meeting link with `Desktop application` (as in CONF-QA-001), confirm the main window shows the meeting screen, then quit Rocket.Chat. Skip this step if the machine is already stuck. | Older build | Main window shows the meeting screen before quitting. | Reproduce the stuck state on the old build. |
| 2 | Install this branch's build over the existing installation. Do not remove the workspace. | Branch build | Installation completes. | Install over the old build. |
| 3 | Start Rocket.Chat. | | The workspace opens on its home page or a room, with the room list visible. The meeting screen does not appear. | Launch and capture. |

## Evidence

- Screenshot of the stuck state (step 1) and of the first launch after
  updating (step 3).

## Failure Signals

- The meeting screen is still shown after updating.
