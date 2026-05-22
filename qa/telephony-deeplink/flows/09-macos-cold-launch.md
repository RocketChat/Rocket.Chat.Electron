---
id: TEL-QA-009
title: macOS cold launch from tel and callto links
platforms: [macos]
priority: release
requires: [telephony_enabled, app_registered_for_protocols, test-links-html]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Clicking a phone link while Rocket.Chat is closed launches the app and routes the link.
---

# macOS Cold Launch

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Enable Telephony in Rocket.Chat. | Set telephony toggle on. | App is registered for phone protocols. |
| 2 | Quit Rocket.Chat completely. | Ensure no Rocket.Chat process remains. | App is closed. |
| 3 | Open `test-links.html` in Safari or Chrome. | Open local HTML in browser. | Link page is visible. |
| 4 | Click `tel:+15551234567`. | Trigger link. | Rocket.Chat launches and opens telephony flow. |
| 5 | Quit Rocket.Chat again. | Ensure no process remains. | App is closed. |
| 6 | Click `callto:+15551234567`. | Trigger link. | Rocket.Chat launches and opens telephony flow. |
| 7 | Repeat while Rocket.Chat is already running. | Trigger link with running app. | Existing app window focuses and routes link. |

## Evidence

- Screen recording is preferred because this tests app launch timing.
- Note browser used.

## Failure Signals

- App launches but no dialpad opens.
- Browser reports no handler.
- Link works only when app is already running.
