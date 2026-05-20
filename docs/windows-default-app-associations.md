# Windows default app associations (tel:/callto:)

This document covers how to make Rocket.Chat the default handler for
`tel:` and `callto:` links on Windows 10 / 11 fleets at scale.

It is intentionally self-contained so it can be shared with a Windows
administrator without surrounding context. For other enterprise
deployment topics (MSI vs NSIS choice, `DISABLE_AUTO_UPDATES`,
SCCM/MECM, troubleshooting), see
[`enterprise-deployment.md`](./enterprise-deployment.md).

## Why this needs admin involvement

Windows 10 1803+ protects per-user file/protocol defaults with a SHA256
"UserChoice" hash bound to the user SID + scheme + ProgId, and the
User Choice Protection Driver (UCPD) introduced in March 2024 blocks
all user-mode writes to those keys. As a result, **no installer or app
— Rocket.Chat included — can set itself as the default `tel:` or
`callto:` handler without the user picking it from Settings → Default
Apps**.

Microsoft's officially supported automation path is the per-machine
policy registry value:

```
HKLM\SOFTWARE\Policies\Microsoft\Windows\System!DefaultAssociationsConfiguration
```

which Windows reads at user logon and applies to the UserChoice keys
on the user's behalf. This is the same value the
**"Set a default associations configuration file"** Group Policy and
the Intune `ApplicationDefaults` CSP set.

## What we ship

The installer drops a ready-made XML at:

```
%ProgramFiles%\Rocket.Chat\resources\RocketChatDefaultAppAssociations.xml
```

containing:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<DefaultAssociations>
  <Association Identifier="tel"    ProgId="RocketChat.tel"    ApplicationName="Rocket.Chat" />
  <Association Identifier="callto" ProgId="RocketChat.callto" ApplicationName="Rocket.Chat" />
</DefaultAssociations>
```

The `RocketChat.tel` and `RocketChat.callto` ProgIDs are the same ones
the installer registers under `HKLM\SOFTWARE\Classes\` on per-machine
MSI installs, so the XML is ready to consume as-is.

## How to apply it

Four channels deliver the same XML to a fleet. Pick whichever matches
your environment; do not stack them.

### 1. MSI public property `SET_DEFAULT_ASSOCIATIONS=1` (unmanaged machines)

For installs that are not centrally managed by Active Directory or
Intune, pass the property when running the MSI:

```cmd
msiexec /i rocketchat-<version>-win-x64.msi SET_DEFAULT_ASSOCIATIONS=1 /qn
```

When set, the installer:

- Writes
  `HKLM\SOFTWARE\Policies\Microsoft\Windows\System!DefaultAssociationsConfiguration`
  = the install-dir XML path.
- Writes a sentinel
  `HKLM\SOFTWARE\Rocket.Chat\InstallState!WroteDefaultAssociationsPolicy = "1"`.

On uninstall the policy value is removed only if the sentinel says we
wrote it AND the value still points at our XML. Other values under the
`System` policy key are left untouched. Major upgrades skip cleanup so
the policy survives version bumps.

Caveats:

- The per-user NSIS installer (`rocketchat-<version>-win-<arch>.exe`)
  does **not** expose this property — it is MSI-only.
- The policy is read by Windows at user logon. Existing profiles keep
  their current default until the next logon; new profiles pick up
  Rocket.Chat immediately.

### 2. Group Policy (Active Directory)

1. Group Policy Management → edit your target GPO.
2. **Computer Configuration → Administrative Templates → Windows
   Components → File Explorer → "Set a default associations
   configuration file"**.
3. Set the policy to **Enabled** and point it at the XML — either the
   bundled path on each machine, or a UNC share with the same
   contents.
4. `gpupdate /force` on a client, log out / log back in. The
   in-app diagnostics panel
   (Settings → Voice & Video → Telephony → Diagnostics) should show
   `isDefault.tel` and `isDefault.callto` as **pass**.

The registry equivalent (handy for one-off testing):

```cmd
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v DefaultAssociationsConfiguration /t REG_SZ /d "%ProgramFiles%\Rocket.Chat\resources\RocketChatDefaultAppAssociations.xml" /f
```

### 3. Intune / MDM `ApplicationDefaults` CSP

For workgroup / Intune-only fleets:

- OMA-URI: `./Vendor/MSFT/Policy/Config/ApplicationDefaults/DefaultAssociationsConfiguration`
- Data type: **String**
- Value: Base64-encoded contents of
  `RocketChatDefaultAppAssociations.xml`

### 4. DISM (image deployment)

For MDT / SCCM image builds:

```cmd
dism /Online /Import-DefaultAppAssociations:"%ProgramFiles%\Rocket.Chat\resources\RocketChatDefaultAppAssociations.xml"
```

Applies to **new** user profiles created after the import; existing
profiles are not modified.

## Precedence

GPO and MDM policy refreshes overwrite any value the installer wrote
via `SET_DEFAULT_ASSOCIATIONS=1`. If your environment uses both, treat
the installer flag as a fallback for unmanaged machines only and rely
on the GPO/CSP for managed ones.

## Verification on a client

```cmd
reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v DefaultAssociationsConfiguration
```

should print the XML path, then in Rocket.Chat:

1. Open **Settings → Voice & Video → Telephony**.
2. Expand **Diagnostics**.
3. `isDefault.tel` and `isDefault.callto` should both report **pass**.
   If they fail, the `details` field explains which scheme is missing
   or being claimed by another handler.
