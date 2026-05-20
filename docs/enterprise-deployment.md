# Enterprise Deployment

Guidance for deploying Rocket.Chat Desktop in enterprise environments (Active
Directory, SCCM/MECM, Intune, Group Policy).

## Installer choice

Two Windows installers are published for each release:

| Installer | File | Scope | Use case |
|-----------|------|-------|----------|
| **MSI** | `rocketchat-<version>-win-<arch>.msi` | Per-machine by default | SCCM/MECM, Intune, GPO, any SYSTEM-context deployment |
| **NSIS** | `rocketchat-<version>-win-<arch>.exe` | Per-user by default | Interactive install by end users |

**Use the MSI for enterprise deployment.** The NSIS installer is not designed
for SYSTEM-context execution (e.g., SCCM running as `NT AUTHORITY\SYSTEM`) —
its per-user/per-machine detection relies on user context that is not
available when running as SYSTEM.

## Standard deployment command

```cmd
msiexec /i rocketchat-<version>-win-x64.msi /qn
```

This performs a silent, per-machine install into `%ProgramFiles%\Rocket.Chat`.

## Public MSI properties

The MSI exposes the following public properties that enterprise administrators
can pass on the `msiexec` command line.

### `DISABLE_AUTO_UPDATES`

Disables the in-app auto-update mechanism by writing
`resources/update.json` with `{"canUpdate": false, "autoUpdate": false}`
during installation.

```cmd
msiexec /i rocketchat-<version>-win-x64.msi DISABLE_AUTO_UPDATES=1 /qn
```

Use this when auto-updates are managed centrally (via SCCM, Intune, or any
software distribution system) and the client should not check for or install
updates on its own.

The property is applied during install. On uninstall, `update.json` is removed
together with the rest of the installation directory.

### `SET_DEFAULT_ASSOCIATIONS`

Wires the bundled default-app associations XML into the Windows
"DefaultAssociationsConfiguration" policy so that `tel:` and `callto:` links
open Rocket.Chat without requiring each user to choose it in Settings →
Default Apps.

```cmd
msiexec /i rocketchat-<version>-win-x64.msi SET_DEFAULT_ASSOCIATIONS=1 /qn
```

When set, the installer:

- Writes `HKLM\SOFTWARE\Policies\Microsoft\Windows\System` value
  `DefaultAssociationsConfiguration` = `%ProgramFiles%\Rocket.Chat\resources\RocketChatDefaultAppAssociations.xml`.
- Writes a sentinel `HKLM\SOFTWARE\Rocket.Chat\InstallState!WroteDefaultAssociationsPolicy = "1"`.

On uninstall the policy value is removed only if the sentinel says we wrote
it AND it still points at our XML; other values under the `System` policy
key are left untouched.

**Important caveats**:

- This is the same registry value an Active Directory GPO writes. If your
  domain already deploys a `Set a default associations configuration file`
  GPO, that GPO wins at the next `gpupdate /force` cycle and overwrites the
  installer's value. Use the property only on machines that are *not*
  managed by such a GPO; managed machines should rely on the GPO instead
  (see "Default app associations" below).
- The policy is read by Windows at user logon. Existing user profiles keep
  their current default until the next logon; brand-new profiles pick up
  Rocket.Chat immediately.
- This property is MSI-only. The per-user NSIS installer does not expose
  it.

## SCCM / MECM deployment

The MSI runs correctly under `NT AUTHORITY\SYSTEM`. Typical deployment
program command line:

```cmd
msiexec /i "rocketchat-<version>-win-x64.msi" DISABLE_AUTO_UPDATES=1 /qn /norestart
```

Detection method: MSI product code, or file presence at
`%ProgramFiles%\Rocket.Chat\Rocket.Chat.exe`.

## Troubleshooting

### Generate a verbose install log

Add `/l*v install.log` to capture a full MSI log (useful if a custom action
or property is not applying as expected):

```cmd
msiexec /i rocketchat-<version>-win-x64.msi DISABLE_AUTO_UPDATES=1 /qn /l*v install.log
```

Search the log for `DISABLE_AUTO_UPDATES`, `WriteUpdateJson`, and
`CustomActionData` to verify the custom action executed.

### Verify auto-updates are disabled

After install, check that `update.json` exists in the resources folder:

```cmd
type "%ProgramFiles%\Rocket.Chat\resources\update.json"
```

It should contain:

```json
{
  "canUpdate": false,
  "autoUpdate": false
}
```

## Default app associations (tel:/callto:)

Windows 10 1803+ protects per-user file/protocol defaults with a SHA256
"UserChoice" hash bound to the user SID + scheme + ProgId, and the User
Choice Protection Driver (UCPD) introduced in March 2024 blocks all
user-mode writes to those keys. As a result, **no installer or app — ours
included — can set itself as the default `tel:` or `callto:` handler
without the user picking it from Settings → Default Apps**.

The supported automation path is the per-machine policy registry value
`HKLM\SOFTWARE\Policies\Microsoft\Windows\System!DefaultAssociationsConfiguration`,
which Windows reads at user logon and applies to the UserChoice keys on
the user's behalf. The installer ships a ready-made XML for this purpose
at:

```
%ProgramFiles%\Rocket.Chat\resources\RocketChatDefaultAppAssociations.xml
```

containing:

```xml
<DefaultAssociations>
  <Association Identifier="tel"    ProgId="RocketChat.tel"    ApplicationName="Rocket.Chat" />
  <Association Identifier="callto" ProgId="RocketChat.callto" ApplicationName="Rocket.Chat" />
</DefaultAssociations>
```

Three channels can apply this XML at scale.

### Group Policy (Active Directory)

1. Group Policy Management → edit your target GPO.
2. **Computer Configuration → Administrative Templates → Windows Components → File Explorer → "Set a default associations configuration file"**.
3. Set the policy to **Enabled** and point it at the XML — either the
   bundled path above (each machine has its own copy) or a UNC share with
   the same contents.
4. `gpupdate /force` and log out / log back in. The diagnostics panel in
   Rocket.Chat → Settings → Voice & Video → Telephony → Diagnostics should
   show `isDefault.tel` and `isDefault.callto` as pass.

The registry equivalent (writable directly by the installer when
`SET_DEFAULT_ASSOCIATIONS=1` is passed; see above):

```cmd
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v DefaultAssociationsConfiguration /t REG_SZ /d "%ProgramFiles%\Rocket.Chat\resources\RocketChatDefaultAppAssociations.xml" /f
```

### Intune / MDM

For workgroup / Intune-only fleets, deploy the same XML via the
`ApplicationDefaults` CSP:

- OMA-URI: `./Vendor/MSFT/Policy/Config/ApplicationDefaults/DefaultAssociationsConfiguration`
- Data type: String
- Value: Base64-encoded contents of `RocketChatDefaultAppAssociations.xml`

### DISM (image deployment)

For MDT / SCCM image builds:

```cmd
dism /Online /Import-DefaultAppAssociations:"%ProgramFiles%\Rocket.Chat\resources\RocketChatDefaultAppAssociations.xml"
```

This applies the associations to **new** user profiles created after the
import; existing profiles are not modified.

### Precedence

GPO and MDM-driven policy refreshes overwrite any value the installer
writes via `SET_DEFAULT_ASSOCIATIONS=1`. If your environment uses both,
treat the installer flag as a fallback for unmanaged machines only and
rely on the GPO/CSP for managed ones.
