'use strict';

const gulp = require('gulp');
const runSequence = require('run-sequence');
const { build } = require('electron-builder');
const config = require('../electron-builder.json');
const { getEnvName } = require('./utils');

const publish = getEnvName() !== 'production' ? 'never' : 'onTagOrDraft';
gulp.task('release:darwin', () => build({ publish, x64: true, mac: [] }));
gulp.task('release:win32', () => build({ publish, x64: true, ia32: true, win: [ 'nsis', 'appx' ] }));
gulp.task('release:linux', (cb) => {
    build({ publish, x64: true, linux: [], c: { productName: 'rocketchat' } })
        .then(() => build({
            publish,
            ia32: true,
            linux: config.linux.target.filter(target => target !== 'snap'),
            c: { productName: 'rocketchat' }
        }))
        .then(() => cb(), (error) => cb(error));
});

gulp.task('release', (cb) => runSequence('build-app', `release:${ process.platform }`, cb));
