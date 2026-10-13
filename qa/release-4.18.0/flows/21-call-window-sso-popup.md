---
id: REL418-QA-021
title: Sign-in popup in the call window opens as an app window and completes
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Video calls
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, pexip_workspace_signed_in, video_calls_inside_app_on, pexip_sso_identity_provider]
test_links: []
expected_result: The sign-in popup opens as an app window, returns the result to the call, and closes.
---

# Sign-In Popup In The Call Window Opens As An App Window And Completes

## Review Basis

- Comparison range: `4.17.4..origin/dev` at `acaf3a712`.
- Changed surface: #3485 (`handleConferenceWebviewWindowOpen` in `src/videoCallWindow/ipc.ts`). Plain http(s) popups from the conference page open as sandboxed child windows. Tab-target links (middle-click, ctrl-click) still open in the system browser. This fix already shipped in 4.17.1, so this flow is a regression check.
- User-visible risk: The identity-provider login popup opens in the system browser, loses its opener, and the call never signs in.
- Hypothesis: In the call window, a login popup opens as an app window, the call receives the result, and the popup closes. A middle-click link still opens the system browser.
- Smallest useful proof: Manual run on the installed build against a Pexip conference with an SSO identity provider. The author tested with a local mimic server only and not against a live Pexip deployment, so this flow is the first live check. Unit specs in `src/videoCallWindow/main/ipc.main.spec.ts` cover the policy.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the installed app, check that `Video calls inside app` is on: left server list, three-dots button near the bottom, `Settings`, `Voice & Video` tab. | Pexip workspace that uses an SSO identity provider | The switch is on. | Read the switch state. |
| 2 | Close Settings. In a room, send a conference link and click it. | `https://<workspace-host>/conference/<alias>` | The call window opens. The meeting page asks the guest to sign in with SSO. | Send and click the link. |
| 3 | In the call window, click the sign-in with SSO control of the meeting page. | | A new window opens with its own title bar, in front of the call window. It shows the identity-provider login page. The system browser does not open. | Click the control. Capture all open windows. |
| 4 | Sign in with the test account in the new window. | SSO test account | The new window closes by itself. The call window shows the meeting as signed in. | Sign in and capture the call window. |
| 5 | In the call window, find a link on the meeting page. Middle-click it (or hold `Cmd` on macOS or `Ctrl` on Windows and Linux and click it). | Any http(s) link on the page | The link opens in the default system browser. No new app window opens. | Click with the modifier and check the browser. |
| 6 | Close the call window. | | The call window closes. The main window stays the same. | Close the window. |

## Evidence

- Screenshot at step 3 that shows the popup window and the call window.
- Screenshot of the call window at step 4.

## Failure Signals

- The login page opens in the system browser at step 3.
- The popup stays open or the call does not sign in at step 4.
- A middle-click link opens an app window at step 5.
