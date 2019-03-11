const gulp = require('gulp');
const less = require('gulp-less');
const plumber = require('gulp-plumber');
const bundle = require('./bundle');
const getEnv = require('./env');


gulp.task('build:public', () => gulp.src('src/public/**/*')
	.pipe(plumber())
	.pipe(gulp.dest('app/public')));

gulp.task('build:i18n', () => gulp.src('src/i18n/lang/**/*')
	.pipe(plumber())
	.pipe(gulp.dest('app/i18n/lang')));

gulp.task('build:bundle', () => {
	const env = getEnv();
	return Promise.all([
		bundle('src/background.js', 'app/background.js', { env }),
		bundle('src/app.js', 'app/app.js', { env }),
		bundle('src/i18n/index.js', 'app/i18n/index.js', { env }),
		bundle('src/preload.js', 'app/preload.js', { env }),
	]);
});

gulp.task('build:less', () => gulp.src('src/stylesheets/main.less')
	.pipe(plumber())
	.pipe(less())
	.pipe(gulp.dest('app/stylesheets')));

gulp.task('build', gulp.parallel('build:public', 'build:i18n', 'build:bundle', 'build:less'));

gulp.task('watch', () => {
	gulp.watch('src/public/**/*', gulp.task('build:public'));
	gulp.watch('src/i18n/lang/**/*', gulp.task('build:i18n'));
	gulp.watch('src/**/*.js', gulp.task('build:bundle'));
	gulp.watch('src/**/*.less', gulp.task('build:less'));
});
