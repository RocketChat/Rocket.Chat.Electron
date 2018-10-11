'use strict';

const gulp = require('gulp');
const runSequence = require('run-sequence');
const { build } = require('electron-builder');
const config = require('../electron-builder.json');
const { getEnvName } = require('./utils');

const publish = getEnvName() !== 'production' ? 'never' : 'onTagOrDraft';
gulp.task('release:darwin', () => build({ publish, x64: true, mac: [] }));
gulp.task('release:win32', () => build({ publish, x64: true, ia32: true, win: ['nsis', 'appx'] }));
gulp.task('release:linux', async() => {
	const allLinuxTargetsButSnap = config.linux.target.filter((target) => target !== 'snap');
	await build({ publish, x64: true, linux: [], c: { productName: 'rocketchat' } });
	await build({ publish, ia32: true, linux: allLinuxTargetsButSnap, c: { productName: 'rocketchat' } });
});

gulp.task('release', (cb) => runSequence('build-app', `release:${ process.platform }`, cb));
