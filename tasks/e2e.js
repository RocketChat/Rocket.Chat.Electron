const childProcess = require('child_process');
const gulp = require('gulp');
const bundle = require('./bundle');
const getEnv = require('./env');


gulp.task('e2e:build', async () => {
	const env = getEnv();
	await bundle.many('src', '*.e2e.js', 'app/e2e.js', { env });
});

gulp.task('e2e:run', (cb) => {
	childProcess
		.spawn('xvfb-maybe', [
			'mocha',
			'--require',
			'source-map-support/register',
			'app/e2e.js',
		], { stdio: 'inherit', shell: true })
		.on('close', cb);
});

gulp.task('e2e', gulp.series('env:test', 'build', 'e2e:build', 'e2e:run'));
