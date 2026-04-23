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
