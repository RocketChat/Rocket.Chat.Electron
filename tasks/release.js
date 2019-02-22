const { build } = require('electron-builder');
const gulp = require('gulp');
const minimist = require('minimist');
const config = require('../electron-builder.json');

const { env } = minimist(process.argv, { default: { env: 'development' } });

const publish = env !== 'production' ? 'never' : 'onTagOrDraft';
gulp.task('release:darwin', () => build({ publish, x64: true, mac: [] }));
gulp.task('release:win32', () => build({ publish, x64: true, ia32: true, win: ['nsis', 'appx'] }));
gulp.task('release:linux', async() => {
	const allLinuxTargetsButSnap = config.linux.target.filter((target) => target !== 'snap');
	await build({ publish, x64: true, linux: [], c: { productName: 'rocketchat' } });
	await build({ publish, ia32: true, linux: allLinuxTargetsButSnap, c: { productName: 'rocketchat' } });
});

gulp.task('release', gulp.series('build-app', `release:${ process.platform }`));
