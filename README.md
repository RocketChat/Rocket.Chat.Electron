# Rocket.Chat Desktop App

[![Latest release](https://img.shields.io/github/v/release/RocketChat/Rocket.Chat.Electron)](https://github.com/RocketChat/Rocket.Chat.Electron/releases/latest)
![Project Dependencies](https://img.shields.io/librariesio/github/RocketChat/Rocket.Chat.Electron)
[![GitHub All Releases](https://img.shields.io/github/downloads/RocketChat/Rocket.Chat.Electron/total.svg)](https://github.com/RocketChat/Rocket.Chat.Electron/releases/latest)
![GitHub](https://img.shields.io/github/license/RocketChat/Rocket.Chat.Electron.svg)

Desktop application for [Rocket.Chat][] available for macOS, Windows and Linux
using [Electron][].

![Rocket.Chat Desktop App](https://user-images.githubusercontent.com/2263066/91490997-c0bd0c80-e889-11ea-92c7-2cbcc3aabc98.png)

---

## Supported Platforms

| Platform | Minimum Version             | Architectures                   | Formats                          |
| -------- | --------------------------- | ------------------------------- | -------------------------------- |
| Windows  | 10                          | x64, ia32, arm64                | NSIS, MSI                        |
| macOS    | 12 (Monterey)               | Universal (x64 + Apple Silicon) | DMG, PKG, ZIP                    |
| Linux    | Ubuntu 22.04+ or equivalent | x64                             | AppImage, deb, rpm, snap, tar.gz |

4.16.0 also ships a **Mac App Store** (MAS) package and a **Microsoft
Store** AppX (the GitHub release attaches `*-mas.pkg` and `*.appx`; those
builds still update only through the stores). There is **no published
Flatpak** (Flatpak remains an electron-builder target only). Linux GitHub
assets are **amd64 / x86_64 only**. See [docs/README.md][] for the full
documentation index.

---

## How updates work by install source

In-app auto-update (`electron-updater`) is allowed only when
`(linux && APPIMAGE) || (win32 && !windowsStore) || (darwin && !mas)`
(`src/updates/main.ts`). Everything else is store- or IT-managed.

| Install source | How it updates |
| -------------- | -------------- |
| GitHub **NSIS** / **MSI** / **DMG** / **PKG** / **AppImage** | In-app **electron-updater** (GitHub Releases) |
| **Mac App Store** (MAS) | Mac App Store only |
| **Microsoft Store** (AppX) | Microsoft Store only |
| **Snap** | Snap store |
| **deb** / **rpm** | Distro packages or IT-managed rollout |

Enterprise MSI installs can turn off in-app updates with
`DISABLE_AUTO_UPDATES=1`, which writes `resources/update.json` with
`canUpdate: false` (and `autoUpdate: false`). NSIS `/disableAutoUpdates`
writes the same file. See [docs/enterprise-deployment.md][] — do not
duplicate that runbook here.

---

## Engage with us

### Share your story

We'd love to hear about [your experience][] and potentially feature it on our
[Blog][].

### Subscribe for Updates

Once a month our marketing team releases an email update with news about product
releases, company related topics, events and use cases. [Sign Up!][]

---

## Download

You can download the latest version from the [Releases][] page.

<p>
  <a href="https://apps.microsoft.com/detail/9nblggh52jv6"><img src="https://get.microsoft.com/images/en-us%20dark.svg" alt="Get it from Microsoft Store" height="50"/></a>&nbsp;&nbsp;<a href="https://apps.apple.com/app/rocket-chat/id1086818840"><img src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-mac-app-store/black/en-us" alt="Download on the Mac App Store" height="50"/></a>&nbsp;&nbsp;<a href="https://snapcraft.io/rocketchat-desktop"><img src="https://snapcraft.io/static/images/badges/en/snap-store-black.svg" alt="Get it from the Snap Store" height="50"/></a>
</p>

## Install

Launch the installer and follow the instructions to install.

### Windows Options

On Windows you can run a silent install by adding the `/S` flag. You can also
add the options below:

- `/S` - Silent install
- `/allusers` - Install for all users (requires admin)
- `/currentuser` - Install only for the current user (default)
- `/disableAutoUpdates` - Disable automatic updates

## Development

### Quick start

Prerequisites:

- [Git](http://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js](https://nodejs.org) **24.11.1** (see [.github/CONTRIBUTING.md][])
- [Yarn](https://yarnpkg.com/) **4.6**

Now just clone and start the app:

```sh
git clone https://github.com/RocketChat/Rocket.Chat.Electron.git
cd Rocket.Chat.Electron
yarn
yarn start
```

### Structure of the project

The source is located in the `src` folder. Everything in this folder will be
built automatically when running the app with `yarn start`.

The build process compiles all stuff from the `src` folder and puts it into the
`app` folder, so after the build has finished, your `app` folder contains the
full, runnable application.

### TypeScript

Following the [ongoing changes in Rocket.Chat codebase][], the app was
rewritten in TypeScript 5 to address issues regarding maintainability.

### The build pipeline

The build process is founded upon [rollup][] bundler. There are three entry files
for your code:

- `src/main.ts`, the script running at the main Electron process, orchestrating
  the whole application;

- `src/rootWindow.ts`, the script that renders the UI of the _root window_, the
  app's main window;

- and `src/preload.ts`, which runs in a privileged mode to connect the app and
  the webviews rendering Rocket.Chat's web client.

#### Adding Node.js modules

Remember to respect the split between `dependencies` and `devDependencies` in
`package.json` file. Only modules listed in `dependencies` will be included into
distributable app.

### Troubleshooting

User-facing logs and the in-app viewer:
[docs/troubleshooting.md](docs/troubleshooting.md)
(**Help → Open Log Viewer**, Settings → Advanced → Verbose logging,
on-disk paths, DevTools, `yarn start` inspector on port 9339).

#### Ubuntu/Debian

You may need to install the following packages for development:

```sh
sudo apt install build-essential libxss-dev
```

#### Fedora/RHEL

You may need to install the following packages for development:

```sh
sudo dnf install libX11-devel libXScrnSaver-devel gcc-c++
```

### Testing

#### Unit tests

```sh
yarn test
```

We use [Jest][] testing framework with the [Jest electron runner][]. Spec
placement is path-sensitive (nested `*.spec.ts`; `*.main.spec.ts` for
main) — see [.github/CONTRIBUTING.md][].

### Making a release

**Do not run `yarn release`.** Official Desktop releases are tag-driven
and documented in [docs/release-process.md][] (`yarn release:tag`, then
CI on the tag). `yarn release` in `package.json` is
`electron-builder --publish onTagOrDraft` and is not the shipping path.

For a **local** installer on the machine you are developing on:

```sh
yarn build-mac    # or yarn build-win / yarn build-linux
```

Those scripts run `electron-builder --publish never` and write packages
to `dist`. That is local packaging only — it does not publish a GitHub
release. Packaging is handled by [electron-builder][]; see its
[customization options][].

## Development and Releases

All pull requests target `dev`; `master` contains only released code, and
`release/X.Y.x` branches carry patch releases for a shipped version.
Releases are tag-driven — pushing a semver tag triggers CI to build every
platform and draft a GitHub release, which a human then reviews and
publishes.

- [docs/README.md][] — grouped documentation index.
- [docs/development-and-release-flow.md][] — conceptual overview of the
  branch model, versioning, and CI/CD.
- [docs/release-process.md][] — operational runbook with the exact commands
  for cutting alpha, stable, and patch releases.
- [.github/CONTRIBUTING.md][] — contribution guidelines, including which
  branch to target.

## Default servers

The `servers.json` file will define what servers the client will connect to and
will populate the server list in the sidebar. It contains a list of default
servers which will be added the first time the user runs the app (or when all
servers are removed from the list).
The file syntax is as follows:

```json
{
  "Demo Rocket Chat": "https://demo.rocket.chat",
  "Open Rocket Chat": "https://open.rocket.chat"
}
```

### Pre-Release Configuration

You can bundle a `servers.json` with the install package, the file should be
located in the root of the project application (same level as the
`package.json`). If the file is found, the initial "Connect to server" screen
will be skipped and it will attempt to connect to the first server in the array
that has been defined and drop the user right at the login screen. Note that the
`servers.json` will only be checked if no other servers have already been added,
even if you uninstall the app without removing older preferences, it will not be
triggered again.

### Post-Install Configuration

If you can't (or don't want to) bundle the file inside the app, you can create a
`servers.json` in the user preferences folder which will overwrite the packaged
one. The file should be located in the `%APPDATA%/Rocket.Chat/` folder or the
installation folder in case of an installation for all users (Windows only).

For Windows, the full paths are:

- `~\Users\<username>\AppData\Roaming\Rocket.Chat\`
- `~\Program Files\Rocket.Chat\Resources\`

On macOS, the full path is:

- `~/Users/<username>/Library/Application Support/Rocket.Chat/`
- `/Library/Preferences/Rocket.Chat/`

On Linux, the full paths are:

- `/home/<username>/.config/Rocket.Chat/`
- `/opt/Rocket.Chat/resources/`

### Overridden settings

You can override the user settings by creating an `overridden-settings.json` in
the user preferences folder.
The file should be located in the `%APPDATA%/Rocket.Chat/` folder or the
installation folder in case of an installation for all users (Windows only).

Every setting set on the file will override the default and user settings. Then
you can use it for disabling the default features like auto-update and even create
a single server mode.

#### The settings that can be overridden are:

| Setting                                    | Description                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `"isReportEnabled": true`                  | Sets if the bugs will be reported to developers.                                                       |
| `"isInternalVideoChatWindowEnabled": true` | Sets if video calls will be opened in an internal window.                                              |
| `"isFlashFrameEnabled": true`              | Sets if the flash frame will be enabled.                                                               |
| `"isMinimizeOnCloseEnabled": false`        | Sets if the app will be minimized on close.                                                            |
| `"doCheckForUpdatesOnStartup": true`       | Sets if the app will check for updates on startup.                                                     |
| `"isMenuBarEnabled": false`                | Windows/Linux: `true` keeps the menu bar always visible; `false` auto-hides it (Alt shows it temporarily). Unused on macOS. |
| `"isTrayIconEnabled": true`                | Enables Tray Icon, the app will be hidden to the tray on close. Overrides `"isMinimizeOnCloseEnabled"` |
| `"isUpdatingEnabled": true`                | Sets if the app can be updated by the user.                                                            |
| `"isAddNewServersEnabled": true`           | Sets if the user can add new servers.                                                                  |

##### Single server mode

If the setting `"isAddNewServersEnabled": false` is set, the user will not be able to add new servers.
The buttons and shortcuts will be disabled. Then you will have to add the server to the `servers.json` file.
With this, you can create a single server mode or just don't let the user add new servers on their own.

##### Example configuration

`overridden-settings.json` file:

```json
{
  "isTrayIconEnabled": false,
  "isMinimizeOnCloseEnabled": false
}
```

If `isTrayIconEnabled` is enabled, the app will be hidden on close.
If `isMinimizeOnCloseEnabled` is enabled, the app will be minimized on close.
With both disabled, the app will quit on close.

## License

Released under the MIT license.

[Rocket.Chat]: https://rocket.chat
[Electron]: https://electronjs.org/
[your experience]: https://survey.zohopublic.com/zs/e4BUFG
[Blog]: https://rocket.chat/case-studies/?utm_source=github&utm_medium=readme&utm_campaign=community
[Sign Up!]: https://rocket.chat/newsletter/?utm_source=github&utm_medium=readme&utm_campaign=community
[Releases]: https://github.com/RocketChat/Rocket.Chat.Electron/releases/latest
[ongoing changes in Rocket.Chat codebase]: https://forums.rocket.chat/t/moving-away-from-meteor-and-beyond/3270
[rollup]: https://github.com/rollup/rollup
[Jest]: https://jestjs.io/
[Jest electron runner]: https://github.com/kayahr/jest-electron-runner
[electron-builder]: https://github.com/electron-userland/electron-builder
[customization options]: https://www.electron.build/configuration
[docs/README.md]: docs/README.md
[docs/development-and-release-flow.md]: docs/development-and-release-flow.md
[docs/release-process.md]: docs/release-process.md
[docs/enterprise-deployment.md]: docs/enterprise-deployment.md
[.github/CONTRIBUTING.md]: .github/CONTRIBUTING.md
