---
id: REL418-QA-038
title: An idle user stays away after the connection drops, on servers 7.10.0 and later
platforms: [windows, macos, linux]
priority: release
qase:
  suite: Release 4.18.0 / Workspaces
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: After the app drops and restores its connection, the idle user stays away on the server. Activity then makes the user online.
---

# Idle Presence After Reconnect (Servers 7.10.0 And Later)

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3490. It shipped in 4.17.1, so this is a regression check.
  `injected.ts` skips the legacy presence block on servers 7.10.0 and later.
  It re-asserts the idle state after a reconnect and login. It skips the
  `Utils` and `UserPresence` module loads. `userPresence/preload.ts` adds
  `reassertUserPresenceDetection`.
- User-visible risk: An idle user comes back as `online` after any websocket
  reconnect and stays `online` until the next idle transition.
- Hypothesis: This holds on a server 8.8.0 or later, and on a server from
  7.10.0 to 8.7.x. An idle user loses the connection and gets it back. The
  user is still `away` on the server 30 seconds later, on all three
  platforms. Real activity makes the user `online`.
- Smallest useful proof: Runtime repro in the installed build. The PR author
  ran this on a dev build with 8.7.0 and 8.8.1 servers and forced the idle
  state. This flow uses real idle time. Tray presence icons are in
  CORE-2525-QA-004 and does not test this path.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Pick the server. In the app, right-click its tab and click `Server info`. Read the line `Version:`. Run this flow once for a server of version 8.8.0 or later, and once for a server from 7.10.0 to 8.7.x. | Server version | The version is 7.10.0 or later. | Read the version in the dialog. |
| 2 | Set the test user preferences with the web API: `POST <host>/api/v1/users.setPreferences` with the user's `X-Auth-Token` and `X-User-Id` headers. | Body `{"data":{"enableAutoAway":true,"idleTimeLimit":60}}` | The answer has `"success": true`. | Run the request with `curl`. |
| 3 | Start the installed build. Sign in as the test user in this workspace. Select the workspace tab. In a browser on another device, or in a private browser window on the same machine, sign in as an admin user. | Test user and admin user | The app shows the workspace with the test user. The admin session is ready. | Sign in on both sides. |
| 4 | In the app, right-click the workspace tab. Click `Open DevTools`. Click the `Console` tab. Type the command and press Enter. Close the DevTools panel. Do not touch the keyboard or mouse of this machine after this step. | `setTimeout(()=>{Meteor.disconnect();setTimeout(()=>Meteor.reconnect(),10000)},100000)` | The console accepts the command. | Evaluate the command. |
| 5 | Wait 90 seconds. On the admin side, look up the test user's status with `GET <host>/api/v1/users.info?username=<test user>` or in the admin user list. | `status` field | `status` is `away`. The yellow dot shows for the user. | Poll `users.info` from the admin session. |
| 6 | Wait until 150 seconds after step 4. Do not touch this machine. On the admin side, check the status again. | `status` field | `status` is still `away`. It did not change to `online` after the drop at 100 seconds and the return at 110 seconds. | Poll `users.info` at 150 seconds. |
| 7 | Move the mouse on the machine with the app. Wait 15 seconds. On the admin side, check the status. | `status` field | `status` is `online`. | Poll `users.info`. |
| 8 | Run the flow again with the second server version. | | The same results as in steps 5, 6, and 7. | Repeat. |

## Evidence

- `users.info` status values with times for steps 5, 6, and 7.
- The server version from step 1 for each run.

## Failure Signals

- `status` is `online` at step 6.
- `status` stays `away` after real activity at step 7.
- `status` never becomes `away` at step 5.
