const { build } = require('electron-builder');
const gulp = require('gulp');
const getEnv = require('./env');


const x64 = true;
const ia32 = true;

gulp.task('release:darwin', async() => {
	const publish = getEnv() === 'production' ? 'onTagOrDraft' : 'never';
	await build({ publish, x64, mac: [] });
});

gulp.task('release:linux', async() => {
	const { linux: { target } } = require('../electron-builder.json');
	const publish = getEnv() === 'production' ? 'onTagOrDraft' : 'never';
	const targets = target.filter((target) => target !== 'snap');
	await build({ publish, x64, ia32, linux: targets, c: { productName: 'rocketchat' } });
	await build({ publish, x64, linux: ['snap'], c: { productName: 'rocketchat' } });
});

gulp.task('release:win32', async() => {
	const publish = getEnv() === 'production' ? 'onTagOrDraft' : 'never';
	await build({ publish, x64, ia32, win: ['nsis', 'appx'] });
});

gulp.task('release', gulp.series('build', `release:${ process.platform }`));
