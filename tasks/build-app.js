'use strict';

const gulp = require('gulp');
const batch = require('gulp-batch');
const less = require('gulp-less');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const watch = require('gulp-watch');
const bundle = require('./bundle');
const utils = require('./utils');
const { beepSound, srcDir, configDir, appDir } = require('./utils');

gulp.task('public', () => gulp.src(srcDir.path('public/**/*'))
	.pipe(plumber())
	.pipe(gulp.dest(appDir.path('public'))));

gulp.task('i18n', () => gulp.src(srcDir.path('i18n/lang/**/*'))
	.pipe(plumber())
	.pipe(gulp.dest(appDir.path('i18n/lang'))));

gulp.task('bundle', () => Promise.all([
	bundle(srcDir.path('background.js'), appDir.path('background.js')),
	bundle(srcDir.path('app.js'), appDir.path('app.js')),
	bundle(srcDir.path('i18n/index.js'), appDir.path('i18n/index.js')),
]));

gulp.task('less', () => gulp.src(srcDir.path('stylesheets/main.less'))
	.pipe(plumber())
	.pipe(less())
	.pipe(gulp.dest(appDir.path('stylesheets'))));

gulp.task('environment', () => gulp.src(configDir.path(`env_${ utils.getEnvName() }.json`))
	.pipe(plumber())
	.pipe(rename('env.json'))
	.pipe(gulp.dest(appDir.path('.'))));

gulp.task('build-app', ['public', 'i18n', 'bundle', 'less', 'environment']);

gulp.task('watch', () => {
	const runOnChanges = (taskName) => batch((event, done) => {
		gulp.start(taskName, (err) => {
			if (err) {
				beepSound();
			}
			done(err);
		});
	});

	watch(srcDir.path('public/**/*'), runOnChanges('public'));
	watch(srcDir.path('i18n/lang/**/*'), runOnChanges('i18n'));
	watch(srcDir.path('**/*.js'), runOnChanges('bundle'));
	watch(srcDir.path('**/*.less'), runOnChanges('less'));
	watch(configDir.path('**/*'), runOnChanges('environment'));
});
