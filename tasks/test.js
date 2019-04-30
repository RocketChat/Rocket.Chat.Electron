const childProcess = require('child_process');
const gulp = require('gulp');
const bundle = require('./bundle');
const getEnv = require('./env');


gulp.task('test:build', async () => {
	const env = getEnv();
	await bundle.many('src', 'main/*.spec.js', 'app/main.specs.js', { env });
	await bundle.many('src', ['*.spec.js', '!main/*.spec.js'], 'app/renderer.specs.js', { env });
});

gulp.task('test:main', (cb) => {
	childProcess
		.spawn('xvfb-maybe', [
			'electron-mocha',
			'--require',
			'source-map-support/register',
			'app/main.specs.js',
		], { stdio: 'inherit', shell: true })
		.on('close', cb);
});

gulp.task('test:renderer', (cb) => {
	childProcess
		.spawn('xvfb-maybe', [
			'electron-mocha',
			'--require',
			'source-map-support/register',
			'--renderer',
			'app/renderer.specs.js',
		], { stdio: 'inherit', shell: true })
		.on('close', cb);
});

gulp.task('test', gulp.series('env:test', gulp.parallel('build', 'test:build'), 'test:main', 'test:renderer'));
