# Outlook Calendar: Allow Insecure Connections

> **Recommended:** Before using this setting, try [System CA Certificates](system-ca-certificates.md) instead. If your Exchange server's CA is installed in the OS trust store, system CA support will handle it securely without disabling certificate validation.

## Overview

Air-gapped or corporate environments often use Exchange servers with self-signed or internal CA certificates that are not trusted by the system certificate store. The `allowInsecureOutlookConnections` setting allows the Outlook calendar sync to connect to these servers by bypassing SSL certificate validation.

> **Warning:** This setting disables TLS certificate verification for Outlook calendar sync requests. Only use it as a last resort when system CA certificates cannot solve the problem (e.g., truly self-signed certificates not installed in the OS trust store).

## Configuration

Create or edit the `overridden-settings.json` file with the following content:

```json
{
  "allowInsecureOutlookConnections": true
}
```

### File location by platform

| Platform | Path |
|----------|------|
| **Windows** | `%APPDATA%/Rocket.Chat/overridden-settings.json` |
| **macOS** | `~/Library/Application Support/Rocket.Chat/overridden-settings.json` |
| **Linux** | `~/.config/Rocket.Chat/overridden-settings.json` |

## Default behavior

The setting defaults to `false`. When disabled (or absent), all Outlook calendar sync connections require valid SSL certificates.

## When to use

- Exchange servers using self-signed certificates
- Corporate environments with internal Certificate Authorities not in the system trust store
- Air-gapped networks where certificate renewal is not feasible

## Related

- PR: [#3191](https://github.com/RocketChat/Rocket.Chat.Electron/pull/3191)
- Jira: [CORE-1363](https://rocketchat.atlassian.net/browse/CORE-1363)
