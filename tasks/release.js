'use strict';

const gulp = require('gulp');
const { build } = require('electron-builder');
const config = require('../electron-builder.json');
const { getEnvName } = require('./utils');

const publish = getEnvName() !== 'production' ? 'never' : 'onTagOrDraft';
gulp.task('release:darwin', () => build({ publish, x64: true, mac: [] }));
gulp.task('release:win32', () => build({ publish, x64: true, win: [ 'nsis', 'appx' ] }));
gulp.task('release:linux', (cb) => {
    build({ publish, x64: true, linux: [] })
        .then(() => build({ publish, ia32: true, linux: config.linux.target.filter(target => target !== 'snap') }))
        .then(() => cb(), (error) => cb(error));
});

gulp.task('release', [ 'build-app', `release:${ process.platform }` ]);
