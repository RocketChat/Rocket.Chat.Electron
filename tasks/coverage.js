const childProcess = require('child_process');
const gulp = require('gulp');
const bundle = require('./bundle');
const getEnv = require('./env');


gulp.task('coverage:build', async() => {
	const env = getEnv();
	const coverage = true;
	await bundle.many('src', 'background/*.spec.js', 'app/main.specs.js', { coverage, env });
	await bundle.many('src', ['*.spec.js', '!background/*.spec.js'], 'app/renderer.specs.js', { coverage, env });
});

gulp.task('coverage:main', (cb) => {
	childProcess
		.spawn('xvfb-maybe', [
			'electron-mocha',
			'--require',
			'source-map-support/register',
			'--reporter',
			'tasks/coverage-reporter',
			'app/main.specs.js',
		], { stdio: 'inherit', shell: true })
		.on('close', cb);
});

gulp.task('coverage:renderer', (cb) => {
	childProcess
		.spawn('xvfb-maybe', [
			'electron-mocha',
			'--require',
			'source-map-support/register',
			'--reporter',
			'tasks/coverage-reporter',
			'--renderer',
			'app/renderer.specs.js',
		], { stdio: 'inherit', shell: true })
		.on('close', cb);
});

gulp.task('coverage:report', (cb) => {
	childProcess
		.spawn('node', [
			'tasks/coverage-reporter',
		], { stdio: 'inherit', shell: true })
		.on('close', cb);
});

gulp.task('coverage', gulp.series('env:test', gulp.parallel('build', 'coverage:build'),
	'coverage:main', 'coverage:renderer', 'coverage:report'));
