# System CA Certificates

## Overview

Rocket.Chat Desktop automatically loads CA certificates from the operating system's trust store, allowing Node.js HTTPS connections to trust certificates installed by system administrators. This covers all outbound TLS connections from the main process, including Outlook calendar sync, supported version checks, and any other server communication.

This feature uses Node.js 24's native `tls.setDefaultCACertificates()` API with zero external dependencies.

## Default behavior

System CA certificates are **enabled by default**. No configuration is needed. The app combines OS-trusted certificates with the bundled Mozilla CA bundle at startup, before any HTTPS connections are made.

## When this helps

- Corporate environments with internal Certificate Authorities
- Exchange servers using certificates signed by an enterprise CA installed in the OS trust store
- Any environment where the IT department manages trusted certificates via Group Policy (Windows), Keychain (macOS), or `/etc/ssl` (Linux)

## How to disable

If system CA loading causes issues, it can be disabled via `overridden-settings.json`:

```json
{
  "useSystemCertificates": false
}
```

### File location by platform

| Platform | Path |
|----------|------|
| **Windows** | `%APPDATA%/Rocket.Chat/overridden-settings.json` |
| **macOS** | `~/Library/Application Support/Rocket.Chat/overridden-settings.json` |
| **Linux** | `~/.config/Rocket.Chat/overridden-settings.json` |

## Relationship with allowInsecureOutlookConnections

The [`allowInsecureOutlookConnections`](outlook-calendar-insecure-connections.md) setting disables all TLS certificate validation for Outlook sync. With system CA certificates enabled, this setting should no longer be necessary in most cases — if the Exchange server's CA is installed in the OS trust store, it will be trusted automatically.

Use `allowInsecureOutlookConnections` only as a last resort for truly self-signed certificates that are not installed in the OS trust store. If both settings are active, a warning will be logged suggesting the insecure bypass may be unnecessary.

## Troubleshooting

**Outlook sync still fails with certificate errors:**
1. Verify the CA certificate is installed in the OS trust store (not just the browser)
2. On Windows: check `certmgr.msc` > Trusted Root Certification Authorities
3. On macOS: check Keychain Access > System Roots / System
4. On Linux: check `/etc/ssl/certs/` or `/etc/pki/tls/certs/`
5. Check the app logs for `System CA certificates:` messages at startup

**App logs show "System CA certificates: failed to load":**
- The app falls back to bundled Mozilla CAs automatically
- This may happen on locked-down systems where the certificate store is not readable
- Use `allowInsecureOutlookConnections` as a fallback in this case

**App logs show "System CA certificates: none found in OS trust store":**
- The OS certificate store appears empty, which is unusual
- Verify the OS trust store has certificates installed
- The app continues with bundled Mozilla CAs
