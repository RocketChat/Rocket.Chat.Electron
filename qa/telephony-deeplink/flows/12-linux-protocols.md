---
id: TEL-QA-012
title: Linux protocol handling
platforms: [linux]
priority: high
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled, installed_linux_build, test-links-html]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Linux desktop protocol defaults can route tel and callto links to Rocket.Chat.
---

# Linux Protocol Handling

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install Linux package or run packaged build. |  | Desktop file is available. | Install app package. |
| 2 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, find the `Telephony` section heading, then switch Telephony on. |  | App attempts protocol registration. | Set telephony toggle on. |
| 3 | Open diagnostics. |  | `linux.xdg.tel` and `linux.xdg.callto` reflect current defaults. | Read checks. |
| 4 | If a visible diagnostics row shows a button labeled `Open Settings`, click it. |  | GNOME/KDE default-app settings opens when supported. | Activate Open Settings action. |
| 5 | Set `tel` and `callto` to Rocket.Chat when diagnostics report another handler. |  | Rocket.Chat owns both handlers. | Use desktop settings first; use xdg tools only when desktop settings are unavailable. |
| 6 | Click valid links in `test-links.html`. |  | Rocket.Chat opens telephony flow. | Trigger `tel` and `callto`. |

## Evidence

- Diagnostics JSON.
- Desktop environment name.
- Command output from `xdg-mime` if used.

## Failure Signals

- Diagnostics cannot determine handler.
- Default-app settings action does nothing on GNOME/KDE.
- Browser opens another handler after defaults are changed.
