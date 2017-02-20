# Rocket.Chat Desktop App [![Build Status](https://img.shields.io/travis/RocketChat/Rocket.Chat.Electron/master.svg)](https://travis-ci.org/RocketChat/Rocket.Chat.Electron) [![Build status](https://ci.appveyor.com/api/projects/status/k72eq3gm42wt4j8b?svg=true)](https://ci.appveyor.com/project/RocketChat/rocket-chat-electron) [![Project Dependencies](https://david-dm.org/RocketChat/Rocket.Chat.Electron.svg)](https://david-dm.org/RocketChat/Rocket.Chat.Electron) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/54ebf39732d14cb19a1a992b46bd0da6)](https://www.codacy.com/app/RocketChat/Rocket-Chat-Electron?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=RocketChat/Rocket.Chat.Electron&amp;utm_campaign=Badge_Grade)

Desktop application for [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) available for macOS, Windows and Linux using [Electron](http://electron.atom.io).

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

Now just clone and start the app:

```sh
git clone https://github.com/RocketChat/Rocket.Chat.Electron.git
cd Rocket.Chat.Electron
npm install
npm start
```

## Structure of the project

The sources is located in the `src` folder. Everything in this folder will be built automatically when running the app with `npm start`.

Stylesheets are written in `less` and are located in `src/stylesheets`. They will be build into a single `main.css` in the `app` folder.

The build process compiles all stuff from the `src` folder and puts it into the `app` folder, so after the build has finished, your `app` folder contains the full, runnable application.

## The build pipeline

Build process is founded upon [gulp](https://github.com/gulpjs/gulp) task runner and [rollup](https://github.com/rollup/rollup) bundler. There are two entry files for your code: `src/background.js` and `src/app.js`. Rollup will follow all `import` statements starting from those files and compile code of the whole dependency tree into one `.js` file for each entry point.


## Adding npm modules

Remember to respect the split between `dependencies` and `devDependencies` in `package.json` file. Only modules listed in `dependencies` will be included into distributable app.

Side note: If the module you want to use in your app is a native one (not pure JavaScript but compiled C code or something) you should first  run `npm install name_of_npm_module --save` and then `npm run postinstall` to rebuild the module for Electron. This needs to be done only once when you're first time installing the module. Later on postinstall script will fire automatically with every `npm install`.

## Working with modules

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

## Issues with Install

### node-gyp
Follow the installation instruction on [node-gyp readme](https://github.com/nodejs/node-gyp#installation).

#### Ubuntu Install
You will need to install:
```sh
build-essential
libevas-dev
libxss-dev
```
### Fedora Install
You will need to install:
```sh
libX11
libXScrnSaver-devel
gcc-c++
```

#### Windows 7
On Windows 7 you may have to follow option 2 of the [node-gyp install guide](https://github.com/nodejs/node-gyp#installation) and install Visual Studio

# Testing

## Unit tests

```
npm test
```

Using [electron-mocha](https://github.com/jprichardson/electron-mocha) test runner with the [chai](http://chaijs.com/api/assert/) assertion library. This task searches for all files in `src` directory which respect pattern `*.spec.js`.

## End to end tests

```
npm run e2e
```

Using [mocha](https://mochajs.org/) test runner and [spectron](http://electron.atom.io/spectron/). This task searches for all files in `e2e` directory which respect pattern `*.e2e.js`.

## Code coverage

```
npm run coverage
```

Using [istanbul](http://gotwarlost.github.io/istanbul/) code coverage tool.

You can set the reporter(s) by setting `ISTANBUL_REPORTERS` environment variable (defaults to `text-summary` and `html`). The report directory can be set with `ISTANBUL_REPORT_DIR` (defaults to `coverage`).

# Making a release

To package your app into an installer use command:

```
npm run release
```

It will start the packaging process for operating system you are running this command on. Ready for distribution file will be outputted to `dist` directory.

You can create Windows installer only when running on Windows, the same is true for Linux and macOS. So to generate all three installers you need all three operating systems.

All packaging actions are handled by [electron-builder](https://github.com/electron-userland/electron-builder). It has a lot of [customization options](https://github.com/electron-userland/electron-builder/wiki/Options), which you can declare under ["build" key in package.json file](https://github.com/szwacz/electron-boilerplate/blob/master/package.json#L2).

# Useful links

http://developerthing.blogspot.com.br/2017/01/awesome-electron.html

# License

Released under the MIT license.
