const gulp = require('gulp');
const batch = require('gulp-batch');
const less = require('gulp-less');
const plumber = require('gulp-plumber');
const watch = require('gulp-watch');
const minimist = require('minimist');
const bundle = require('./bundle');

const { env } = minimist(process.argv, { default: { env: 'development' } });

gulp.task('public', () => gulp.src('src/public/**/*')
	.pipe(plumber())
	.pipe(gulp.dest('app/public')));

gulp.task('i18n', () => gulp.src('src/i18n/lang/**/*')
	.pipe(plumber())
	.pipe(gulp.dest('app/i18n/lang')));

gulp.task('bundle', () => Promise.all([
	bundle('src/background.js', 'app/background.js', { env }),
	bundle('src/app.js', 'app/app.js', { env }),
	bundle('src/i18n/index.js', 'app/i18n/index.js', { env }),
	bundle('src/preload.js', 'app/preload.js', { env }),
]));

gulp.task('less', () => gulp.src('src/stylesheets/main.less')
	.pipe(plumber())
	.pipe(less())
	.pipe(gulp.dest('app/stylesheets')));

gulp.task('build-app', gulp.series('public', 'i18n', 'bundle', 'less'));

gulp.task('watch', () => {
	const run = (taskName) => batch((event, done) => gulp.task(taskName)(done));

	watch('src/public/**/*', run('public'));
	watch('src/i18n/lang/**/*', run('i18n'));
	watch('src/**/*.js', run('bundle'));
	watch('src/**/*.less', run('less'));
});

gulp.task('build-unit-tests', gulp.series('build-app', async() => {
	await bundle.many('src', 'background/*.spec.js', 'app/main.specs.js', { env });
	await bundle.many('src', ['*.spec.js', '!background/*.spec.js'], 'app/renderer.specs.js', { env });
}));

gulp.task('build-coverage-tests', gulp.series('build-app', async() => {
	await bundle.many('src', 'background/*.spec.js', 'app/main.specs.js', { coverage: true, env });
	await bundle.many('src', ['*.spec.js', '!background/*.spec.js'], 'app/renderer.specs.js', { coverage: true, env });
}));

gulp.task('build-e2e-tests', gulp.series('build-app', async() => {
	await bundle.many('src', '*.e2e.js', 'app/e2e.js', { env });
}));
