---
id: TEL-QA-002
title: Enable and disable telephony protocol handling
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [test-links-html, at_least_one_workspace]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Disabled telephony ignores phone links; enabled telephony handles them.
---

# Enable And Disable Gating

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Telephony settings toggle, startup protocol registration, and
  `tel:` / `callto:` link gating.
- User-visible risk: Phone links route into the app while Telephony is disabled,
  or fail to route after Telephony is enabled.
- Hypothesis: The enabled setting is the user-visible gate for handling phone
  links.
- Smallest useful proof: Local UI repro using `test-links.html` clickable
  protocol links, plus targeted startup registration coverage in
  `src/app/main/app.main.spec.ts`.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start from a fresh app launch before enabling Telephony. Open `test-links.html` in a browser and click `tel:+15551234567`. | Telephony has not been enabled in this profile. | Rocket.Chat does not place a telephony call request or steal the link as a newly registered phone handler. | Trigger the link before enabling Telephony. |
| 2 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, then find the `Telephony` section heading. |  | Toggle is visible. | Navigate to Telephony settings. |
| 3 | Switch the Telephony toggle off if it is on. |  | Diagnostics section is hidden or inactive. | Set telephony toggle to off. |
| 4 | Click `callto:+15551234567` from `test-links.html`. |  | Rocket.Chat does not place a telephony call request. | Trigger the same link. |
| 5 | Switch the Telephony toggle on. |  | Default-handler prompt or diagnostics can appear. | Set telephony toggle to on. |
| 6 | Click `tel:+15551234567` again. |  | Rocket.Chat opens the telephony dialpad flow. | Trigger the same link. |
| 7 | Click `callto:+15551234567`. |  | Rocket.Chat opens the telephony dialpad flow. | Trigger the same link. |

## Evidence

- Screenshot or screen recording showing disabled vs enabled behavior.
- Note any OS prompt shown by the browser.
- Optional code-path proof: targeted test output for startup registration showing
  `rocketchat` registers at startup while `tel` and `callto` do not.

## Failure Signals

- Disabled mode still opens the dialpad.
- Enabled mode ignores both `tel:` and `callto:`.
- A fresh startup registers `tel` or `callto` before the tester opts in.
