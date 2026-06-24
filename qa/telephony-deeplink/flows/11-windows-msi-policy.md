---
id: TEL-QA-011
title: Windows MSI SET_DEFAULT_ASSOCIATIONS policy
platforms: [windows]
priority: release
qase:
  suite: Telephony deeplinks
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [msi_artifact, administrator_or_system_install_context]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: MSI policy points to an existing XML and diagnostics pass after Windows applies defaults.
---

# Windows MSI Policy

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Windows MSI installer protocol association policy.
- User-visible risk: Enterprise installs do not register the phone-link
  protocols, or policy blocks expected association behavior.
- Hypothesis: The MSI package contains the expected `tel:` and `callto:`
  association data needed for Windows deployment.
- Smallest useful proof: Installer/package inspection or Windows install repro,
  depending on available release artifacts.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install MSI with `SET_DEFAULT_ASSOCIATIONS=1`. |  | Install succeeds. | Run `msiexec /i <msi> SET_DEFAULT_ASSOCIATIONS=1 /qn`. |
| 2 | Query policy registry value. |  | Value points to Rocket.Chat XML under install `resources`. | Run `reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v DefaultAssociationsConfiguration`. |
| 3 | Check the XML path exists. |  | `RocketChatDefaultAppAssociations.xml` exists at the registry path. | Test file existence. |
| 4 | Sign out and sign back in after install. |  | Windows applies defaults. | Reapply Windows default associations through a logon cycle. |
| 5 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, find the `Telephony` section heading, then switch Telephony on. |  | Diagnostics are available. | Set telephony toggle on. |
| 6 | Open diagnostics. |  | `isDefault.tel` and `isDefault.callto` pass when policy applied. | Read checks. |
| 7 | Click valid links. |  | Rocket.Chat handles both protocols. | Trigger `tel` and `callto`. |
| 8 | Uninstall. |  | Installer removes policy only if it owns the sentinel. | Remove MSI. |

## Evidence

- MSI install log.
- `reg query` output.
- Screenshot or command output proving XML exists.
- Diagnostics JSON.

## Failure Signals

- Registry path contains `resources\\resources`.
- XML file is missing.
- Policy is removed during major upgrade unexpectedly.
