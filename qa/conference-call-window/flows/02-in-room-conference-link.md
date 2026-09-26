---
id: CONF-QA-002
title: Conference link clicked inside a room opens in the call window
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Conference call window
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires:
  [
    installed_branch_build,
    pexip_workspace_signed_in,
    video_calls_inside_app_on,
    test-links-html,
  ]
test_links: ['https://<workspace-host>/conference/<alias>?scheduled=true']
expected_result: Clicking a conference address posted in a room opens the meeting in the call window and the main window stays on the room.
---

# Conference Link Clicked Inside A Room

## Review Basis

- Comparison range: `dev` to `fix/conference-deep-link-video-window`.
- Changed surface: Main-frame navigation guard on the workspace view
  (`moveConferenceCallPageOut` in `src/ui/main/serverView/index.ts`).
- User-visible risk: The Pexip call info posts the conference address
  (`URL: https://<workspace>/conference/<id>`) into rooms; clicking it inside
  the desktop app navigated the whole workspace to the meeting screen.
- Hypothesis: Any navigation of the workspace view to a conference call page
  is moved to the call window and the workspace view returns to the previous
  page.
- Smallest useful proof: Local UI repro by clicking the address in a message.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In `test-links.html`, fill in the workspace host and a valid scheduled-meeting alias, then copy the text in the `Conference address to paste in a room` box. | Workspace host, meeting alias | The copied text looks like `https://<workspace-host>/conference/<alias>?scheduled=true`. | Copy the generated address. |
| 2 | In the main Rocket.Chat window, open any channel from the left room list, click the message composer at the bottom, paste the address and press Enter. | Copied address | The message appears in the room with the address shown as a link. | Post the address as a message. |
| 3 | Click the link in the message you just sent. | | A separate call window opens with the `Chat` panel (`Add people` button) on the left and the meeting video area on the right. | Click the posted link. |
| 4 | Switch back to the main window. | | The main window shows the same room with the message list and the workspace sidebar. At most a very brief flash; it does not stay on the meeting screen. | Capture the main window. |
| 5 | Optional: if the room has a Pexip call message, open its call information and click the `URL:` address instead. | Existing call | Same result as steps 3-4. | Click the call-info URL. |

## Evidence

- Screenshot of the posted message and of the main window after the click.
- Screenshot of the call window.

## Failure Signals

- The main window stays on the meeting screen after the click.
- Two meeting sessions for the same person appear on the meeting side.
