---
id: REL418-QA-037
title: Workspace behind HTTP basic authentication loads with the saved credentials
platforms: [windows, macos, linux]
priority: medium
qase:
  suite: Release 4.18.0 / Workspaces
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: A workspace whose address holds a user name and password loads without a prompt, even when other workspaces are listed before it.
---

# Basic Authentication With Several Workspaces

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3518. The `login` handler in `src/navigation/main.ts`
  now skips a workspace that does not match. It returns after it applies the
  matching credentials. It calls the empty callback only after the loop. The
  same PR removes a duplicate drain of the queued certificate callbacks.
- User-visible risk: With two or more workspaces, a non-matching workspace
  earlier in the list answered the request with no credentials. The workspace
  that sits behind basic authentication then failed to load.
- Hypothesis: A normal workspace is first in the list. A basic
  authentication workspace is second. The second workspace loads and shows its
  sign-in page without a credential prompt.
- Smallest useful proof: Local UI repro in the installed build with a
  reverse proxy that asks for basic authentication. The PR has unit specs for
  the login handler. The duplicate certificate drain has no tester-visible
  effect and has a unit spec only.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Prepare a Rocket.Chat server behind a reverse proxy that asks for HTTP basic authentication. Use a user name and a password. Prepare a normal workspace without basic authentication. | Protected server `https://protected.example.com` with user `qa-user` and password `qa-pass`. Normal server `https://normal.example.com` | Opening the protected address in a browser shows the browser's own sign-in prompt. | Confirm with `curl -s -o /dev/null -w "%{http_code}" https://protected.example.com` that the answer is 401. |
| 2 | Start the installed build with no workspaces (use a new profile, or remove the workspaces from the tab menu `Remove`). In the field `Enter your server URL`, type the normal address. Click `Connect`. Sign in. | `https://normal.example.com` | The normal workspace shows as the first tab. | Add the normal workspace. |
| 3 | Click the plus button `Add workspace` at the right end of the tab strip. In the field `Enter your server URL`, type the protected address with the credentials in it. Click `Connect`. | `https://qa-user:qa-pass@protected.example.com` | The protected workspace shows as the second tab. Its page loads and shows the Rocket.Chat sign-in screen. No credential prompt shows. | Add the workspace. Capture the page. |
| 4 | Click the first tab. Then click the second tab again. | | The second workspace shows its page again with no prompt and no failure view. | Switch the tabs. Capture the page. |
| 5 | With the second tab selected, open the `View` menu and click `Reload`. | | The page reloads and shows the sign-in screen with no prompt and no failure view (`Server Failed to Load`). | Choose `View` > `Reload`. Capture the page. |
| 6 | Quit the app (Cmd+Q on macOS, File > Quit on Windows and Linux). Start it again. Click the second tab. | | The second workspace loads with no prompt. | Restart the app. Select the tab. Capture the page. |

## Evidence

- Screenshot of the second workspace after step 3 and step 6.
- The `curl` result from step 1.

## Failure Signals

- A sign-in prompt shows for the protected address.
- The failure view `Server Failed to Load` shows for the second workspace.
- The second workspace works only when it is the first tab in the list.
