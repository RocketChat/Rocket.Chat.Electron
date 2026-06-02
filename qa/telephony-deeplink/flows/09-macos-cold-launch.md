---
id: TEL-QA-009
title: macOS cold launch from tel and callto links
platforms: [macos]
priority: release
qase:
  suite: Telephony deeplinks
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled, app_registered_for_protocols, test-links-html]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Clicking a phone link while Rocket.Chat is closed launches the app and routes the link.
---

# macOS Cold Launch

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: macOS protocol handling during cold launch.
- User-visible risk: A phone link clicked while the app is closed is lost,
  ignored, or routed before workspaces are ready.
- Hypothesis: macOS launches Rocket.Chat from a `tel:` or `callto:` link and
  preserves the pending call until the app can route it.
- Smallest useful proof: OS-level repro on macOS using clickable protocol links.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, find the `Telephony` section heading, then switch Telephony on. |  | App is registered for phone protocols. | Set telephony toggle on. |
| 2 | Quit Rocket.Chat completely. |  | App is closed. | Ensure no Rocket.Chat process remains. |
| 3 | Open `test-links.html` in Safari or Chrome. |  | Link page is visible. | Open local HTML in browser. |
| 4 | Click `tel:+15551234567`. |  | Rocket.Chat launches and opens telephony flow. | Trigger link. |
| 5 | Quit Rocket.Chat again. |  | App is closed. | Ensure no process remains. |
| 6 | Click `callto:+15551234567`. |  | Rocket.Chat launches and opens telephony flow. | Trigger link. |
| 7 | Repeat while Rocket.Chat is already running. |  | Existing app window focuses and routes link. | Trigger link with running app. |

## Evidence

- Screen recording is preferred because this tests app launch timing.
- Note browser used.

## Failure Signals

- App launches but no dialpad opens.
- Browser reports no handler.
- Link works only when app is already running.
