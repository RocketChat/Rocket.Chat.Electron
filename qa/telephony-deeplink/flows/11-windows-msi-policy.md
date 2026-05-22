---
id: TEL-QA-011
title: Windows MSI SET_DEFAULT_ASSOCIATIONS policy
platforms: [windows]
priority: release
requires: [msi_artifact, administrator_or_system_install_context]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: MSI policy points to an existing XML and diagnostics pass after Windows applies defaults.
---

# Windows MSI Policy

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Install MSI with `SET_DEFAULT_ASSOCIATIONS=1`. | Run `msiexec /i <msi> SET_DEFAULT_ASSOCIATIONS=1 /qn`. | Install succeeds. |
| 2 | Query policy registry value. | Run `reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v DefaultAssociationsConfiguration`. | Value points to Rocket.Chat XML under install `resources`. |
| 3 | Check the XML path exists. | Test file existence. | `RocketChatDefaultAppAssociations.xml` exists at the registry path. |
| 4 | Sign out and sign back in after install. | Reapply Windows default associations through a logon cycle. | Windows applies defaults. |
| 5 | Enable Telephony in Rocket.Chat. | Set telephony toggle on. | Diagnostics are available. |
| 6 | Open diagnostics. | Read checks. | `isDefault.tel` and `isDefault.callto` pass when policy applied. |
| 7 | Click valid links. | Trigger `tel` and `callto`. | Rocket.Chat handles both protocols. |
| 8 | Uninstall. | Remove MSI. | Installer removes policy only if it owns the sentinel. |

## Evidence

- MSI install log.
- `reg query` output.
- Screenshot or command output proving XML exists.
- Diagnostics JSON.

## Failure Signals

- Registry path contains `resources\\resources`.
- XML file is missing.
- Policy is removed during major upgrade unexpectedly.
