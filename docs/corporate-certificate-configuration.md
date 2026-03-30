# Corporate Certificate Configuration

This guide covers how to configure Rocket.Chat Desktop for environments where Exchange or Rocket.Chat servers use certificates not trusted by default (internal CAs, self-signed certificates, etc.).

## Option 1: System CA Certificates (Recommended)

The app automatically loads CA certificates from the operating system's trust store at startup, combining them with the bundled Mozilla CA bundle. This covers all Node.js HTTPS connections from the main process, including Outlook calendar sync and supported version checks.

This feature uses Node.js 24's native `tls.setDefaultCACertificates()` API — available since the upgrade to Electron 40 (Node.js 24.5.0+) — with zero external dependencies.

### How it works

- **Enabled by default** — no configuration needed
- On startup, the app calls `tls.getCACertificates('system')` to read OS-trusted certificates
- These are combined with the bundled Mozilla CAs via `tls.setDefaultCACertificates()`
- All subsequent TLS connections automatically trust both system and bundled CAs

### When this helps

- Corporate environments with internal Certificate Authorities
- Exchange servers using certificates signed by an enterprise CA in the OS trust store
- Environments where IT manages certificates via Group Policy (Windows), Keychain (macOS), or `/etc/ssl` (Linux)

### How to disable

If system CA loading causes issues, add to `overridden-settings.json`:

```json
{
  "useSystemCertificates": false
}
```

### Troubleshooting

**Outlook sync still fails with certificate errors:**
1. Verify the CA certificate is installed in the OS trust store (not just the browser)
2. Windows: check `certmgr.msc` > Trusted Root Certification Authorities
3. macOS: check Keychain Access > System Roots / System
4. Linux: check `/etc/ssl/certs/` or `/etc/pki/tls/certs/`
5. Check app logs for `System CA certificates:` messages at startup

**App logs show "System CA certificates: failed to load":**
- The app falls back to bundled Mozilla CAs automatically
- This may happen on locked-down systems where the certificate store is not readable
- Use Option 2 below as a fallback

## Option 2: Allow Insecure Connections (Last Resort)

If your Exchange server uses a truly self-signed certificate that is not installed in the OS trust store, you can disable TLS certificate validation for Outlook calendar sync.

> **Warning:** This setting disables all TLS certificate verification for Outlook sync requests. Only use it when Option 1 cannot solve the problem.

Add to `overridden-settings.json`:

```json
{
  "allowInsecureOutlookConnections": true
}
```

This setting defaults to `false`. When both this and system CAs are active, a warning is logged suggesting the insecure bypass may be unnecessary.

## Configuration file locations

| Platform | Path |
|----------|------|
| **Windows** | `%APPDATA%/Rocket.Chat/overridden-settings.json` |
| **macOS** | `~/Library/Application Support/Rocket.Chat/overridden-settings.json` |
| **Linux** | `~/.config/Rocket.Chat/overridden-settings.json` |

Settings can also be placed at the app ASAR level (outside the app bundle) for system-wide deployment by administrators.

## Related

- PR: [#3191](https://github.com/RocketChat/Rocket.Chat.Electron/pull/3191) — `allowInsecureOutlookConnections`
- Jira: [CORE-1363](https://rocketchat.atlassian.net/browse/CORE-1363)
