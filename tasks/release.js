const { build } = require('electron-builder');
const gulp = require('gulp');
const getEnv = require('./env');


const x64 = true;
const ia32 = true;

gulp.task('release:darwin', async () => {
	const publish = getEnv() === 'production' ? 'onTagOrDraft' : 'never';
	await build({ publish, x64, mac: [] });
});

gulp.task('release:linux', async () => {
	const publish = getEnv() === 'production' ? 'onTagOrDraft' : 'never';
	await build({ publish, x64, linux: [], c: { productName: 'rocketchat' } });
});

gulp.task('release:win32', async () => {
	const publish = getEnv() === 'production' ? 'onTagOrDraft' : 'never';
	await build({ publish, x64, ia32, win: [] });
});

gulp.task('release', gulp.series('build', `release:${ process.platform }`));
