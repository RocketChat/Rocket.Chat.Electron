---
name: package-smoke
description: Run the installer smoke-test scripts (MSI on Windows VM, Linux AppImage/deb) against a built artifact and report a digest
disable-model-invocation: true
---

# Package Smoke

Run the packaged-installer smoke tests against a built artifact and
report a one-line verdict + verbatim error excerpt. Do NOT run these
directly with Bash — the underlying scripts are long-running/noisy
(builds, VM copy, install/uninstall cycles); dispatch through the
`watcher` agent and read its digest.

## Read fully first

- `scripts/README.md` — Linux script usage (`linux-test-deb.sh`;
  `linux-test-appimage.sh` is undocumented there, see below).
- `scripts/msi-test/README.md` — MSI suite scope, prerequisites, VM env
  vars, scenarios A/B/C.
- `scripts/msi-test/run-msi-tests.sh` — real orchestrator args/env.
- `scripts/msi-test/test-on-windows.ps1` — what each scenario asserts.
- `scripts/msi-test/fetch-logs.sh` — log-only re-fetch without re-running.
- `scripts/linux-test-appimage.sh` — real flags (source has no header
  doc; flags below are read from the script itself).
- `scripts/linux-test-deb.sh` — real flags (documented in
  `scripts/README.md`).

## When NOT to use

- Unit/integration tests (`yarn test`) — not this skill, no artifact
  involved.
- Browser/web-client testing — out of scope, this is desktop-installer
  only.
- Verifying UI rendering/behavior inside a running app — use
  `dev-app-verify` or the `mosdat-testing` skill instead; this skill
  only proves an installer artifact installs and launches.
- No built artifact exists yet — build first (`yarn build` +
  `electron-builder`, or let `linux-test-appimage.sh` /
  `linux-test-deb.sh` build it via their default no-`--skip-build` path).

## Steps

### 1. Resolve the artifact

Take the artifact path as an argument, or find the newest in `dist/`:

```bash
ls -t dist/*.msi dist/*.exe dist/*.AppImage dist/*.deb 2>/dev/null | head -1
```

### 2. Map extension to script and platform

| Extension   | Script                                                                         | Runs on                                        |
| ----------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| `.msi`      | `scripts/msi-test/run-msi-tests.sh`                                            | macOS host, orchestrates a Windows VM over SSH |
| `.exe`      | n/a — the MSI suite only tests `.msi`; no smoke script covers NSIS `.exe` here | —                                              |
| `.AppImage` | `scripts/linux-test-appimage.sh`                                               | Linux only (`OSTYPE` guard exits non-Linux)    |
| `.deb`      | `scripts/linux-test-deb.sh`                                                    | Linux only, needs `dpkg`/`apt-get`             |

### 3. Check prerequisites for the mapped script

**MSI** (`run-msi-tests.sh`):

- Runs from a macOS/Linux host with `sshpass`, `ssh`, `scp` in `PATH`.
- Requires a reachable Windows 10 VM with OpenSSH on port 22 and env
  vars `VM_HOST`, `VM_PORT` (default 22), `VM_USER`, `VM_PASS` set
  (`VM_PASS` is required, no default — export it, never commit it).
- If the VM was reprovisioned behind the same IP, delete
  `scripts/msi-test/.known_hosts` first.
- The script auto-picks the newest `dist/*.msi` by mtime if `MSI_PATH`
  is unset and no path argument is given.
- Invocation: `MSI_PATH=<path> ./scripts/msi-test/run-msi-tests.sh` or
  `./scripts/msi-test/run-msi-tests.sh <path>`.
- If the VM is unreachable, the script prints the Proxmox web UI URL —
  start the VM there, wait ~30s, retry. Prefer the `mosdat-testing`
  skill instead when the task is "does this build actually work on a
  real machine" — it owns the Proxmox-hosted VM lifecycle end-to-end
  (build→deploy→run→verdict); use `package-smoke`'s MSI path only for
  this specific `DISABLE_AUTO_UPDATES` install-log scenario suite.

**AppImage** (`linux-test-appimage.sh`):

- Linux host only (hard-fails on non-`linux-gnu` `OSTYPE`).
- Flags: `--skip-build`, `--skip-install` (chmod +x step),
  `--skip-run`, `--help`/`-h`.
- With no flags: builds via `yarn build` + `electron-builder --publish
never --linux AppImage`, finds `dist/rocketchat-*-linux-*.AppImage`,
  chmods it, launches it in the background, logs to
  `/tmp/rocketchat-appimage.log`.

**deb** (`linux-test-deb.sh`):

- Linux host only, needs `dpkg`, `apt-get`, sudo access for install.
- Flags: `--skip-build`, `--skip-install`, `--skip-run`, `--help`/`-h`.
- With no flags: `yarn build-linux`, finds
  `dist/rocketchat-*-linux-*.deb`, installs via `dpkg -i` (auto-fixes
  deps with `apt-get install -f`), launches
  `/opt/Rocket.Chat/rocketchat-desktop` in background.

If the required host/VM/env var is missing, stop and report
**UNVERIFIED** with exactly what's missing — do not guess credentials
or fake a VM.

### 4. Run through `watcher`

Dispatch the resolved command to the `watcher` agent (long-running,
noisy — never stream this into your own context):

```bash
# MSI example
MSI_PATH=dist/rocketchat-4.14.0-win-x64.msi ./scripts/msi-test/run-msi-tests.sh

# AppImage example
./scripts/linux-test-appimage.sh --skip-build

# deb example
./scripts/linux-test-deb.sh --skip-build
```

For MSI, the watcher should also report the structured result at
`scripts/msi-test/logs/<timestamp>/test-results.json` (per-scenario
pass/fail) and note `scripts/msi-test/fetch-logs.sh` as the way to
re-pull logs without re-running if the digest needs more detail.

### 5. Report

One-line verdict (`PASS` / `FAIL` / `UNVERIFIED` + reason) plus a
verbatim excerpt of any error line from the watcher's digest — never a
paraphrase, per AGENTS.md Writing rules (no invented metrics).
