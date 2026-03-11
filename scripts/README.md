# Testing Scripts

This directory contains automation scripts for testing Rocket.Chat Desktop on Linux.

## Scripts

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

