# Security policy

## Reporting a vulnerability

Report security issues to **security@rocket.chat**.

Do **not** open a public GitHub issue until a fix exists. We assess the
risk and make a fix available before creating a public issue.

Thank you for your contribution.

## Supported Desktop versions

Security reports are accepted for:

- The last N stable Desktop **minor** lines — the current stable line
  (4.16.x as of 2026-08-18) and any still-maintained `release/X.Y.x`
  patch lines
- The **current alpha** on `dev` (`4.17.0-alpha.x` as of 2026-08-18)

Older Desktop minors that are no longer receiving patches are out of
scope.

## Server compatibility

The Desktop app does not pin a single Rocket.Chat **server** version.
Compatibility is that of the **connected workspace**: the app loads that
workspace's web client. When reporting, include both the Desktop version
and the workspace/server version (`<workspace>/api/info`).
