---
id: REL418-QA-035
title: Workspace tab shows a red record icon while camera, microphone or screen is captured
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Workspaces
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: A tab shows one red record icon while its workspace or its video call window captures a camera, microphone or screen. The icon goes away when capture stops, and a restart shows no stale icon.
---

# Tab Capture Indicator

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3493 (stacked on #3491). A hook in the page main world
  wraps `getUserMedia` and `getDisplayMedia`. The video call window reports
  over IPC. `WorkspaceTab` draws a red `rec` icon in the tab strip. The reset
  of audio and capture flags at startup (`SERVERS_LOADED`) is in the same PR.
- User-visible risk: The icon does not show during a capture, stays after the
  capture stops, or shows after a restart. The icon shows in the sidebar
  layout.
- Hypothesis: While any device is captured, the workspace tab shows one red
  record icon, and the tooltip names the devices. When the last device stops,
  the icon goes away. After a restart no icon shows.
- Smallest useful proof: Local UI repro in the installed build. Use
  `getUserMedia` and `getDisplayMedia` calls from the DevTools console. Use
  one real video call for the call window source.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed build with two signed-in workspaces. Open `View`, `Workspace switcher`, `Tabs`. Click tab B in the top strip. Workspace A stays in the background. | Workspace A and workspace B | Tab B is selected. | Set the layout and select tab B. |
| 2 | Right-click tab A. Click `Open DevTools`. In the DevTools panel, click the `Console` tab. Type the command and press Enter. If the system asks for microphone access, allow it. | `var mic=await navigator.mediaDevices.getUserMedia({audio:true})` | Tab A shows one small red icon at its right end. It is a filled circle with a ring (a record mark). The icon is red, not grey. | Evaluate the command. Capture the tab strip. |
| 3 | Hover over tab A. | | The tooltip first line ends with `— Microphone on`. | Hover and read the tooltip. |
| 4 | In the console, type the command and press Enter. If the system asks for camera access, allow it. | `var cam=await navigator.mediaDevices.getUserMedia({video:true})` | Tab A still shows one red icon, not two. The tooltip ends with `— Camera on, Microphone on`. | Evaluate the command. Hover and read the tooltip. |
| 5 | In the console, type the command and press Enter. | `mic.getTracks().forEach(t=>t.stop())` | The red icon stays. The tooltip ends with `— Camera on`. | Evaluate the command. Hover and read the tooltip. |
| 6 | In the console, type the command and press Enter. | `cam.getTracks().forEach(t=>t.stop())` | The red icon goes away. | Evaluate the command. Capture the strip. |
| 7 | In the console, type the command and press Enter. In the screen picker that opens, choose one screen and confirm. On macOS, allow screen recording in System Settings if the system asks. | `var scr=await navigator.mediaDevices.getDisplayMedia({video:true})` | Tab A shows the red icon. The tooltip ends with `— Sharing screen`. | Evaluate the command. Choose a screen. Capture the strip. |
| 8 | In the console, type the command and press Enter. | `scr.getTracks().forEach(t=>t.stop())` | The red icon goes away. | Evaluate the command. Capture the strip. |
| 9 | Click tab A to select it. Open a room. Start a video call from the room header (the camera icon button, if the server shows it). Allow the microphone and camera in the call window. Join the call. Look at tab A in the main window. | A server with video calls | A separate call window opens. Tab A shows the red icon while the call window uses the microphone or camera. | Start the call. Capture both windows. |
| 10 | Close the call window. | | The red icon goes away from tab A within 5 seconds. | Close the window. Capture the strip. |
| 11 | In the console of workspace A, run the command from step 2 again with the name `mic3`. | `var mic3=await navigator.mediaDevices.getUserMedia({audio:true})` | The red icon shows on tab A. | Evaluate the command. |
| 12 | Quit the app (Cmd+Q on macOS, File > Quit on Windows and Linux). Start it again. | | After the restart, tab A shows no red icon. | Quit, restart, and capture the strip. |
| 13 | Right-click tab A. Click `Open DevTools`. In the console, run the command. Open `View`, `Workspace switcher`, `Sidebar`. Hover over the icon of workspace A. | `var mic4=await navigator.mediaDevices.getUserMedia({audio:true})` | The sidebar shows no red icon. The tooltip first line ends with `— Microphone on`. | Run the command, switch the layout, hover, and read the tooltip. |
| 14 | In the console, type `mic4.getTracks().forEach(t=>t.stop())` and press Enter. Set `Workspace switcher` back to `Tabs`. | `mic4.getTracks().forEach(t=>t.stop())` | The tab strip shows again with no red icon. | Stop the track and restore the layout. |

## Evidence

- Screenshots of the tab strip for steps 2, 4, 6, 7, 9, and 10.
- Tooltip text for steps 3, 4, 5, and 7.

## Failure Signals

- No red icon shows when a device is captured.
- Two icons show at the same time.
- The icon stays after the capture stops.
- The icon shows after a restart.
- The icon shows for workspace B when A captures.
- The icon is grey, like the audio badge.
