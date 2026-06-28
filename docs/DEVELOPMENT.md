# Development Scripts

This document outlines the various development and testing scripts available in the `scripts/` directory.

## Testing Scripts (Linux)

This section contains automation scripts for testing Rocket.Chat Desktop on Linux.

### `install-volta.sh`

Installs Volta (JavaScript toolchain manager) if it's not already installed. Volta provides node.js and npm, which are required for building the project.

#### Usage

```bash
# Interactive mode (prompts before installing)
./scripts/install-volta.sh

# Non-interactive mode (installs automatically)
./scripts/install-volta.sh --non-interactive
```

#### What It Does

1. **Checks if Volta is installed**
   - Looks for `volta` command in PATH
   - Checks `$VOLTA_HOME` environment variable
   - Checks common installation location (`~/.volta/bin/volta`)

2. **Installs Volta if missing**
   - Downloads and runs the official Volta installer
   - Adds Volta to PATH for current session
   - Adds Volta to `~/.bashrc` for future sessions

3. **Verifies installation**
   - Checks that `volta` command is available
   - Displays Volta version

#### Features

- Can be sourced by other scripts to use its functions
- Non-interactive mode for CI/automation
- Automatically adds Volta to shell profile
- Safe to run multiple times (skips if already installed)

#### Requirements

- `curl` (for downloading Volta installer)
- Internet connection

### `linux-test-deb.sh`

Builds, installs, and runs the Rocket.Chat Desktop .deb package for testing purposes.

#### Usage

```bash
./scripts/linux-test-deb.sh [OPTIONS]
```

#### Options

- `--skip-build` - Skip building the .deb package (useful if you've already built it)
- `--skip-install` - Skip installing the .deb package (useful for testing installation separately)
- `--skip-run` - Skip running the installed app (useful if you just want to install)
- `--help`, `-h` - Show help message

#### Examples

Build, install, and run:
```bash
./scripts/linux-test-deb.sh
```

Skip build if .deb already exists:
```bash
./scripts/linux-test-deb.sh --skip-build
```

Only build and install, don't run:
```bash
./scripts/linux-test-deb.sh --skip-run
```

#### What It Does

1. **Builds the .deb package**
   - Runs `yarn build-linux` to build the app and create Linux packages
   - Outputs to `dist/` directory

2. **Finds the .deb file**
   - Searches for `dist/rocketchat-*-linux-*.deb`
   - Uses the first matching file found

3. **Installs the .deb package**
   - Uninstalls any previous version if present
   - Installs the new package using `dpkg -i`
   - Automatically fixes missing dependencies with `apt-get install -f`

4. **Runs the installed app**
   - Launches Rocket.Chat Desktop from `/opt/Rocket.Chat/rocketchat-desktop`
   - Runs in background and displays the process ID

#### Requirements

- Linux operating system
- `node.js` and `yarn` (or Volta - the script will install it automatically if needed)
- `dpkg` and `apt-get` (standard on Debian/Ubuntu systems)
- `curl` (for installing Volta if needed)
- Sudo access (for installation, if not running as root)

#### Automatic Dependency Installation

The script automatically installs missing dependencies:
- **Volta** (if node.js/yarn not found) - provides node.js and npm
- **binutils** (if `ar` command not found) - required for building .deb packages
- **Package dependencies** - automatically resolved during .deb installation

#### Output

The script provides color-coded output:
- 🔵 Blue: Informational messages
- 🟢 Green: Success messages
- 🟡 Yellow: Warnings
- 🔴 Red: Errors

#### Error Handling

The script will exit with a non-zero status code if any step fails. Common issues:

- **Build fails**: Check that all dependencies are installed (`yarn install`)
- **Install fails**: Ensure you have sudo access and the .deb file is valid
- **App not found**: The installation path may differ; check `/opt/Rocket.Chat/` or use `which rocketchat-desktop`

#### Notes

- The script automatically handles uninstalling previous versions
- Missing dependencies are automatically resolved during installation
- The app runs in the background; use `kill <PID>` to stop it
- This script is intended for development/testing purposes only


## MSI Test Suite — DISABLE_AUTO_UPDATES (PROD-595)

Validates that passing `DISABLE_AUTO_UPDATES=1` to the Rocket.Chat MSI installer correctly
writes `C:\Program Files\Rocket.Chat\resources\update.json` with `{"canUpdate":false,"autoUpdate":false}`.

### Prerequisites

- macOS host with `sshpass`, `ssh`, `scp` in PATH
- Windows 10 VM with OpenSSH on port 22. Configure `VM_HOST`, `VM_PORT`, `VM_USER`, and `VM_PASS` in your shell before running these scripts. Example:
  ```
  export VM_HOST=192.168.13.87 VM_USER=jean VM_PASS='<your password>'
  bash scripts/msi-test/run-msi-tests.sh
  ```
  Never commit `VM_PASS` to the repo.
- Built MSI artifact — e.g. `dist/rocketchat-4.14.0-win-x64.msi`
- VM must be running before you invoke the orchestrator
- If the VM is reprovisioned behind the same IP, delete `scripts/msi-test/.known_hosts` before running again.

### Files

| File | Runs on | Purpose |
|------|---------|---------|
| `run-msi-tests.sh` | macOS | Orchestrator: copy files, run PS1, report |
| `test-on-windows.ps1` | Windows VM | Three test scenarios |
| `fetch-logs.sh` | macOS | Pull results + install logs after a run |

### Scenarios

| Scenario | What it tests |
|----------|---------------|
| A — baseline | Plain install leaves `update.json` absent |
| B — DISABLE_AUTO_UPDATES=1 | Property written as current user context |
| C — SYSTEM context (SCCM sim) | Property written via PsExec -s (SYSTEM account) |

### Running

```bash
# Full run (copies an existing MSI, executes tests, prints summary)
MSI_PATH=dist/rocketchat-4.14.0-win-x64.msi ./scripts/msi-test/run-msi-tests.sh

# Or pass as argument
./scripts/msi-test/run-msi-tests.sh dist/rocketchat-4.14.0-win-x64.msi

# Fetch logs from a previous run without re-running tests
./scripts/msi-test/fetch-logs.sh
```

### VM not reachable?

The orchestrator will print a message with the Proxmox web UI URL if port 22 is closed.
Start the VM there, wait ~30 s, then retry.

### Results

- Live output printed to stdout during run
- `scripts/msi-test/logs/<timestamp>/test-results.json` — structured pass/fail per scenario
- `scripts/msi-test/logs/<timestamp>/install-*.log` — verbose MSI logs from each scenario
