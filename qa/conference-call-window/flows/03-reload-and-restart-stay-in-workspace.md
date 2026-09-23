---
id: CONF-QA-003
title: Reload and restart keep the workspace after a meeting
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Conference call window
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build, pexip_workspace_signed_in, conf_qa_001_done]
test_links: []
expected_result: Reload, force reload and an app restart after joining a meeting all show the workspace, never the meeting screen.
---

# Reload And Restart Keep The Workspace

## Review Basis

- Comparison range: `dev` to `fix/conference-deep-link-video-window`.
- Changed surface: Saved last page per workspace (`lastPath`,
  `src/servers/reducers.ts`, `src/ui/components/ServersView/ServerPane.tsx`).
- User-visible risk: The original report says a forced reload did not help and
  the meeting screen came back every time.
- Hypothesis: A conference page is never saved as the workspace's last page,
  so reloads and restarts land on a normal workspace page.
- Smallest useful proof: Local UI repro right after CONF-QA-001.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Run CONF-QA-001 up to step 5, keep the call window open, and note the room shown in the main window. | | Main window shows a room. | Complete CONF-QA-001 steps 1-5. |
| 2 | In the main window, open the `View` menu in the menu bar (Windows/Linux: press Alt if the menu bar is hidden) and click `Reload`. | | The workspace reloads and shows the same room, not the meeting. | Trigger View > Reload. |
| 3 | Open the `View` menu again and click `Force reload`. | | The workspace reloads and shows a normal page, not the meeting. | Trigger View > Force reload. |
| 4 | Right-click the workspace's icon in the left server list (or its tab at the top) and click `Force reload`. | | Same as step 3. | Use the workspace context menu. |
| 5 | Quit Rocket.Chat completely (Windows: right-click the tray icon, `Quit`; macOS: `Rocket.Chat` menu, `Quit Rocket.Chat`), then start it again. | | The workspace opens on a normal page with the room list. The meeting screen does not appear. | Quit and relaunch. |

## Evidence

- Screenshot of the main window after steps 2, 3 and 5.

## Failure Signals

- Any reload or the restart shows the meeting screen or `You left the meeting`
  in the main window.
