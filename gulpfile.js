const { spawn } = require('child_process');

const electron = require('electron');
const { build } = require('electron-builder');
const { parallel, series, task } = require('gulp');

require('./tasks');

const NODE_ENV = process.env.NODE_ENV || 'development';

task('start:electron', () => spawn(electron, [__dirname], { stdio: 'inherit', shell: true }));

task('start', series('build', parallel('watch', 'start:electron')));

task('release:darwin', () => build({
	publish: NODE_ENV === 'production' ? 'onTagOrDraft' : 'never',
	x64: true,
	mac: [],
}));

task('release:linux', () => build({
	publish: NODE_ENV === 'production' ? 'onTagOrDraft' : 'never',
	x64: true,
	linux: [],
	c: { productName: 'rocketchat' },
}));

task('release:win32', () => build({
	publish: NODE_ENV === 'production' ? 'onTagOrDraft' : 'never',
	x64: true,
	ia32: true,
	win: [],
}));

task('release', series('build', `release:${ process.platform }`));
