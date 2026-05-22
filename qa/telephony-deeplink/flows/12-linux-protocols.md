---
id: TEL-QA-012
title: Linux protocol handling
platforms: [linux]
priority: high
requires: [telephony_enabled, installed_linux_build, test-links-html]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Linux desktop protocol defaults can route tel and callto links to Rocket.Chat.
---

# Linux Protocol Handling

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Install Linux package or run packaged build. | Install app package. | Desktop file is available. |
| 2 | Enable Telephony. | Set telephony toggle on. | App attempts protocol registration. |
| 3 | Open diagnostics. | Read checks. | `linux.xdg.tel` and `linux.xdg.callto` reflect current defaults. |
| 4 | If diagnostics show Open Settings, click it. | Activate Open Settings action. | GNOME/KDE default-app settings opens when supported. |
| 5 | Set `tel` and `callto` to Rocket.Chat when diagnostics report another handler. | Use desktop settings first; use xdg tools only when desktop settings are unavailable. | Rocket.Chat owns both handlers. |
| 6 | Click valid links in `test-links.html`. | Trigger `tel` and `callto`. | Rocket.Chat opens telephony flow. |

## Evidence

- Diagnostics JSON.
- Desktop environment name.
- Command output from `xdg-mime` if used.

## Failure Signals

- Diagnostics cannot determine handler.
- Default-app settings action does nothing on GNOME/KDE.
- Browser opens another handler after defaults are changed.
