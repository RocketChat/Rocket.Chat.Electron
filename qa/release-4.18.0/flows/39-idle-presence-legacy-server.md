---
id: REL418-QA-039
title: Idle presence still works on servers older than 7.10.0
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
expected_result: On a server older than 7.10.0 the idle user becomes away, stays away after a reconnect, and becomes online again after activity.
---

# Idle Presence On Servers Older Than 7.10.0

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3490. The legacy presence block in `injected.ts` stays
  active only on servers older than 7.10.0. The `Utils` and `UserPresence`
  module loads now run only there. The reconnect re-assert also covers these
  servers.
- User-visible risk: The version check turns the legacy block off on old
  servers. Idle users then never become `away`.
- Hypothesis: On a server older than 7.10.0 the user becomes `away` when
  idle. The user stays `away` after a drop and a return of the connection.
  Activity makes the user `online`.
- Smallest useful proof: Runtime repro in the installed build with an old
  server. The PR author did not run the reconnect case on a server older than
  8.7.0. This flow needs a server below 7.10.0.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the app, right-click the tab of the old server. Click `Server info`. Read the line `Version:`. | Server version below 7.10.0 | The version is lower than 7.10.0. | Read the version in the dialog. |
| 2 | Set the test user preferences with the web API: `POST <host>/api/v1/users.setPreferences` with the user's `X-Auth-Token` and `X-User-Id` headers. | Body `{"data":{"enableAutoAway":true,"idleTimeLimit":60}}` | The answer has `"success": true`. | Run the request with `curl`. |
| 3 | Sign in as the test user in the app. Select the workspace tab. In a browser on another device, sign in as an admin user. | Test user and admin user | The app shows the workspace. The admin session is ready. | Sign in on both sides. |
| 4 | Right-click the workspace tab. Click `Open DevTools`. Click the `Console` tab. Type the command and press Enter. Close the DevTools panel. Do not touch the keyboard or mouse of this machine after this step. | `setTimeout(()=>{Meteor.disconnect();setTimeout(()=>Meteor.reconnect(),10000)},100000)` | The console accepts the command. | Evaluate the command. |
| 5 | Wait 90 seconds. On the admin side, read the status of the test user with `GET <host>/api/v1/users.info?username=<test user>`. | `status` field | `status` is `away`. | Poll `users.info`. |
| 6 | Wait until 150 seconds after step 4. Check the status again. | `status` field | `status` is still `away`. | Poll `users.info`. |
| 7 | Move the mouse on the machine with the app. Wait 15 seconds. Check the status. | `status` field | `status` is `online`. | Poll `users.info`. |

## Evidence

- `users.info` status values with times for steps 5, 6, and 7.
- The server version from step 1.

## Failure Signals

- `status` never becomes `away` at step 5.
- `status` is `online` at step 6.
- The webview console shows `Failed to load Utils module` or `Failed to load UserPresence module`.
