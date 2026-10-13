---
id: REL418-QA-023
title: Screen sharing from a call still works
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Video calls
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, pexip_workspace_signed_in, video_calls_inside_app_on, hardware_graphics_machine, second_participant]
test_links: []
expected_result: The picker lists sources and the other participant sees the shared content.
---

# Screen Sharing From A Call Still Works

## Review Basis

- Comparison range: `4.17.4..origin/dev` at `acaf3a712`.
- Changed surface: #3517 (removes the External-API bridge, keeps `installScreenObtainer` in `src/videoCallWindow/preload/jitsiBridge.ts`), #3546 (JitsiBridge no longer loads `external_api.js`). #3552 (the share request still warms the source cache). #3510 (`videoCall.requestScreenSharing`). On macOS the #3552 warm-up triggers the permission prompt.
- User-visible risk: The Share control does nothing, the picker is empty, or the shared content does not reach the other participant. #3517 has no user-visible change by design, so a break shows only here.
- Hypothesis: In a call in the call window, the share control opens the `Share your screen` picker with sources, and the other participant sees the shared content.
- Smallest useful proof: Manual run on a machine with a physical or hardware-accelerated screen. Do not use a software-rendered VM, because screen capture cannot be tested there. This flow also covers the Windows and Linux warm-up path that #3552 did not change.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start a call from a conference link in a room so that the call window opens. Ask a second person to join the same call on another device. | `https://<workspace-host>/conference/<alias>` | The call window shows the meeting. The second participant is in the call. | Open the call window. |
| 2 | In the call window, click the screen share control of the meeting toolbar. If the system asks for Screen Recording or screen access, allow it. On macOS, quit and reopen the app after you allow it, and start again from step 1. | | A picker window opens with the title `Share your screen`. It has the tabs `Your entire screen` and `Application window`, and the buttons `Cancel` and `Share`. | Click the share control. Capture the picker. |
| 3 | In the picker, select a screen thumbnail on the `Your entire screen` tab. Click `Share`. | | The picker closes. The call shows that you share your screen. | Select a source and click Share. |
| 4 | Ask the second participant what they see. | | The second participant sees your screen. | Get the answer or a screenshot. |
| 5 | Stop sharing with the share control of the meeting toolbar. Repeat steps 2 and 3 with the `Application window` tab and one window. | One open application window | The shared window shows for the second participant. After you stop, the share ends. | Repeat with a window source. |

## Evidence

- Screenshot of the picker at step 2.
- Screenshot or answer from the second participant at step 4.

## Failure Signals

- The share control does nothing, or the picker never opens.
- The picker shows `No screens found` or `No windows found` with permission on.
- The other participant sees a black or empty picture.
