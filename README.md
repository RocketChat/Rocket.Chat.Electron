# Rocket.Chat Desktop App

[![Latest release](https://img.shields.io/github/v/release/RocketChat/Rocket.Chat.Electron)](https://github.com/RocketChat/Rocket.Chat.Electron/releases/latest)
[![Total downloads](https://img.shields.io/github/downloads/RocketChat/Rocket.Chat.Electron/total.svg)](https://github.com/RocketChat/Rocket.Chat.Electron/releases)
![Dependencies](https://img.shields.io/librariesio/github/RocketChat/Rocket.Chat.Electron)
[![License](https://img.shields.io/github/license/RocketChat/Rocket.Chat.Electron.svg)](LICENSE)

The official desktop app for [Rocket.Chat](https://www.rocket.chat) on Windows, macOS, and Linux, built with [Electron](https://www.electronjs.org/).

The desktop app gives you everything in the Rocket.Chat web client, plus:

- **Multiple workspaces in one window:** Add all your Rocket.Chat workspaces to the sidebar and switch between them.
- **Native notifications:** Get system notifications with inline quick reply on Windows and macOS.
- **Runs in the background:** Keep the app in the system tray or minimized so you never miss a message.
- **Built-in video call window:** Open calls in an app window instead of a browser tab.
- **Centrally managed settings:** IT teams can preset workspaces, lock settings, and install silently at scale.

![Rocket.Chat Desktop App](https://user-images.githubusercontent.com/2263066/91490997-c0bd0c80-e889-11ea-92c7-2cbcc3aabc98.png)

## Contents

- [Download and install](#download-and-install)
- [Configure the app for your organization](#configure-the-app-for-your-organization)
- [Develop](#develop)
- [Branches and releases](#branches-and-releases)
- [Contribute](#contribute)
- [Get help](#get-help)
- [License](#license)

## Download and install

Get the app from your platform's store:

<p>
  <a href="https://apps.microsoft.com/detail/9nblggh52jv6"><img src="https://get.microsoft.com/images/en-us%20dark.svg" alt="Get it from Microsoft Store" height="50"/></a>&nbsp;&nbsp;<a href="https://apps.apple.com/app/rocket-chat/id1086818840"><img src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-mac-app-store/black/en-us" alt="Download on the Mac App Store" height="50"/></a>&nbsp;&nbsp;<a href="https://snapcraft.io/rocketchat-desktop"><img src="https://snapcraft.io/static/images/badges/en/snap-store-black.svg" alt="Get it from the Snap Store" height="50"/></a>
</p>

You can also download an installer from the [latest release](https://github.com/RocketChat/Rocket.Chat.Electron/releases/latest).

| Platform | Minimum version             | Architectures                   | Formats                          |
| -------- | --------------------------- | ------------------------------- | -------------------------------- |
| Windows  | 10                          | x64, ia32, arm64                | NSIS (.exe), MSI                 |
| macOS    | 12 (Monterey)               | Universal (x64 + Apple Silicon) | DMG, PKG, ZIP                    |
| Linux    | Ubuntu 22.04 or equivalent  | x64                             | AppImage, deb, rpm, snap, tar.gz |

For step-by-step instructions, see [Install desktop and mobile apps](https://docs.rocket.chat/docs/desktop-mobile-apps).

### Silent installation

To deploy the app across many machines without user prompts, use the NSIS or MSI installer on Windows, the PKG installer on macOS, or the deb package on Linux. For example, on Windows:

```sh
rocketchat-<version>-win.exe /S /allusers /disableAutoUpdates
```

For every installer option, see [Silent installation for desktop app](https://docs.rocket.chat/docs/desktop-mobile-apps#silent-installation-for-desktop-app).

## Configure the app for your organization

Admins can control how the app behaves on every device with two JSON files:

- **`servers.json`:** Presets the workspaces that appear in the sidebar the first time a user opens the app. When you bundle it with the installer, users skip the **Connect to server** screen and go straight to the login screen.
- **`overridden-settings.json`:** Enforces settings such as disabling auto-update, hiding the tray icon, or turning off quick reply in notifications. Combine `"isAddNewServersEnabled": false` with `servers.json` to lock users to a single workspace.

For file locations on each operating system and the full list of settings, see [Preset workspaces](https://docs.rocket.chat/docs/desktop-mobile-apps#preset-workspaces-in-rocketchat-desktop) and [Override settings](https://docs.rocket.chat/docs/desktop-mobile-apps#override-settings-in-rocketchat-desktop).

## Develop

### Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js](https://nodejs.org) 22.0.0 or later
- [Yarn](https://yarnpkg.com/) 4.0.2 or later

On Linux, you also need these system packages:

```sh
# Ubuntu/Debian
sudo apt install build-essential libxss-dev

# Fedora/RHEL
sudo dnf install libX11-devel libXScrnSaver-devel gcc-c++
```

### Quick start

```sh
git clone https://github.com/RocketChat/Rocket.Chat.Electron.git
cd Rocket.Chat.Electron
yarn
yarn start
```

`yarn start` builds the app and watches for changes.

### Project structure

The app is written in TypeScript. The source lives in `src`, and the build compiles it into `app`, which then contains the full, runnable application.

The build uses the [Rollup](https://rollupjs.org/) bundler and has three entry points:

| File                | Runs in                  | Purpose                                                              |
| ------------------- | ------------------------ | -------------------------------------------------------------------- |
| `src/main.ts`       | Electron main process    | Orchestrates the whole application.                                  |
| `src/rootWindow.ts` | Root window              | Renders the UI of the app's main window.                             |
| `src/preload.ts`    | Privileged preload layer | Connects the app to the webviews that render the Rocket.Chat client. |

> [!IMPORTANT]
> Only modules listed in `dependencies` in `package.json` are included in the distributable app. Put build and test tools in `devDependencies`.

### Lint and test

```sh
yarn lint   # ESLint and TypeScript checks
yarn test   # Unit tests
```

Tests use [Jest](https://jestjs.io/) with the [Jest Electron runner](https://github.com/kayahr/jest-electron-runner). Jest picks up every file in `src` that matches `*.(spec|test).{js,ts,tsx}`.

### Package the app

```sh
yarn release
```

This packages the app for the operating system you run it on and writes the installers to `dist`. Packaging is handled by [electron-builder](https://github.com/electron-userland/electron-builder). See its [configuration options](https://www.electron.build/configuration) to customize the output.

## Branches and releases

- Pull requests target `dev`, the default branch.
- `master` holds only released code. Its tip is always the latest stable release.
- `release/X.Y.x` branches carry patch releases for a shipped version and merge into `master` after each patch.

Releases are tag-driven. Pushing a semver tag triggers CI to build every platform and create a draft GitHub release, which a maintainer reviews and publishes.

- [Development and release flow](docs/development-and-release-flow.md): The branch model, versioning, and CI/CD.
- [Release process](docs/release-process.md): The exact commands for alpha, stable, and patch releases.

## Contribute

We welcome contributions. Before you open a pull request:

1. Read the [contribution guidelines](.github/CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).
2. For a new feature or a larger change, open an issue first so we can discuss it.
3. Run `yarn lint` and `yarn test`, and make sure both pass.

**Found a bug?** [Open an issue](https://github.com/RocketChat/Rocket.Chat.Electron/issues) with your app version, operating system, and steps to reproduce it.

**Found a security issue?** Don't open a public issue. Email security@rocket.chat instead. See [SECURITY.md](SECURITY.md).

## Get help

- **Documentation:** [Rocket.Chat docs](https://docs.rocket.chat) and [developer guides](https://developer.rocket.chat/docs/desktop-app)
- **Community:** Ask in [#support](https://open.rocket.chat/channel/support) on our community server or on the [forums](https://forums.rocket.chat)
- **Customers:** Contact the [support desk](https://desk.rocket.chat)
- **Main project:** [RocketChat/Rocket.Chat](https://github.com/RocketChat/Rocket.Chat)

## License

Released under the [MIT license](LICENSE).
