---
id: REL418-QA-022
title: Call window boots without console errors and keeps a minimal bridge
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Video calls
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, pexip_workspace_signed_in, video_calls_inside_app_on]
test_links: []
expected_result: The call page logs no TypeError and no script error. The bridge has no credential method.
---

# Call Window Boots Without Console Errors And Keeps A Minimal Bridge

## Review Basis

- Comparison range: `4.17.4..origin/dev` at `acaf3a712`.
- Changed surface: #3510 (the call window preload exposes `window.RocketChatDesktop.videoCall` with `close`, `openInMainWindow`, and `requestScreenSharing`. `window.videoCallWindow` and `getAuthCredentials` are removed), #3546 (four no-op setters `setUrlResolver`, `setFavicon`, `setTitle`, `setUserPresenceDetection`. JitsiBridge no longer loads `external_api.js`), #3517 (the hollow Jitsi bridge, `test-ipc`, and `web-contents-id` are removed. The screen obtainer stays). Files: `src/videoCallWindow/preload/index.ts`, `src/videoCallWindow/preload/jitsiBridge.ts`, `src/videoCallWindow/ipc.ts`.
- User-visible risk: The conference page throws TypeError on boot. Or the Jitsi script loads in a loop. Or the close and open-in-main-window controls break. Or the session token reaches the provider page.
- Hypothesis: After a conference link opens in the call window, the DevTools console of the call page shows no `TypeError` and no `external_api.js` error. `RocketChatDesktop.videoCall` has the three methods. `videoCallWindow` is undefined and no credential method exists.
- Smallest useful proof: Console check on the installed build through the in-app DevTools menu item. The author ran #3546 on macOS only and said that other platforms were not run. Spec files `preload.main.spec.ts` and `preloadCoverage.main.spec.ts` cover the bridge. #3517 has no user-visible change. This flow is its regression check. `REL418-QA-023` covers the screen obtainer.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the menu bar open `Help`, then `Video Call Tools`, then click `Auto-open DevTools` to add a check mark. On Windows and Linux, press `Alt` to show a hidden menu bar. | | `Auto-open DevTools` shows a check mark. | Open the menu and toggle the item. |
| 2 | In a room, send a conference link and click it. | `https://<workspace-host>/conference/new?rid=GENERAL` | A call window opens. A DevTools window opens next to it. | Send and click the link. |
| 3 | In the DevTools window, click the `Console` tab. Read all red entries. | | The console shows no `TypeError`. It shows no `setUrlResolver is not a function`, no `setUserPresenceDetection is not a function`, no `Error loading Jitsi Meet External API script`, and no `Refused to execute script`. | Read the console text and search for these strings. |
| 4 | In the console prompt, type `Object.keys(window.RocketChatDesktop.videoCall)` and press Enter. | | The result shows `close`, `openInMainWindow`, and `requestScreenSharing`. | Run the command and copy the output. |
| 5 | Type `typeof window.videoCallWindow` and press Enter. Then type `typeof window.RocketChatDesktop.videoCall.getAuthCredentials` and press Enter. | | Both results show `"undefined"`. | Run both commands and copy the output. |
| 6 | Type `window.RocketChatDesktop.videoCall.openInMainWindow('/home')` and press Enter. | | The main window comes to the front on the `/home` page of the workspace. The call window closes or stays, with no error in the console. | Run the command. Capture the main window. |
| 7 | Open the call window again with the same link. In the console, type `window.RocketChatDesktop.videoCall.close()` and press Enter. | | The call window closes. | Run the command and check that the window closes. |
| 8 | In the menu bar open `Help`, `Video Call Tools`, and click `Auto-open DevTools` to clear the check mark. | | The check mark is gone. | Toggle the item. |

## Evidence

- Screenshot of the DevTools console at step 3.
- Copied output of steps 4 and 5.

## Failure Signals

- Any `TypeError` or script-load error in the console at step 3.
- The same error repeats on every page change.
- `videoCallWindow` or `getAuthCredentials` exists.
- `close` or `openInMainWindow` does nothing.
