# Documentation index

Guides for Rocket.Chat Desktop. Start here; do not copy the longer
runbooks into other files — link them.

The latest **stable** Desktop release as of 2026-08-18 is **4.16.0**.
`package.json` on `dev` is **4.17.0-alpha.1**. Released code lives on
`master`. Electron is **42.5.0**.

## Getting started

| Doc | What it covers |
| --- | -------------- |
| [README.md](../README.md) | Platforms, download/install, default servers, overridden settings, [how updates work by install source](../README.md#how-updates-work-by-install-source) |
| [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) | Contributor setup (Node 24.11.1, Yarn 4.6), tests, local packaging, CLA |
| [AGENTS.md](../AGENTS.md) | Agent/contributor conventions (branch model, tests, UI, tagging). Do not duplicate it here. |
| [troubleshooting.md](./troubleshooting.md) | Log Viewer, Verbose logging, on-disk log paths, DevTools, `yarn start` inspector 9339 |
| [SECURITY.md](../SECURITY.md) | How to report security issues |

## Shipping

| Doc | What it covers |
| --- | -------------- |
| [development-and-release-flow.md](./development-and-release-flow.md) | Branch model, versioning, why `dev` / `master` / `release/X.Y.x` exist |
| [release-process.md](./release-process.md) | Operational runbook: alpha, stable promotion, patch tags (`yarn release:tag`) |
| [qa-alpha-update-testing.md](./qa-alpha-update-testing.md) | Manual check of `X.Y.Z-alpha.N` → `N+1` in-app updates |
| [RENEW_CI_CREDENTIALS.md](./RENEW_CI_CREDENTIALS.md) | Refreshing CI secrets used by release builds |
| [CHANGELOG.md](../CHANGELOG.md) | Historical notes through 3.7.3; 4.x notes are on GitHub Releases |

## Enterprise / IT

| Doc | What it covers |
| --- | -------------- |
| [enterprise-deployment.md](./enterprise-deployment.md) | MSI vs NSIS, `DISABLE_AUTO_UPDATES`, SCCM/Intune. Canonical MSI docs — do not clone. |
| [silent-installation.md](./silent-installation.md) | Unattended install commands per format (aligned with 4.16.0 / README) |
| [windows-default-app-associations.md](./windows-default-app-associations.md) | `tel:` / `callto:` default-handler rollout on Windows |
| [corporate-certificate-configuration.md](./corporate-certificate-configuration.md) | Internal CAs and system certificate trust |

## Linux

| Doc | What it covers |
| --- | -------------- |
| [linux-display-server.md](./linux-display-server.md) | Wayland vs X11 detection, wrapper script, package-type behavior |

## Video / screen share

| Doc | What it covers |
| --- | -------------- |
| [video-call-window-flow.md](./video-call-window-flow.md) | Video-call window lifecycle |
| [video-call-window-management.md](./video-call-window-management.md) | Window management for calls |
| [video-call-screen-sharing.md](./video-call-screen-sharing.md) | Screen-share path |
| [video-call-window-wgc-limitations.md](./video-call-window-wgc-limitations.md) | Windows Graphics Capture limits |
| [pexip-auth-credentials.md](./pexip-auth-credentials.md) | Pexip persistent-chat credentials |

## Internals / postmortems

| Doc | What it covers |
| --- | -------------- |
| [desktop-ui-guidelines.md](./desktop-ui-guidelines.md) | Titlebar/tab-bar tokens, Fuselage geometry, SVG pitfalls |
| [supported-versions-flow.md](./supported-versions-flow.md) | How the app loads and caches workspace supported-versions data |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Known upstream/Electron limitations |
| [COVERAGE.md](./COVERAGE.md) | Test-coverage measurement and history |
| [postmortem-supported-versions-race.md](./postmortem-supported-versions-race.md) | Supported-versions race |
| [postmortem-screen-picker-startup-enumeration.md](./postmortem-screen-picker-startup-enumeration.md) | Screen picker at startup |
| [postmortem-screen-picker-sandbox-detection.md](./postmortem-screen-picker-sandbox-detection.md) | Sandbox / portal detection |
| [postmortem-msi-disable-auto-updates.md](./postmortem-msi-disable-auto-updates.md) | MSI `DISABLE_AUTO_UPDATES` hardening |
| [linux-wayland-bug-postmortem.md](./linux-wayland-bug-postmortem.md) | Wayland / ozone crash path |

## QA

| Doc | What it covers |
| --- | -------------- |
| [qa/README.md](../qa/README.md) | QA pack layout and how to run flows |
| [qa/AGENTS.md](../qa/AGENTS.md) | Rules for authoring QA packs |
| [qa/flow-template.md](../qa/flow-template.md) | Flow table schema (Qase-compatible) |
| [qa-alpha-update-testing.md](./qa-alpha-update-testing.md) | Alpha-channel update pass (also listed under Shipping) |
