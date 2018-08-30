Rocket.Chat Desktop App [![Build Status](https://img.shields.io/travis/RocketChat/Rocket.Chat.Electron/master.svg)](https://travis-ci.org/RocketChat/Rocket.Chat.Electron) [![Build status](https://ci.appveyor.com/api/projects/status/k72eq3gm42wt4j8b/branch/master?svg=true)](https://ci.appveyor.com/project/RocketChat/rocket-chat-electron) [![Project Dependencies](https://david-dm.org/RocketChat/Rocket.Chat.Electron.svg)](https://david-dm.org/RocketChat/Rocket.Chat.Electron) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/54ebf39732d14cb19a1a992b46bd0da6)](https://www.codacy.com/app/RocketChat/Rocket-Chat-Electron?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=RocketChat/Rocket.Chat.Electron&amp;utm_campaign=Badge_Grade)
===============================================================================

Desktop application for [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) available for macOS, Windows and Linux using [Electron](https://electronjs.org/).


# Download

You can download the latest version from the [Releases](https://github.com/RocketChat/Rocket.Chat.Electron/releases/latest) page.


# Install

Launch the installer and follow the instructions to install.

## Windows Options

On Windows you can run a silent install by adding the `/S` flag. You can also add the options below:

- `/S` - Silent install
- `/allusers` - Install for all users (requires admin)
- `/currentuser` - Install for current user only (default)

# Development

## Quick start

Prerequisites:

* [Git](http://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
* [Node.js](https://nodejs.org)
* [node-gyp](https://github.com/nodejs/node-gyp#installation)
* [Yarn](http://yarnpkg.com/) is recommended instead of npm.

Now just clone and start the app:

```sh
git clone https://github.com/RocketChat/Rocket.Chat.Electron.git
cd Rocket.Chat.Electron
yarn
yarn start
```

## Structure of the project

The sources is located in the `src` folder. Everything in this folder will be built automatically when running the app with `yarn start`.

Stylesheets are written in `less` and are located in `src/stylesheets`. They will be build into a single `main.css` in the `app` folder.

The build process compiles all stuff from the `src` folder and puts it into the `app` folder, so after the build has finished, your `app` folder contains the full, runnable application.

## The build pipeline

Build process is founded upon [gulp](https://github.com/gulpjs/gulp) task runner and [rollup](https://github.com/rollup/rollup) bundler. There are two entry files for your code: `src/background.js` and `src/app.js`. Rollup will follow all `import` statements starting from those files and compile code of the whole dependency tree into one `.js` file for each entry point.


### Adding node modules

Remember to respect the split between `dependencies` and `devDependencies` in `package.json` file. Only modules listed in `dependencies` will be included into distributable app.


### Working with modules

Thanks to [rollup](https://github.com/rollup/rollup) you can (and should) use ES6 modules for most code in `src` folder.

Use ES6 syntax in the `src` folder like this:
```js
import myStuff from './my_lib/my_stuff';
```

The exception is in `src/public`. ES6 will work inside this folder, but it is limited to what Electron/Chromium supports. The key thing to note is that you cannot use `import` and `export` statements. Imports and exports need to be done using CommonJS syntax:

```js
const myStuff = require('./my_lib/my_stuff');
const { myFunction } =  require('./App');
```


## Troubleshooting

### node-gyp

Follow the installation instruction on [node-gyp readme](https://github.com/nodejs/node-gyp#installation).


### Ubuntu

You will need to install the following packages:

```sh
build-essential
libevas-dev
libxss-dev
```


### Fedora

You will need to install the following packages:

```sh
libX11
libXScrnSaver-devel
gcc-c++
```


### Windows 7

On Windows 7 you may have to follow option 2 of the [node-gyp install guide](https://github.com/nodejs/node-gyp#installation) and install Visual Studio


## Testing

### Unit tests

```
yarn test
```

Using [electron-mocha](https://github.com/jprichardson/electron-mocha) test runner with the [chai](http://chaijs.com/api/assert/) assertion library. This task searches for all files in `src` directory which respect pattern `*.spec.js`.


### End to end tests

```
yarn e2e
```

Using [mocha](https://mochajs.org/) test runner and [spectron](http://electron.atom.io/spectron/). This task searches for all files in `e2e` directory which respect pattern `*.e2e.js`.


### Code coverage

```
yarn coverage
```

Using [istanbul](http://gotwarlost.github.io/istanbul/) code coverage tool.

You can set the reporter(s) by setting `ISTANBUL_REPORTERS` environment variable (defaults to `text-summary` and `html`). The report directory can be set with `ISTANBUL_REPORT_DIR` (defaults to `coverage`).


## Making a release

To package your app into an installer use command:

```
yarn release
```

It will start the packaging process for operating system you are running this command on. Ready for distribution file will be outputted to `dist` directory.

All packaging actions are handled by [electron-builder](https://github.com/electron-userland/electron-builder). It has a lot of [customization options](https://github.com/electron-userland/electron-builder/wiki/Options), which you can declare under ["build" key in package.json file](https://github.com/szwacz/electron-boilerplate/blob/master/package.json#L2).


# Default servers

The `servers.json` file will define what servers the client will connect to and will populate the server list in the sidebar, it contains a list of default servers which will be added the first time the user runs the app (or when all servers are removed from the list).
The file syntax is as follows:
```
{
  "Demo Rocket Chat": "https://demo.rocket.chat",
  "Open Rocket Chat": "https://open.rocket.chat"
}
```


## Pre-Release Configuration

You can bundle a `servers.json` with the install package, the file should be located in the root of the project application (same level as the `package.json`). If the file is found, the initial "Connect to server" screen will be skipped and it will attempt to connect to the first server in the array that has been defined and drop the user right at the login screen. Note that the `servers.json` will only be checked if no other servers have already be added, even if you uninstall the app without removing older preferences, it will not be triggered again.


## Post-Install Configuration

If you can't (or don't want to) bundle the file inside the app, you can create a `servers.json` in the user preferences folder which will overwrite the packaged one. The file should be located in the `%APPDATA%/Rocket.Chat/` folder or the installation folder in case of a installation for all users (Windows only).

For Windows the full paths are:

```
~\Users\<username>\AppData\Roaming\Rocket.Chat\
~\Program Files\Rocket.Chat\Resources\
```

On MacOS the full path is:

```
~/Users/<username>/Library/Application Support/Rocket.Chat/
~/Applications/Rocket.Chat.app/Contents/Resources/
```

On Linux the full path is:

```
/home/<username>/.config/Rocket.Chat/
/opt/Rocket.Chat/resources/
```


# License

Released under the MIT license.
