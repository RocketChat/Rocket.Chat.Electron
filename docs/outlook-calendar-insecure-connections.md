# Outlook Calendar: Allow Insecure Connections

## Overview

Air-gapped or corporate environments often use Exchange servers with self-signed or internal CA certificates that are not trusted by the system certificate store. The `allowInsecureOutlookConnections` setting allows the Outlook calendar sync to connect to these servers by bypassing SSL certificate validation.

> **Warning:** This setting disables TLS certificate verification for Outlook calendar sync requests. Only enable it when connecting to Exchange servers with known self-signed or internal CA certificates. Do not enable it in production environments with public-facing servers.

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
